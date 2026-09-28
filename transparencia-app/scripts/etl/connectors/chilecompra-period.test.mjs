import { describe, expect, it } from "vitest";
import { selectChileCompraPeriod } from "../chilecompra-period.mjs";

const catalog = (publishedPeriods = ["2026-06"]) => ({
  sources: [{ id: "chilecompra", foundPeriods: ["2026-06", "2026-07"] }],
  partitions: publishedPeriods.map((period) => ({ sourceId: "chilecompra", period })),
});

function monthFetch(counts, invalid = false) {
  return async (url) => {
    const parsed = new URL(url);
    const [, , , type, year, month] = parsed.pathname.split("/");
    if (invalid && month === "08" && type.includes("TratoDirecto")) {
      return { ok: true, status: 200, json: async () => ({ data: [] }) };
    }
    const total = counts[`${year}-${month}`]?.[type] ?? 0;
    return {
      ok: true,
      status: 200,
      json: async () => total > 0
        ? { pagination: { total }, data: [{ ocid: "sample" }] }
        : { status: 404, detail: "No se encontraron resultados." },
    };
  };
}

describe("selección segura del período ChileCompra", () => {
  it("retrocede desde meses aún no publicados y elige julio detectado pero no publicado", async () => {
    const result = await selectChileCompraPeriod({
      catalog: catalog(),
      currentPeriod: "2026-09",
      fetchImpl: monthFetch({
        "2026-07": {
          listaOCDSAgnoMes: 8004,
          listaOCDSAgnoMesTratoDirecto: 9361,
          listaOCDSAgnoMesConvenio: 17364,
        },
      }),
    });

    expect(result).toEqual({
      period: "2026-07",
      listingCounts: {
        licitacion: 8004,
        trato_directo: 9361,
        convenio_marco: 17364,
      },
    });
  });

  it("prefiere el mes actual cuando ya hay datos nuevos para refrescarlo", async () => {
    const result = await selectChileCompraPeriod({
      catalog: catalog(["2026-06", "2026-09"]),
      currentPeriod: "2026-09",
      fetchImpl: monthFetch({
        "2026-09": {
          listaOCDSAgnoMes: 1,
          listaOCDSAgnoMesTratoDirecto: 0,
          listaOCDSAgnoMesConvenio: 0,
        },
      }),
    });

    expect(result).toEqual({
      period: "2026-09",
      listingCounts: { licitacion: 1, trato_directo: 0, convenio_marco: 0 },
    });
  });

  it("no reingiere períodos cerrados ya publicados cuando los actuales están vacíos", async () => {
    await expect(selectChileCompraPeriod({
      catalog: catalog(["2026-06", "2026-07"]),
      currentPeriod: "2026-09",
      fetchImpl: monthFetch({
        "2026-07": {
          listaOCDSAgnoMes: 8004,
          listaOCDSAgnoMesTratoDirecto: 9361,
          listaOCDSAgnoMesConvenio: 17364,
        },
      }),
    })).resolves.toBeNull();
  });

  it("falla ante una respuesta inválida en vez de declarar un mes vacío", async () => {
    await expect(selectChileCompraPeriod({
      catalog: catalog(),
      currentPeriod: "2026-09",
      fetchImpl: monthFetch({}, true),
    })).rejects.toThrow("CHILECOMPRA_PERIOD_PROBE_INVALID_SCHEMA");
  });

  it("falla si el origen declara registros pero entrega una primera página vacía", async () => {
    await expect(selectChileCompraPeriod({
      catalog: catalog(),
      currentPeriod: "2026-09",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ pagination: { total: 7 }, data: [] }),
      }),
    })).rejects.toThrow("CHILECOMPRA_PERIOD_PROBE_INVALID_COUNT");
  });
});
