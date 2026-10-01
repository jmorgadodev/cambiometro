import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildLakePlan } from "../lake.mjs";
import { assertMovementCandidate } from "../../movimientos-publication.mjs";
import { sha256 } from "../../movimientos-pipeline.mjs";

describe("adaptadores del contrato ETL", () => {
  it("rechaza un descenso de movimientos aunque supere el mínimo del dominio", () => {
    const original = JSON.parse(readFileSync(new URL("../../../data/movimientos.json", import.meta.url), "utf8"));
    const previous = structuredClone(original);
    previous.movimientos.push({ ...previous.movimientos[0], id: "fixture-extra" });
    previous.checksum_sha256 = sha256({ ...previous, checksum_sha256: undefined });
    expect(() => assertMovementCandidate(previous, original)).toThrow("COUNT_REGRESSION");
  });

  it.each([false, true])("Cámara: staging aislado; bytes alterados=%s", (corrupt) => {
    const directory = mkdtempSync(join(tmpdir(), "camara-contract-"));
    try {
      const plan = buildLakePlan({ actualizado_en: "2026-10-01T12:00:00Z", fuentes: {
        asistencia_camara: [{ id: "fixture-attendance", fecha: "2026-09-01", source_period: "2026-09", kind: "attendance" }],
      } });
      const prefix = "partitions/camara/asistencia_camara/2026/09/";
      const assets = plan.assets.filter((asset) => asset.key.startsWith(prefix));
      for (const asset of assets) {
        const target = join(directory, asset.key);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, corrupt && asset.key.endsWith(".gz") ? Buffer.from("altered") : asset.data);
      }
      const partition = plan.catalog.partitions[0];
      const other = { id: "infolobby/2026/09", sourceId: "infolobby", period: "2026-09", recordCount: 7, checksumSha256: "a".repeat(64) };
      const catalog = { sources: [{ id: "camara", recordCount: 1 }, { id: "infolobby", recordCount: 7 }], partitions: [partition, other] };
      const before = JSON.stringify(catalog);
      writeFileSync(join(directory, "before.json"), before);
      writeFileSync(join(directory, "release-summary.json"), JSON.stringify({
        sourceId: "camara", variant: "asistencia_camara", period: "2026-09", recordCount: 1,
        generatedAt: "2026-10-01T12:00:00Z", partitions: [partition],
        assets: assets.map(({ key, size, checksumSha256 }) => ({ key, size, checksumSha256 })),
      }));
      const result = spawnSync(process.execPath, ["scripts/etl/merge-camara-attendance-preflight.mjs",
        "--catalog", join(directory, "before.json"), "--staged", join(directory, "release-summary.json"),
        "--output", join(directory, "after.json"), "--expected-count", "1"], { encoding: "utf8" });
      expect(readFileSync(join(directory, "before.json"), "utf8")).toBe(before);
      if (corrupt) {
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("CAMARA_PREFLIGHT_ASSET_INVALID");
        expect(existsSync(join(directory, "after.json"))).toBe(false);
      } else {
        expect(result.status, result.stderr).toBe(0);
        const after = JSON.parse(readFileSync(join(directory, "after.json"), "utf8"));
        expect(after.partitions.find((entry) => entry.id === other.id)).toEqual(other);
        expect(after.sources.find((entry) => entry.id === "infolobby")).toEqual(catalog.sources[1]);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
