import release from "@/data/remuneraciones-38bis-publico.json";
import audit from "@/data/remuneraciones-38bis-publico-audit.json";
import manifest from "@/data/remuneraciones-38bis-publico-manifest.json";
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

  it("mantiene los indicadores del corte actual en el manifiesto raíz", () => {
    const current = manifest.periodos.find((period) => period.mes === manifest.mes);
    expect(current).toBeDefined();
    expect(manifest.comparison).toEqual(current?.comparison);
    expect(manifest.comparison.entradas).toBeGreaterThan(0);
    expect(manifest.comparison.salidas_observadas).toBeGreaterThan(0);
    expect(manifest.comparison.cambios).toBeGreaterThan(0);
  });
});
