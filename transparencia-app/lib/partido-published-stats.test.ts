import { describe, expect, it } from "vitest";
import { buildPublishedPartyStats } from "./partido-published-stats";

const members = [
  { id: "dip-a", nombre_completo: "Persona A", cargo: "Diputado" },
  { id: "dip-b", nombre_completo: "Persona B", cargo: "Diputado" },
] as const;
const source = {
  sessions: { s1: { id: "s1", fuente: "camara", fecha: "2026-09-01", descripcion: "Proyecto publicado", total_si: "1", total_no: "0", total_abstencion: "0" } },
  votes: { "dip-a": [["s1", "Afirmativo"]] as [string, string][] },
};

describe("estadísticas de bancada desde entradas publicadas", () => {
  it("recupera los votos documentados sin inventar No Vota para miembros sin fila", () => {
    const result = buildPublishedPartyStats(members, source, {});
    expect(result.votosCamara).toMatchObject({ afirmativo: 1, noVota: 0, apariciones: 1 });
    expect(result.votaciones[0].votosNominales).toEqual([{ politico_id: "dip-a", nombre: "Persona A", opcion: "Afirmativo" }]);
    expect(result.publication.votingPeriods.camara).toEqual({ from: "2026-09-01", to: "2026-09-01" });
  });
  it("excluye del cálculo una sesión cuyo nominal no concuerda con el resultado", () => {
    const result = buildPublishedPartyStats(members, { ...source, sessions: { s1: { ...source.sessions.s1, total_si: "2" } } }, {});
    expect(result.votosCamara.apariciones).toBe(0);
    expect(result.votaciones).toHaveLength(0);
    expect(result.publication.excludedVotes).toBe(1);
  });
  it("un duplicado nominal invalida la sesión, no duplica los votos", () => {
    const result = buildPublishedPartyStats(members, { ...source, votes: { "dip-a": [["s1", "Afirmativo"], ["s1", "Afirmativo"]] } }, {});
    expect(result.votosCamara.apariciones).toBe(0);
  });
  it("suma gastos por persona y período, sin sumar otra vez la fila total ni convertir nulos", () => {
    const result = buildPublishedPartyStats(members, source, { "dip-a": [
      { id: "a", periodo: "2026-03", item: "Arriendo", monto_clp: 100 },
      { id: "b", periodo: "2026-03", item: "TOTAL", monto_clp: 100 },
      { id: "c", periodo: "2026-04", item: "Arriendo", monto_clp: 200 },
      { id: "d", periodo: "2026-05", item: "Arriendo", monto_clp: null },
    ] });
    expect(result.gastos.total).toBe(300);
    expect(result.gastos.porMes).toEqual([{ periodo: "2026-03", total: 100, parlamentarios: 1 }, { periodo: "2026-04", total: 200, parlamentarios: 1 }]);
    expect(result.publication.expensePeriods).toEqual(["2026-03", "2026-04"]);
    expect(result.gastos.porPolitico).toHaveLength(1);
  });
  it("la cobertura del mes no incluye integrantes con datos sólo en otro mes", () => {
    const result = buildPublishedPartyStats(members, source, {
      "dip-a": [{ id: "a", periodo: "2026-03", item: "Arriendo", monto_clp: 100 }],
      "dip-b": [{ id: "b", periodo: "2026-04", item: "Arriendo", monto_clp: 200 }],
    });
    expect(result.gastos.porPolitico).toHaveLength(2);
    expect(result.gastos.porMes.map((row) => row.parlamentarios)).toEqual([1, 1]);
  });
  it("no atribuye a Cámara un voto de Senado ni agrega nombres ajenos al catálogo", () => {
    const result = buildPublishedPartyStats(members, { ...source, sessions: { s1: { ...source.sessions.s1, fuente: "senado" } } }, {});
    expect(result.votosCamara.emitidos + result.votosSenado.emitidos).toBe(0);
  });
  it("no atribuye gastos anteriores a la legislatura al catálogo 2026–2030", () => {
    const result = buildPublishedPartyStats(members, source, { "dip-a": [
      { id: "old", periodo: "2014-03", item: "Arriendo", monto_clp: 900 },
      { id: "new", periodo: "2026-03", item: "Arriendo", monto_clp: 0 },
    ] });
    expect(result.gastos.total).toBe(0);
    expect(result.publication.expensePeriods).toEqual(["2026-03"]);
    expect(result.gastos.porPolitico).toHaveLength(1);
  });
});
