import { describe, expect, it } from "vitest";
import { GET as getSources } from "../app/api/v1/sources/route";
import { GET as getEntity } from "../app/api/v1/entities/[id]/route";
import { GET as getRecords } from "../app/api/v1/records/route";
import { GET as getRelations } from "../app/api/v1/relations/route";
import { GET as getCrosses } from "../app/api/v1/crosses/route";
import { GET as getPolitico } from "../app/api/v1/politico/[id]/route";
import { parseRelationQuery } from "./api-v1";

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
    const response = await getSources(new Request("https://example.test/api/v1/sources"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveProperty("data");
    expect(payload).toHaveProperty("meta");
    expect(payload.links.self).toBe("https://example.test/api/v1/sources");
    expect(payload.data.some((source: { status: string }) => source.status === "connected")).toBe(false);
  });

  it("filtra y pagina registros con un enlace next reproducible", async () => {
    const response = await getRecords(new Request("https://example.test/api/v1/records?source=camara&kind=vote&limit=2"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(2);
    expect(payload.meta.limit).toBe(2);
    expect(payload.links.next).toContain("cursor=v1_");
  }, 20_000);

  it("rechaza filtros inválidos con el error uniforme", async () => {
    const response = await getRecords(new Request("https://example.test/api/v1/records?kind=delito"));
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
    const response = await getRecords(new Request(`https://example.test/api/v1/records?source=${source}&limit=2`));
    expect(response.status).toBe(200);
  });

  it("devuelve 404 uniforme para una entidad desconocida", async () => {
    const response = await getEntity(
      new Request("https://example.test/api/v1/entities/no-existe"),
      { params: Promise.resolve({ id: "no-existe" }) },
    );
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Entidad no encontrada.", details: { id: "no-existe" } },
    });
    expect(response.status).toBe(404);
  });

  it("expone relaciones y cruces con la misma cadena de evidencia", async () => {
    const relationsResponse = await getRelations(new Request("https://example.test/api/v1/relations?predicate=cast_vote&limit=1"));
    const relationPayload = await relationsResponse.json();
    const crossesResponse = await getCrosses(new Request("https://example.test/api/v1/crosses?predicate=cast_vote&limit=1"));
    const crossesPayload = await crossesResponse.json();

    expect(relationPayload.data).toHaveLength(1);
    expect(crossesPayload.data).toHaveLength(1);
    expect(crossesPayload.data[0].relation.id).toBe(relationPayload.data[0].id);
    expect(crossesPayload.data[0].evidence[0].id).toBe(relationPayload.data[0].evidenceRecordIds[0]);
    expect(crossesPayload.data[0].relation.disclaimer).toContain("no implica irregularidad");
  });

  it("permite embeber fichas mediante CORS solamente de lectura", async () => {
    const request = new Request("https://example.test/api/v1/politico/dip-061");
    const response = await getPolitico(request, { params: Promise.resolve({ id: "dip-061" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(payload.links.self).toBe(request.url);
  });
});
