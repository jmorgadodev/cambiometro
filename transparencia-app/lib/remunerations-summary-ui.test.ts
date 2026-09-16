import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("resumen mensual de remuneraciones", () => {
  it("no publica una gráfica ni un acceso a detalle mensual que confundan la consulta", () => {
    const page = readFileSync(resolve(import.meta.dirname, "../app/remuneraciones-publicas/page.tsx"), "utf8");
    const client = readFileSync(resolve(import.meta.dirname, "../components/remuneraciones/Remuneraciones38BisClient.tsx"), "utf8");

    expect(page).not.toContain("Ver detalle mensual");
    expect(client).not.toContain("RemuneracionesHistoryChart");
  });

  it("conserva los detalles comparables que sí aportan a la ficha", () => {
    const client = readFileSync(resolve(import.meta.dirname, "../components/remuneraciones/Remuneraciones38BisClient.tsx"), "utf8");

    expect(client).toContain("Nuevos registros");
    expect(client).toContain("Registros que ya no aparecen");
    expect(client).toContain("Cambios de monto");
    expect(client).toContain("bruto_anterior");
    expect(client).toContain("bruto_actual");
    expect(client).toContain("Ver ficha");
  });
});
