import { partyAtVoteDate } from "./party-membership-periods.mjs";
import { validateFeaturedVotes } from "../scripts/verify-votaciones-destacadas.mjs";
import { describe, expect, it } from "vitest";
import { buildCohesionRows } from "./cohesion-bancadas";
import { buildLatestSenateVotes, mergeLatestSenateVoteCards } from "./home-editorial-adapter";

const vote = (patch = {}) => ({ votacion_id: "senado-vot-101", camara: "Senado", fecha: "2026-11-17", resultado: "Aprobado", votos: { favor: 20, contra: 2, abstencion: 1 }, ...patch });
const membership = (partido_id: string, desde: string, hasta: string) => ({ partido_id, partido_nombre: partido_id, desde, hasta });
const roster = () => ["a", "b"].map(id => ({ id, cargo: "Diputado", partido_id: "nuevo", militancias: [membership("anterior", "2026-01-01", "2026-06-30"), membership("nuevo", "2026-07-01", "2026-12-31")] }));
describe("integridad de votaciones y afiliación histórica", () => {
  it("agrupa cada voto según el partido documentado en esa fecha", () => {
    const source: Parameters<typeof buildCohesionRows>[1] = { sessions: { old: { id: "old", fecha: "2026-03-01", fuente: "camara" }, recent: { id: "recent", fecha: "2026-09-01", fuente: "camara" } }, votes: { a: [["old", "Afirmativo"], ["recent", "Afirmativo"]], b: [["old", "Afirmativo"], ["recent", "En Contra"]] } };
    const rows = buildCohesionRows(roster(), source);
    expect(rows.map(row => [row.sigla, row.cohesion_pct, row.votaciones_consideradas])).toEqual([["ANTERIOR", 100, 1], ["NUEVO", 50, 1]]);
  });
  it("no infiere la afiliación histórica desde el partido actual", () => {
    const source: Parameters<typeof buildCohesionRows>[1] = { sessions: { s: { id: "s", fecha: "2026-09-01", fuente: "camara" } }, votes: { a: [["s", "Afirmativo"]], b: [["s", "Afirmativo"]] } };
    expect(buildCohesionRows(roster().map(person => ({ id: person.id, cargo: person.cargo, partido_id: person.partido_id })), source)).toEqual([]);
  });
  it("no cuenta Sí y Afirmativo como opciones enfrentadas", () => {
    const source: Parameters<typeof buildCohesionRows>[1] = { sessions: { s: { id: "s", fecha: "2026-09-01", fuente: "camara" } }, votes: { a: [["s", "Sí"]], b: [["s", "Afirmativo"]] } };
    expect(buildCohesionRows(roster(), source)[0].cohesion_pct).toBe(100);
  });
  it("descarta fechas imposibles de las fichas de la landing", () => {
    expect(buildLatestSenateVotes([vote({ fecha: "2026-02-30" })])).toEqual([]);
  });
  it("un conteo vacío o inválido no genera porcentajes ni votos nominales inventados", () => {
    for (const favor of ["", "21x", -1, 1.5]) {
      const result = buildLatestSenateVotes([{ sourceId: "votaciones_senado", occurredAt: "2026-11-17", data: { id: "senado-vot-101", resultado: "Aprobado", total_si: favor, total_no: 1, total_abstencion: 0 } }]);
      expect(result[0].hasNominalVotes).toBe(false);
    }
  });
  it("no repite la misma votación en dos tarjetas", () => {
    expect(buildLatestSenateVotes([vote(), vote()], 3)).toHaveLength(1);
  });
});

