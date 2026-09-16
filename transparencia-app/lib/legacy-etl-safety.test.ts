import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const legacyScripts = [
  "scripts/etl/ingest-directorio-estado.mjs",
  "scripts/etl/ingest-asignaciones-congreso.mjs",
];

describe("bloqueos de ETL heredados", () => {
  it("no deja activos los scripts que contenían datos simulados", () => {
    for (const relativePath of legacyScripts) {
      const source = readFileSync(resolve(relativePath), "utf8");
      expect(source).toContain("LEGACY_SYNTHETIC_ETL_DISABLED");
      expect(source).not.toMatch(/wrangler['\"]\s*,\s*['\"]d1['\"]|--remote/);
    }
  });

  it("exige la compuerta explícita antes de materializar D1 remotamente", () => {
    const source = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(source).toContain("D1_REMOTE_MATERIALIZATION_REQUIRES_EXPLICIT_CONFIRMATION");
    expect(source).toContain("canMaterializeD1");
  });

  it("rechaza una ejecución remota directa sin autorización", () => {
    const result = spawnSync(process.execPath, ["scripts/materialize-d1.mjs", "--remote"], {
      encoding: "utf8",
      env: {
        ...process.env,
        D1_ALLOW_REMOTE_MATERIALIZATION: "",
        D1_MATERIALIZATION_CONFIRMATION: "",
      },
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("D1_REMOTE_MATERIALIZATION_REQUIRES_EXPLICIT_CONFIRMATION");
  });
});
