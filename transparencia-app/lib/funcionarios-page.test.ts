import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

  it("destaca el sueldo bruto y formatea horas extras", () => {
    expect(client).toContain("Sueldo Bruto Mensual");
    expect(client).toContain("formatCLP");
    expect(client).toContain("hrs extras");
  });

  it("muestra tarjeta de resumen municipal cuando hay datos", () => {
    expect(client).toContain("Resumen de Nómina Oficial");
    expect(client).toContain("Funcionarios en nómina");
    expect(client).toContain("Sueldo bruto promedio");
  });

  it("no consulta el Worker con alcance nacional no soportado", () => {
    expect(personasClient).toContain('if (organismoFilter === "Todos")');
    expect(personasClient).toContain("Selecciona un organismo");
  });
});
