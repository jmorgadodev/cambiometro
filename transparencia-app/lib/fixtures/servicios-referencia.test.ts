import { describe, it, expect } from "vitest";
import { getServicioPublicoById, SERVICIOS_PUBLICOS_SEED } from "@/lib/servicios-publicos";
import { getRutOficialServicio, validateModulo11 } from "@/lib/servicios-publicos-rut";
import { PRESUPUESTO_CONFIG_POR_SERVICIO, presupuestoParaServicio } from "@/lib/presupuesto";
import { getServicioPublicoEnriquecido } from "@/lib/servicios-publicos-data";

/**
 * Fixture Externo Congelado: Referencia Oficial de Servicios Públicos (Ronda 2 — Auditoría Periodística)
 * Fuentes canónicas:
 * - Ley Nº 21.796 de Presupuestos del Sector Público 2026 (BCN idNorma 1219410)
 * - Dirección de Presupuestos (DIPRES) · Reportes de Ejecución Presupuestaria
 * - MercadoPúblico / ChileCompra OCDS (RUT oficial del comprador)
 * - Consejo para la Transparencia (CPLT) Transparencia Activa
 * - Decretos Supremos y BCN Reseñas Oficiales
 */
describe("Fixture Externo Congelado: Referencia Oficial de Servicios Públicos (Ronda 2)", () => {
  // 1. MUESTRA DE 5 SERVICIOS: SENCE, FONASA, SII, MINSAL, MOP
  describe("1. Auditoría Verbatim de 5 Servicios Públicos", () => {
    // SENCE
    it("Servicio 1: SENCE (Partida 08, Cap. 04, RUT 61.531.000-K, Ley 21.796)", () => {
      const sence = getServicioPublicoById("serv-sence");
      expect(sence).toBeDefined();
      expect(sence?.sigla).toBe("SENCE");
      expect(sence?.director_jefe_actual).toBe("Rodrigo Valdivia Lefort (s)");
      expect(sence?.fuente_director).toContain("sence.gob.cl");

      const rut = getRutOficialServicio("serv-sence");
      expect(rut).toBe("61.531.000-K");
      expect(validateModulo11(rut!)).toBe(true);

      const cfg = PRESUPUESTO_CONFIG_POR_SERVICIO["serv-sence"];
      expect(cfg.partida).toBe("8");
      expect(cfg.capitulo).toBe("4");

      const pres = presupuestoParaServicio("serv-sence");
      expect(pres).not.toBeNull();
      expect(pres?.inicial_ley_clp).toBe(269_461_866_000);
      expect(pres?.vigente_clp).toBe(264_674_890_000);
      expect(pres?.ejecutado_clp).toBe(127_524_324_000);
      expect(pres?.porcentaje_ejecucion).toBe(48.2);

      const enriched = getServicioPublicoEnriquecido("serv-sence");
      expect(enriched?.personal?.dotacion_total).toBe(1154);
      expect(enriched?.compras?.procesos_count).toBe(135);
      expect(enriched?.compras?.monto_total_clp).toBe(970_465_511);
    });

    // FONASA
    it("Servicio 2: FONASA (Partida 11, Cap. 02, RUT 61.603.000-0, Ley 21.796)", () => {
      const fonasa = getServicioPublicoById("serv-fonasa");
      expect(fonasa).toBeDefined();
      expect(fonasa?.sigla).toBe("FONASA");
      expect(fonasa?.director_jefe_actual).toBe("César Oyarzo");
      expect(fonasa?.fuente_director).toContain("fonasa.cl");

      const rut = getRutOficialServicio("serv-fonasa");
      expect(rut).toBe("61.603.000-0");
      expect(validateModulo11(rut!)).toBe(true);

      const cfg = PRESUPUESTO_CONFIG_POR_SERVICIO["serv-fonasa"];
      expect(cfg.partida).toBe("11");
      expect(cfg.capitulo).toBe("2");

      const pres = presupuestoParaServicio("serv-fonasa");
      expect(pres).not.toBeNull();
      expect(pres?.inicial_ley_clp).toBe(4_502_308_594_000);
      expect(pres?.vigente_clp).toBe(4_506_394_588_000);
      expect(pres?.ejecutado_clp).toBe(2_491_850_991_000);
      expect(pres?.porcentaje_ejecucion).toBe(55.3);

      const enriched = getServicioPublicoEnriquecido("serv-fonasa");
      expect(enriched?.personal?.dotacion_total).toBe(1280);
      expect(enriched?.compras?.procesos_count).toBe(351);
      expect(enriched?.compras?.monto_total_clp).toBe(345_667_590_259);
    });

    // SII
    it("Servicio 3: SII (Partida 05, Cap. 04, RUT 60.803.000-K, Ley 21.796)", () => {
      const sii = getServicioPublicoById("serv-sii");
      expect(sii).toBeDefined();
      expect(sii?.sigla).toBe("SII");
      expect(sii?.director_jefe_actual).toBe("Jorge Trujillo");
      expect(sii?.fuente_director).toContain("sii.cl");

      const rut = getRutOficialServicio("serv-sii");
      expect(rut).toBe("60.803.000-K");
      expect(validateModulo11(rut!)).toBe(true);

      const cfg = PRESUPUESTO_CONFIG_POR_SERVICIO["serv-sii"];
      expect(cfg.partida).toBe("5");
      expect(cfg.capitulo).toBe("4");

      const pres = presupuestoParaServicio("serv-sii");
      expect(pres).not.toBeNull();
      expect(pres?.inicial_ley_clp).toBe(61_208_838_000);
      expect(pres?.vigente_clp).toBe(61_208_838_000);
      expect(pres?.ejecutado_clp).toBe(38_037_143_000);
      expect(pres?.porcentaje_ejecucion).toBe(62.1);

      const enriched = getServicioPublicoEnriquecido("serv-sii");
      expect(enriched?.personal?.dotacion_total).toBe(5220);
      expect(enriched?.compras?.procesos_count).toBe(409);
      expect(enriched?.compras?.monto_total_clp).toBe(1_121_907_958);
    });

    // MINSAL
    it("Servicio 4: MINSAL (Partida 11, RUT 61.601.000-K, Ley 21.796)", () => {
      const minsal = getServicioPublicoById("min-salud");
      expect(minsal).toBeDefined();
      expect(minsal?.sigla).toBe("MINSAL");
      expect(minsal?.director_jefe_actual).toBe("May Chomali Garib");
      expect(minsal?.fuente_director).toContain("minsal.cl");

      const rut = getRutOficialServicio("min-salud");
      expect(rut).toBe("61.601.000-K");
      expect(validateModulo11(rut!)).toBe(true);

      const cfg = PRESUPUESTO_CONFIG_POR_SERVICIO["min-salud"];
      expect(cfg.partida).toBe("11");

      const pres = presupuestoParaServicio("min-salud");
      expect(pres).not.toBeNull();
      expect(pres?.inicial_ley_clp).toBe(4_502_308_594_000);
      expect(pres?.vigente_clp).toBe(4_506_394_588_000);
      expect(pres?.ejecutado_clp).toBe(2_491_850_991_000);
      expect(pres?.porcentaje_ejecucion).toBe(55.3);

      const enriched = getServicioPublicoEnriquecido("min-salud");
      expect(enriched?.compras?.procesos_count).toBe(3571);
      expect(enriched?.compras?.monto_total_clp).toBe(13_995_643_046);
    });

    // MOP
    it("Servicio 5: MOP (Partida 12, RUT 61.202.000-0, Ley 21.796)", () => {
      const mop = getServicioPublicoById("min-mop");
      expect(mop).toBeDefined();
      expect(mop?.sigla).toBe("MOP");
      expect(mop?.director_jefe_actual).toBe("Louis de Grange Concha");
      expect(mop?.fuente_director).toContain("mop.cl");

      const rut = getRutOficialServicio("min-mop");
      expect(rut).toBe("61.202.000-0");
      expect(validateModulo11(rut!)).toBe(true);

      const cfg = PRESUPUESTO_CONFIG_POR_SERVICIO["min-mop"];
      expect(cfg.partida).toBe("12");

      const pres = presupuestoParaServicio("min-mop");
      expect(pres).not.toBeNull();
      expect(pres?.inicial_ley_clp).toBe(9_401_108_902_000);
      expect(pres?.vigente_clp).toBe(9_903_312_488_000);
      expect(pres?.ejecutado_clp).toBe(4_272_596_383_000);
      expect(pres?.porcentaje_ejecucion).toBe(43.1);

      const enriched = getServicioPublicoEnriquecido("min-mop");
      expect(enriched?.compras?.procesos_count).toBe(9179);
      expect(enriched?.compras?.monto_total_clp).toBe(260_206_344_550);
    });
  });

  // 2. REGLA R10: CERO HARDCODING Y CONSISTENCIA DE FUENTES
  describe("2. Regla R10: Integridad y Cero Hardcoding", () => {
    it("Todos los RUTs jurídicos asignados cumplen Módulo 11", () => {
      for (const serv of SERVICIOS_PUBLICOS_SEED) {
        const rut = getRutOficialServicio(serv.id);
        if (rut) {
          expect(validateModulo11(rut), `RUT inválido para ${serv.id}: ${rut}`).toBe(true);
        }
      }
    });

    it("Servicios sin partida presupuestaria retornan null y no inventan cifras", () => {
      // Un servicio no mapeado a partida
      const sinPartida = presupuestoParaServicio("servicio-inexistente-xyz");
      expect(sinPartida).toBeNull();
    });
  });
});
