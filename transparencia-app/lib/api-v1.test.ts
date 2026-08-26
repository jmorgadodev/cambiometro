import { describe, expect, it } from "vitest";
import api from "../workers/public-api/index";
import { parseRelationQuery } from "./api-v1";

function testEnv(transferRows = 59361) {
  const statement = (sql: string, bindings: unknown[] = []) => ({
    bind(...values: unknown[]) {
      return statement(sql, values);
    },
    async first<T>() {
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
    ],
  };
  return {
    PUBLIC_DATA: {
      get: async (key: string) => files[key] === undefined ? null : { json: async <T>() => files[key] as T },
    },
  } as never;
}

describe("API canónica v1", () => {
  it("expone health 200 sólo cuando D1 y el release R2 están disponibles", async () => {
    const env = { ...(testEnv() as object), ...(transferR2Env() as object) } as never;
    const response = await api.fetch(new Request("https://example.test/api/v1/health"), env);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({ ok: true, d1: true, r2: true, transferRows: 59361 });
  });

  it("mantiene health en 503 cuando D1 y el manifest R2 no comparten universo", async () => {
    const env = { ...(testEnv(59360) as object), ...(transferR2Env() as object) } as never;
    const response = await api.fetch(new Request("https://example.test/api/v1/health"), env);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.data).toMatchObject({ ok: false, d1: true, r2: true, d1TransferRows: 59360, transferRows: 59361, d1Consistent: false });
  });

  it("mantiene health listo cuando R2 completo está disponible aunque D1 aún no tenga la tabla de transferencias", async () => {
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
    expect(payload.data).toMatchObject({ ok: true, d1: true, r2: true, d1TransferRows: 0, d1Consistent: false, transferRows: 59361 });
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

  it("filtra y pagina registros con un enlace next reproducible", async () => {
    const response = await fetchApi("https://example.test/api/v1/records?source=camara&kind=vote&limit=2");
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(2);
    expect(payload.meta.limit).toBe(2);
    expect(payload.links.next).toContain("cursor=v1_");
  }, 20_000);

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
});
