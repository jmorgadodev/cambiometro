import { describe, expect, it, vi } from "vitest";
import api from "../workers/public-api/index";
import { parseRelationQuery } from "./api-v1";

function testEnv(transferRows = 59361) {
  const statement = (sql: string, bindings: unknown[] = []) => ({
    bind(...values: unknown[]) {
      return statement(sql, values);
    },
    async first<T>() {
      if (sql.includes("FROM transferencias_19862_release")) return { checksum_sha256: "release-checksum" } as T;
      if (sql.includes("FROM transferencias_19862")) return { total: transferRows } as T;
      if (sql.includes("FROM politicos")) return null;
      if (sql.includes("count(*)")) return { total: sql.includes("relations") ? 2 : sql.includes("records") ? 4 : 1 } as T;
      if (sql.includes("WHERE id = ?")) return bindings[0] === "no-existe" ? null : { id: bindings[0], kind: "person", name: "Persona de prueba", identifiers_json: "[]", attributes_json: "{}", source_ids_json: "[]" } as T;
      return null;
    },
    async all<T>() {
      if (sql.includes("FROM sources")) return { results: [{ id: "camara", status: "available" }] } as T;
      if (sql.includes("FROM records")) return { results: [{ id: "record-1", kind: "vote", source_id: "camara", title: "Votación", description: null, occurred_at: "2026-01-01", period_json: "{}", subject_entity_ids_json: "[]", object_entity_ids_json: "[]", amount_json: null, evidence_json: "{}", data_json: "{}" }, { id: "record-2", kind: "vote", source_id: "camara", title: "Votación 2", description: null, occurred_at: "2026-01-02", period_json: "{}", subject_entity_ids_json: "[]", object_entity_ids_json: "[]", amount_json: null, evidence_json: "{}", data_json: "{}" }] } as T;
      if (sql.includes("FROM relations")) return { results: [{ id: "relation-1", from_id: "person-1", predicate: "cast_vote", to_id: "record-1", evidence_record_ids_json: '["record-1"]', period_json: "{}", reconciliation_json: "{}" }] } as T;
      return { results: [] } as T;
    },
  });
  return { DB: { prepare: (sql: string) => statement(sql) } } as never;
}

const fetchApi = (url: string) => api.fetch(new Request(url), testEnv());

function transferR2Env() {
  const files: Record<string, unknown> = {
    "projections/transferencias-v1/manifest.json": {
      schemaVersion: 1,
      dataset: "ley-19862-transferencias",
      generatedAt: "2026-08-25T00:00:00.000Z",
      totalRows: 59361,
      pageSize: 50,
      totalPages: 1188,
      checksumSha256: "release-checksum",
      expected: { totalMontoClp: 5011094170302, totalReceptores: 14640, totalEmisores: 272 },
      pages: [
        { page: 1, count: 2, key: "projections/transferencias-v1/releases/release-checksum/p-0001.json" },
        ...Array.from({ length: 1187 }, (_, index) => ({
          page: index + 2,
          count: 50,
          key: `projections/transferencias-v1/releases/release-checksum/p-${String(index + 2).padStart(4, "0")}.json`,
        })),
      ],
      searchIndex: { key: "projections/transferencias-v1/releases/release-checksum/search-index.json", count: 59361 },
    },
    "projections/transferencias-v1/releases/release-checksum/p-0001.json": [
      { id: "tr-1", fecha: "2026-08-01", period: "2026", title: "Fondo educacional", emitter_name: "MINEDUC", receiver_name: "VIÑA BUS S.A.", monto_clp: 347920910, url: "https://registros19862.gob.cl/registro/tr-1" },
      { id: "tr-2", fecha: "2026-08-02", period: "2026", title: "Programa cultural", emitter_name: "MINEDUC", receiver_name: "Fundación Chile", monto_clp: 1000, url: "https://registros19862.gob.cl/registro/tr-2" },
    ],
    "projections/transferencias-v1/releases/release-checksum/search-index.json": [
      { i: 0, p: 1, y: "2026", d: "2026-08-01", e: "MINEDUC", r: "VIÑA BUS S.A.", t: "Fondo educacional", m: 347920910 },
      { i: 1, p: 1, y: "2026", d: "2026-08-02", e: "MINEDUC", r: "Fundación Chile", t: "Programa cultural", m: 1000 },
    ],
  };
  return {
    PUBLIC_DATA: {
      get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T },
    },
  } as never;
}

