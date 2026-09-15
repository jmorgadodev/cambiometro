import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildR2ManifestRepairCandidates } from "../r2-manifest-repair-candidates.mjs";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

describe("candidatos locales de reparación de manifiestos R2", () => {
  it("sólo habilita un candidato cuando coinciden período, conteo y checksums", () => {
    const root = mkdtempSync(join(tmpdir(), "cambiometro-r2-repair-candidate-"));
    const key = "partitions/demo/2026/09";
    const manifestKey = `${key}/manifest.json`;
    const artifactKey = `${key}/records-${digest("demo\n")}.jsonl.gz`;
    mkdirSync(join(root, key), { recursive: true });
    writeFileSync(join(root, artifactKey), "demo\n");
    writeFileSync(join(root, manifestKey), JSON.stringify({
      sourceId: "demo",
      year: 2026,
      month: 9,
      recordCount: 1,
      projectionChecksumSha256: digest("demo\n"),
      artifacts: [{ key: artifactKey, checksumSha256: digest("demo\n") }],
    }));

    const result = buildR2ManifestRepairCandidates({
      localLakeRoot: root,
      remoteCatalog: { partitions: [{ sourceId: "demo", id: "demo/2026/09", period: "2026-09", recordCount: 1, checksumSha256: digest("demo\n"), manifestKey }] },
      missingManifestKeys: [manifestKey],
    });

    expect(result).toMatchObject({ ready: true, writesPerformed: false, requestedMissingManifests: 1, rejected: [] });
    expect(result.candidates[0]).toMatchObject({ manifestKey, artifactKey, recordCount: 1, writesPerformed: false });
  });

  it("rechaza datos locales que no representan el manifiesto remoto", () => {
    const root = mkdtempSync(join(tmpdir(), "cambiometro-r2-repair-candidate-"));
    const manifestKey = "partitions/demo/2026/09/manifest.json";
    mkdirSync(join(root, "partitions/demo/2026/09"), { recursive: true });
    writeFileSync(join(root, manifestKey), JSON.stringify({ year: 2026, month: 9, recordCount: 2, projectionChecksumSha256: "a".repeat(64), artifacts: [] }));

    const result = buildR2ManifestRepairCandidates({
      localLakeRoot: root,
      remoteCatalog: { partitions: [{ sourceId: "demo", period: "2026-09", recordCount: 1, checksumSha256: "b".repeat(64), manifestKey }] },
      missingManifestKeys: [manifestKey],
    });

    expect(result.ready).toBe(false);
    expect(result.writesPerformed).toBe(false);
    expect(result.rejected[0]).toMatchObject({ reason: "record_count_mismatch", remoteCount: 1, localCount: 2 });
  });
});
