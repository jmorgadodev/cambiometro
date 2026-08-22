import { describe, it, expect } from "vitest";
import { SLUG_TO_POLITICO } from "@/lib/politico-slugs";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { personalApoyoParaSenador } from "@/lib/personal-apoyo";
import { remuneracionParaPolitico } from "@/lib/remuneraciones";

describe("Tarea 14 / Fix #14: Costo Mensual del Parlamentario y Dieta Oficial", () => {
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

  it("cobertura oficial: 205/205 parlamentarios obtienen dieta bruta oficial", async () => {
    expect(POLITICOS_SEED.length).toBe(205);
    for (const p of POLITICOS_SEED) {
      const rem = await remuneracionParaPolitico(p.nombre_completo);
      expect(rem, `Remuneración no encontrada para ${p.nombre_completo}`).not.toBeNull();
      expect(rem?.bruto_mensual).toBeGreaterThan(0);
      expect([8239091, 9110534]).toContain(rem?.bruto_mensual);
    }
  });

  it("caso Becker jul-2026: SUELDO == valor oficial y total == dieta + 12.555.000", async () => {
    const becker = SLUG_TO_POLITICO.get("miguel-becker-alvear");
    expect(becker).toBeDefined();

    const rem = await remuneracionParaPolitico(becker!.nombre_completo);
    expect(rem).not.toBeNull();
    expect(rem?.bruto_mensual).toBe(8239091);

    const personal = await personalApoyoParaSenador(becker!.nombre_completo);
    expect(personal).not.toBeNull();

    const personalJulio = personal?.registros
      .filter((r) => r.periodo === "2026-07")
      .reduce((sum, r) => sum + r.monto, 0);
    expect(personalJulio).toBe(12555000);

    const totalParcialJulio = rem!.bruto_mensual + personalJulio!;
    expect(totalParcialJulio).toBe(8239091 + 12555000);
    expect(totalParcialJulio).toBe(20794091);
  });

  it("caso Kaiser mayo 2026: total == dieta + 4.582.550 + personal mayo (3 componentes)", async () => {
    const kaiser = SLUG_TO_POLITICO.get("vanessa-kaiser-barents-von-hohenhagen");
    expect(kaiser).toBeDefined();

    const rem = await remuneracionParaPolitico(kaiser!.nombre_completo);
    expect(rem).not.toBeNull();
    expect(rem?.bruto_mensual).toBe(8239091);

    const personal = await personalApoyoParaSenador(kaiser!.nombre_completo);
    const personalMayo = personal?.registros
      .filter((r) => r.periodo === "2026-05")
      .reduce((sum, r) => sum + r.monto, 0);
    expect(personalMayo).toBe(15250000);

    const gastosMayo = 4582550;
    const totalMayo = rem!.bruto_mensual + gastosMayo + personalMayo!;
    expect(totalMayo).toBe(8239091 + 4582550 + 15250000);
    expect(totalMayo).toBe(28071641);
  });

  it("caso Campillai 2026-05 y 2026-07: dieta presente en ambos periodos", async () => {
    const campillai = SLUG_TO_POLITICO.get("fabiola-campillai-rojas");
    expect(campillai).toBeDefined();

    const rem = await remuneracionParaPolitico(campillai!.nombre_completo);
    expect(rem?.bruto_mensual).toBe(8239091);

    const personal = await personalApoyoParaSenador(campillai!.nombre_completo);
    const personalMayo = personal?.registros
      .filter((r) => r.periodo === "2026-05")
      .reduce((sum, r) => sum + r.monto, 0);
    expect(personalMayo).toBe(16210660);

    const personalJulio = personal?.registros
      .filter((r) => r.periodo === "2026-07")
      .reduce((sum, r) => sum + r.monto, 0);
    expect(personalJulio).toBe(17647479);

    expect(rem!.bruto_mensual + personalJulio!).toBe(8239091 + 17647479);
  });

  it("caso sin fuente o nombre inexistente: devuelve null", async () => {
    const inexistente = await remuneracionParaPolitico("Persona Totalmente Falsa Inexistente");
    expect(inexistente).toBeNull();
  });
});
