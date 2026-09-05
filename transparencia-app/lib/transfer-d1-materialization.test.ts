import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("proyección D1 dedicada de transferencias", () => {
  const script = readFileSync(
    resolve("scripts/materialize-transferencias-d1.mjs"),
    "utf8",
  );

  it("acepta una configuración Wrangler dedicada sin cambiar el destino por defecto", () => {
    expect(script).toContain('argument("--config", "wrangler.d1.jsonc")');
    expect(script).toContain('argument("--database", "transparencia-db")');
    expect(script).toContain('argument("--release-manifest", "")');
    expect(script).toContain('argument("--release-dir", "")');
    expect(script).toContain("transferencias_19862_stage");
  });

  it("permite materializar el release canónico descargado desde R2", () => {
    expect(script).toContain("TRANSFER_D1_RELEASE_MANIFEST_INVALID");
    expect(script).toContain("releaseStaging");
    expect(script).toContain("validateReleaseManifest(manifest)");
  });

  it("activa el release sólo después de construir el staging y escribir el marcador", () => {
    expect(script.indexOf("stage-indexes")).toBeGreaterThan(-1);
    expect(script.indexOf("activate-release")).toBeGreaterThan(
      script.indexOf("stage-indexes"),
    );
    expect(script).toContain("releaseChecksum !== manifest.checksumSha256");
    expect(script).not.toMatch(/\bBEGIN;|\bCOMMIT;/);
  });
});
