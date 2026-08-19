import { describe, expect, it } from "vitest";
import {
  getEntity,
  listRecords,
  listRelations,
  listSourceManifests,
} from "./data-platform-v1";
import { sanitizePublicPayload } from "./privacy";

describe("plataforma canónica v1", () => {
  it("inventaría todas las fuentes comprometidas sin marcar como conectada una cobertura incompleta", () => {
    const sources = listSourceManifests();
    const ids = sources.map((source) => source.id);

    expect(ids).toEqual(expect.arrayContaining([
      "infoprobidad",
      "infolobby",
      "camara",
      "senado",
      "chilecompra",
      "dipres",
      "sinim",
      "contraloria",
      "ley-19862",
      "transparencia-activa",
      "servel",
    ]));
    expect(sources.filter((source) => source.status === "connected")).toEqual([]);
    expect(sources.find((source) => source.id === "camara")?.recordCount).toBeGreaterThan(155);
  });

  it("distingue un índice oficial inventariado de registros ya normalizados", () => {
    const dipres = listSourceManifests().find((source) => source.id === "dipres");
    expect(dipres?.status).toBe("partial");
    expect(dipres?.recordCount ?? 0).toBeGreaterThan(0);
    expect(dipres?.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(dipres?.statusDetail).toContain("Snapshot limitado");
  });

  it("pagina con cursor, limita a 100 y conserva filtros estables", () => {
    const first = listRecords({ source: "camara", kind: "vote", limit: 2 });

    expect(first.data).toHaveLength(2);
    expect(first.nextCursor).toMatch(/^v1_/);
    expect(first.data.every((record) => record.sourceId === "camara")).toBe(true);
    expect(first.data.every((record) => record.kind === "vote")).toBe(true);

    const second = listRecords({
      source: "camara",
      kind: "vote",
      limit: 200,
      cursor: first.nextCursor ?? undefined,
    });
    expect(second.limit).toBe(100);
    expect(second.data[0]?.id).not.toBe(first.data[0]?.id);
  });

  it("sólo publica relaciones de Cámara conciliadas mediante el identificador oficial", () => {
    const relations = listRelations({ predicate: "cast_vote", limit: 100 });

    expect(relations.data.length).toBeGreaterThan(0);
    expect(relations.data.every((edge) => edge.reconciliation.method === "official_id")).toBe(true);
    expect(relations.data.every((edge) => edge.evidenceRecordIds.length > 0)).toBe(true);

    const entity = getEntity(relations.data[0].fromId);
    expect(entity?.identifiers.some((identifier) => identifier.scheme === "camara-dipid")).toBe(true);
  });

  it("conserva RUT personales (identificadores públicos únicos) y omite solo domicilios/cuentas", () => {
    const sanitized = sanitizePublicPayload({
      nombre: "Persona de prueba",
      rut: "12.345.678-5",
      domicilio_particular: "Calle privada 123",
      empresa: {
        razon_social: "Proveedor SpA",
        rut_juridico: "76.123.456-7",
      },
      participantes: [{ nombre: "Otra persona", rut_persona: "9.876.543-2" }],
    });

    expect(sanitized).toEqual({
      nombre: "Persona de prueba",
      rut: "12.345.678-5",
      empresa: {
        razon_social: "Proveedor SpA",
        rut_juridico: "76.123.456-7",
      },
      participantes: [{ nombre: "Otra persona", rut_persona: "9.876.543-2" }],
    });
  });
});
