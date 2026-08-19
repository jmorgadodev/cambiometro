import { describe, expect, it } from "vitest";
import * as XLSX from "@e965/xlsx";
import { zipSync } from "fflate";
import {
  aggregateServelRecords,
  fetchServelPreliminaryResults,
  normalizeServelRow,
  parseServelWorkbook,
} from "../scripts/etl/connectors/servel.mjs";

const officialHeaders = [
  "region", "circunscripcion_senatorial", "distrito", "comuna",
  "cod_local_votacion", "local_votacion", "cod_colegio_escrutador",
  "colegio_escrutador", "sede_colegio_escrutador", "incidencia_mesa",
  "cod_mesa", "electores", "mesa", "letra_pacto", "pacto", "subpacto",
  "partido", "nro_en_voto", "cod_candidato", "nombre_candidato",
  "votos_preliminares", "electo_nominado", "vocales", "form_40",
];

const officialRow = {
  region: "DE AYSEN DEL GENERAL CARLOS IBAÑEZ DEL CAMPO",
  circunscripcion_senatorial: "CIRCUNSCRIPCIÓN SENATORIAL 14",
  distrito: "DISTRITO 27",
  comuna: "AYSEN",
  cod_local_votacion: 10172111,
  local_votacion: "ESCUELA POETISA GABRIELA MISTRAL",
  cod_colegio_escrutador: 1102,
  colegio_escrutador: "CENTRO CULTURAL",
  sede_colegio_escrutador: "AYSEN",
  incidencia_mesa: null,
  cod_mesa: 749100001,
  electores: 400,
  mesa: 1,
  letra_pacto: "C",
  pacto: "UNIDAD POR CHILE",
  subpacto: null,
  partido: "PARTIDO POR LA DEMOCRACIA",
  nro_en_voto: 13,
  cod_candidato: 55014013,
  nombre_candidato: "XIMENA ORDENES NEIRA",
  votos_preliminares: 29,
  electo_nominado: 1,
  vocales: 3,
  form_40: "749100001_S_05_ACTAMESA_00001.TIFF",
};

