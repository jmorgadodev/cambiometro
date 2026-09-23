import { describe, expect, it } from "vitest";
import {
  assertSenateVotePeriodPreserved,
  fetchSenateVotesByDateRange,
  senateVoteRangesByLegislature,
} from "../scripts/etl/senado-votaciones-release.mjs";

describe("rangos de legislatura para votaciones del Senado 2026+", () => {
  it("asigna enero y febrero de 2026 a la legislatura 373", () => {
    expect(senateVoteRangesByLegislature("2026-01-01", "2026-02-28")).toEqual([
      { legislatura: 373, from: "2026-01-01", to: "2026-02-28" },
    ]);
  });

  it("divide marzo 2026 en la última sesión 373 y el inicio de la 374", () => {
    expect(senateVoteRangesByLegislature("2026-03-01", "2026-03-31")).toEqual([
      { legislatura: 373, from: "2026-03-01", to: "2026-03-10" },
      { legislatura: 374, from: "2026-03-11", to: "2026-03-31" },
    ]);
  });

  it("rechaza rangos anteriores al alcance 2026+", () => {
    expect(() => senateVoteRangesByLegislature("2025-12-31", "2026-01-31"))
      .toThrow("SENADO_VOTES_RANGE_BEFORE_2026");
  });

  it("combina votos de ambas legislaturas en orden y rechaza IDs duplicados", async () => {
    const calls: Array<{ legislatura: number; desde: string; to: string }> = [];
    const rows = await fetchSenateVotesByDateRange({
      from: "2026-03-01",
      to: "2026-03-31",
      fetcher: async (input) => {
        calls.push({ legislatura: input.legislatura!, desde: input.desde, to: input.to });
        return input.legislatura === 373
          ? [{ votacion_id: "10900", fecha: "2026-03-10" } as never]
          : [{ votacion_id: "10901", fecha: "2026-03-11" } as never];
      },
    });

    expect(calls).toEqual([
      { legislatura: 373, desde: "2026-03-01", to: "2026-03-10" },
      { legislatura: 374, desde: "2026-03-11", to: "2026-03-31" },
    ]);
    expect(rows.map((row) => row.votacion_id)).toEqual(["10900", "10901"]);
    await expect(fetchSenateVotesByDateRange({
      from: "2026-03-01",
      to: "2026-03-31",
      fetcher: async () => [{ votacion_id: "10900", fecha: "2026-03-10" } as never],
    })).rejects.toThrow("SENADO_VOTES_DUPLICATE_ID:10900");
  });

  it("acepta una partición nueva sin fingir que ya existían filas", () => {
    expect(assertSenateVotePeriodPreserved({
      period: "2026-01",
      catalog: { partitions: [] },
      stagedIds: ["10784", "10785"],
      currentMeta: { total: 0, sourceBackend: "none", sourceStatus: "temporarily-unavailable" },
      currentIds: [],
    })).toMatchObject({ period: "2026-01", previouslyPublished: false, existingRecords: 0, preserved: true });
  });

  it("no permite reemplazar una partición publicada perdiendo sus IDs", () => {
    const catalog = { partitions: [{ sourceId: "votaciones_senado", period: "2026-03" }] };
    expect(() => assertSenateVotePeriodPreserved({
      period: "2026-03",
      catalog,
      stagedIds: ["10900"],
      currentMeta: { total: 2, sourceBackend: "r2-lake", sourceStatus: "complete", missingPartitions: 0 },
      currentIds: ["10900", "10901"],
    })).toThrow("SENADO_REPAIR_EXISTING_VOTE_DROPPED:2026-03:10901");
  });
});
