import { describe, expect, it } from "vitest";
import api from "../workers/public-api/index";
import { parseRelationQuery } from "./api-v1";

function testEnv() {
  const statement = (sql: string, bindings: unknown[] = []) => ({
    bind(...values: unknown[]) {
      return statement(sql, values);
    },
    async first<T>() {
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

describe("API canónica v1", () => {
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
});
