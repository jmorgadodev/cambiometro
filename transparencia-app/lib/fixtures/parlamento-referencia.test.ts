import { describe, it, expect } from "vitest";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { SLUG_TO_POLITICO, getPoliticoSlug } from "@/lib/politico-slugs";
import { remuneracionParaPolitico } from "@/lib/remuneraciones";
import { personalApoyoParaSenador, personalApoyoParaDiputado } from "@/lib/personal-apoyo";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import dataRemuneraciones from "@/data/remuneraciones-38bis.json";

/**
 * Fixture Externo Congelado: Referencia Oficial de Parlamento (Ronda 1 — Auditoría Periodística)
 * Fuentes: senado.cl/transparencia/dietas, camara.cl/transparencia/dietas, CPLT Transparencia Activa,
 * Consejo Resolutivo de Asignaciones Parlamentarias y BCN Fichas Biográficas.
 */
describe("Fixture Externo Congelado: Referencia Oficial de Parlamento (Ronda 1)", () => {
  // 1. DIETA OFICIAL: 205/205 parlamentarios con $8.291.039 brutos (o $9.110.534 autoridades de mesa)
  it("1. DIETA OFICIAL: los 205 parlamentarios tienen asignada la dieta oficial $8.291.039 (o $9.110.534 mesa)", async () => {
    expect(POLITICOS_SEED.length).toBe(205);
    const dietasUnicas = new Set<number>();

    for (const pol of POLITICOS_SEED) {
      const rem = await remuneracionParaPolitico(pol.nombre_completo);
      expect(rem, `Remuneración oficial no encontrada para ${pol.nombre_completo}`).not.toBeNull();
      expect([8291039, 9110534]).toContain(rem?.bruto_mensual);
      if (rem) dietasUnicas.add(rem.bruto_mensual);
    }

    // Comprobar que no queda ningún valor antiguo traspuesto ($8.239.091)
    const jsonStr = JSON.stringify(dataRemuneraciones);
    expect(jsonStr).not.toContain("8239091");
    expect(dietasUnicas.has(8291039)).toBe(true);
  });

  // 2. RECALCULAR V2: Vanessa Kaiser con base oficial de tope de personal ($11.406.149) y exceso +33,7%
  it("2. RECALCULAR V2: Vanessa Kaiser mantiene evaluación ALTA y fórmula de exceso +33,7% con regla oficial", () => {
    const BASE_OFICIAL_PERSONAL_SENADO = 11_406_149;
    const TOTAL_KAISER_JULIO = 15_250_000;

    const evalKaiser = evaluateSenateSupport({
      total_clp: TOTAL_KAISER_JULIO,
      period: "2026-07",
      base_mensual_clp: BASE_OFICIAL_PERSONAL_SENADO,
      verified_transfers: [],
    });

    expect(evalKaiser.status).toBe("ALTA");
    expect(evalKaiser.excess_clp).toBe(3843851);
    expect(evalKaiser.base_mensual_clp).toBe(BASE_OFICIAL_PERSONAL_SENADO);

    const pct = ((TOTAL_KAISER_JULIO - BASE_OFICIAL_PERSONAL_SENADO) / BASE_OFICIAL_PERSONAL_SENADO) * 100;
    const formattedPct = `+${pct.toFixed(1).replace(".", ",")}%`;
    expect(formattedPct).toBe("+33,7%");
  });

  // 3. MUESTRA DE 5 FICHAS PARLAMENTARIAS VERBATIM
  describe("3. Muestra de 5 Fichas Parlamentarias Oficiales", () => {
    it("Ficha 1: Vanessa Kaiser (Senador, C11, PNL, Dieta $8.291.039, Personal $15.250.000)", async () => {
      const kaiser = SLUG_TO_POLITICO.get("vanessa-kaiser-barents-von-hohenhagen");
      expect(kaiser).toBeDefined();
      expect(kaiser?.cargo).toBe("Senador");
      expect(kaiser?.circunscripcion).toBe(11);
      expect(kaiser?.partido_id).toBe("pnl");

      const rem = await remuneracionParaPolitico(kaiser!.nombre_completo);
      expect(rem?.bruto_mensual).toBe(8291039);

      const personal = await personalApoyoParaSenador(kaiser!.nombre_completo);
      const julio = personal.registros.filter((r) => r.periodo === "2026-07");
      const totalJulio = julio.reduce((s, r) => s + r.monto, 0);
      expect(totalJulio).toBe(15250000);
      expect(julio.length).toBe(7);
    });

    it("Ficha 2: Paulina Núñez Urrutia (Senador / Presidenta del Senado, C3, RN, Dieta $9.110.534)", async () => {
      const nunez = POLITICOS_SEED.find((p) => p.nombre_completo.toLowerCase().includes("paulina núñez"));
      expect(nunez).toBeDefined();
      expect(nunez?.cargo).toBe("Senador");
      expect(nunez?.circunscripcion).toBe(3);
      expect(nunez?.partido_id).toBe("rn");

      const rem = await remuneracionParaPolitico(nunez!.nombre_completo);
      expect(rem?.bruto_mensual).toBe(9110534);

      const personal = await personalApoyoParaSenador(nunez!.nombre_completo);
      const julio = personal.registros.filter((r) => r.periodo === "2026-07");
      const totalJulio = julio.reduce((s, r) => s + r.monto, 0);
      expect(totalJulio).toBe(14844699);
      expect(julio.length).toBe(5);
    });

    it("Ficha 3: Alfonso de Urresti Longton (Senador, C12, PS, Dieta $8.291.039)", async () => {
      const urresti = POLITICOS_SEED.find((p) => p.nombre_completo.toLowerCase().includes("urresti"));
      expect(urresti).toBeDefined();
      expect(urresti?.cargo).toBe("Senador");
      expect(urresti?.circunscripcion).toBe(12);
      expect(urresti?.partido_id).toBe("ps");

      const rem = await remuneracionParaPolitico(urresti!.nombre_completo);
      expect(rem?.bruto_mensual).toBe(8291039);

      const personal = await personalApoyoParaSenador(urresti!.nombre_completo);
      const julio = personal.registros.filter((r) => r.periodo === "2026-07");
      const totalJulio = julio.reduce((s, r) => s + r.monto, 0);
      expect(totalJulio).toBe(14988938);
      expect(julio.length).toBe(7);
    });

    it("Ficha 4: Jorge Alessandri Vergara (Diputado / Presidente Cámara, D10, UDI, Dieta $9.110.534)", async () => {
      const alessandri = POLITICOS_SEED.find((p) => p.nombre_completo.toLowerCase().includes("jorge alessandri"));
      expect(alessandri).toBeDefined();
      expect(alessandri?.cargo).toBe("Diputado");
      expect(alessandri?.numero_distrito).toBe(10);
      expect(alessandri?.partido_id).toBe("udi");

      const rem = await remuneracionParaPolitico(alessandri!.nombre_completo);
      expect(rem?.bruto_mensual).toBe(9110534);

      const personal = await personalApoyoParaDiputado("1009");
      expect(personal.n_personas).toBe(5);
      expect(personal.total_mensual).toBe(8946054);
    });

    it("Ficha 5: Boris Barrera Moreno (Diputado, D9, PCCh, Dieta $8.291.039)", async () => {
      const barrera = POLITICOS_SEED.find((p) => p.nombre_completo.toLowerCase().includes("boris barrera"));
      expect(barrera).toBeDefined();
      expect(barrera?.cargo).toBe("Diputado");
      expect(barrera?.numero_distrito).toBe(9);
      expect(barrera?.partido_id).toBe("pc");

      const rem = await remuneracionParaPolitico(barrera!.nombre_completo);
      expect(rem?.bruto_mensual).toBe(8291039);

      const personal = await personalApoyoParaDiputado("1012");
      expect(personal.n_personas).toBe(9);
      expect(personal.total_mensual).toBe(13203657);
    });
  });

  // 4. DIRECTORIO VIGENTE: CERO parlamentarios vencidos (ej. Johannes Kaiser)
  it("4. DIRECTORIO VIGENTE: ningún parlamentario con período vencido listado como vigente", () => {
    // Exactamente 155 diputados y 50 senadores
    const diputados = POLITICOS_SEED.filter((p) => p.cargo === "Diputado");
    const senadores = POLITICOS_SEED.filter((p) => p.cargo === "Senador");
    expect(diputados.length).toBe(155);
    expect(senadores.length).toBe(50);

    // CERO Johannes Kaiser en el directorio activo 2026-2030
    const johannes = POLITICOS_SEED.find((p) => p.nombre_completo.toLowerCase().includes("johannes kaiser"));
    expect(johannes).toBeUndefined();

    // Comprobar que no hay slugs con nombres de exdiputados vencidos
    const allSlugs = POLITICOS_SEED.map((p) => getPoliticoSlug(p));
    expect(allSlugs).not.toContain("johannes-kaiser");
    expect(allSlugs).toContain("vanessa-kaiser-barents-von-hohenhagen");
  });
});
