import { describe, expect, it } from "vitest";
import { buildSenateExpenseUrl, discoverLatestSenateExpensePeriod, fetchSenateOperationalExpenses, normalizeSenateDiet, normalizeSenateDomesticTicket, normalizeSenateExpense, normalizeSenateForeignMission } from "../scripts/etl/connectors/senado.mjs";

function item(id: number, amount: number | null = 1_200_000) {
  return { id, attributes: { ano: 2026, mes: 5, gastos_operacionales: "ARRIENDO OFICINAS", monto: amount, unidad_ejecutora: 77, appaterno: "CASTRO", apmaterno: "GONZALEZ", nombre: "JUAN LUIS", publishedAt: "2026-08-03T13:30:39.252Z" } };
}

describe("conector de gastos operacionales del Senado", () => {
  it("construye filtros y paginación oficiales", () => {
    const url = new URL(buildSenateExpenseUrl(2026, 5, 3));
    expect(url.searchParams.get("filters[ano][$eq]")).toBe("2026");
    expect(url.searchParams.get("filters[mes][$eq]")).toBe("5");
    expect(url.searchParams.get("pagination[page]")).toBe("3");
    expect(url.searchParams.get("pagination[pageSize]")).toBe("500");
  });

  it("normaliza monto CLP y concilia por identificador interno, nunca por nombre", () => {
    expect(normalizeSenateExpense(item(3285724), { sourceUrl: "https://web-back.senado.cl/api/official" })).toMatchObject({
      id: "senado-operational-expense-3285724",
      fecha: "2026-05-01",
      kind: "expense",
      monto_clp: 1_200_000,
      person: { entity_id: "senator-cl-ue-77", official_id: "77", name: "JUAN LUIS CASTRO GONZALEZ" },
      subject_entity_ids: ["senator-cl-ue-77"],
      reconciliation_method: "official_senate_executor_id",
    });
    expect(normalizeSenateExpense(item(2, null), { sourceUrl: "x" })).toMatchObject({ monto_clp: null, availability: "not_reported" });
  });

  it("descubre el último período y recorre todas las páginas sin límite artificial", async () => {
    const period = await discoverLatestSenateExpensePeriod({ fetchImpl: async () => Response.json({ data: { data: [{ attributes: { ano: 2025, mes: 12 } }, { attributes: { ano: 2026, mes: 5 } }] } }) });
    expect(period).toEqual({ year: 2026, month: 5 });
    const calls: string[] = [];
    const result = await fetchSenateOperationalExpenses({
      year: 2026,
      month: 5,
      fetchImpl: async (input) => {
        const url = String(input);
        calls.push(url);
        const page = Number(new URL(url).searchParams.get("pagination[page]"));
        return Response.json({ data: { data: [item(page)], meta: { pagination: { page, pageSize: 500, pageCount: 2, total: 2 } } } });
      },
    });
    expect(calls).toHaveLength(2);
    expect(result.records).toHaveLength(2);
  });

  it("descarta filas repetidas cuando la paginacion inestable repite un ID oficial", async () => {
    const result = await fetchSenateOperationalExpenses({
      year: 2026,
      month: 5,
      fetchImpl: async (input) => {
        const page = Number(new URL(String(input)).searchParams.get("pagination[page]"));
        return Response.json({ data: { data: [item(77)], meta: { pagination: { page, pageSize: 500, pageCount: 2, total: 2 } } } });
      },
    });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe("senado-operational-expense-77");
  });

  it("rechaza montos inválidos y respuestas incompatibles", async () => {
    expect(() => normalizeSenateExpense(item(1, -1), { sourceUrl: "x" })).toThrow("SENADO_INVALID_AMOUNT");
    await expect(fetchSenateOperationalExpenses({ year: 2026, month: 5, fetchImpl: async () => Response.json({ data: {} }) })).rejects.toThrow("SENADO_INVALID_RESPONSE_SCHEMA");
  });

  it("publica dieta sin RUT personal y valida la identidad contable", () => {
    const record = normalizeSenateDiet({ id: 160055, attributes: { ano: 2026, mes: 5, rut: "12.615.234-5", unidad_ejecutora: 39, appaterno: "ARAYA", apmaterno: "GUERRERO", nombre: "PEDRO", dieta: 8_239_091, deducciones: 1_754_897, saldo: 6_484_194 } }, { sourceUrl: "x" });
    expect(record).toMatchObject({ kind: "remuneration", monto_clp: 8_239_091, deductions_clp: 1_754_897, net_clp: 6_484_194, subject_entity_ids: ["senator-cl-ue-39"] });
    expect(JSON.stringify(record)).not.toContain("12615234");
    expect(() => normalizeSenateDiet({ id: 1, attributes: { ano: 2026, mes: 5, unidad_ejecutora: 39, nombre: "A", dieta: 10, deducciones: 3, saldo: 8 } }, { sourceUrl: "x" })).toThrow("SENADO_INVALID_DIET_TOTALS");
  });

  it("concilia pasajes por ID y deja misiones sin relación cuando el API sólo trae nombre", () => {
    const ticket = normalizeSenateDomesticTicket({ id: 228093, attributes: { ano: 2025, mes: 8, estado: 1, unidad_ejecutora: 65, appaterno: "ARAVENA", apmaterno: "ACUÑA", nombre: "CARMEN GLORIA", origendestino: "ZCO:SCL:ZCO", fecha: "2025-08-03" } }, { sourceUrl: "x" });
    expect(ticket).toMatchObject({ kind: "expense", route: "ZCO:SCL:ZCO", monto_clp: null, subject_entity_ids: ["senator-cl-ue-65"] });
    expect(JSON.stringify(ticket)).not.toMatch(/usuario|192\.168/);
    const mission = normalizeSenateForeignMission({ id: 19862, attributes: { ano: 2026, mes: 2, appaterno: "CARVAJAL", apmaterno: "AMBIADO", nombre: "MARIALORETO", destino: "EE.UU.", fecha_ida: "2026-02-11", fecha_regreso: "2026-02-14", objeto: "UNIÓN INTERPARLAMENTARIA", monto: "2041403" } }, { sourceUrl: "x" });
    expect(mission).toMatchObject({ monto_clp: 2_041_403, subject_entity_ids: [], reconciliation_method: "unlinked_no_official_identifier" });
  });
});
