import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PartidosPage from "../app/partidos/page";
import PartidoPage from "../app/partidos/[sigla]/page";
import { readFileSync } from "node:fs";
import { PUBLICATION_SCOPES } from "./publication-scope";

describe("indicadores retirados en páginas y rutas preservadas", () => {
  it("Datos no promete universo completo, revisión universal ni actualización en vivo", () => {
    const page = readFileSync(new URL("../app/datos/page.tsx", import.meta.url), "utf8");
    const dashboard = readFileSync(new URL("../components/datos/EtlHealthDashboardClient.tsx", import.meta.url), "utf8");
    expect(page).not.toContain("Universo completo");
    expect(page).not.toContain("Monitor en tiempo real");
    expect(page).not.toContain("Monitoreo en vivo");
    expect(page).not.toContain('gridTemplateColumns: "minmax(0, 1.15fr) minmax(23rem, 1fr)"');
    expect(dashboard).not.toContain("Registros revisados y auditados");
    expect(dashboard).toContain("Total entre fuentes: En revisión");
  });
  it("recupera las comparaciones publicadas sin reactivar cohesión ni apoyo no acreditados", async () => {
    const html = renderToStaticMarkup(await PartidosPage());
    expect(html).toContain("En revisión");
    expect(html).toContain("/partidos/rn");
    expect(html).toContain("Mayor Gasto Operacional Total");
    expect(html).toContain("Mayor proporción de voto emitido");
    expect(html).not.toContain("asignación mensual vigente");
    expect(html).toContain("Tabla interactiva con ordenamiento multicriterio");
    expect(html).toContain("Cohesión y personal de apoyo agregado: En revisión");
    expect(html).not.toContain("Bancadas más unidas");
  });
  it("el preview de esta revisión no prepara ni consulta D1 y conserva las pruebas habituales", () => {
    const workflow = readFileSync(new URL("../../.github/workflows/pages-ui-refresh.yml", import.meta.url), "utf8");
    expect(workflow).toContain("audit_without_d1:");
    expect(workflow).toMatch(/name: Preparar D1 local de integración\s+if: inputs\.audit_without_d1 != true/);
    expect(workflow).toMatch(/name: Verificar navegador, temas y CSP\s+if: inputs\.audit_without_d1 != true/);
    expect(workflow).toContain("node scripts/verify-defensible-browser.mjs");
    expect(workflow).toContain("npm run verify:security");
  });
  it("la ficha recupera los indicadores publicados sin afirmar afiliación histórica", async () => {
    const html = renderToStaticMarkup(await PartidoPage({ params: Promise.resolve({ sigla: "rn" }) }));
    expect(html).not.toContain("Comparaciones de bancada: En revisión");
    expect(html).toContain("Gastos bancada (publicados)");
    expect(html).toContain("no acredita pertenencia histórica");
    expect(html).not.toContain("Asistencia = votos emitidos");
  });
  it("todas las rutas principales reciben aviso SSR, sin depender de JavaScript del navegador", () => {
    const routes = { movimientos: "movimientos", "votaciones-destacadas": "votaciones", politico: "politico", partidos: "partidos", "gastos-operacionales": "gastos", "remuneraciones-publicas": "remuneraciones", municipalidades: "municipalidades", "servicios-publicos": "servicios", transferencias: "transferencias", entidades: "entidades", cruces: "cruces", personas: "personas", funcionarios: "remuneraciones", autoridades: "personas", rankings: "rankings", comparar: "comparar", calculadora: "calculadora", datos: "datos", fuentes: "datos", buscar: "buscar", cambios: "movimientos" } as const;
    for (const [route, area] of Object.entries(routes)) {
      const layout = readFileSync(new URL(`../app/${route}/layout.tsx`, import.meta.url), "utf8");
      expect(layout).toContain(`area="${area}"`);
      expect(PUBLICATION_SCOPES[area]).toBeTruthy();
      expect(layout).not.toContain('"use client"');
    }
  });
});