function workbookBytes(rows = [officialRow], headers = officialHeaders) {
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map((row) => headers.map((header) => row[header as keyof typeof officialRow] ?? null)),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("conector de resultados preliminares SERVEL", () => {
  it("normaliza votos por códigos oficiales sin enlazar por nombre", () => {
    expect(normalizeServelRow(officialRow, {
      contest: "senators",
      sourceUrl: "https://www.servel.cl/oficial.zip",
      workbookName: "senadores-14.xlsx",
    })).toMatchObject({
      id: "servel-2025-senators-749100001-55014013",
      fecha: "2025-11-16",
      kind: "vote",
      status: "preliminary",
      votes: 29,
      candidate: {
        entity_id: "servel-candidate-55014013",
        official_id: "55014013",
        name: "XIMENA ORDENES NEIRA",
      },
      subject_entity_ids: ["servel-candidate-55014013"],
      object_entity_ids: [],
      reconciliation_method: "official_servel_candidate_code",
      evidence_locator: "749100001_S_05_ACTAMESA_00001.TIFF",
    });
  });

  it("conserva resultados del exterior y totales de papeleta sin inventar personas", () => {
    const row = {
      continente: "ASIA", pais: "VIETNAM", consulado: "CONSULADO HANOI", circunscripcion: "HANOI",
      cod_local_votacion: 20020126, local_votacion: "CONSULADO - HANOI",
      cod_colegio_escrutador: 20002, colegio_escrutador: "ESTABLECIMIENTO ESPECIAL 2",
      incidencia_mesa: null, cod_mesa: 912100001, mesa: 1, electores: 42,
      letra_pacto: null, pacto: null, subpacto: null, partido: null,
      nro_en_voto: 900, cod_candidato: null, nombre_candidato: "Votos Nulos",
      votos: 2, vocales: 3, form_40: "912100001_P_04_ACTAMESA_00001.TIFF",
    };
    expect(normalizeServelRow(row, { contest: "president", sourceUrl: "https://www.servel.cl/oficial.zip", workbookName: "exterior.xlsx" })).toMatchObject({
      id: "servel-2025-president-912100001-option-900",
      votes: 2,
      candidate: null,
      subject_entity_ids: [],
      geography: { continent: "ASIA", country: "VIETNAM", consulate: "CONSULADO HANOI" },
      reconciliation_method: "official_servel_ballot_summary_code",
    });
  });

  it("preserva códigos oficiales de nominación distintos de un booleano", () => {
    expect(normalizeServelRow({ ...officialRow, electo_nominado: 3 }, {
      contest: "president", sourceUrl: "https://www.servel.cl/oficial.zip", workbookName: "presidente.xlsx",
    })).toMatchObject({ nominated_elected: true, nomination_status_code: 3 });
  });

  it("lee el esquema oficial de 24 columnas y rechaza cambios incompatibles", () => {
    expect(parseServelWorkbook(workbookBytes(), {
      contest: "senators", sourceUrl: "https://www.servel.cl/oficial.zip", workbookName: "fixture.xlsx",
    })).toHaveLength(1);
    expect(() => parseServelWorkbook(workbookBytes([officialRow], officialHeaders.slice(0, -1)), {
      contest: "senators", sourceUrl: "https://www.servel.cl/oficial.zip", workbookName: "invalido.xlsx",
    })).toThrow("SERVEL_INVALID_HEADERS");
  });

  it("reduce las mesas a una proyección cruzable por candidatura y comuna", () => {
    const first = normalizeServelRow(officialRow, { contest: "senators", sourceUrl: "https://www.servel.cl/oficial.zip", workbookName: "fixture.xlsx" });
    const second = normalizeServelRow({ ...officialRow, cod_mesa: 749100002, votos_preliminares: 11 }, { contest: "senators", sourceUrl: "https://www.servel.cl/oficial.zip", workbookName: "fixture.xlsx" });
    expect(aggregateServelRecords([first, second])).toMatchObject([{
      votes: 40,
      tables_reported: 2,
      polling_places_reported: 1,
      official_forms_count: 1,
      electors: 800,
      aggregation: { operation: "sum_votes_and_distinct_official_table_codes" },
    }]);
  });

  it("rechaza duplicados de candidatura y mesa antes de alterar totales", () => {
    const record = normalizeServelRow(officialRow, { contest: "senators", sourceUrl: "https://www.servel.cl/oficial.zip", workbookName: "fixture.xlsx" });
    expect(() => aggregateServelRecords([record, record])).toThrow("SERVEL_DUPLICATE_TABLE_CANDIDATE");
  });

  it("descarga ZIP, conserva checksum del original y agrega todos los XLSX", async () => {
    const zipped = zipSync({
      "circunscripcion-14.xlsx": workbookBytes(),
      "circunscripcion-1.xlsx": workbookBytes([{ ...officialRow, cod_mesa: 749100002, cod_candidato: 55014012 }]),
    });
    const result = await fetchServelPreliminaryResults({
      contest: "senators",
      url: "https://www.servel.cl/oficial.zip",
      fetchImpl: async () => new Response(zipped),
    });
    expect(result.records).toHaveLength(2);
    expect(result.original).toMatchObject({
      name: "PRELIMINARES_SENADORES_CIRCUNSCRIPCION.zip",
      redistributable: false,
      size: zipped.byteLength,
    });
    expect(result.original.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falla explícitamente ante fuente caída y no inventa datos", async () => {
    await expect(fetchServelPreliminaryResults({
      contest: "senators",
      url: "https://www.servel.cl/oficial.zip",
      fetchImpl: async () => new Response("caído", { status: 503 }),
    })).rejects.toThrow("SERVEL_HTTP_503");
  });

  it("corta descargas sin Content-Length que superan el límite", async () => {
    await expect(fetchServelPreliminaryResults({
      contest: "senators",
      url: "https://www.servel.cl/oficial.zip",
      maxDownloadBytes: 5,
      fetchImpl: async () => new Response("123456"),
    })).rejects.toThrow("SERVEL_DOWNLOAD_TOO_LARGE");
  });
});
