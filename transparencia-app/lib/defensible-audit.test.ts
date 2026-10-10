import { describe, expect, it } from "vitest";
import { auditPublishedVotes, auditPartyArithmetic } from "../scripts/audit-defensible-publication.mjs";

describe("auditoría acotada del conjunto publicado", () => {
  it("distingue una sesión sin nominales, un duplicado y un total discordante", () => {
    const result = auditPublishedVotes({ sessions: {
      one: { fuente: "senado", fecha: "2026-09-30", total_si: 2, total_no: 0, total_abstencion: 0 },
      empty: { fuente: "camara", fecha: "2026-09-29" },
    }, votes: { person: [["one", "Afirmativo"], ["one", "Afirmativo"], ["missing", "En Contra"]] } });
    expect(result.duplicatePairs).toBe(1);
    expect(result.unknownSessions).toBe(1);
    expect(result.sessionsWithoutNominals).toEqual(["empty"]);
    expect(result.totalDisagreements).toHaveLength(1);
    expect(result.byChamber.senado.options.Afirmativo).toBe(1);
  });
  it("comprueba sumas sin confundir voto emitido y apariciones", () => {
    const count = { afirmativo: 1, enContra: 1, abstencion: 1, noVota: 2, dispensado: 0, apariciones: 5, emitidos: 3 };
    expect(auditPartyArithmetic({ rn: { votosCamara: count, votosSenado: count, gastos: { total: 3, porMes: [{ total: 1 }, { total: 2 }] } } }).disagreements).toEqual([]);
    expect(auditPartyArithmetic({ rn: { votosCamara: { ...count, emitidos: 5 }, gastos: { total: 9, porMes: [{ total: 1 }] } } }).disagreements).toHaveLength(2);
  });
});
