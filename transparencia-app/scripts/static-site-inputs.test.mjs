import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  assertStaticInputManifest,
  assertStaticInputManifestComplete,
  assertStaticInputContentQuality,
  buildStaticInputEntries,
  buildStaticInputManifest,
  omitRetainedExpenseSubsets,
  parseRequestedStaticFiles,
  STATIC_SITE_FILE_GROUPS,
} from "./static-site-inputs.mjs";

describe("static site input release", () => {
  it("keeps Movimientos isolated from the Parlamento release group", () => {
    assert.ok(!STATIC_SITE_FILE_GROUPS.parlamento.includes("data/movimientos.json"));
    assert.ok(STATIC_SITE_FILE_GROUPS.movimientos.includes("data/movimientos.json"));
  });

  it("builds and validates a checksum manifest from an allowed group", () => {
    const root = mkdtempSync(join(tmpdir(), "cambiometro-static-inputs-"));
    try {
      const file = "data/lake-subsets/chilecompra.subset.json";
      const target = join(root, "data", "lake-subsets", "chilecompra.subset.json");
      mkdirSync(join(root, "data", "lake-subsets"), { recursive: true });
      writeFileSync(target, "{\"generatedAt\":\"test\"}\n", "utf8");
      const requested = parseRequestedStaticFiles({ groups: ["chilecompra"] });
      assert.equal(requested.length, 2);
      const entries = buildStaticInputEntries({ root, files: [file], releaseId: "a".repeat(64) });
      const manifest = buildStaticInputManifest({ entries });
      assertStaticInputManifest(manifest);
      assert.equal(manifest.files[0].checksumSha256.length, 64);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("incluye sólo los fragmentos mensuales enumerados por el índice de gastos", () => {
    const root = mkdtempSync(join(tmpdir(), "cambiometro-expense-period-inputs-"));
    try {
      const base = join(root, "data", "lake-subsets", "expense-periods");
      mkdirSync(join(base, "gastos_camara"), { recursive: true });
      const periods = ["2026-05", "2026-06"].map((period) => ({
        period,
        path: `data/lake-subsets/expense-periods/gastos_camara/${period}.json`,
        recordCount: 1,
      }));
      writeFileSync(join(base, "manifest.json"), JSON.stringify({
        schemaVersion: 1,
        dataset: "gastos-operacionales-por-periodo",
        sources: [{ sourceId: "gastos_camara", periods }],
      }));
      for (const item of periods) {
        writeFileSync(join(base, "gastos_camara", `${item.period}.json`), JSON.stringify({
          sourceId: "gastos_camara", period: item.period, recordCount: 1,
          records: [{ periodo: item.period }],
        }));
      }

      const requested = parseRequestedStaticFiles({ groups: ["gastos"], root });

      assert.equal(requested.length, 5);
      assert.ok(requested.includes(periods[0].path));
      assert.ok(requested.includes(periods[1].path));
      assert.ok(!requested.includes("data/lake-subsets/expense-periods/gastos_camara/2026-07.json"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reutiliza la misma clave R2 para un fragmento mensual sin cambios", () => {
    const root = mkdtempSync(join(tmpdir(), "cambiometro-expense-period-key-"));
    try {
      const relativePath = "data/lake-subsets/expense-periods/gastos_camara/2026-06.json";
      const target = join(root, ...relativePath.split("/"));
      mkdirSync(join(root, "data", "lake-subsets", "expense-periods", "gastos_camara"), { recursive: true });
      writeFileSync(target, JSON.stringify({
        sourceId: "gastos_camara", period: "2026-06", recordCount: 1,
        records: [{ periodo: "2026-06" }],
      }));

      const first = buildStaticInputEntries({ root, files: [relativePath], releaseId: "a".repeat(64) });
      const second = buildStaticInputEntries({ root, files: [relativePath], releaseId: "b".repeat(64) });

      assert.equal(first[0].key, second[0].key);
      assert.equal(first[0].sourceId, "gastos_camara");
      assert.equal(first[0].period, "2026-06");
      assert.equal(first[0].recordCount, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reutiliza los subconjuntos completos ya publicados y conserva fallback", () => {
    const entries = [
      { path: "data/lake-subsets/gastos-camara.subset.json", key: "cam-new", size: 100 },
      { path: "data/lake-subsets/gastos-senado.subset.json", key: "sen-new", size: 200 },
      { path: "data/lake-subsets/expense-periods/manifest.json", key: "period-index", size: 30 },
    ];
    const previousManifest = { files: [
      { path: "data/lake-subsets/gastos-camara.subset.json", key: "cam-old" },
      { path: "data/lake-subsets/gastos-senado.subset.json", key: "sen-old" },
    ] };

    assert.deepEqual(omitRetainedExpenseSubsets(entries, previousManifest).map((entry) => entry.path),
      ["data/lake-subsets/expense-periods/manifest.json"]);
    assert.deepEqual(omitRetainedExpenseSubsets(entries, null), entries);
  });

  it("rejects files outside the static input allowlist", () => {
    assert.throws(
      () => parseRequestedStaticFiles({ files: ["data/lake/partitions/secret.json"] }),
      /STATIC_INPUT_FILE_NOT_ALLOWED/,
    );
  });

  it("detects a partial release before Pages can hydrate stale checkout files", () => {
    const root = mkdtempSync(join(tmpdir(), "cambiometro-static-inputs-partial-"));
    try {
      const file = "data/lake-subsets/chilecompra.subset.json";
      const target = join(root, "data", "lake-subsets", "chilecompra.subset.json");
      mkdirSync(join(root, "data", "lake-subsets"), { recursive: true });
      writeFileSync(target, "{}\n", "utf8");
      const entries = buildStaticInputEntries({ root, files: [file], releaseId: "b".repeat(64) });
      const manifest = buildStaticInputManifest({ entries });
      assert.throws(() => assertStaticInputManifestComplete(manifest), /STATIC_INPUT_MANIFEST_INCOMPLETE/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects syntactically valid but incomplete source catalogs", () => {
    assert.throws(
      () => assertStaticInputContentQuality("data/lake-subsets/chilecompra.subset.json", JSON.stringify({ buyers: [] })),
      /STATIC_INPUT_PARTIAL_CHILECOMPRA/,
    );
    assert.throws(
      () => assertStaticInputContentQuality("data/lake-subsets/infolobby.subset.json", JSON.stringify({ records: [] })),
      /STATIC_INPUT_PARTIAL_INFOLOBBY/,
    );
  });
});
