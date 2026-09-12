import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { projectLakeEvidence, readR2EvidenceRecords } from "@/lib/r2-records";

function fakeBucket(recordsByKey: Record<string, unknown>) {
  const encoded = new Map<string, ArrayBuffer>();
  for (const [key, value] of Object.entries(recordsByKey)) {
    if (value instanceof ArrayBuffer) {
      encoded.set(key, value);
      continue;
    }
    const raw = typeof value === "string" ? value : JSON.stringify(value);
    const data = Uint8Array.from(Buffer.from(raw));
    encoded.set(key, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  }
  return {
    async get(key: string) {
      const data = encoded.get(key);
      if (!data) return null;
      return {
        async json<T>() { return JSON.parse(new TextDecoder().decode(data)) as T; },
        async arrayBuffer() { return data; },
      };
    },
  };
}

function gzipText(lines: unknown[]) {
  const data = gzipSync(`${lines.map((line) => JSON.stringify(line)).join("\n")}\n`);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

function sha256(data: ArrayBuffer) {
  return createHash("sha256").update(Buffer.from(data)).digest("hex");
}

function partition(sourceId: string, period: string, key: string, data: ArrayBuffer, recordCount: number) {
  return {
    sourceId,
    period,
    recordCount,
    manifestKey: `partitions/${sourceId}/${period}/manifest.json`,
    releaseTag: "data-test",
    manifestAssetName: `${sourceId}-${period}-manifest.json`,
    key,
    manifest: {
      projectionChecksumSha256: "projection",
      artifacts: [{ key, checksumSha256: sha256(data), releaseAssetName: `${sourceId}-${period}-records.jsonl.gz` }],
    },
  };
}

describe("registros calientes de R2", () => {
  it("proyecta ejecución DIPRES con monto CLP, origen y checksum", () => {
    const record = projectLakeEvidence({ id: "dipres-1", sourceId: "dipres", kind: "budget_execution", occurredAt: "2026-06-01", evidence: { sourceUrl: "https://dipres.gob.cl/real.csv" }, data: { period: "2026-06", denominacion: "APORTE FISCAL", ejecucion_acumulada_clp: 12_809_860_000, monto_original: { ejecutado: "12.809.860", unidad: "miles de pesos" } } }, "abc", "2026-08-08T00:00:00Z");
    expect(record).toMatchObject({ kind: "budget_execution", title: "APORTE FISCAL", amount: { amountClp: 12_809_860_000, currency: "CLP", originalAmount: "12.809.860", originalUnit: "miles de pesos" }, evidence: { checksumSha256: "abc" } });
  });

  it("proyecta contratos ChileCompra con comprador, proveedores y moneda original", () => {
    const record = projectLakeEvidence({ id: "chilecompra-award-1", sourceId: "chilecompra", kind: "contract", occurredAt: "2026-06-01", evidence: { sourceUrl: "https://api.mercadopublico.cl/real" }, data: { title: "Orden de compra", description: "Servicio", buyer: { id: "CL-MP-10" }, suppliers: [{ id: "CL-MP-20" }], monto_clp: 593301, monto_original: { amount: "593301", currency: "CLP", unit: "currency_unit" } } }, "def", "2026-08-08T00:00:00Z");
    expect(record).toMatchObject({ kind: "contract", title: "Orden de compra", subjectEntityIds: ["chilecompra-cl-mp-10"], objectEntityIds: ["chilecompra-cl-mp-20"], amount: { amountClp: 593301, originalAmount: "593301" } });
  });

  it("conserva entidades territoriales explícitas de SINIM", () => {
    const record = projectLakeEvidence({ id: "sinim-1", sourceId: "sinim", kind: "expense", occurredAt: "2025-12-31", evidence: { sourceUrl: "https://datos.sinim.gov.cl/real.xls" }, data: { title: "Gasto municipal", subject_entity_ids: ["municipality-cl-01101"], monto_clp: 10_000, monto_original: { amount: "10", currency: "CLP", unit: "miles de pesos" } } }, "abc", "2026-08-08T00:00:00Z");
    expect(record).toMatchObject({ subjectEntityIds: ["municipality-cl-01101"], amount: { amountClp: 10_000 } });
  });

  it("sirve una página de una fuente no indexada sin descomprimir todas sus particiones", async () => {
    const first = gzipText([{ id: "camara-1", sourceId: "camara", kind: "attendance", occurredAt: "2026-09-02", data: { title: "Asistencia" } }]);
    const second = gzipText([{ id: "camara-2", sourceId: "camara", kind: "attendance", occurredAt: "2026-08-02", data: { title: "Asistencia" } }]);
    const firstPartition = partition("camara", "2026-09", "partitions/camara/2026/09/records.jsonl.gz", first, 1);
    const secondPartition = partition("camara", "2026-08", "partitions/camara/2026/08/records.jsonl.gz", second, 1);
    const bucket = fakeBucket({
      "catalog/v1/manifest.json": { generatedAt: "2026-09-12T00:00:00Z", partitions: [firstPartition, secondPartition] },
      [firstPartition.manifestKey]: firstPartition.manifest,
      [secondPartition.manifestKey]: secondPartition.manifest,
      [firstPartition.key]: first,
      [secondPartition.key]: second,
    });

    const result = await readR2EvidenceRecords(bucket, { source: "camara", limit: 1 });

    expect(result).toMatchObject({ total: 2, expectedTotal: 2, loadedRows: 1, complete: false, missingPartitions: 0 });
    expect(result?.data).toHaveLength(1);
    expect(result?.data[0]?.id).toBe("camara-1");
  });

  it("rechaza filtros amplios sin índice antes de iniciar un scan que pueda producir 1102", async () => {
    const partitions = Array.from({ length: 13 }, (_, index) => {
      const period = `202${Math.floor(index / 12) + 4}-${String((index % 12) + 1).padStart(2, "0")}`;
      const key = `partitions/camara/${period}/records.jsonl.gz`;
      const data = gzipText([{ id: `camara-${index}`, sourceId: "camara", kind: "attendance", occurredAt: `${period}-01`, data: {} }]);
      return partition("camara", period, key, data, 1);
    });
    const result = await readR2EvidenceRecords(fakeBucket({ "catalog/v1/manifest.json": { partitions } }), { source: "camara", kind: "vote", limit: 25 });

    expect(result).toMatchObject({ scanLimited: true, expectedTotal: 13, complete: false });
    expect(result?.data).toEqual([]);
  });
});
