import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import VotacionesHistorial from "../components/VotacionesHistorial";
import { unreconciledNominalSessions } from "./vote-publication-integrity";

describe("retirada de nominales que no concilian con los totales", () => {
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
  it("un historial en revisión no convierte ese estado en presencia ni voto cero", () => {
    const html = renderToStaticMarkup(createElement(VotacionesHistorial, { votaciones: [{ id: "bad", fecha: "2026-09-21", opcion: "En revisión", descripcion: "Cambio de trámite" }] }));
    expect(html).toContain("Indicadores nominales: En revisión");
    expect(html).not.toMatch(/>\s*100%\s*</);
    expect(html).not.toContain("Presente, no votó");
  });
});
