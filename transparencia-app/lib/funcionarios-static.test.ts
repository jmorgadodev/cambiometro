import { describe, expect, it } from "vitest";
import { queryStaticFuncionarios } from "./funcionarios-static";

const rows = [
  { id: "1", nombre_completo: "Ana Pérez", organo_nombre: "Municipalidad de Maipú", organo_tipo: "municipalidad", cargo: "Alcaldesa", estamento: "Profesional", tipo_contrato: "Planta", remuneracion_bruta_mensual: 2_000_000, fecha_ingreso: "2020-01-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0, fuente_periodo: "2026-06" },
  { id: "2", nombre_completo: "Bruno Soto", organo_nombre: "Municipalidad de Maipú", organo_tipo: "municipalidad", cargo: "Técnico", estamento: "Técnico", tipo_contrato: "Contrata", remuneracion_bruta_mensual: 1_000, fecha_ingreso: "2026-06-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0, fuente_periodo: "2026-06" },
  { id: "3", nombre_completo: "Carla Díaz", organo_nombre: "Municipalidad de Maipú", organo_tipo: "municipalidad", cargo: "Administrativa", estamento: "Administrativo", tipo_contrato: "Contrata", remuneracion_bruta_mensual: 0, fecha_ingreso: "2026-06-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0, fuente_periodo: "2026-06" },
] as never[];

describe("consulta de nómina estática", () => {
  it("conserva ceros y faltantes y calcula estadísticas del filtro antes de paginar", () => {
    const sample = [...rows, { ...(rows[2] as Record<string, unknown>), id: "missing", remuneracion_bruta_mensual: null }] as never[];
    const result = queryStaticFuncionarios(sample, { contrato: "Contrata", limit: 1 });
    expect(result.meta.total).toBe(3);
    expect(result.meta.amountCounts).toEqual({ positive: 1, zero: 1, negative: 0, missing: 1 });
    expect(result.meta.sueldoCompletoCount).toBeNull();
    expect(result.meta.stats.scope).toBe("filtered_records");
    expect(result.meta.stats.promedioSueldo).toBe(500);
    expect(queryStaticFuncionarios(sample, { contrato: "Contrata", limit: 10 }).meta.stats).toEqual(result.meta.stats);
  });
  it("aplica el mismo contrato de filtros/paginación que el Worker", () => {
    const result = queryStaticFuncionarios(rows, { contrato: "Contrata", page: 1, limit: 10 });
    expect(result.data.map((row) => row.id)).toEqual(["2", "3"]);
    expect(result.meta.total).toBe(2);
    expect(result.meta.totalHeadcount).toBe(2);
    expect(result.meta.sourceStatus).toBe("static-fallback");
  });

  it("separa pagos sin monto y micro-montos sin inventar registros", () => {
    const result = queryStaticFuncionarios(rows);
    expect(result.meta.sinPagoCount).toBe(1);
    expect(result.meta.microMontoCount).toBe(1);
    expect(result.meta.sueldoCompletoCount).toBeNull();
    expect(result.meta.amountCounts).toEqual({ positive: 2, zero: 1, negative: 0, missing: 0 });
  });

  it("permite filtrar correcciones de formato y datos observados por auditoría", () => {
    const auditedRows = [
      { id: "format", nombre_completo: ". Diego Pérez", organo_nombre: "Municipalidad", organo_tipo: "municipalidad", cargo: "Profesional", estamento: "Profesional", tipo_contrato: "Planta", remuneracion_bruta_mensual: 2_000_000, remuneracion_liquida_mensual: 1_500_000, fecha_ingreso: "2020-01-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0 },
      { id: "observed", nombre_completo: "Eva Soto", organo_nombre: "Municipalidad", organo_tipo: "municipalidad", cargo: "Profesional", estamento: "Profesional", tipo_contrato: "Planta", remuneracion_bruta_mensual: 2_000_000, remuneracion_liquida_mensual: 0, fecha_ingreso: "2020-01-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0 },
    ] as never[];

    expect(queryStaticFuncionarios(auditedRows, { calidad: "corregidos", page: 1, limit: 10 }).data.map((row) => row.id)).toEqual(["format"]);
    expect(queryStaticFuncionarios(auditedRows, { calidad: "observados", page: 1, limit: 10 }).data).toEqual([]);
    const missingLiquid = auditedRows.map(row => ({ ...(row as Record<string, unknown>), remuneracion_liquida_mensual: null })) as never[];
    expect(queryStaticFuncionarios(missingLiquid, { calidad: "observados" }).data.map(row => row.id)).toEqual(["format", "observed"]);
  });
});
