import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import FuncionarioDetailDialog from "../components/municipalidades/FuncionarioDetailDialog";

const source = "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv";
const render = (sourceUrl?: string) => renderToStaticMarkup(createElement(FuncionarioDetailDialog, {
  nombreOrganismo: "Municipalidad de Tortel", onClose: () => {},
  record: { id: "historical-abel", nombre: "Abel Becerra Vidal", periodo: "2025-01", cargo: "Alcalde",
    remuneracionBruta: 468212, remuneracionLiquida: 410021, fuente: "Transparencia Activa · CPLT", sourceUrl,
    observaciones: "Sin observaciones" },
}));

describe("procedencia y alcance de remuneraciones municipales", () => {
  it("la lectura rápida conserva presupuesto cero y no afirma ausencia oficial", () => {
    const source = readFileSync(resolve("components/municipalidades/MunicipalidadDetailDashboardClient.tsx"), "utf8");
    expect(source.includes('const presupuestoPublicado = pres?.vigente_clp ?? pres?.inicial_clp ?? null')).toBe(true);
    expect(source.includes('label: "Presupuesto vigente", value: presupuestoPublicado !== null')).toBe(true);
    expect(source.includes('"No publicado por la fuente"')).toBe(false);
  });
  it("no convierte ausencia en compras/control en ausencia de publicación oficial", () => {
    const source = readFileSync(resolve("components/municipalidades/MunicipalidadDetailDashboardClient.tsx"), "utf8");
    expect(source).toContain('"Sin registros integrados"');
    expect(source).toContain("informes CGR integrados");
    expect(source).not.toContain('label: "Compras y control", value: comprasMuni ? formatNum(comprasMuni.procesos_count ?? 0) : "No publicado"');
  });
  it("mantiene el monto y período históricos y explica que no acreditan cargo actual", () => {
    const html = render(source);
    expect(html).toContain("2025-01");
    expect(html).toContain("468.212");
    expect(html).toContain("410.021");
    expect(html).toContain("puede corresponder a una exautoridad");
    expect(html).toContain("no acredita que siga en el cargo");
    expect(html).toContain("El motivo del pago sólo puede confirmarse");
    expect(html).toContain("Sin observaciones");
  });
  it("identifica un CSV completo y conserva enlace seguro sin inventar un registro individual", () => {
    const html = render(source);
    expect(html).toContain(`href="${source}"`);
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain("Consultar datos de origen (CSV completo)");
    expect(render("https://www.portaltransparencia.cl/")).toContain("Ver registro original");
    expect(render()).not.toContain("Consultar datos de origen");
  });
  it("la tarjeta identifica el publicador municipal, recopilador y período junto al monto", () => {
    const source = readFileSync(resolve("components/municipalidades/MunicipalidadDetailDashboardClient.tsx"), "utf8");
    expect(source).toContain("Origen del dato:");
    expect(source).toContain("recopilada por el Consejo para la Transparencia (CPLT)");
    expect(source).toContain("Período informado:");
    expect(source).toContain("Consultar datos de origen (CSV completo)");
  });
});
