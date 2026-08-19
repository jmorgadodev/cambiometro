import { describe, expect, it } from "vitest";
import {
  esFilaResumenTotal,
  formatPeriodoMes,
  procesarGastosPolitico,
  assertGastosConsistency,
} from "./gastos-operacionales";
import { POLITICOS_SEED } from "./seed-politicos";
import { getGastosParaPolitico, type EtlRecord } from "./data-source";

describe("M7 - Gastos Operacionales: prevención de doble conteo y consistencia build-time", () => {
  it("detecta correctamente filas de resumen total", () => {
    expect(esFilaResumenTotal("VALOR TOTAL")).toBe(true);
    expect(esFilaResumenTotal("valor total")).toBe(true);
    expect(esFilaResumenTotal("TOTAL")).toBe(true);
    expect(esFilaResumenTotal("TOTAL GASTOS")).toBe(true);
    expect(esFilaResumenTotal("TOTAL GASTOS OPERACIONALES")).toBe(true);
    expect(esFilaResumenTotal("TRASLACION VEHICULO")).toBe(false);
    expect(esFilaResumenTotal("TELEFONIA CELULAR")).toBe(false);
    expect(esFilaResumenTotal("ARRIENDO OFICINAS")).toBe(false);
  });

  it("formatea períodos legibles en español", () => {
    expect(formatPeriodoMes("2026-05")).toMatch(/may.*2026/i);
    expect(formatPeriodoMes("2026-04")).toMatch(/abr.*2026/i);
  });

  it("resuelve el caso vivo (mayo 2026) evitando la duplicación 2x de VALOR TOTAL", () => {
    const rawRecords = [
      {
        id: "rec-1",
        periodo: "2026-05",
        item: "VALOR TOTAL",
        monto_clp: 18330206,
      },
      {
        id: "rec-2",
        periodo: "2026-05",
        item: "TRASLACION VEHICULO",
        monto_clp: 7847170,
      },
      {
        id: "rec-3",
        periodo: "2026-05",
        item: "TELEFONIA CELULAR",
        monto_clp: 2845068,
      },
      {
        id: "rec-4",
        periodo: "2026-05",
        item: "ARRIENDO OFICINAS",
        monto_clp: 7637968,
      },
    ];

    const result = procesarGastosPolitico(rawRecords as unknown as EtlRecord[]);

    expect(result.meses).toHaveLength(1);
    const may = result.meses[0];

    // total_mes es exactamente $18.330.206 (NO $36.660.412)
    expect(may.total).toBe(18330206);
    expect(may.sumaItems).toBe(18330206);
    expect(may.totalPublicadoFuente).toBe(18330206);
    expect(may.diferenciaExplicada).toBeNull();

    // VALOR TOTAL NO se incluye en la lista de items desagregados
    expect(may.items).toHaveLength(3);
    expect(may.items.map((i) => i.item)).toEqual([
      "TRASLACION VEHICULO",
      "ARRIENDO OFICINAS",
      "TELEFONIA CELULAR",
    ]);

    // La suma de los items es igual al total del mes
    const sumItems = may.items.reduce((acc, i) => acc + i.monto, 0);
    expect(sumItems).toBe(may.total);

    // Acumulado coincide con total del mes
    expect(result.totalAcumulado).toBe(18330206);
  });

  it("calcula variación % vs mes anterior sobre totales corregidos", () => {
    const rawRecords = [
      {
        id: "rec-1",
        periodo: "2026-04",
        item: "VALOR TOTAL",
        monto_clp: 10000000,
      },
      {
        id: "rec-2",
        periodo: "2026-04",
        item: "ITEM A",
        monto_clp: 10000000,
      },
      {
        id: "rec-3",
        periodo: "2026-05",
        item: "VALOR TOTAL",
        monto_clp: 15000000,
      },
      {
        id: "rec-4",
        periodo: "2026-05",
        item: "ITEM A",
        monto_clp: 15000000,
      },
    ];

    const result = procesarGastosPolitico(rawRecords as unknown as EtlRecord[]);

    expect(result.meses).toHaveLength(2);
    expect(result.meses[0].total).toBe(10000000);
    expect(result.meses[0].variacion).toBeNull();
    expect(result.meses[1].total).toBe(15000000);
    // Variación correcta (+50%)
    expect(result.meses[1].variacion).toBe(50);
    expect(result.totalAcumulado).toBe(25000000);
  });

  it("explica y badges discrepancias si la fuente oficial publica un total que difiere de la suma de ítems", () => {
    const rawRecords = [
      {
        id: "rec-1",
        periodo: "2026-05",
        item: "VALOR TOTAL",
        monto_clp: 20000000, // Fuente dice 20M
      },
      {
        id: "rec-2",
        periodo: "2026-05",
        item: "TRASLACION",
        monto_clp: 12000000,
      },
      {
        id: "rec-3",
        periodo: "2026-05",
        item: "OFICINA",
        monto_clp: 6000000,
      },
      // Items suman 18M
    ];

    const result = procesarGastosPolitico(rawRecords as unknown as EtlRecord[]);
    const may = result.meses[0];

    expect(may.total).toBe(18000000);
    expect(may.sumaItems).toBe(18000000);
    expect(may.totalPublicadoFuente).toBe(20000000);
    expect(may.diferenciaExplicada).not.toBeNull();
    expect(may.diferenciaExplicada?.diferencia).toBe(2000000);
    expect(may.diferenciaExplicada?.mensaje).toContain("La fuente oficial publicó un total de $20.000.000 pero el desglose de ítems suma $18.000.000");
  });

  it("valida la aserción de consistencia sin errores en todos los parlamentarios de la base de datos", () => {
    for (const p of POLITICOS_SEED) {
      const records = getGastosParaPolitico(p);
      expect(() => assertGastosConsistency(p.id, records)).not.toThrow();
    }
  });
});
