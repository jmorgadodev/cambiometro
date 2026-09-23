import { describe, expect, it } from "vitest";
import { fetchVerifiedSenadoVoteRecords, mergeSenadoVotesIntoStaticSnapshot } from "../scripts/etl/senado-static-projection.mjs";

const senators = [
  { id: "politico-ana", cargo: "Senador", nombre_completo: "Ana Pérez Soto" },
  { id: "politico-beto", cargo: "Senador", nombre_completo: "Beto Gómez Díaz" },
];

function record(id: number, fecha: string, votos: unknown[], extra = {}) {
  return {
    id: `votaciones_senado-sen-vot-${id}`,
    sourceId: "votaciones_senado",
    kind: "vote",
    occurredAt: fecha,
    data: {
      votacion_id: String(id),
      fecha,
      descripcion: `Votación ${id}`,
      resultado: "Aprobado",
      quorum: "Q.C.",
      tipo: "Votación en sala",
      boletin: "1234-56",
      url: `https://www.senado.cl/votacion/${id}`,
      votos,
      ...extra,
    },
  };
}

describe("mergeSenadoVotesIntoStaticSnapshot", () => {
  it("reemplaza sólo los periodos verificados de Senado y mantiene Cámara y periodos no suministrados", () => {
    const snapshot = {
      generatedAt: "2026-09-20T00:00:00Z",
      totalSessions: 3,
      sessions: {
        "senado-vot-10": { id: "senado-vot-10", fuente: "senado", fecha: "2026-09-01" },
        "senado-vot-old-feb": { id: "senado-vot-old-feb", fuente: "senado", fecha: "2026-02-01" },
        "camara-vot-20": { id: "camara-vot-20", fuente: "camara", fecha: "2026-09-01" },
      },
      votes: {
        "politico-ana": [["senado-vot-10", "En Contra"], ["senado-vot-old-feb", "Afirmativo"], ["camara-vot-20", "Afirmativo"]],
        "politico-beto": [["senado-vot-10", "Afirmativo"]],
      },
    };

    const result = mergeSenadoVotesIntoStaticSnapshot(snapshot, [
      record(11, "2026-09-23", [
        { id: "911", nombre: "Ana Pérez Soto", opcion: "Afirmativo" },
        { id: "912", nombre: "Beto Gómez Díaz", opcion: "En Contra" },
      ]),
    ], { senators, generatedAt: "2026-09-23T21:00:00Z" });

    expect(result.replacedPeriods).toEqual(["2026-09"]);
    expect(result.snapshot.sessions["senado-vot-10"]).toBeUndefined();
    expect(result.snapshot.sessions["senado-vot-11"]).toMatchObject({
      fuente: "senado",
      fecha: "2026-09-23",
      periodo: "2026-09",
      total_si: "1",
      total_no: "1",
    });
    expect(result.snapshot.sessions["senado-vot-old-feb"]).toBeDefined();
    expect(result.snapshot.sessions["camara-vot-20"]).toBeDefined();
    expect(result.snapshot.votes["politico-ana"]).toEqual([
      ["senado-vot-old-feb", "Afirmativo"],
      ["camara-vot-20", "Afirmativo"],
      ["senado-vot-11", "Afirmativo"],
    ]);
    expect(result.snapshot.votes["politico-beto"]).toEqual([
      ["senado-vot-11", "En Contra"],
    ]);
    expect(result.snapshot.totalSessions).toBe(3);
    expect(result.snapshot.generatedAt).toBe("2026-09-23T21:00:00Z");
  });

  it("preserva la entrada y reporta senadores no identificados sin borrar la votación", () => {
    const snapshot = { sessions: {}, votes: { "politico-ana": [] }, totalSessions: 0 };
    const result = mergeSenadoVotesIntoStaticSnapshot(snapshot, [
      record(12, "2026-09-23", [{ id: "9999", nombre: "Persona fuera del padrón", opcion: "Afirmativo" }]),
    ], { senators, generatedAt: "2026-09-23T21:00:00Z" });

    expect(snapshot.sessions).toEqual({});
    expect(result.snapshot.sessions["senado-vot-12"]).toBeDefined();
    expect(result.mappedVotes).toBe(0);
    expect(result.unmatchedVotes).toBe(1);
  });

  it("rechaza registros fuera de 2026, de otra fuente o duplicados", () => {
    const emptySnapshot = { sessions: {}, votes: {}, totalSessions: 0 };
    expect(() => mergeSenadoVotesIntoStaticSnapshot(emptySnapshot, [
      record(13, "2025-12-31", []),
    ], { senators })).toThrow("SENADO_STATIC_RECORD_OUT_OF_SCOPE");

    expect(() => mergeSenadoVotesIntoStaticSnapshot(emptySnapshot, [
      { ...record(13, "2026-09-23", []), sourceId: "camara" },
    ], { senators })).toThrow("SENADO_STATIC_INVALID_SOURCE");

    expect(() => mergeSenadoVotesIntoStaticSnapshot(emptySnapshot, [
      record(13, "2026-09-23", []),
      record(13, "2026-09-23", []),
    ], { senators })).toThrow("SENADO_STATIC_DUPLICATE_ID");
  });
});

describe("fetchVerifiedSenadoVoteRecords", () => {
  it("accepts only complete R2-backed periods and preserves missing zero-vote periods", async () => {
    const calls: string[] = [];
    const result = await fetchVerifiedSenadoVoteRecords({
      from: "2026-02",
      to: "2026-03",
      fetcher: async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const period = url.searchParams.get("period")!;
        calls.push(period);
        if (period === "2026-02") {
          return new Response(JSON.stringify({ meta: { total: 0, sourceBackend: "none", sourceStatus: "temporarily-unavailable" }, data: [] }));
        }
        return new Response(JSON.stringify({
          meta: { total: 1, limit: 100, page: 1, totalPages: 1, sourceBackend: "r2-lake", sourceStatus: "complete", publishedRows: 1, expectedRows: 1, missingPartitions: 0 },
          data: [record(31, "2026-03-01", [])],
        }));
      },
    });

    expect(calls).toEqual(["2026-02", "2026-03"]);
    expect(result.records).toHaveLength(1);
    expect(result.completePeriods).toEqual([{ period: "2026-03", recordCount: 1 }]);
  });

  it("refuses partial periods instead of silently synchronizing an incomplete projection", async () => {
    await expect(fetchVerifiedSenadoVoteRecords({
      from: "2026-09",
      to: "2026-09",
      fetcher: async () => new Response(JSON.stringify({
        meta: { total: 1, sourceBackend: "r2-lake", sourceStatus: "partial", missingPartitions: 1 },
        data: [record(31, "2026-09-01", [])],
      })),
    })).rejects.toThrow("SENADO_STATIC_PERIOD_NOT_COMPLETE:2026-09");
  });
});
