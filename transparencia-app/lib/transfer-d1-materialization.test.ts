import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("proyección D1 dedicada de transferencias", () => {
  const script = readFileSync(resolve("scripts/materialize-transferencias-d1.mjs"), "utf8");

  it("acepta una configuración Wrangler dedicada sin cambiar el destino por defecto", () => {
    expect(script).toContain('argument("--config", "wrangler.d1.jsonc")');
    expect(script).toContain('argument("--database", "transparencia-db")');
    expect(script).toContain("transferencias_19862_stage");
  });

  it("activa el release sólo después de construir el staging y escribir el marcador", () => {
    expect(script.indexOf("stage-indexes")).toBeGreaterThan(-1);
    expect(script.indexOf("activate-release")).toBeGreaterThan(script.indexOf("stage-indexes"));
    expect(script).toContain("releaseChecksum !== manifest.checksumSha256");
    expect(script).not.toMatch(/\bBEGIN;|\bCOMMIT;/);
  });
});
