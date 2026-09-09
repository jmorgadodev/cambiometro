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

  it("encuentra un registro histórico por nombre sin convertirlo en parte del corte actual", () => {
    const historicalRows = [
      { id: "historical", nombre_completo: "Maria Victoria Raimann Pumpin", organo_nombre: "Municipalidad de Independencia", organo_tipo: "municipalidad", cargo: "Medico Cirujano", estamento: "Profesional", tipo_contrato: "Contrata", remuneracion_bruta_mensual: 1_876_569, fecha_ingreso: "2024-04-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0, fuente_periodo: "2024-04" },
    ] as never[];
    const current = queryStaticFuncionarios(historicalRows, { query: "Maria Victoria Raimann Pumpin", periodo: "2026-07", page: 1, limit: 10 });
    const allPeriods = queryStaticFuncionarios(historicalRows, { query: "Maria Victoria Raimann Pumpin", periodo: "Todos", page: 1, limit: 10 });

    expect(current.meta.total).toBe(0);
    expect(allPeriods.meta.total).toBe(1);
    expect(allPeriods.data[0].fuente_periodo).toBe("2024-04");
  });

  it("acepta el contrato de Código del Trabajo como etiqueta de interfaz", () => {
    const result = queryStaticFuncionarios([
      { id: "codigo", nombre_completo: "Carlos Código", organo_nombre: "Municipalidad", organo_tipo: "municipalidad", cargo: "Operario", estamento: "Auxiliar", tipo_contrato: "Código del Trabajo", remuneracion_bruta_mensual: 800_000, fecha_ingreso: "2024-01-01", horas_extras_mes_anterior: 0, monto_horas_extras_clp: 0 },
    ] as never[], { contrato: "CodigoTrabajo", page: 1, limit: 10 });
    expect(result.meta.total).toBe(1);
  });
});
