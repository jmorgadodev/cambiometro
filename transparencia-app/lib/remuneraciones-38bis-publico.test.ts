import release from "@/data/remuneraciones-38bis-publico.json";
import audit from "@/data/remuneraciones-38bis-publico-audit.json";
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
});
