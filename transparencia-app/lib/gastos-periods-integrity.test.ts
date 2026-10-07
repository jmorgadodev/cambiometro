import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { procesarGastosPolitico } from "./gastos-operacionales";
import type { EtlRecord } from "./data-source";

function expenses(rows: Array<{ periodo: string; monto_clp: number | null }>): EtlRecord[] {
  return rows.map((row, index) => ({ ...row, id: `fixture-${index}`, item: "TOTAL" })) as unknown as EtlRecord[];
}

describe("cortes de gastos defendibles", () => {
  it("no ofrece como seleccionable un corte sin monto calculable", () => {
    const result = procesarGastosPolitico(expenses([
      { periodo: "2026-05", monto_clp: 100 },
      { periodo: "2026-06", monto_clp: null },
    ]));
    expect(result.periodos).toEqual(["2026-05"]);
    expect(result.ultimoPeriodo).toBe("2026-05");
  });
  it("rechaza meses inexistentes y conserva el cero explícito", () => {
    const result = procesarGastosPolitico(expenses([
      { periodo: "2026-13", monto_clp: 100 },
      { periodo: "2026-07", monto_clp: 0 },
    ]));
    expect(result.periodos).toEqual(["2026-07"]);
    expect(result.meses[0].total).toBe(0);
  });
  it("no presenta un salto entre cortes como variación mensual", () => {
    const result = procesarGastosPolitico(expenses([
      { periodo: "2026-04", monto_clp: 100 },
      { periodo: "2026-06", monto_clp: 200 },
    ]));
    expect(result.meses[1].variacion).toBeNull();
  });
  it("compara meses consecutivos incluso al cambiar de año", () => {
    const result = procesarGastosPolitico(expenses([
      { periodo: "2025-12", monto_clp: 100 },
      { periodo: "2026-01", monto_clp: 150 },
    ]));
    expect(result.meses[1].variacion).toBe(50);
  });
  it("retira el agregado sin conciliar de pantalla, props y promesas SEO", () => {
    const page = readFileSync("app/gastos-operacionales/page.tsx", "utf8");
    const client = readFileSync("components/GastosOperacionalesExplorerClient.tsx", "utf8");
    expect(client).toContain("Total monetario: En revisión");
    expect(client).not.toContain("money(summary.totalMontoClp)");
    expect(page).not.toContain("universo completo");
    expect(page).toContain("summary={publicSummary}");
  });
  it("no interpreta la ausencia de montos en la ficha como gasto cero", () => {
    const result = procesarGastosPolitico(expenses([{ periodo: "2026-06", monto_clp: null }]));
    expect(result.meses).toEqual([]);
    expect(result.ultimoPeriodo).toBe("");
    const page = readFileSync("app/politico/[id]/page.tsx", "utf8");
    expect(page).toContain('mesesGastos.length > 0 ? formatCLP(gastosTotales) : "Monto no informado"');
    expect(page).toContain("Suma de montos informados");
  });
});
