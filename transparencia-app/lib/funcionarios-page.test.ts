import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getPayrollPeriodContext } from "@/lib/payroll-period-context";

describe("experiencia y usabilidad de nóminas de funcionarios municipales (/funcionarios)", () => {
  const page = readFileSync(resolve("app/funcionarios/page.tsx"), "utf8");
  const client = readFileSync(resolve("components/GlobalFuncionariosClient.tsx"), "utf8");
  const personasClient = readFileSync(resolve("components/personas/PersonasUniversalClient.tsx"), "utf8");

  it("la página /funcionarios conserva el acceso al directorio", () => {
    expect(readFileSync(resolve("public/_redirects"), "utf8")).toContain("/funcionarios /personas?tab=funcionarios 301");
  });

  it("incorpora selector de vista entre cards y tabla compacta", () => {
    expect(client).toContain('setViewMode("cards")');
    expect(client).toContain('setViewMode("table")');
    expect(client).toContain("<table");
  });

  it("mapea estamentos largos a nombres cortos con tooltip completo", () => {
    expect(client).toContain("formatEstamentoCorto");
    expect(client).toContain("title={`Estamento oficial: ${estamentoStyle.original}`}");
  });

  it("provee filtros por nombre, municipalidad, contrato, estamento, rango de sueldo y horas extras", () => {
    expect(client).toContain("ESTAMENTOS_OPTIONS");
    expect(client).toContain("CONTRATOS_OPTIONS");
    expect(client).toContain("RANGOS_SUELDO");
    expect(client).toContain("soloHorasExtras");
    expect(client).toContain("handleResetFilters");
  });

  it("presenta el monto como dato del período y no como sueldo vigente", () => {
    expect(client).toContain("Monto bruto reportado");
    expect(client).toContain("Monto bruto / período");
    expect(client).toContain("Período informado:");
    expect(client).toContain("El registro no acredita que la persona siga en el cargo ni que cubra el mes completo.");
    expect(client).not.toContain("Sueldo Bruto Mensual");
    expect(client).toContain("formatCLP");
    expect(client).toContain("hrs extras");
  });

  it("muestra tarjeta de resumen municipal cuando hay datos", () => {
    expect(client).toContain("Resumen de Nómina Oficial");
    expect(client).toContain("Funcionarios en nómina");
    expect(client).toContain("Sueldo bruto promedio");
  });

  it("consulta el Worker también con alcance nacional", () => {
    expect(personasClient).not.toContain('if (organismoFilter === "Todos") {');
    expect(personasClient).toContain("include_zero");
    expect(personasClient).toContain("Reintentar consulta");
  });

  it("muestra período y alcance del monto en el directorio que sirve /personas", () => {
    expect(personasClient).toContain("Monto bruto reportado:");
    expect(personasClient).toContain("Monto bruto / período");
    expect(personasClient).toContain("getPayrollPeriodContext(periodoReportado)");
    expect(personasClient).toContain("Guía CPLT");
  });

  it("explica como mensualizados los montos de planillas CPLT hasta marzo de 2025", () => {
    const context = getPayrollPeriodContext("2025-01");

    expect(context.isCpltMonthlyizedPeriod).toBe(true);
    expect(context.message).toContain("monto bruto publicado es mensualizado");
    expect(context.message).not.toContain("ni mes completo");
  });

  it("no extiende la aclaración de mensualización a abril de 2025 ni a períodos inválidos", () => {
    expect(getPayrollPeriodContext("2025-04").isCpltMonthlyizedPeriod).toBe(false);
    expect(getPayrollPeriodContext("No informado").isCpltMonthlyizedPeriod).toBe(false);
  });
});
