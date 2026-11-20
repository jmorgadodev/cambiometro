import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { loadParliamentaryDashboard } from "./parliamentary-dashboard-data";
vi.mock("./politicos", () => ({ POLITICOS_SEED: [{ id: "d", nombre_completo: "Ana Perez Soto", cargo: "Diputado" }] }));
vi.mock("./data-source", () => ({ diputadoIdParaPolitico: () => "10", getGastosParaPolitico: () => { throw new Error("Stale slices must not be used"); }, nameSequenceMatches: () => false }));
vi.mock("./remuneraciones", () => ({ remuneracionParaPolitico: async () => ({ bruto_mensual: 900, mes: "2026-06" }) }));
const hash = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("entrada verificada del dashboard", () => {
  it("sin pin ni bundle local muestra preparación pendiente y no fixtures", async () => {
    vi.stubEnv("CAMBIOMETRO_DASHBOARD_LOCAL_DATA", ""); vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(await loadParliamentaryDashboard()).toMatchObject({ mode: "unverified", rows: [], releaseId: null });
  });
  it("el bundle local alterado queda rechazado", async () => {
    vi.stubEnv("CAMBIOMETRO_DASHBOARD_LOCAL_DATA", "local.json"); vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "");
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify({ sha256: "wrong", data: { mode: "local-verified", rows: [] } }));
    await expect(loadParliamentaryDashboard()).rejects.toThrow("DASHBOARD_LOCAL_DATA_CHECKSUM_INVALID");
  });
  it("la publicación no puede consumir el override de revisión local", async () => {
    vi.stubEnv("CAMBIOMETRO_DASHBOARD_LOCAL_DATA", "local.json"); vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "1");
    await expect(loadParliamentaryDashboard()).rejects.toThrow("DASHBOARD_LOCAL_DATA_NOT_ALLOWED_IN_PUBLICATION");
  });
  it.each([false, true])("un filesystem no disponible queda cerrado en publicación=%s", async published => {
    vi.stubEnv("CAMBIOMETRO_DASHBOARD_LOCAL_DATA", "");
    vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", published ? "1" : "");
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const unavailable = Object.assign(new Error("Filesystem unavailable"), { code: "ENOSYS" });
    vi.spyOn(fs, "readFileSync").mockImplementation(() => { throw unavailable; });
    if (published) await expect(loadParliamentaryDashboard()).rejects.toThrow("Filesystem unavailable");
    else expect(await loadParliamentaryDashboard()).toMatchObject({ mode: "unverified", rows: [], releaseId: null });
  });
  it.each([false, true])("usa archivos fijados del release, rechaza divergencia=%s", async tamper => {
    vi.stubEnv("CAMBIOMETRO_DASHBOARD_LOCAL_DATA", "");
    const paths = ["data/lake-subsets/gastos-camara.subset.json", "data/lake-subsets/gastos-senado.subset.json", "data/personal-apoyo.json"];
    const contents = [JSON.stringify({ records: [{ id: "1", diputado_id: "10", periodo: "2026-03", item: "Arriendo", monto_clp: 100 }] }), JSON.stringify({ records: [] }), JSON.stringify({ diputados: {}, senadores: {} })];
    const pin = { releaseSetId: "release", domains: { gastos: { files: paths.map((path, i) => ({ path, size: Buffer.byteLength(contents[i]), checksumSha256: hash(contents[i]) })) } } };
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation((path) => {
      const key = String(path).replaceAll("\\", "/");
      if (key.endsWith("release-set.json")) return JSON.stringify(pin);
      const i = paths.findIndex(p => key.endsWith(p));
      if (i < 0) throw new Error("Unexpected file");
      return Buffer.from(contents[i] + (tamper && i === 0 ? " " : ""));
    });
    if (tamper) await expect(loadParliamentaryDashboard()).rejects.toThrow("DASHBOARD_PUBLISHED_INPUT_MISMATCH");
    else expect(await loadParliamentaryDashboard()).toMatchObject({ mode: "published", releaseId: "release", rows: [expect.objectContaining({ component: "gastos", amount: 100 }), expect.objectContaining({ component: "dieta", amount: 900, period: "2026-06" })] });
  });
});
