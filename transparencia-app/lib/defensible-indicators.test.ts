import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PoliticosListClient, { type PoliticoCardData } from "../components/PoliticosListClient";
import { POLITICOS_SEED } from "./seed-politicos";
import { personalApoyoDelPartido } from "./partido-estadisticas";
import { movimientoOfficialEvidence } from "./movimientos";

describe("publicación defendible, sin modificar releases", () => {
  it("no presenta una tarifa fija como dieta observada cuando falta el registro", () => {
    const item = {
      politico: POLITICOS_SEED[0], partido: undefined, fuentes: 0, sueldo: null,
      partidoConfig: { nombre: "Independiente", sigla: "IND", color_oficial: "var(--accent)" },
      dietaMonto: 8291039, verifiedPhoto: null, initials: "AB",
      gastosTotal: 0, gastosPeriodos: 0, gastosRegistros: 0, gastosUltimoPeriodo: null,
    } as PoliticoCardData;
    const html = renderToStaticMarkup(createElement(PoliticosListClient, { items: [item], title: "Personas" }));
    expect(html).toContain("En revisión");
    expect(html).not.toContain("8.291.039");
    expect(html).not.toContain("Nómina oficial verificada");
  });
  it("no convierte filas históricas ni coincidencias parciales de nombre en gasto mensual de una bancada", async () => {
    const result = await personalApoyoDelPartido("rn");
    expect(result.totalMensual).toBeNull();
    expect(result.totalPersonas).toBeNull();
    expect(result.promedioPorParlamentario).toBeNull();
  });
  it("no llama verificación legal a un organigrama ni a una fecha anterior al documento", () => {
    expect(movimientoOfficialEvidence({ estado: "verificado", fecha_verificacion: "2026-04-01T16:00:00Z", fuentes: [
      { nivel: "oficial", medio: "Ministerio", url: "https://www.gob.cl/organigrama", fecha: "2026-04-06", titulo: "Autoridades" },
    ] }).referenceAvailable).toBe(false);
    expect(movimientoOfficialEvidence({ estado: "verificado", decreto_url: "https://www.bcn.cl/leychile/navegar?idNorma=123", fecha_verificacion: "2026-04-01T16:00:00Z", fuentes: [
      { nivel: "oficial", medio: "BCN", url: "https://www.bcn.cl/leychile/navegar?idNorma=123", fecha: "2026-04-06", titulo: "Decreto" },
    ] }).referenceAvailable).toBe(false);
  });
  it("una referencia legal individualizada y fechada permite mostrar el estado sin cambiar el original", () => {
    const row = { estado: "verificado" as const, decreto_url: "https://www.diariooficial.interior.gob.cl/publicaciones/2026/04/06/123.pdf", fecha_verificacion: "2026-04-07T16:00:00Z", fuentes: [
      { nivel: "oficial" as const, medio: "Diario Oficial", url: "https://www.diariooficial.interior.gob.cl/publicaciones/2026/04/06/123.pdf", fecha: "2026-04-06", titulo: "Decreto de cese" },
    ] };
    expect(movimientoOfficialEvidence(row).referenceAvailable).toBe(true);
    expect(row.fecha_verificacion).toBe("2026-04-07T16:00:00Z");
  });
});
