import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildLocalR2RepairPlan } from "../scripts/r2-repair-plan.mjs";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

describe("plan local de reparación R2", () => {
  it("verifica manifiesto y artefacto sin ejecutar escrituras", () => {
    const lakeRoot = mkdtempSync(join(tmpdir(), "cambiometro-r2-plan-"));
    const artifactKey = "partitions/demo/2026/01/records.jsonl.gz";
    const manifestKey = "partitions/demo/2026/01/manifest.json";
    const artifactPath = join(lakeRoot, artifactKey);
    const manifestPath = join(lakeRoot, manifestKey);
    mkdirSync(join(lakeRoot, "partitions/demo/2026/01"), { recursive: true });
    writeFileSync(artifactPath, "demo\n");
    writeFileSync(manifestPath, JSON.stringify({ artifacts: [{ key: artifactKey, checksumSha256: digest("demo\n") }] }));

    const plan = buildLocalR2RepairPlan({
      lakeRoot,
      sourceId: "demo",
      catalog: { partitions: [{ sourceId: "demo", id: "demo/2026/01", manifestKey }] },
    });

    expect(plan).toMatchObject({ ready: true, writesPerformed: false, checkedPartitions: 1, missing: [], mismatches: [] });
    expect(plan.operations.map((operation) => operation.key)).toEqual([artifactKey, manifestKey].sort());
  });

  it("bloquea el plan cuando falta un artefacto o su checksum no coincide", () => {
    const lakeRoot = mkdtempSync(join(tmpdir(), "cambiometro-r2-plan-"));
    const artifactKey = "partitions/demo/2026/01/records.jsonl.gz";
    const manifestKey = "partitions/demo/2026/01/manifest.json";
    const directory = join(lakeRoot, "partitions/demo/2026/01");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(lakeRoot, manifestKey), JSON.stringify({ artifacts: [{ key: artifactKey, checksumSha256: "f".repeat(64) }] }));

    const plan = buildLocalR2RepairPlan({ lakeRoot, sourceId: "demo", catalog: { partitions: [{ sourceId: "demo", manifestKey }] } });
    expect(plan.ready).toBe(false);
    expect(plan.missing).toHaveLength(1);
    expect(plan.writesPerformed).toBe(false);
  });

  it("resuelve fuentes anidadas por el segmento del manifestKey", () => {
    const lakeRoot = mkdtempSync(join(tmpdir(), "cambiometro-r2-plan-"));
    const manifestKey = "partitions/camara/votaciones_camara/2026/08/manifest.json";
    const artifactKey = "partitions/camara/votaciones_camara/2026/08/records.jsonl.gz";
    const directory = join(lakeRoot, "partitions/camara/votaciones_camara/2026/08");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(lakeRoot, artifactKey), "vote\n");
    writeFileSync(join(lakeRoot, manifestKey), JSON.stringify({ artifacts: [{ key: artifactKey, checksumSha256: digest("vote\n") }] }));

    const plan = buildLocalR2RepairPlan({
      lakeRoot,
      sourceId: "votaciones_camara",
      catalog: { partitions: [{ sourceId: "camara", manifestKey }] },
    });

    expect(plan).toMatchObject({ ready: true, checkedPartitions: 1, writesPerformed: false });
  });
});
