import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { personalApoyoContentChecksum, shouldRefreshPersonalApoyo } from "../scripts/etl/personal-apoyo-publication.mjs";

describe("actualización diaria de apoyo Senado sin publicaciones vacías", () => {
  const baseline = { generado_en: "2026-10-05T00:00:00Z", diputados: {}, senadores: { Oficina: [{ periodo: "2026-08", monto: 100 }] } };
  it("no publica sólo porque cambie la fecha de extracción", () => {
    expect(personalApoyoContentChecksum(baseline)).toBe(personalApoyoContentChecksum({ ...baseline, generado_en: "2026-10-08T00:00:00Z" }));
  });
  it("no publica por distinto orden de claves o filas", () => {
    const first = { ...baseline, senadores: { Oficina: [{ periodo: "2026-08", monto: 100 }, { periodo: "2026-09", monto: 120 }] } };
    const second = { senadores: { Oficina: [{ monto: 120, periodo: "2026-09" }, { monto: 100, periodo: "2026-08" }] }, diputados: {}, generado_en: "2026-10-08T00:00:00Z" };
    expect(personalApoyoContentChecksum(first)).toBe(personalApoyoContentChecksum(second));
  });
  it("sí detecta septiembre o un monto corregido, incluso con igual cantidad de filas", () => {
    expect(personalApoyoContentChecksum(baseline)).not.toBe(personalApoyoContentChecksum({ ...baseline, senadores: { Oficina: [{ periodo: "2026-09", monto: 100 }] } }));
    expect(personalApoyoContentChecksum(baseline)).not.toBe(personalApoyoContentChecksum({ ...baseline, senadores: { Oficina: [{ periodo: "2026-08", monto: 101 }] } }));
  });
  it("un no-op no dispara Pages ni el verificador de una publicación", () => {
    const jobs = (conclusion: string) => [{ steps: [{ name: "Publicar entrada estática validada para Pages", conclusion }] }];
    expect(shouldRefreshPersonalApoyo(jobs("skipped"))).toBe(false);
    expect(shouldRefreshPersonalApoyo(jobs("success"))).toBe(true);
    expect(() => shouldRefreshPersonalApoyo(jobs("failure"))).toThrow();
    expect(() => shouldRefreshPersonalApoyo([])).toThrow();
  });
  it("revisa a diario y bloquea ambos publicadores cuando no cambia contenido", () => {
    const workflow = readFileSync(resolve("..", ".github/workflows/etl-personal-apoyo-senado.yml"), "utf8");
    expect(workflow).toContain('cron: "30 7 * * *"');
    expect(workflow).toContain("compare-personal-apoyo-candidate.mjs");
    expect(workflow.match(/steps\.changes\.outputs\.changed == 'true'/g)).toHaveLength(2);
    expect(workflow).toContain("--skip-d1");
    for (const name of ["pages-static-refresh.yml", "etl-publication-guard.yml"]) {
      expect(readFileSync(resolve("..", ".github/workflows", name), "utf8")).toContain("shouldRefreshPersonalApoyo");
    }
  });
  it("no usa D1 remota ni siquiera si falla activar el manifiesto R2", () => {
    const publisher = readFileSync("scripts/publish-personal-apoyo.mjs", "utf8");
    expect(publisher).toContain('if (!skipD1) wrangler(["d1", "execute", database, "--remote", "--file", failurePath]);');
  });
});
