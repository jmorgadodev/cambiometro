import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { loadExplorerBootstrap } from "./parliamentary-explorer-data";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
function setup(
  extra: { badHash?: boolean; schema?: number; pinRelease?: string } = {},
) {
  vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "");
  vi.stubEnv("CAMBIOMETRO_DASHBOARD_LOCAL_DATA", "");
  vi.stubEnv("CAMBIOMETRO_DASHBOARD_SOURCE_RECEIPT", "");
  const body = JSON.stringify({
    schemaVersion: extra.schema ?? 1,
    releaseId: "release",
    projectionId: "projection",
    members: [],
    partitions: [],
    sources: {},
    notes: [],
    dictionaries: { periods: [], items: [], categories: [], roles: [] },
    packedFacts: [],
  });
  const manifest = {
    releaseId: "release",
    projectionId: "projection",
    bootstrap: {
      sha256: extra.badHash ? "tampered" : hash(body),
      bytes: Buffer.byteLength(body),
    },
  };
  vi.spyOn(fs, "existsSync").mockReturnValue(true);
  vi.spyOn(fs, "readFileSync").mockImplementation((file) =>
    String(file).endsWith("release-set.json")
      ? JSON.stringify({ releaseSetId: extra.pinRelease ?? "release" })
      : String(file).endsWith("manifest.json")
        ? JSON.stringify(manifest)
        : Buffer.from(body),
  );
}
describe("bootstrap verificado del explorador", () => {
  it("no usa fixtures si falta la proyección local", () => {
    vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "");
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(loadExplorerBootstrap()).toBeNull();
  });
  it("falla cerrado si se intenta publicar sin proyección", () => {
    vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "1");
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(loadExplorerBootstrap).toThrow("EXPLORER_BOOTSTRAP_REQUIRED");
  });
  it("rechaza contenido alterado aunque el JSON sea válido", () => {
    setup({ badHash: true });
    expect(loadExplorerBootstrap).toThrow(
      "EXPLORER_BOOTSTRAP_INTEGRITY_FAILED",
    );
  });
  it("rechaza versiones de esquema no compatibles", () => {
    setup({ schema: 2 });
    expect(loadExplorerBootstrap).toThrow(
      "EXPLORER_BOOTSTRAP_RELEASE_MISMATCH",
    );
  });
  it("no mezcla un bootstrap viejo con un pin nuevo", () => {
    setup({ pinRelease: "other" });
    vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "1");
    expect(loadExplorerBootstrap).toThrow(
      "EXPLORER_PUBLISHED_RELEASE_MISMATCH",
    );
  });
  it("impide publicar un override local", () => {
    setup();
    vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "1");
    vi.stubEnv("CAMBIOMETRO_DASHBOARD_SOURCE_RECEIPT", "local.json");
    expect(loadExplorerBootstrap).toThrow("EXPLORER_LOCAL_DATA_IN_PUBLICATION");
  });
  it("carga una proyección cuyo hash, esquema y release son coherentes", () => {
    setup();
    vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", "1");
    expect(loadExplorerBootstrap()).toMatchObject({
      releaseId: "release",
      projectionId: "projection",
    });
  });
  it.each([false, true])(
    "filesystem unavailable never becomes a published fallback (%s)",
    (published) => {
      setup();
      vi.stubEnv("CAMBIOMETRO_PUBLISHED_RELEASE_ONLY", published ? "1" : "");
      vi.spyOn(fs, "existsSync").mockImplementation(() => {
        throw Object.assign(new Error("Unavailable"), { code: "ENOSYS" });
      });
      if (published) expect(loadExplorerBootstrap).toThrow("Unavailable");
      else expect(loadExplorerBootstrap()).toBeNull();
    },
  );
});
