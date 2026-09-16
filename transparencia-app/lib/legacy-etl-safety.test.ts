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

  it("prefiere el token de auditoría en los monitores de D1", () => {
    for (const relativePath of [".github/workflows/usage-watch.yml", ".github/workflows/d1-post-reset-probe.yml"]) {
      const source = readFileSync(resolve("..", relativePath), "utf8");
      expect(source).toContain("secrets.CLOUDFLARE_AUDIT_API_TOKEN || secrets.WRANGLER_TOKEN");
    }
  });

  it("mantiene congelado el Worker ETL histórico", () => {
    const source = readFileSync(resolve("workers/etl/cron.ts"), "utf8");
    const config = readFileSync(resolve("workers/etl/wrangler.toml"), "utf8");
    expect(source).toContain("Worker congelado");
    expect(source).not.toMatch(/prepare\(|\.put\(|fetchInfoProbidad|fetchGastos|fetchAudiencias/);
    expect(config).not.toContain("[[d1_databases]]");
    expect(config).not.toContain("crons =");
  });
});
