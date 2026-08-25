import { describe, expect, it } from "vitest";
import { buildTransferReportUrl, fetchTransferMonth, normalizeTransferCsv } from "../scripts/etl/connectors/ley-19862.mjs";

const csv = `\uFEFFFOLIO;FECHA_DECRETO;FECHA_INGRESO;PERIODO;OBJETIVO_APORTE;MARCO_LEGAL;CLASIFICACION;EMISORA_RUT;EMISORA_NOMBRE;EMISORA_CLASE;RECEPTORA_RUT;RECEPTORA_NOMBRE;RECEPTORA_CLASE;MONTO;COMUNA\r
4562225;01-01-2025;11-12-2025;2025;"Programa; cuidados";"Decreto 1";"Transferencias corrientes (subtítulo 24)";60.103.000-4;"MINISTERIO DE DESARROLLO SOCIAL";"Ministerio o servicio público";61.961.000-8;"SERVICIO NACIONAL DEL ADULTO MAYOR";"Ministerio o servicio público";5623137440;Santiago\r
`;

describe("conector Registro Ley 19.862", () => {
  it("construye el CSV mensual oficial por fecha de decreto", () => {
    const url = new URL(buildTransferReportUrl(2025, 1));
    expect(url.searchParams.get("trans[desde]")).toBe("2025-01-01");
    expect(url.searchParams.get("trans[hasta]")).toBe("2025-01-31");
    expect(url.searchParams.get("trans[fecha]")).toBe("d");
    expect(url.searchParams.get("csv")).toBe("1");
  });

  it("normaliza transferencia, RUT jurídicos, entidades y monto entero CLP", () => {
    const [record] = normalizeTransferCsv(csv, { sourceUrl: "https://registros19862.gob.cl/reporte.csv" });
    expect(record).toMatchObject({
      id: "ley-19862-transfer-4562225",
      kind: "transfer",
      fecha: "2025-01-01",
      monto_clp: 5_623_137_440,
      emitter: { rut_juridico: "60.103.000-4", entity_id: "legal-cl-601030004" },
      receiver: { rut_juridico: "61.961.000-8", entity_id: "legal-cl-619610008" },
      subject_entity_ids: ["legal-cl-601030004"],
      object_entity_ids: ["legal-cl-619610008"],
    });
    expect(record.objective).toBe("Programa; cuidados");
  });

  it("rechaza montos y schemas incompatibles", () => {
    expect(() => normalizeTransferCsv(csv.replace("5623137440", "monto desconocido"), { sourceUrl: "x" })).toThrow("LEY_19862_INVALID_AMOUNT");
    expect(() => normalizeTransferCsv("FOLIO;OTRA_COLUMNA\n1;x", { sourceUrl: "x" })).toThrow("LEY_19862_INVALID_SCHEMA");
  });

  it("reintenta fallas de red y errores 5xx, pero no 4xx", async () => {
    let attempts = 0;
    const result = await fetchTransferMonth({
      year: 2025,
      month: 1,
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "EAI_AGAIN" } });
        if (attempts === 2) return new Response("", { status: 503 });
        return new Response(csv, { status: 200 });
      },
    });
    expect(attempts).toBe(3);
    expect(result.records).toHaveLength(1);

    await expect(fetchTransferMonth({
      year: 2025,
      month: 1,
      fetchImpl: async () => new Response("", { status: 404 }),
    })).rejects.toThrow("LEY_19862_HTTP_404");
  });
});
