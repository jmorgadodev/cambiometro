import release from "@/data/remuneraciones-38bis-publico.json";
import audit from "@/data/remuneraciones-38bis-publico-audit.json";
import manifest from "@/data/remuneraciones-38bis-publico-manifest.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("release público de remuneraciones 38 bis", () => {
  it("conserva el universo completo sin convertirlo en una consulta D1", () => {
    expect(release.filas).toBeGreaterThan(500);
    expect(release.registros).toHaveLength(release.filas);
    expect(release.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.d1_rows_read).toBe(0);
    expect(audit.d1_rows_written).toBe(0);
  });

  it("incluye el registro oficial del caso de 1,9 millones", () => {
    const row = release.registros.find((item) => item.nombre === "CRISTOBAL JAVIER SOTO FUENTES");
    expect(row).toMatchObject({
      organismo: "MINISTERIO DEL INTERIOR",
      cargo: "ASESOR JUNIOR",
      bruto_mensual: 1_900_000,
    });
  });

  it("publica las comparaciones del corte actual y mantiene sus detalles alineados", () => {
    expect(manifest.comparison).toMatchObject({
      estado: "comparado",
      periodo_anterior: "2026-05",
      entradas: 52,
      salidas_observadas: 50,
      cambios: 438,
    });
    expect(manifest.periodos[0].comparison).toEqual(manifest.comparison);
  });

  it("mantiene las tres listas comparativas completas y no confunde ausencia de monto con cero", () => {
    const comparisonPath = join(process.cwd(), "public", "data", "remuneraciones-38bis", "months", manifest.mes, "comparison.json");
    const comparison = JSON.parse(readFileSync(comparisonPath, "utf8")) as {
      entradas: unknown[];
      salidas_observadas: unknown[];
      cambios: Array<{ bruto_anterior: number | null; bruto_actual: number | null }>;
    };

    expect(comparison.entradas).toHaveLength(manifest.comparison.entradas);
    expect(comparison.salidas_observadas).toHaveLength(manifest.comparison.salidas_observadas);
    expect(comparison.cambios).toHaveLength(manifest.comparison.cambios);
    expect(comparison.cambios.every((row) => row.bruto_anterior !== null && row.bruto_actual !== null)).toBe(true);
  });
});
