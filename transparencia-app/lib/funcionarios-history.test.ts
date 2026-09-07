import { describe, expect, it } from "vitest";
import { buildFuncionarioSalaryHistory } from "./funcionarios-history";
import type { FuncionarioPublico } from "./funcionarios";

function row(overrides: Partial<FuncionarioPublico>): FuncionarioPublico {
  return {
    id: "id",
    nombre_completo: "Ana Pérez Soto",
    organo_nombre: "Municipalidad de Prueba",
    organo_tipo: "municipalidad",
    cargo: "Profesional",
    estamento: "Profesional",
    tipo_contrato: "Planta",
    remuneracion_bruta_mensual: 1_000_000,
    remuneracion_liquida_mensual: null,
    fecha_ingreso: "2024-01-01",
    horas_extras_mes_anterior: 0,
    monto_horas_extras_clp: 0,
    ...overrides,
  };
}

describe("buildFuncionarioSalaryHistory", () => {
  it("ordena por período y suma varias filas de la misma persona en un corte", () => {
    const history = buildFuncionarioSalaryHistory([
      row({ id: "mar", fuente_periodo: "2026-03", remuneracion_bruta_mensual: 900_000, remuneracion_liquida_mensual: 700_000 }),
      row({ id: "apr-a", fuente_periodo: "2026-04", remuneracion_bruta_mensual: 1_000_000, remuneracion_liquida_mensual: 780_000, horas_extras_mes_anterior: 4, monto_horas_extras_clp: 50_000 }),
      row({ id: "apr-b", fuente_periodo: "2026-04", remuneracion_bruta_mensual: 100_000, remuneracion_liquida_mensual: 80_000, horas_extras_mes_anterior: 1, monto_horas_extras_clp: 10_000 }),
      row({ id: "other", nombre_completo: "Otra Persona", fuente_periodo: "2026-04", remuneracion_bruta_mensual: 9_000_000 }),
    ], "ana   perez soto");

    expect(history).toEqual([
      { periodo: "2026-03", etiqueta: "Mar 2026", bruto: 900_000, liquido: 700_000, horasExtras: 0, montoHorasExtras: 0, registros: 1 },
      { periodo: "2026-04", etiqueta: "Abr 2026", bruto: 1_100_000, liquido: 860_000, horasExtras: 5, montoHorasExtras: 60_000, registros: 2 },
    ]);
  });

  it("conserva como no informado el líquido cuando la fuente no lo publica", () => {
    const history = buildFuncionarioSalaryHistory([
      row({ fuente_periodo: "2026-05", remuneracion_liquida_mensual: null, monto_horas_extras_clp: undefined as unknown as number }),
    ], "Ana Pérez Soto");

    expect(history[0]?.liquido).toBeNull();
    expect(history[0]?.montoHorasExtras).toBeNull();
  });
});
