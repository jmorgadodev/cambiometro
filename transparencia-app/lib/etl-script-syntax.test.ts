import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("scripts ETL ejecutados por GitHub Actions", () => {
  it("mantiene sintaxis JavaScript valida en el ETL masivo de CPLT", () => {
    const scripts = [
      "scripts/etl/stream-remote-personal.mjs",
      "scripts/etl/municipality-registry.mjs",
      "scripts/update-commune-catalog.mjs",
      "scripts/publish-cplt-projections.mjs",
      "scripts/ingest-cplt-nacional.mjs",
      "scripts/stage-cplt-category.mjs",
      "scripts/merge-cplt-category-artifacts.mjs",
    ];
    for (const file of scripts) {
      expect(() => execFileSync(process.execPath, ["--check", resolve(process.cwd(), file)], { stdio: "pipe" })).not.toThrow();
    }
  });
});
