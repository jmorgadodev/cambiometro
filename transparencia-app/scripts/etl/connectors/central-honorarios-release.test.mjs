import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeCentralHonorariosPartitions } from "../central-honorarios-release.mjs";

const temporaryDirectories = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("release de honorarios centrales", () => {
  it("particiona por mes y entrega conteo, tamaño y checksum", async () => {
    const root = await mkdtemp(join(tmpdir(), "central-honorarios-test-"));
    temporaryDirectories.push(root);
    const manifest = await writeCentralHonorariosPartitions([
      { fuente_periodo: "2026-06", id: "b", nombre_completo: "B" },
      { fuente_periodo: "2026-05", id: "c", nombre_completo: "C" },
      { fuente_periodo: "2026-06", id: "a", nombre_completo: "A" },
    ], root, { sourceUrl: "https://source.test/honorarios.csv", sourceValidator: "etag-test" });

    expect(manifest.recordCount).toBe(3);
    expect(manifest.sourceUrl).toBe("https://source.test/honorarios.csv");
    expect(manifest.partitions).toHaveLength(2);
    expect(manifest.partitions.map((item) => item.period)).toEqual(["2026-05", "2026-06"]);
    expect(manifest.partitions[0]).toMatchObject({ recordCount: 1, checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(manifest.partitions[1]).toMatchObject({ recordCount: 2, checksumSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(JSON.parse(await readFile(join(root, "partitions", "2026-06.json"), "utf8"))).toHaveLength(2);
  });

  it("rechaza períodos que no tienen formato mensual", async () => {
    const root = await mkdtemp(join(tmpdir(), "central-honorarios-invalid-"));
    temporaryDirectories.push(root);
    await expect(writeCentralHonorariosPartitions([{ fuente_periodo: "2026", id: "x" }], root)).rejects.toThrow("CENTRAL_HONORARIO_PERIOD_INVALID");
  });
});