describe("actualización de tarjetas sin retroceder el corte", () => {
  it("una respuesta antigua o parcial conserva las tres votaciones más recientes", () => {
    const snapshot = buildLatestSenateVotes([vote({ votacion_id: "senado-vot-103" }), vote({ votacion_id: "senado-vot-102", fecha: "2026-11-16" }), vote({ fecha: "2026-11-15" })], 3);
    const old = buildLatestSenateVotes([vote({ votacion_id: "senado-vot-99", fecha: "2026-09-01" })]);
    const merged = mergeLatestSenateVoteCards(snapshot, old);
    expect(merged.map(row => row.id)).toEqual(snapshot.map(row => row.id));
    expect(snapshot).toHaveLength(3);
  });
  it("incorpora una votación nueva sin borrar las anteriores ni duplicarlas", () => {
    const snapshot = buildLatestSenateVotes([vote(), vote({ votacion_id: "senado-vot-100", fecha: "2026-11-16" })], 3);
    const latest = buildLatestSenateVotes([vote({ votacion_id: "senado-vot-102", fecha: "2026-11-18" }), vote()], 3);
    expect(mergeLatestSenateVoteCards(snapshot, latest).map(row => row.id)).toEqual(["senado-vot-102", "senado-vot-101", "senado-vot-100"]);
  });
});

describe("evidencia temporal y resultado oficial", () => {
  it("una afiliación solapada o sin fecha no se sustituye por la actual", () => {
    const person = { partido_id: "actual", militancias: [membership("a", "2026-01-01", "2026-12-31"), membership("b", "2026-06-01", "2026-12-31")] };
    expect(partyAtVoteDate(person, "2026-09-01")).toBeNull();
    expect(partyAtVoteDate({ militancias: [] }, "2026-09-01")).toBeNull();
    expect(partyAtVoteDate({ militancias: [membership("ind", "2026-01-01", "2026-12-31")] }, "2026-09-01")).toBe("ind");
  });
  it("no usa una votación duplicada para calcular cohesión", () => {
    const source: Parameters<typeof buildCohesionRows>[1] = { sessions: { s: { id: "s", fecha: "2026-09-01", fuente: "camara" } }, votes: { a: [["s", "Afirmativo"], ["s", "En Contra"]], b: [["s", "Afirmativo"]] } };
    expect(buildCohesionRows(roster(), source)).toEqual([]);
  });
  it("respeta un rechazo oficial aunque los sí superen a los no", () => {
    const featured = Array.from({ length: 8 }, (_, i) => ({ votacion_id: String(i), boletin: "1-1", fuente_url: "https://www.senado.cl/votacion", titulo: "Registro oficial", resumen: "Se consultó el registro oficial. Se conserva el resultado publicado.", resultado: "Rechazado" }));
    const source: Parameters<typeof buildCohesionRows>[1] = { sessions: Object.fromEntries(featured.map(item => [item.votacion_id, { boletin: "1-1", resultado: "Rechazado", total_si: "30", total_no: "10" }])) };
    expect(validateFeaturedVotes(source, featured)).toEqual([]);
    expect(validateFeaturedVotes(source, featured.map(item => ({ ...item, resultado: "Aprobado" })))).toHaveLength(8);
    expect(validateFeaturedVotes(source, featured.map(item => ({ ...item, fuente_url: "https://senado.cl.example.org/" })))).toHaveLength(8);
  });
});

it("reconoce los alias del mismo ID de Senado sin duplicar tarjetas", () => {
  const snapshot = buildLatestSenateVotes([vote()]);
  const live = buildLatestSenateVotes([vote({ votacion_id: "sen-vot-101" })]);
  expect(mergeLatestSenateVoteCards(snapshot, live)).toHaveLength(1);
});
it("no mezcla cámara declarada y prefijo contradictorio al calcular bancadas", () => {
  const source: Parameters<typeof buildCohesionRows>[1] = { sessions: { "senado-vot-1": { id: "senado-vot-1", fecha: "2026-09-01", fuente: "camara" } }, votes: { a: [["senado-vot-1", "Afirmativo"]], b: [["senado-vot-1", "Afirmativo"]] } };
  expect(buildCohesionRows(roster().map(person => ({ ...person, cargo: "Senador" })), source)).toEqual([]);
});
