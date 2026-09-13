import { describe, expect, it } from "vitest";
import { queryStaticFuncionarios } from "./funcionarios-static";

const rows = [
  { id: "1", nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad de Maipú", organo_tipo: "municipalidad", cargo: "Alcaldesa", estamento: "Profesional", tipo_contrato: "Planta", remuneracion_bruta_mensual: 2_000_000, fecha_ingreso: "2020-01-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0, fuente_periodo: "2026-06" },
  { id: "2", nombre_completo: "Bruno Soto", organo_nombre: "Municipalidad de Maipú", organo_tipo: "municipalidad", cargo: "Técnico", estamento: "Técnico", tipo_contrato: "Contrata", remuneracion_bruta_mensual: 1_000, fecha_ingreso: "2026-06-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0, fuente_periodo: "2026-06" },
  { id: "3", nombre_completo: "Carla Díaz", organo_nombre: "Municipalidad de Maipú", organo_tipo: "municipalidad", cargo: "Administrativa", estamento: "Administrativo", tipo_contrato: "Contrata", remuneracion_bruta_mensual: 0, fecha_ingreso: "2026-06-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0, fuente_periodo: "2026-06" },
] as never[];

describe("consulta de nómina estática", () => {
  it("aplica el mismo contrato de filtros/paginación que el Worker", () => {
    const result = queryStaticFuncionarios(rows, { contrato: "Contrata", page: 1, limit: 10 });
    expect(result.data.map((row) => row.id)).toEqual(["2"]);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalHeadcount).toBe(3);
    expect(result.meta.sourceStatus).toBe("static-fallback");
  });

  it("separa pagos sin monto y micro-montos sin inventar registros", () => {
    const result = queryStaticFuncionarios(rows);
    expect(result.meta.sinPagoCount).toBe(1);
    expect(result.meta.microMontoCount).toBe(1);
    expect(result.meta.sueldoCompletoCount).toBe(1);
  });

  it("permite filtrar correcciones de formato y datos observados por auditoría", () => {
    const auditedRows = [
      { id: "format", nombre_completo: ". Diego Pérez", organo_nombre: "Municipalidad", organo_tipo: "municipalidad", cargo: "Profesional", estamento: "Profesional", tipo_contrato: "Planta", remuneracion_bruta_mensual: 2_000_000, remuneracion_liquida_mensual: 1_500_000, fecha_ingreso: "2020-01-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0 },
      { id: "observed", nombre_completo: "Eva Soto", organo_nombre: "Municipalidad", organo_tipo: "municipalidad", cargo: "Profesional", estamento: "Profesional", tipo_contrato: "Planta", remuneracion_bruta_mensual: 2_000_000, remuneracion_liquida_mensual: 0, fecha_ingreso: "2020-01-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0 },
    ] as never[];

    expect(queryStaticFuncionarios(auditedRows, { calidad: "corregidos", page: 1, limit: 10 }).data.map((row) => row.id)).toEqual(["format"]);
    expect(queryStaticFuncionarios(auditedRows, { calidad: "observados", page: 1, limit: 10 }).data.map((row) => row.id)).toEqual(["observed"]);
  });
});
