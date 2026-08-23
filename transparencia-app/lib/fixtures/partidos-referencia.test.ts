import { describe, expect, it } from "vitest";
import {
  PARTIDOS_TRANSPARENCIA_MUESTRA,
  TRANSFERENCIAS_PARLAMENTARIOS_MUESTRA,
  CRUCES_CGR_MUESTRA,
  CRUCES_CHILECOMPRA_MUESTRA,
  CRUCES_INFOLOBBY_MUESTRA,
  CRUCES_LEY19862_MUESTRA,
  getPartidoTransparencia,
} from "../partidos-transparencia";
import { SOURCE_CANONICAL_COUNTS } from "../published-sources";
import { getLey19862Summary } from "../transferencias-data";
import { leerContraloriaV1 } from "../contraloria-lake";
import { leerChileCompraV1 } from "../chilecompra";
import { leerInfoLobbyV1 } from "../infolobby";

/**
 * Fixture Externo Congelado — Ronda 4: Auditoría Periodística Partidos, Transferencias y Cruces
 * 
 * Anclas oficiales congeladas:
 * - Declaraciones de patrimonio/intereses de directivas (Ley 19.862 / Ley 20.880 / InfoProbidad)
 * - Financiamiento público (FCM / Aportes Trimestrales SERVEL Ley 20.900 / DFL 4 Ley 18.603)
 * - Padrón de militantes activos SERVEL
 * - Muestra de 10 transferencias / declaraciones oficiales de parlamentarios
 * - 4 fuentes de cruces: CGR (auditorías), ChileCompra (procesos), InfoLobby (audiencias), Ley 19.862 (transferencias)
 */

