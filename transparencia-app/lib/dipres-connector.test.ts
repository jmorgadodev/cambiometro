import { describe, expect, it } from "vitest";
import { auditDipresHierarchy, decodeDipresCsv, extractDipresBudgetYears, extractDipresExecutionAssets, fetchDipresExecution, fetchDipresExecutions, normalizeDipresRows, parseDelimited, parseThousandsClp } from "../scripts/etl/connectors/dipres.mjs";

describe("conector DIPRES", () => {
  it("descubre el CSV en pesos y asigna el período explícito", () => {
    const html = `<p class="titulo aid-422424 cid-22">Informe Ejecución Segundo Trimestre [Pesos]</p><div class="aid-422424 binary-doc_xml"><a href="articles-422424_doc_xml.xml">XML</a></div><div class="aid-422424 binary-doc_csv"><a href="articles-422424_doc_csv.csv">CSV</a></div><p class="titulo aid-422425 cid-22">Informe Ejecución Segundo Trimestre [Dólares]</p>`;
    expect(extractDipresExecutionAssets(html, 2026)[0]).toMatchObject({ id: "422424", period: "2026-06", month: 6, csvUrl: "https://www.dipres.gob.cl/597/articles-422424_doc_csv.csv" });
  });

  it("descubre el archivo oficial por año y reconoce meses nombrados directamente", () => {
    const archive = `<li><a class="pvid-37782" href="w3-multipropertyvalues-15199-37782.html" title="Ir a 2026">2026</a></li><li><a class="pvid-25771" href="w3-multipropertyvalues-15199-25771.html" title="Ir a 2021">2021</a></li>`;
    expect(extractDipresBudgetYears(archive)).toEqual([
      { year: 2021, id: "25771", budgetUrl: "https://www.dipres.gob.cl/597/w3-multipropertyvalues-15199-25771.html" },
      { year: 2026, id: "37782", budgetUrl: "https://www.dipres.gob.cl/597/w3-multipropertyvalues-15199-37782.html" },
    ]);

    const execution = `<p class="titulo aid-1">Informe Ejecución a Junio [Pesos]</p><a href="articles-1_doc_csv.csv">CSV</a><p class="titulo aid-2">Informe Ejecución a Septiembre [Pesos]</p><a href="articles-2_doc_csv.csv">CSV</a>`;
    expect(extractDipresExecutionAssets(execution, 2021).map((asset) => asset.month)).toEqual([6, 9]);
  });

  it("sigue la ruta histórica oficial aunque DIPRES invierta los identificadores", async () => {
    const archive = `<a class="pvid-37782" href="w3-multipropertyvalues-15199-37782.html" title="Ir a 2026">2026</a><a class="pvid-25771" href="w3-multipropertyvalues-15199-25771.html" title="Ir a 2021">2021</a>`;
    const budget = `<a href="w3-multipropertyvalues-25771-25910.html" title="Ir a Ejecución Total">Ejecución Total</a>`;
    const execution = `<p class="titulo aid-264044">Informe Ejecución a Diciembre [Pesos]</p><a href="articles-264044_doc_csv.csv">CSV</a>`;
    const csv = "Partida;Capítulo;Programa;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada\n1;1;1;APORTE;1;1;1\n";
    const requested: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);
      requested.push(url);
      if (url.endsWith("15199-25771.html")) return new Response(budget);
      if (url.endsWith("25771-25910.html")) return new Response(execution);
      if (url.endsWith("articles-264044_doc_csv.csv")) return new Response(Buffer.from(csv, "latin1"));
      return new Response(archive);
    };
    const results = await fetchDipresExecutions({ year: 2021, fetchImpl });
    expect(results.map((result) => result.period)).toEqual(["2021-12"]);
    expect(requested).toEqual([
      "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25910-37782.html",
      "https://www.dipres.gob.cl/597/w3-multipropertyvalues-15199-25771.html",
      "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25771-25910.html",
      "https://www.dipres.gob.cl/597/articles-264044_doc_csv.csv",
    ]);
  });

  it("interpreta CSV separado por punto y coma y convierte miles de pesos a CLP", () => {
    const rows = parseDelimited("Partida;Capítulo;Programa;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada a Mayo\r\n1;1;1;APORTE;22.829.774;22.572.715;12.809.860\r\n");
    const records = normalizeDipresRows(rows, { id: "1", year: 2026, month: 5, period: "2026-05", title: "Mayo", csvUrl: "https://dipres.gob.cl/real.csv", xmlUrl: null });
    expect(records[0]).toMatchObject({
      id: "dipres-2026-05-1-1-1-0-0-0-p", classification_level: "program", budget_side: null,
      presupuesto_inicial_clp: 22_829_774_000, presupuesto_vigente_clp: 22_572_715_000, ejecucion_acumulada_clp: 12_809_860_000,
      subject_entity_ids: ["public-body-dipres-program-2026-1-1-1"], summable: false,
    });
    expect(parseThousandsClp("0")).toBe(0);
    expect(parseThousandsClp("1,36187E+11")).toBe(136_187_000_000_000);
    expect(() => parseThousandsClp("no informado")).toThrow("INVALID_DIPRES_AMOUNT");
  });

  it("detecta CSV UTF-8 con BOM sin corromper sus encabezados", () => {
    const bytes = Buffer.from(`\uFEFFPartida;Capítulo;Denominación\n01;01;Ejecución\n`, "utf8");
    expect(parseDelimited(decodeDipresCsv(bytes))[0]).toEqual({ Partida: "01", Capítulo: "01", Denominación: "Ejecución" });
  });

  it("atribuye RESULTADO al programa precedente y distingue agregados de hojas sumables", () => {
    const rows = parseDelimited("Partida;Capítulo;Programa;Subtítulo;ítem;Asignación;Moneda;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada a Junio\n1;2;3;21;;;P;GASTOS EN PERSONAL;100;120;50\n1;2;3;21;1;;P;PERSONAL DE PLANTA;100;120;50\n;;;;;;P;RESULTADO;;;70\n");
    const records = normalizeDipresRows(rows, { id: "1", year: 2026, month: 6, period: "2026-06", title: "Junio", csvUrl: "https://dipres.gob.cl/real.csv", xmlUrl: null });
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ classification_level: "subtitle", budget_side: "expenditure", is_aggregate: true, summable: false });
    expect(records[1]).toMatchObject({ classification_level: "item", budget_side: "expenditure", is_aggregate: false, summable: true });
    expect(records[2]).toMatchObject({ id: "dipres-2026-06-1-2-3-result-p", classification_level: "program_result", budget_side: "balance", summable: false, ejecucion_acumulada_clp: 70_000 });
    expect(auditDipresHierarchy(records)).toMatchObject({ comparedAggregates: 1, mismatchCount: 0, discrepancies: [] });
  });

  it("conserva variantes oficiales de un código duplicado sin duplicar el total", () => {
    const rows = parseDelimited("Partida;Capítulo;Programa;Subtítulo;ítem;Asignación;Moneda;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada\n50;01;04;28;04;103;P;Ciencia y Tecnología;0;10;0\n50;01;04;28;04;103;P;Subsecretaría de Seguridad Pública;0;10;0\n");
    const records = normalizeDipresRows(rows, { id: "1", year: 2025, month: 12, period: "2025-12", title: "Diciembre", csvUrl: "https://dipres.gob.cl/real.csv", xmlUrl: null });
    expect(new Set(records.map((record) => record.id)).size).toBe(2);
    expect(records.filter((record) => record.summable)).toHaveLength(1);
    expect(records.filter((record) => record.source_duplicate)).toHaveLength(1);
    expect(records.find((record) => record.source_duplicate)?.duplicate_of_record_id).toBe(records.find((record) => record.summable)?.id);
  });

  it("repara una denominación oficial con punto y coma sin desplazar los montos", () => {
    const rows = parseDelimited("Partida;Capítulo;Programa;Subtítulo;Item;Asignación;Moneda;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada;\n5;73;2;33;1;423;P;Piloto; Techos verdes;0;40000;40000\n");
    const [record] = normalizeDipresRows(rows, { id: "1", year: 2021, month: 12, period: "2021-12", title: "Diciembre", csvUrl: "https://dipres.gob.cl/real.csv", xmlUrl: null });
    expect(record).toMatchObject({
      denominacion: "Piloto; Techos verdes", presupuesto_inicial_clp: 0, presupuesto_vigente_clp: 40_000_000,
      ejecucion_acumulada_clp: 40_000_000, source_schema_repair: "unquoted_semicolon_in_denomination",
    });

    const rowsWithoutTrailingColumn = parseDelimited("Partida;Capítulo;Programa;Subtítulo;Item;Asignación;Moneda;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada\n5;73;2;33;1;423;P;Piloto; Techos verdes;0;40000;0\n");
    expect(rowsWithoutTrailingColumn[0].__extra_fields).toEqual(["0"]);
    const [november] = normalizeDipresRows(rowsWithoutTrailingColumn, { id: "2", year: 2021, month: 11, period: "2021-11", title: "Noviembre", csvUrl: "https://dipres.gob.cl/real.csv", xmlUrl: null });
    expect(november).toMatchObject({ denominacion: "Piloto; Techos verdes", presupuesto_inicial_clp: 0, presupuesto_vigente_clp: 40_000_000, ejecucion_acumulada_clp: 0, source_schema_repair: "unquoted_semicolon_in_denomination" });
  });

  it("descarga todos los períodos publicados sin repetir el índice", async () => {
    const html = `<p class="titulo aid-1">Informe Ejecución Enero [Pesos]</p><a href="articles-1_doc_csv.csv">CSV</a><p class="titulo aid-2">Informe Ejecución Febrero [Pesos]</p><a href="articles-2_doc_csv.csv">CSV</a>`;
    const csv = "Partida;Capítulo;Programa;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada\n1;1;1;APORTE;1;1;1\n";
    let indexCalls = 0;
    const fetchImpl = async (input: string | URL | Request) => { if (String(input).includes("multipropertyvalues")) indexCalls += 1; return new Response(String(input).includes("multipropertyvalues") ? html : Buffer.from(csv, "latin1")); };
    const results = await fetchDipresExecutions({ year: 2026, fetchImpl });
    expect(results.map((result) => result.period)).toEqual(["2026-01", "2026-02"]);
    expect(indexCalls).toBe(1);
  });

  it("selecciona el último período realmente publicado cuando no se indica mes", async () => {
    const html = `<p class="titulo aid-1">Informe Ejecución Abril [Pesos]</p><a href="articles-1_doc_csv.csv">CSV</a><p class="titulo aid-2">Informe Ejecución Segundo Trimestre [Pesos]</p><a href="articles-2_doc_csv.csv">CSV</a>`;
    const csv = "Partida;Capítulo;Programa;Denominación;Presupuesto Inicial;Presupuesto Vigente;Ejecución Acumulada a Junio\n1;1;1;APORTE;1;1;1\n";
    const fetchImpl = async (input: string | URL | Request) => new Response(String(input).includes("multipropertyvalues") ? html : Buffer.from(csv, "latin1"), { status: 200 });
    const result = await fetchDipresExecution({ year: 2026, fetchImpl });
    expect(result.period).toBe("2026-06");
    expect(result.month).toBe(6);
  });
});