function officialsR2Env() {
  const files: Record<string, unknown> = {
    "projections/funcionarios-v1/manifest.json": {
      generatedAt: "2026-08-25T00:00:00.000Z",
      version: "2026-08-25",
      assets: [{ key: "projections/funcionarios-v1/versions/2026-08-25/muni-maipu.json" }],
    },
    "projections/funcionarios-v1/versions/2026-08-25/muni-maipu.json": [
      { id: "func-1", nombre_completo: "Claudio Adaros", cargo: "Analista", tipo_contrato: "Contrata", estamento: "Profesional", remuneracion_bruta_mensual: 5894314, url: "https://www.cplt.cl/" },
      { id: "func-2", nombre_completo: "Otra Persona", cargo: "Auxiliar", tipo_contrato: "Planta", estamento: "Auxiliar", remuneracion_bruta_mensual: 900000, url: "https://www.cplt.cl/" },
      { id: "func-3", nombre_completo: "Persona Laboral", cargo: "Administrativa", tipo_contrato: "Código del Trabajo", estamento: "Administrativo", remuneracion_bruta_mensual: 1200000, url: "https://www.cplt.cl/" },
    ],
  };
  return {
    PUBLIC_DATA: {
      get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T },
    },
  } as never;
}

describe("API canónica v1", () => {
  it("consulta el directorio nacional por páginas sin exigir muni", async () => {
    const files: Record<string, unknown> = {
      "projections/funcionarios-v1/manifest.json": {
        generatedAt: "2026-08-25T00:00:00.000Z",
        version: "2026-08-25",
        assets: [],
        searchIndex: { key: "projections/funcionarios-v1/versions/2026-08-25/search_index.json" },
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index.json": {
        schemaVersion: 1,
        totalRows: 1203287,
        pageSize: 2,
        pages: [{ page: 1, key: "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json", count: 2 }],
        shards: {},
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json": [
        { id: "func-1", n: "Claudio Adaros", c: "Analista", o: "Municipalidad de Maipú", t: "Contrata", e: "Profesional", b: 5894314 },
        { id: "func-2", n: "Otra Persona", c: "Auxiliar", o: "Municipalidad de Maipú", t: "Planta", e: "Auxiliar", b: 900000 },
      ],
    };
    const env = {
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;
    const response = await api.fetch(new Request("https://example.test/api/funcionarios?limit=2&include_zero=true"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(2);
    expect(payload.meta.totalHeadcount).toBe(1203287);
    expect(payload.meta.total).toBe(1203287);
  });

  it("usa R2 si D1 está temporalmente sin cuota de lectura", async () => {
    const files: Record<string, unknown> = {
      "projections/funcionarios-v1/manifest.json": {
        generatedAt: "2026-08-25T00:00:00.000Z",
        version: "2026-08-25",
        assets: [],
        searchIndex: { key: "projections/funcionarios-v1/versions/2026-08-25/search_index.json" },
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index.json": {
        schemaVersion: 1,
        totalRows: 1203287,
        pageSize: 2,
        pages: [{ page: 1, key: "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json", count: 2 }],
        shards: {},
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json": [
        { id: "func-1", n: "Claudio Adaros", c: "Analista", o: "Municipalidad de Maipú", t: "Contrata", e: "Profesional", b: 5894314 },
      ],
    };
    const statement = {
      bind() { return statement; },
      async first() { throw new Error("D1_ERROR: daily rows_read quota exceeded"); },
      async all() { throw new Error("D1_ERROR: daily rows_read quota exceeded"); },
    };
    const env = {
      DB: { prepare: () => statement },
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/funcionarios?limit=1&include_zero=true"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0].nombre_completo).toBe("Claudio Adaros");
    expect(payload.meta.totalHeadcount).toBe(1203287);
    expect(payload.meta.sourceStatus).toBe("r2-search");
  });

  it("prefiere el índice nacional de R2 antes de tocar D1", async () => {
    const files: Record<string, unknown> = {
      "projections/funcionarios-v1/manifest.json": {
        generatedAt: "2026-08-25T00:00:00.000Z",
        version: "2026-08-25",
        assets: [],
        searchIndex: { key: "projections/funcionarios-v1/versions/2026-08-25/search_index.json" },
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index.json": {
        schemaVersion: 1,
        totalRows: 1203287,
        pageSize: 2,
        pages: [{ page: 1, key: "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json", count: 1 }],
        shards: {},
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json": [
        { id: "func-1", n: "Claudio Adaros", c: "Analista", o: "Municipalidad de Maipú", t: "Contrata", e: "Profesional", b: 5894314 },
      ],
    };
    const env = {
      DB: { prepare: () => { throw new Error("D1 no debe consultarse cuando R2 está disponible"); } },
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/funcionarios?limit=1&include_zero=true"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0].nombre_completo).toBe("Claudio Adaros");
    expect(payload.meta.sourceStatus).toBe("r2-search");
  });

  it("mantiene el directorio consultable desde el catálogo R2 si D1 falla", async () => {
    const files: Record<string, unknown> = {
      "projections/static-site-v1/manifest.json": {
        schemaVersion: 1,
        dataset: "cambiometro-static-site-inputs",
        files: [{
          path: "data/catalog/entities-routes.json",
          key: "projections/static-site-v1/releases/catalog/data/catalog/entities-routes.json",
        }],
      },
      "projections/static-site-v1/releases/catalog/data/catalog/entities-routes.json": [
        { id: "person-1", kind: "person", name: "Ana Pérez", identifiers: [], attributes: { office: "Diputada" }, sourceIds: ["camara"] },
        { id: "municipality-1", kind: "municipality", name: "Municipalidad de Maipú", identifiers: [], attributes: {}, sourceIds: ["sinim"] },
      ],
    };
    const statement = {
      bind() { return statement; },
      async first() { throw new Error("D1_ERROR: daily rows_read quota exceeded"); },
      async all() { throw new Error("D1_ERROR: daily rows_read quota exceeded"); },
    };
    const env = {
      DB: { prepare: () => statement },
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/directorio?q=maipu&limit=1"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toMatchObject({ id: "municipality-1", name: "Municipalidad de Maipú" });
    expect(payload.meta).toMatchObject({ total: 1, limit: 1 });
  });

  it("mantiene la búsqueda del home disponible desde el catálogo R2", async () => {
    const env = {
      DB: { prepare: () => { throw new Error("D1 no debe consultarse para la búsqueda del catálogo"); } },
      PUBLIC_DATA: {
        get: async (key: string) => key === "projections/entities-v1/entities-routes.json"
          ? { json: async <T>() => [{ id: "person-1", kind: "person", name: "Vanessa Kaiser", attributes: { cargo: "Senadora" }, identifiers: [], sourceIds: [] }] as T }
          : null,
      },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/v1/search?q=Kaiser"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.autoridades[0]).toMatchObject({ nombre: "Vanessa Kaiser", type: "persona" });
    expect(payload.meta.sourceStatus).toBe("r2-catalog");
  });

  it("mantiene diputados y senadores buscables aunque D1 y el catálogo R2 no respondan", async () => {
    const env = {
      DB: { prepare: () => { throw new Error("D1_ERROR: daily rows_read quota exceeded"); } },
      PUBLIC_DATA: { get: async () => null },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/v1/search?q=Vanessa%20Kaiser"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.autoridades[0]).toMatchObject({
      id: "sen-038",
      nombre: "Vanessa Kaiser Barents-Von Hohenhagen",
      type: "persona",
      url: "/politico/vanessa-kaiser-barents-von-hohenhagen",
    });
  });

  it("no duplica una persona cuando existe en ambos catálogos", async () => {
    const files: Record<string, unknown> = {
      "projections/entities-v1/entities-routes.json": [
        { id: "person-camara-1110", kind: "person", name: "Carlos Bianchi Chelech", attributes: {}, identifiers: [], sourceIds: [] },
      ],
    };
    const env = {
      DB: { prepare: () => { throw new Error("D1_ERROR: daily rows_read quota exceeded"); } },
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/v1/search?q=Bianchi"), env);
    const payload = await response.json();
    const matches = payload.data.autoridades.filter((item: { nombre: string }) => item.nombre === "Carlos Bianchi Chelech");

    expect(response.status).toBe(200);
    expect(matches).toHaveLength(1);
    expect(matches[0].url).toBe("/politico/carlos-bianchi-chelech");
  });

  it("no propaga un error 1101 cuando una consulta histórica agota D1", async () => {
    const env = {
      DB: { prepare: () => { throw new Error("D1_ERROR: daily rows_read quota exceeded"); } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/v1/records?limit=1"), env);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ error: { code: "DATABASE_UNAVAILABLE" } });
  });

  it("filtra registros por las tablas normalizadas y no por LIKE sobre JSON", async () => {
    const prepared: string[] = [];
    const db = {
      prepare(sql: string) {
        prepared.push(sql);
        const statement = {
          bind() { return statement; },
          async first<T>() { return { total: 0 } as T; },
          async all<T>() { return { results: [] } as T; },
        };
        return statement;
      },
    };

    const response = await api.fetch(
      new Request("https://example.test/api/v1/records?entity_id=person-1&limit=10"),
      { DB: db } as never,
    );

    expect(response.status).toBe(200);
    expect(prepared.join("\n")).toContain("records.id IN");
    expect(prepared.join("\n")).toContain("FROM record_subjects");
    expect(prepared.join("\n")).toContain("FROM record_objects");
    expect(prepared.join("\n")).not.toContain("subject_entity_ids_json LIKE");
    expect(prepared.join("\n")).not.toContain("object_entity_ids_json LIKE");
  });

  it("sirve gastos operacionales desde el release R2 cuando D1 está agotado", async () => {
    const files: Record<string, unknown> = {
      "projections/static-site-v1/manifest.json": {
        files: [{ path: "data/lake-subsets/gastos-camara.subset.json", key: "releases/expenses/camara.json" }],
      },
      "releases/expenses/camara.json": {
        schemaVersion: 1,
        sourceId: "gastos_camara",
        generatedAt: "2026-09-02T00:00:00.000Z",
        recordCount: 1,
        records: [{
          id: "expense-1",
          diputado_id: "1009",
          nombre: "Diputado de prueba",
          fecha: "2026-08-01",
          periodo: "2026-08",
          item: "Traslado",
          monto_clp: 10000,
          url: "https://www.camara.cl/registro/expense-1",
          fuente: "Cámara de Diputados",
        }],
      },
    };
    const env = {
      DB: { prepare: () => { throw new Error("D1_ERROR: daily rows_read quota exceeded"); } },
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/v1/records?source=gastos_camara&limit=1"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta).toMatchObject({ total: 1, sourceBackend: "r2" });
    expect(payload.data[0]).toMatchObject({ id: "expense-1", kind: "expense", sourceId: "gastos_camara", title: "Traslado" });
  });

  it("pagina el universo nacional de forma continua aunque R2 use bloques físicos mayores", async () => {
    const files: Record<string, unknown> = {
      "projections/funcionarios-v1/manifest.json": {
        generatedAt: "2026-08-25T00:00:00.000Z",
        version: "2026-08-25",
        assets: [],
        searchIndex: { key: "projections/funcionarios-v1/versions/2026-08-25/search_index.json" },
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index.json": {
        schemaVersion: 1,
        totalRows: 6,
        pageSize: 3,
        pages: [
          { page: 1, key: "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json", count: 3 },
          { page: 2, key: "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0002.json", count: 3 },
        ],
        shards: {},
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json": [
        { id: "func-1", n: "Persona 1", b: 1 },
        { id: "func-2", n: "Persona 2", b: 2 },
        { id: "func-3", n: "Persona 3", b: 3 },
      ],
      "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0002.json": [
        { id: "func-4", n: "Persona 4", b: 4 },
        { id: "func-5", n: "Persona 5", b: 5 },
        { id: "func-6", n: "Persona 6", b: 6 },
      ],
    };
    const env = {
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/funcionarios?page=2&limit=2&include_zero=true&sortBy=nombre_asc"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.map((row: { id: string }) => row.id)).toEqual(["func-3", "func-4"]);
    expect(payload.meta).toMatchObject({ total: 6, page: 2, totalPages: 3, limit: 2 });
  });

  it("combina filtros nacionales usando índices de posiciones sin perder filas", async () => {
    const base = "projections/funcionarios-v1/versions/2026-08-25/search_index";
    const files: Record<string, unknown> = {
      "projections/funcionarios-v1/manifest.json": {
        generatedAt: "2026-08-25T00:00:00.000Z",
        version: "2026-08-25",
        assets: [],
        searchIndex: { key: `${base}.json` },
      },
      [`${base}.json`]: {
        schemaVersion: 1,
        totalRows: 6,
        pageSize: 3,
        pages: [
          { page: 1, key: `${base}/p-0001.json`, count: 3 },
          { page: 2, key: `${base}/p-0002.json`, count: 3 },
        ],
        shards: {},
        filters: {
          "contrato:planta": { key: `${base}/filter-planta.json`, count: 3 },
          "estamento:profesional": { key: `${base}/filter-profesional.json`, count: 4 },
          "cargo:alcalde": { key: `${base}/filter-alcalde.json`, count: 2 },
        },
      },
      [`${base}/p-0001.json`]: [
        { id: "func-1", n: "Persona 1", c: "Alcaldesa", t: "Planta", e: "Profesional", b: 1 },
        { id: "func-2", n: "Persona 2", t: "Contrata", e: "Profesional", b: 2 },
        { id: "func-3", n: "Persona 3", t: "Planta", e: "Auxiliar", b: 3 },
      ],
      [`${base}/p-0002.json`]: [
        { id: "func-4", n: "Persona 4", c: "Alcalde", t: "Planta", e: "Profesional", b: 4 },
        { id: "func-5", n: "Persona 5", t: "Contrata", e: "Profesional", b: 5 },
        { id: "func-6", n: "Persona 6", t: "Honorarios", e: "Auxiliar", b: 6 },
      ],
      [`${base}/filter-planta.json`]: [0, 2, 3],
      [`${base}/filter-profesional.json`]: [0, 1, 3, 4],
      [`${base}/filter-alcalde.json`]: [0, 3],
    };
    const env = {
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/funcionarios?contrato=Planta&estamento=Profesional&cargo=alcalde&page=1&limit=20&include_zero=true&sortBy=nombre_asc"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.map((row: { id: string }) => row.id)).toEqual(["func-1", "func-4"]);
    expect(payload.meta).toMatchObject({ total: 2, page: 1, totalPages: 1, limit: 20 });
  });

  it("consulta todos los fragmentos de un shard nacional dividido", async () => {
    const files: Record<string, unknown> = {
      "projections/funcionarios-v1/manifest.json": {
        generatedAt: "2026-08-25T00:00:00.000Z",
        version: "2026-08-25",
        assets: [],
        searchIndex: { key: "projections/funcionarios-v1/versions/2026-08-25/search_index.json" },
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index.json": {
        schemaVersion: 1,
        totalRows: 2,
        pageSize: 2,
        pages: [{ page: 1, key: "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json", count: 2 }],
        shards: {
          cl: [
            "projections/funcionarios-v1/versions/2026-08-25/search_index/cl-001.json",
            "projections/funcionarios-v1/versions/2026-08-25/search_index/cl-002.json",
          ],
        },
      },
      "projections/funcionarios-v1/versions/2026-08-25/search_index/p-0001.json": [
        { id: "func-1", n: "Claudio Adaros", c: "Analista", o: "Municipalidad de Maipú", b: 5894314 },
        { id: "func-2", n: "Claudia Araya", c: "Abogada", o: "Municipalidad de Maipú", b: 1900000 },
      ],
      "projections/funcionarios-v1/versions/2026-08-25/search_index/cl-001.json": [
        ["claudio", [0]],
      ],
      "projections/funcionarios-v1/versions/2026-08-25/search_index/cl-002.json": [
        ["claudia", [1]],
      ],
    };
    const env = {
      PUBLIC_DATA: { get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T } },
    } as never;
    const response = await api.fetch(new Request("https://example.test/api/funcionarios?query=Cla&include_zero=true&page=2&limit=1"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.map((row: { id: string }) => row.id)).toEqual(["func-2"]);
    expect(payload.meta).toMatchObject({ total: 2, page: 2, totalPages: 2, limit: 1 });
  });

  it("expone health 200 cuando el release R2 canónico está disponible", async () => {
    const env = { ...(testEnv() as object), ...(transferR2Env() as object), PREFER_TRANSFER_D1: "1", HEALTH_CHECK_D1: "1" } as never;
    const response = await api.fetch(new Request("https://example.test/api/v1/health"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.data).toMatchObject({ ok: true, d1: true, r2: true, transferRows: 59361, d1ReleaseChecksum: "release-checksum", transferSource: "d1" });
  });

  it("mantiene health operativo y marca D1 inconsistente cuando R2 tiene el release canónico", async () => {
    const env = { ...(testEnv(59360) as object), ...(transferR2Env() as object), HEALTH_CHECK_D1: "1" } as never;
    const response = await api.fetch(new Request("https://example.test/api/v1/health"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ ok: true, d1: true, r2: true, d1TransferRows: 59360, transferRows: 59361, d1Consistent: false, transferSource: "r2" });
  });

  it("no consulta el COUNT de transferencias en health por defecto", async () => {
    const prepare = vi.fn(() => {
      throw new Error("health no debe leer la tabla de transferencias");
    });
    const response = await api.fetch(new Request("https://example.test/api/v1/health"), {
      ...(transferR2Env() as object),
      DB: { prepare },
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ ok: true, d1: true, r2: true, d1TransferRows: 0, d1Consistent: false, transferSource: "r2" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("mantiene health operativo cuando la proyección D1 opcional aún no existe", async () => {
    const env = {
      ...(transferR2Env() as object),
      DB: {
        prepare: (sql: string) => {
          if (sql.includes("FROM transferencias_19862")) throw new Error("no such table: transferencias_19862");
          throw new Error(`Unexpected health query: ${sql}`);
        },
      },
    } as never;
    const response = await api.fetch(new Request("https://example.test/api/v1/health"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ ok: true, d1: true, r2: true, d1TransferRows: 0, d1Consistent: false, transferSource: "r2", transferRows: 59361 });
  });

  it("devuelve 503 estructurado cuando el manifest R2 está corrupto", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/health"), {
      ...(testEnv() as object),
      PUBLIC_DATA: { get: async () => ({ json: async () => { throw new Error("invalid json"); } }) },
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.data).toMatchObject({ ok: false, d1: true, r2: false, transferRows: 0 });
  });

  it("bloquea escrituras D1 en el perfil remoto de preview", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "informacion", email: "preview@example.test", descripcion: "Solicitud de prueba del preview." }),
    }), { ...(testEnv() as object), READ_ONLY_PREVIEW: "1" } as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "READ_ONLY_PREVIEW" } });
  });

  it("acepta entity_id como ancla bidireccional de relaciones", () => {
    expect(
      parseRelationQuery(
        "https://example.test/api/v1/relations?entity_id=person-camara-1002&limit=10",
      ),
    ).toMatchObject({
      entityId: "person-camara-1002",
      limit: 10,
    });
  });

  it("entrega fuentes en el contrato uniforme y sin conexiones sobredimensionadas", async () => {
    const response = await fetchApi("https://example.test/api/v1/sources");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveProperty("data");
    expect(payload).toHaveProperty("meta");
    expect(payload.links.self).toBe("https://example.test/api/v1/sources");
    expect(payload.data.some((source: { status: string }) => source.status === "connected")).toBe(false);
  });

  it("usa los conteos publicados y no escanea el histórico al listar fuentes", async () => {
    const prepared: string[] = [];
    const db = {
      prepare(sql: string) {
        prepared.push(sql);
        const statement = {
          bind() { return statement; },
          async all() { return { results: [] }; },
        };
        return statement;
      },
    };
    const response = await api.fetch(
      new Request("https://example.test/api/v1/sources"),
      { DB: db } as never,
    );

    expect(response.status).toBe(200);
    expect(prepared.some((sql) => /COUNT\(\*\).*FROM records/i.test(sql))).toBe(false);
    expect(prepared.some((sql) => /source_state\.record_count/i.test(sql))).toBe(true);
  });

  it("prefiere el inventario R2 y evita D1 cuando está publicado", async () => {
    const prepare = vi.fn(() => {
      throw new Error("D1 no debe consultarse para el inventario público");
    });
    const PUBLIC_DATA = {
      get: async (key: string) => {
        if (key === "projections/sources-v1/source-inventory.json") {
          return { json: async <T>() => ({ sources: [{ id: "chilecompra", label: "ChileCompra" }] }) as T };
        }
        if (key === "projections/sources-v1/source-health.json") {
          return { json: async <T>() => ({ sources: { chilecompra: { recordCount: 74142, status: "connected" } } }) as T };
        }
        return null;
      },
    };

    const response = await api.fetch(new Request("https://example.test/api/v1/sources"), { DB: { prepare }, PUBLIC_DATA } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({ id: "chilecompra", recordCount: 74142, status: "connected" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("sirve el catálogo de fuentes desde R2 si D1 agotó su cuota", async () => {
    const env = {
      DB: { prepare: () => { throw new Error("D1_ERROR: daily rows_read quota exceeded"); } },
      PUBLIC_DATA: {
        get: async (key: string) => {
          if (key === "projections/sources-v1/source-inventory.json") {
            return { json: async <T>() => ({ sources: [{ id: "camara", label: "Cámara", status: "partial" }] }) as T };
          }
          if (key === "projections/sources-v1/source-health.json") {
            return { json: async <T>() => ({ sources: { camara: { recordCount: 19025, status: "partial", generatedAt: "2026-08-21T00:00:00.000Z" } } }) as T };
          }
          return null;
        },
      },
    } as never;

    const response = await api.fetch(new Request("https://example.test/api/v1/sources"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data[0]).toMatchObject({ id: "camara", recordCount: 19025, status: "connected" });
  });

  it("filtra y pagina registros con un enlace next reproducible", async () => {
    const response = await fetchApi("https://example.test/api/v1/records?source=camara&kind=vote&limit=2");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(2);
    expect(payload.meta.limit).toBe(2);
    expect(payload.links.next).toContain("cursor=v1_");
  }, 20_000);

  it("prefiere el índice R2 para fuentes completas y evita consultar D1", async () => {
    const archive = JSON.stringify({
      id: "lobby-1",
      sourceId: "infolobby",
      kind: "lobby",
      occurredAt: "2026-08-01",
      evidence: { sourceUrl: "https://www.infolobby.cl/1" },
      data: { title: "Audiencia pública", subject_entity_ids: [], object_entity_ids: [] },
    }) + "\n";
    const manifest = {
      schemaVersion: 1,
      sourceId: "infolobby",
      totalRows: 1,
      pageSize: 1,
      recordArchiveKey: "indexes/v1/infolobby/archive.jsonl.gz",
      pages: [{ offset: 0, length: new TextEncoder().encode(archive).byteLength }],
    };
    const prepare = vi.fn(() => { throw new Error("D1 no debe consultarse para InfoLobby indexado"); });
    const PUBLIC_DATA = {
      get: async (key: string) => {
        if (key === "projections/static-site-v1/manifest.json") return { json: async <T>() => ({ files: [{ path: "placeholder", key: "placeholder" }] }) as T };
        if (key === "indexes/v1/infolobby/manifest.json") return { json: async <T>() => manifest as T };
        if (key === manifest.recordArchiveKey) return { arrayBuffer: async () => new TextEncoder().encode(archive).buffer };
        return null;
      },
    };

    const response = await api.fetch(new Request("https://example.test/api/v1/records?source=infolobby&limit=1"), { DB: { prepare }, PUBLIC_DATA } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta.sourceBackend).toBe("r2-lake");
    expect(payload.data[0].id).toBe("lobby-1");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("rechaza filtros inválidos con el error uniforme", async () => {
    const response = await fetchApi("https://example.test/api/v1/records?kind=delito");
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: {
        code: "INVALID_QUERY",
        message: "Parámetros de consulta inválidos.",
        details: { kind: "Valor no permitido: delito" },
      },
    });
  });

  it.each(["votaciones_senado", "gastos_camara", "gastos_senado"])("acepta la fuente ETL canónica %s", async (source) => {
    const response = await fetchApi(`https://example.test/api/v1/records?source=${source}&limit=2`);
    expect(response.status).toBe(200);
  });

  it("devuelve 404 uniforme para una entidad desconocida", async () => {
    const response = await fetchApi("https://example.test/api/v1/entities/no-existe");
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Entidad no encontrada.", details: { id: "no-existe" } },
    });
    expect(response.status).toBe(404);
  });

  it("expone relaciones y cruces con la misma cadena de evidencia", async () => {
    const relationsResponse = await fetchApi("https://example.test/api/v1/relations?predicate=cast_vote&limit=1");
    const relationPayload = await relationsResponse.json();
    const crossesResponse = await fetchApi("https://example.test/api/v1/crosses?predicate=cast_vote&limit=1");
    const crossesPayload = await crossesResponse.json();

    expect(relationPayload.data).toHaveLength(1);
    expect(crossesPayload.data).toHaveLength(1);
    expect(crossesPayload.data[0].relation.id).toBe(relationPayload.data[0].id);
    expect(crossesPayload.data[0].evidence[0].id).toBe(relationPayload.data[0].evidenceRecordIds[0]);
    expect(crossesPayload.data[0].relation.disclaimer).toContain("no implica irregularidad");
  });

  it("permite embeber fichas mediante CORS solamente de lectura", async () => {
    const request = new Request("https://example.test/api/v1/politico/dip-061");
    const response = await api.fetch(request, testEnv());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(payload.links.self).toBe(request.url);
  });

  it("usa el roster compacto si la tabla legacy de políticos no está disponible", async () => {
    const failingEnv = {
      DB: {
        prepare: () => ({
          bind: () => ({
            first: async () => { throw new Error("legacy table unavailable"); },
          }),
        }),
      },
    } as never;
    const response = await api.fetch(new Request("https://example.test/api/v1/politico/dip-061"), failingEnv);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe("dip-061");
  });

  it("acepta el preflight CORS del widget sin habilitar métodos de escritura", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/politico/dip-061", {
      method: "OPTIONS",
      headers: {
        Origin: "null",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "x-cambiometro-uptime-token",
      },
    }), testEnv());

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("X-Cambiometro-Uptime-Token");
  });

  it("sirve transferencias completas desde R2 cuando D1 está vacío", async () => {
    const request = new Request("https://example.test/api/v1/transferencias?page=1&limit=1&q=VIÑA");
    const response = await api.fetch(request, transferR2Env());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.total).toBe(1);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].receiver_name).toBe("VIÑA BUS S.A.");
    expect(payload.kpis.total_transfers).toBe(59361);
    expect(payload.sourceStatus).toBe("complete");
  });

  it("respeta limit y paginación lógica aunque R2 use chunks de 50 filas", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/transferencias?page=1&limit=1"), transferR2Env());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].id).toBe("tr-1");
    expect(payload.limit).toBe(1);
    expect(payload.totalPages).toBe(59361);
  });

  it("usa R2 como fuente pública por defecto sin consultar D1", async () => {
    const prepare = vi.fn(() => {
      throw new Error("D1 no debe consultarse en el camino público");
    });
    const response = await api.fetch(new Request("https://example.test/api/v1/transferencias?page=1&limit=1"), {
      ...(transferR2Env() as object),
      DB: { prepare },
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sourceStatus).toBe("complete");
    expect(payload.total).toBe(59361);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("mantiene D1 disponible sólo cuando se activa explícitamente", async () => {
    const response = await api.fetch(new Request("https://example.test/api/v1/transferencias?page=1&limit=1"), {
      ...(transferR2Env() as object),
      PREFER_TRANSFER_D1: "1",
      DB: {
        prepare: (sql: string) => ({
          bind() { return this; },
          async first<T>() {
            if (sql.includes("transferencias_19862_release")) return { checksum_sha256: "release-checksum" } as T;
            return { total: 59361 } as T;
          },
          async all<T>() { return { results: [{ id: "d1-1", fecha: "2026-08-01", periodo: "2026", emisor_nombre: "D1", receptor_nombre: "R", materia: "M", monto_clp: 1, url_registro: "https://registros19862.gob.cl/registro/d1-1" }] } as T; },
        }),
      },
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sourceStatus).toBe("d1");
    expect(payload.data[0].id).toBe("d1-1");
  });

  it("ignora D1 desactualizada y conserva el universo R2 como fuente coherente", async () => {
    const staleRow = {
      id: "stale-1",
      fecha: "2025-01-01",
      periodo: "2025",
      emisor_nombre: "D1 desactualizada",
      receptor_nombre: "D1 desactualizada",
      materia: "Dato antiguo",
      monto_clp: 1,
      clasificacion: "Antiguo",
      comuna: "Santiago",
    };
    const statement = (sql: string) => ({
      bind() { return this; },
      async first<T>() { return (sql.includes("COUNT") ? { total: 1 } : null) as T; },
      async all<T>() { return { results: [staleRow] } as T; },
    });
    const response = await api.fetch(new Request("https://example.test/api/v1/transferencias?page=1&limit=1"), {
      ...(transferR2Env() as object),
      DB: { prepare: (sql: string) => statement(sql) },
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sourceStatus).toBe("complete");
    expect(payload.total).toBe(59361);
    expect(payload.data[0].id).toBe("tr-1");
  });

  it("sirve y filtra funcionarios desde la proyección CPLT de R2", async () => {
    const request = new Request("https://example.test/api/funcionarios?muni=muni-maipu&query=Claudio&limit=10");
    const response = await api.fetch(request, officialsR2Env());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta.sourceStatus).toBe("r2");
    expect(payload.meta.total).toBe(1);
    expect(payload.data[0].nombre_completo).toBe("Claudio Adaros");
  });

  it("normaliza Código del Trabajo al aplicar el filtro contractual", async () => {
    const request = new Request("https://example.test/api/funcionarios?muni=muni-maipu&contrato=CodigoTrabajo&include_zero=true&limit=10");
    const response = await api.fetch(request, officialsR2Env());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(1);
    expect(payload.data[0].id).toBe("func-3");
  });

  it("ofrece la descarga segmentada del bloque consultado", async () => {
    const request = new Request("https://example.test/api/v1/export?dataset=funcionarios&format=csv&muni=muni-maipu&page=1&limit=2");
    const response = await api.fetch(request, officialsR2Env());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(body).toContain("nombre_completo");
    expect(body).toContain("Claudio Adaros");
  });

  it("sirve la descarga segmentada desde R2 sin consultar D1 cuando el índice está disponible", async () => {
    const prepare = vi.fn(() => { throw new Error("D1 no debe consultarse para exportar el directorio"); });
    const response = await api.fetch(new Request("https://example.test/api/v1/export?dataset=funcionarios&format=json&muni=muni-maipu&page=1&limit=2"), {
      ...(officialsR2Env() as object),
      DB: { prepare },
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.meta.export).toBe("segmentada");
    expect(prepare).not.toHaveBeenCalled();
  });
});
