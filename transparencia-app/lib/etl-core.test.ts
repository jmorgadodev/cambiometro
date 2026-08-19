import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  applyConnectorOutcome,
  buildDeterministicPartition,
  gzipDeterministicJsonl,
  protectPersonalIdentifiers,
  splitDeterministically,
  storagePolicy,
} from "../scripts/etl/core.mjs";

describe("núcleo del lago de datos", () => {
  it("produce exactamente el mismo gzip y checksum al repetir una partición", () => {
    const records = [
      { id: "b", amount: 2, nested: { z: 1, a: 2 } },
      { nested: { a: 1 }, id: "a", amount: 1 },
    ];
    const first = buildDeterministicPartition(records);
    const second = buildDeterministicPartition([...records].reverse());

    expect(first.checksumSha256).toBe(second.checksumSha256);
    expect(Buffer.compare(first.compressed, second.compressed)).toBe(0);
    expect(gunzipSync(first.compressed).toString("utf8").split("\n")[0]).toContain('"id":"a"');
  });

  it("divide archivos en partes deterministas sin perder bytes", () => {
    const input = Buffer.from("abcdefghijklmnopqrstuvwxyz", "utf8");
    const parts = splitDeterministically(input, 10);

    expect(parts.map((part: Buffer) => part.length)).toEqual([10, 10, 6]);
    expect(Buffer.concat(parts).equals(input)).toBe(true);
  });

  it("comprime JSONL determinista en flujo sin concatenar el original", async () => {
    const records = [{ id: "b", nested: { z: 1, a: 2 } }, { nested: { a: 1 }, id: "a" }];
    const first = await gzipDeterministicJsonl(records, (a, b) => a.id.localeCompare(b.id));
    const second = await gzipDeterministicJsonl([...records].reverse(), (a, b) => a.id.localeCompare(b.id));

    expect(first.checksumSha256).toBe(second.checksumSha256);
    expect(first.uncompressedChecksumSha256).toBe(second.uncompressedChecksumSha256);
    expect(gunzipSync(first.compressed).toString("utf8")).toBe('{"id":"a","nested":{"a":1}}\n{"id":"b","nested":{"a":2,"z":1}}\n');
  });

  it("separa el HMAC interno y conserva el RUT personal como identificador público", () => {
    const protectedRecord = protectPersonalIdentifiers(
      { id: "persona-1", rut: "12.345.678-5", nombre: "Persona" },
      "secreto-de-prueba-con-32-caracteres",
    );

    expect(protectedRecord.internal.personalRutHmac).toMatch(/^[a-f0-9]{64}$/);
    expect(protectedRecord.public).toEqual({ id: "persona-1", nombre: "Persona", rut: "12.345.678-5" });
  });

  it("aplica los umbrales internos de almacenamiento R2", () => {
    expect(storagePolicy(6.3, 8).action).toBe("publish");
    expect(storagePolicy(6.4, 8).action).toBe("archive_cold_partitions");
    expect(storagePolicy(7.2, 8).action).toBe("block_growth");
  });

  it("conserva el último dato válido cuando el conector falla", () => {
    const previous = { records: [{ id: "real-1" }], checksumSha256: "abc", status: "partial" };
    const outcome = applyConnectorOutcome(previous, { error: new Error("timeout") });

    expect(outcome.records).toEqual(previous.records);
    expect(outcome.checksumSha256).toBe("abc");
    expect(outcome.status).toBe("stale");
    expect(outcome.errors[0]).toContain("timeout");
  });
});
