import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyFuncionarioRecord } from "./funcionarios-quality";

describe("interpretación conservadora de nóminas", () => {
  it("no afirma ausencia de pago, sueldo completo ni error de origen sólo por el importe", () => {
    for (const bruto of [null, 0, 200, 468212]) {
      const result = classifyFuncionarioRecord({ remuneracion_bruta_mensual: bruto, observaciones: "Sin observaciones" });
      expect(result.nivelConfianza).toBe("En revisión de origen");
      expect(result.explicacionCiudadana).not.toMatch(/sin liquidación|no corresponde a un sueldo|estándar|calculada conforme/i);
      expect(result.isSueldoCompleto).toBe(false);
      expect(result.isMicroMonto).toBe(false);
      expect(result.isAnomalia).toBe(false);
    }
  });
  it("distingue el cero explícito del monto ausente", () => {
    expect(classifyFuncionarioRecord({ remuneracion_bruta_mensual: 0 }).isSinPago).toBe(false);
    expect(classifyFuncionarioRecord({ remuneracion_bruta_mensual: null }).isSinPago).toBe(true);
    expect(classifyFuncionarioRecord({ remuneracion_bruta_mensual: 0 }).etiquetaCausa).toBe("Monto cero informado");
  });
  it("no infiere prorrateo por una fecha aislada", () => {
    const result = classifyFuncionarioRecord({ remuneracion_bruta_mensual: 1000, fecha_ingreso: "2026-06-01", observaciones: "Sin observaciones" });
    expect(result.causaId).toBeNull();
  });
  it("no llama personas únicas a registros ni resta como sueldo base", () => {
    const ui = readFileSync("components/municipalidades/MunicipalidadDetailDashboardClient.tsx", "utf8");
    expect(ui).not.toContain("personas físicas registradas");
    expect(ui).not.toContain("Dato de alcaldía no publicado");
    const builder = readFileSync("scripts/rebuild-authoritative-municipalidades.mjs", "utf8");
    expect(builder).not.toContain("const base = Math.max(0, bruto - heMonto)");
  });
});
