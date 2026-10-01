import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Pages publication serialization", () => {
  for (const name of ["pages-ui-refresh", "pages-static-refresh"]) {
    it(`${name} pins inputs and packages release evidence`, () => {
      const body = readFileSync(new URL(`../../../../.github/workflows/${name}.yml`, import.meta.url), "utf8");
      expect(body.includes("--release-set-file .ci-data-version/release-set.json")).toBe(true);
      expect(body.includes("cp .ci-data-version/release-set.json out/data/release-set.json")).toBe(true);
      expect(body.includes("--pin out/data/release-set.json --manifest .ci-data-version/promotion-static-manifest.json")).toBe(true);
    });
  }
  it("rejects stale manually promoted artifacts before deployment", () => {
    const body = readFileSync(new URL("../../../../.github/workflows/pages-promote-artifact.yml", import.meta.url), "utf8");
    expect(body.includes("--pin out/data/release-set.json --manifest .ci-data-version/promotion-static-manifest.json")).toBe(true);
    expect(body.indexOf("node scripts/verify-release-set.mjs")).toBeLessThan(body.indexOf("run: npx wrangler pages deploy"));
  });
  for (const name of ["pages-ui-refresh", "pages-static-refresh", "pages-promote-artifact",
    "etl-contraloria", "etl-chilecompra", "etl-infolobby-scheduled", "etl-expenses",
    "etl-camara-votaciones", "etl-daily", "etl-ley-19862", "etl-cplt",
    "etl-personal-apoyo-senado", "etl-camara-reconciliation", "etl-infoprobidad",
    "etl-dipres", "etl-movimientos", "etl-personal-apoyo", "etl-sinim", "etl-servel"]) {
    it(`${name} shares the ETL publication lock without canceling production`, () => {
      const body = readFileSync(new URL(`../../../../.github/workflows/${name}.yml`, import.meta.url), "utf8");
      const concurrency = body.split("concurrency:")[1]?.split(/\r?\n\r?\n/)[0] ?? "";
      expect(/group: cambiometro-static-publication/.test(concurrency)).toBe(true);
      expect(/cancel-in-progress: false/.test(concurrency)).toBe(true);
      expect(/queue: max/.test(concurrency)).toBe(true);
    });
  }
});