describe("Fixture Externo Congelado: Referencia Oficial de Partidos, Transferencias y Cruces (Ronda 4)", () => {
  describe("1. Muestra de 5 Partidos Políticos (RN, UDI, PPD, PCCh, PNL)", () => {
    it("Partido 1: Renovación Nacional (RN)", () => {
      const rn = getPartidoTransparencia("rn");
      expect(rn).not.toBeNull();
      expect(rn?.sigla).toBe("RN");
      expect(rn?.nombre_oficial).toBe("Renovación Nacional");
      expect(rn?.directiva.presidente).toBe("Rodrigo Galilea Vial");
      expect(rn?.directiva.secretario_general).toBe("Andrea Balladares Fuentes");
      expect(rn?.directiva.declaracion_patrimonio_url).toContain("infoprobidad.cl");
      expect(rn?.financiamiento_publico.recibe_aporte_trimestral).toBe(true);
      expect(rn?.financiamiento_publico.resolucion_servel).toContain("SERVEL");
      expect(rn?.padron_afiliados.total_afiliados).toBe(38412);
      expect(rn?.padron_afiliados.fecha_corte).toBe("31-12-2025");
      expect(rn?.padron_afiliados.fuente_padron_url).toContain("servel.cl");
    });

    it("Partido 2: Unión Demócrata Independiente (UDI)", () => {
      const udi = getPartidoTransparencia("udi");
      expect(udi).not.toBeNull();
      expect(udi?.sigla).toBe("UDI");
      expect(udi?.nombre_oficial).toBe("Unión Demócrata Independiente");
      expect(udi?.directiva.presidente).toBe("Guillermo Ramírez Diez");
      expect(udi?.directiva.secretario_general).toBe("Juan Antonio Coloma Álamos");
      expect(udi?.directiva.declaracion_patrimonio_url).toContain("infoprobidad.cl");
      expect(udi?.financiamiento_publico.recibe_aporte_trimestral).toBe(true);
      expect(udi?.financiamiento_publico.resolucion_servel).toContain("SERVEL");
      expect(udi?.padron_afiliados.total_afiliados).toBe(33218);
      expect(udi?.padron_afiliados.fecha_corte).toBe("31-12-2025");
      expect(udi?.padron_afiliados.fuente_padron_url).toContain("servel.cl");
    });

    it("Partido 3: Partido por la Democracia (PPD)", () => {
      const ppd = getPartidoTransparencia("ppd");
      expect(ppd).not.toBeNull();
      expect(ppd?.sigla).toBe("PPD");
      expect(ppd?.nombre_oficial).toBe("Partido por la Democracia");
      expect(ppd?.directiva.presidente).toBe("Jaime Quintana Leal");
      expect(ppd?.directiva.secretario_general).toBe("José Toro Kemp");
      expect(ppd?.directiva.declaracion_patrimonio_url).toContain("infoprobidad.cl");
      expect(ppd?.financiamiento_publico.recibe_aporte_trimestral).toBe(true);
      expect(ppd?.financiamiento_publico.resolucion_servel).toContain("SERVEL");
      expect(ppd?.padron_afiliados.total_afiliados).toBe(27304);
      expect(ppd?.padron_afiliados.fecha_corte).toBe("31-12-2025");
      expect(ppd?.padron_afiliados.fuente_padron_url).toContain("servel.cl");
    });

    it("Partido 4: Partido Comunista de Chile (PCCh)", () => {
      const pc = getPartidoTransparencia("pc");
      expect(pc).not.toBeNull();
      expect(pc?.sigla).toBe("PCCh");
      expect(pc?.nombre_oficial).toBe("Partido Comunista de Chile");
      expect(pc?.directiva.presidente).toBe("Lautaro Carmona Soto");
      expect(pc?.directiva.secretario_general).toBe("Bárbara Figueroa Sandoval");
      expect(pc?.directiva.declaracion_patrimonio_url).toContain("infoprobidad.cl");
      expect(pc?.financiamiento_publico.recibe_aporte_trimestral).toBe(true);
      expect(pc?.financiamiento_publico.resolucion_servel).toContain("SERVEL");
      expect(pc?.padron_afiliados.total_afiliados).toBe(45719);
      expect(pc?.padron_afiliados.fecha_corte).toBe("31-12-2025");
      expect(pc?.padron_afiliados.fuente_padron_url).toContain("servel.cl");
    });

    it("Partido 5: Partido Nacional Libertario (PNL - Cero datos inventados)", () => {
      const pnl = getPartidoTransparencia("pnl");
      expect(pnl).not.toBeNull();
      expect(pnl?.sigla).toBe("PNL");
      expect(pnl?.nombre_oficial).toBe("Partido Nacional Libertario");
      expect(pnl?.directiva.presidente).toBe("Johannes Kaiser Barents-Von Hohenhagen");
      expect(pnl?.directiva.secretario_general).toBe("Ángel Soto");
      expect(pnl?.directiva.declaracion_patrimonio_url).toContain("infoprobidad.cl");
      expect(pnl?.financiamiento_publico.recibe_aporte_trimestral).toBe(false);
      expect(pnl?.financiamiento_publico.resolucion_servel).toContain("—");
      expect(pnl?.financiamiento_publico.monto_anual_referencia_clp).toBeNull();
      expect(pnl?.padron_afiliados.total_afiliados).toBe(4150);
      expect(pnl?.padron_afiliados.fecha_corte).toBe("31-12-2025");
      expect(pnl?.padron_afiliados.fuente_padron_url).toContain("servel.cl");
    });
  });

  describe("2. Muestra de 10 Parlamentarios con Transferencias y Declaraciones Oficiales", () => {
    it("Contiene exactamente 10 parlamentarios verificados con URLs a registros oficiales", () => {
      expect(TRANSFERENCIAS_PARLAMENTARIOS_MUESTRA.length).toBe(10);
      for (const p of TRANSFERENCIAS_PARLAMENTARIOS_MUESTRA) {
        expect(p.politico_id).toBeDefined();
        expect(p.nombre_completo.length).toBeGreaterThan(5);
        expect(p.url_declaracion_oficial).toMatch(/^https?:\/\//);
        expect(p.organismo_revisor).toBeDefined();
        expect(p.detalle_financiamiento).toBeDefined();
      }
    });

    it("Valida casos específicos de la muestra parlamentaria", () => {
      const kaiser = TRANSFERENCIAS_PARLAMENTARIOS_MUESTRA.find((p) => p.politico_id === "dip-johannes-kaiser");
      expect(kaiser).toBeDefined();
      expect(kaiser?.partido_sigla).toBe("PNL");
      expect(kaiser?.url_declaracion_oficial).toContain("infoprobidad.cl");

      const cariola = TRANSFERENCIAS_PARLAMENTARIOS_MUESTRA.find((p) => p.politico_id === "dip-karol-cariola");
      expect(cariola).toBeDefined();
      expect(cariola?.partido_sigla).toBe("PC");

      const quintana = TRANSFERENCIAS_PARLAMENTARIOS_MUESTRA.find((p) => p.politico_id === "sen-jaime-quintana");
      expect(quintana).toBeDefined();
      expect(quintana?.cargo).toBe("Senador");
    });
  });

  describe("3. Cruces Oficiales (4 fuentes)", () => {
    it("Fuente 1: CGR (Contraloría General de la República) — 5 auditorías oficiales verificadas", () => {
      expect(CRUCES_CGR_MUESTRA.length).toBe(5);
      for (const audit of CRUCES_CGR_MUESTRA) {
        expect(audit.numero_informe).toMatch(/^\d+\/\d{4}$/);
        expect(audit.url_oficial).toContain("contraloria.cl");
        expect(audit.entidad.length).toBeGreaterThan(3);
      }

      const lakeCgr = leerContraloriaV1();
      expect(lakeCgr?.records.length).toBeGreaterThan(50);
    });

    it("Fuente 2: ChileCompra — Procesos y montos oficiales OCDS", () => {
      expect(CRUCES_CHILECOMPRA_MUESTRA.length).toBe(5);
      for (const buyer of CRUCES_CHILECOMPRA_MUESTRA) {
        expect(buyer.rut_juridico).toMatch(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/);
        expect(buyer.monto_total_clp).toBeGreaterThan(0);
        expect(buyer.procesos).toBeGreaterThan(0);
        expect(buyer.fuente_url).toContain("mercadopublico.cl");
      }

      const lakeCc = leerChileCompraV1();
      expect(lakeCc?.buyers.length).toBeGreaterThan(500);
      expect(SOURCE_CANONICAL_COUNTS["chilecompra"]).toBe(74142);
    });

    it("Fuente 3: InfoLobby — 5 audiencias oficiales con código y trazabilidad", () => {
      expect(CRUCES_INFOLOBBY_MUESTRA.length).toBe(5);
      for (const lobby of CRUCES_INFOLOBBY_MUESTRA) {
        expect(lobby.id).toContain("infolobby-");
        expect(lobby.url_audiencia).toContain("infolobby.cl");
        expect(lobby.sujeto_pasivo.length).toBeGreaterThan(3);
      }

      const lakeLobby = leerInfoLobbyV1();
      expect(lakeLobby).not.toBeNull();
      expect(SOURCE_CANONICAL_COUNTS["infolobby"]).toBe(60523);
    });

    it("Fuente 4: Ley 19.862 — 5 transferencias con respaldo documental y código oficial", () => {
      expect(CRUCES_LEY19862_MUESTRA.length).toBe(5);
      for (const transfer of CRUCES_LEY19862_MUESTRA) {
        expect(transfer.id).toMatch(/^ley-19862-transfer-\d+$/);
        expect(transfer.emitter_rut).toMatch(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/);
        expect(transfer.receiver_rut).toMatch(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/);
        expect(transfer.monto_clp).toBeGreaterThan(0);
        expect(transfer.url_transferencia).toContain("registros19862.gob.cl");
      }

      const summary = getLey19862Summary();
      expect(summary.kpis.total_transfers).toBe(59361);
      expect(summary.kpis.total_receptores).toBe(14640);
    });
  });
});
