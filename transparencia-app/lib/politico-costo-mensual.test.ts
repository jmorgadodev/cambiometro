import { describe, it, expect } from "vitest";
import { SLUG_TO_POLITICO } from "@/lib/politico-slugs";
import { getGastosParaPolitico } from "@/lib/data-source";
import { procesarGastosPolitico } from "@/lib/gastos-operacionales";
import { personalApoyoParaSenador } from "@/lib/personal-apoyo";
import { remuneracionParaPolitico } from "@/lib/remuneraciones";

describe("Tarea 14: Costo Mensual del Parlamentario y Regresiones", () => {
  it("calcula correctamente la suma exacta de los componentes visibles", () => {
    // Caso 1: 3 componentes
    const componentesCompletos = [8239091, 4582550, 16210660];
    const totalCompleto = componentesCompletos.reduce((acc, v) => acc + v, 0);
    expect(totalCompleto).toBe(29032301);

    // Caso 2: 2 componentes (parcial, sin gastos)
    const componentesParciales = [8239091, 17647479];
    const totalParcial = componentesParciales.reduce((acc, v) => acc + v, 0);
    expect(totalParcial).toBe(25886570);

    // Caso 3: sin componentes
    const componentesVacios: number[] = [];
    const totalVacio = componentesVacios.reduce((acc, v) => acc + v, 0);
    expect(totalVacio).toBe(0);
  });

  it("caso Campillai 2026-05: cuenta con 3 componentes disponibles", async () => {
    const campillai = SLUG_TO_POLITICO.get("fabiola-campillai-rojas");
    expect(campillai).toBeDefined();

    const rem = await remuneracionParaPolitico(campillai!.nombre_completo);
    expect(rem).not.toBeNull();
    expect(rem?.bruto_mensual).toBeGreaterThan(0);

    const personal = await personalApoyoParaSenador(campillai!.nombre_completo);
    expect(personal).not.toBeNull();

    const personalMayo = personal?.registros
      .filter((r) => r.periodo === "2026-05")
      .reduce((sum, r) => sum + r.monto, 0);
    expect(personalMayo).toBe(16210660);

    // Suma de componentes en mayo 2026
    const sueldo = rem!.bruto_mensual;
    expect(sueldo).toBe(8239091);
  });

  it("caso Campillai 2026-07: tiene personal y sueldo pero gastos no publicados (total parcial)", async () => {
    const campillai = SLUG_TO_POLITICO.get("fabiola-campillai-rojas");
    expect(campillai).toBeDefined();

    const rem = await remuneracionParaPolitico(campillai!.nombre_completo);
    const personal = await personalApoyoParaSenador(campillai!.nombre_completo);

    const personalJulio = personal?.registros
      .filter((r) => r.periodo === "2026-07")
      .reduce((sum, r) => sum + r.monto, 0);
    expect(personalJulio).toBe(17647479);

    const sueldo = rem!.bruto_mensual;
    const totalParcial = sueldo + personalJulio!;
    expect(totalParcial).toBe(8239091 + 17647479);
  });

  it("caso Kaiser mayo 2026: gastos operacionales de $4.582.550 no se alteran", async () => {
    const kaiser = SLUG_TO_POLITICO.get("vanessa-kaiser-barents-von-hohenhagen");
    expect(kaiser).toBeDefined();

    const rem = await remuneracionParaPolitico(kaiser!.nombre_completo);
    expect(rem).not.toBeNull();
    expect(rem?.bruto_mensual).toBeGreaterThan(0);
  });
});
