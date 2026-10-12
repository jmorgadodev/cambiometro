import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import VotacionesHistorial from "../components/VotacionesHistorial";
import PoliticoScoreHeader from "../components/PoliticoScoreHeader";
import { summarizeVerifiedNominalVotes, unreconciledNominalSessions } from "./vote-publication-integrity";

describe("retirada de nominales que no concilian con los totales", () => {
  it("calcula indicadores con sesiones conciliadas y excluye sólo las que siguen en revisión", () => {
    expect(summarizeVerifiedNominalVotes(["Afirmativo", "No Vota", "En Contra", "En revisión", "Pareo", "Abstención"])).toEqual({
      verifiedRecords: 5,
      excludedRecords: 1,
      present: 4,
      emitted: 3,
      noVote: 1,
      pctEmitted: 75,
    });
  });
  it("no acepta todos No Vota si la sesión declara votos efectivos", () => {
    expect(unreconciledNominalSessions({ sessions: { bad: { total_si: "56", total_no: "60", total_abstencion: "5" } }, votes: { p: [["bad", "No Vota"]] } }).has("bad")).toBe(true);
  });
  it("no acepta abstenciones desaparecidas en la proyección Senado", () => {
    expect(unreconciledNominalSessions({ sessions: { bad: { total_si: "1", total_no: "0", total_abstencion: "1" } }, votes: { p: [["bad", "Afirmativo"]] } }).has("bad")).toBe(true);
  });
  it("conserva una sesión conciliada y un cero explícito sin rellenar valores ausentes", () => {
    const sessions = { ok: { total_si: "1", total_no: "0", total_abstencion: "1" }, zero: { total_si: "0", total_no: "0", total_abstencion: "0" }, absent: {} };
    const votes: Record<string, [string, string][]> = { p: [["ok", "Afirmativo"], ["zero", "No Vota"], ["absent", "No Vota"]], q: [["ok", "Abstención"]] };
    expect([...unreconciledNominalSessions({ sessions, votes })]).toEqual(["absent"]);
  });
  it("excluye del resumen sólo los registros en revisión y conserva las opciones conciliadas", () => {
    const html = renderToStaticMarkup(createElement(VotacionesHistorial, { votaciones: [
      { id: "bad", fecha: "2026-09-21", opcion: "En revisión", descripcion: "Cambio de trámite" },
      { id: "ok", fecha: "2026-09-20", opcion: "Afirmativo", descripcion: "Proyecto conciliado" },
    ] }));
    expect(html).toContain("1 de 2 registros no concilian");
    expect(html).toContain("votaciones-historial__resumen");
    expect(html).toContain("A favor");
    expect(html).not.toMatch(/>\s*100%\s*</);
    expect(html).not.toContain("Presente, no votó");
  });

  it("muestra los indicadores calculados con registros conciliados aunque existan sesiones excluidas", () => {
    const html = renderToStaticMarkup(createElement(PoliticoScoreHeader, { data: {
      id: "dip-060",
      nombre_completo: "Jorge Alessandri Vergara",
      cargo: "Diputado",
      distrito_region: "Región Metropolitana",
      partido: null,
      pctAsistencia: null,
      pctEmitioVoto: 75,
      presenteSinVotar: 1,
      sesionesPresentes: 4,
      totalSesiones: 6,
      nominalIndicatorsInReview: true,
      nominalRecordsExcluded: 1,
      attendanceInReview: true,
    } }));

    expect(html).toContain("No disponible");
    expect(html).toContain("75%");
    expect(html).toContain("1 votación excluida");
    expect(html).not.toContain(">En revisión</div>");
  });
});
