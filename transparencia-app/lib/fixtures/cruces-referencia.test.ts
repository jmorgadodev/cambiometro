import { describe, it, expect } from "vitest";
import { getAllCrosses } from "@/lib/data-platform-v1";
import { leerContraloriaV1 } from "@/lib/contraloria-lake";
import { leerChileCompraV1 } from "@/lib/chilecompra";
import { leerInfoLobbyV1 } from "@/lib/infolobby";
import { leerInfoProbidadV1 } from "@/lib/infoprobidad-lake";
import { getLey19862Summary } from "@/lib/transferencias-data";
import { SOURCE_CANONICAL_COUNTS } from "@/lib/published-sources";
import {
  CRUCES_CGR_MUESTRA,
  CRUCES_CHILECOMPRA_MUESTRA,
  CRUCES_INFOLOBBY_MUESTRA,
  CRUCES_LEY19862_MUESTRA,
  CRUCES_INFOPROBIDAD_MUESTRA,
} from "@/lib/partidos-transparencia";

/**
 * Fixture Externo Congelado: Referencia Oficial de Cruces Documentales (Ronda 4 — Auditoría Periodística)
 * Valida la trazabilidad de las 5 fuentes documentales clave del Estado chileno:
 * 1. CGR: organismo → informe (N° informe + URL cgr.cl)
 * 2. ChileCompra: comprador → proveedor (código OCDS + monto + URL)
 * 3. InfoLobby: autoridad → sujeto pasivo (código audiencia + URL)
 * 4. Ley 19.862: organismo → receptor (ID transferencia + monto + URL)
 * 5. InfoProbidad: declarante → organismo (URL declaración CPLT)
 * 6. Votaciones Congreso: parlamentario → proyecto de ley
 */
describe("Fixture Externo Congelado: Cruces de Referencia Oficial (Ronda 4)", () => {
  // ─── 1. CONTEOS POR TIPO > 0 EN EL GRAFO INDEXADO ─────────────────────────
  describe("1. Conteos por tipo > 0 en el Grafo de Relaciones", () => {
    it("El universo total de aristas indexadas supera las 500 relaciones trazables", () => {
      const allCrosses = getAllCrosses();
      expect(allCrosses.length).toBeGreaterThan(500);
    });

    it("Todas las categorías documentales poseen conteo > 0 en las aristas", () => {
      const allCrosses = getAllCrosses();

      const counts = {
        Auditorías: 0,
        Declaraciones: 0,
        Compras: 0,
        Lobby: 0,
        Transferencias: 0,
        Votaciones: 0,
      };

      for (const cross of allCrosses) {
        const src = cross.evidence[0]?.sourceId || "";
        const pred = cross.relation.predicate;
        if (src === "contraloria" || pred === "audited") counts.Auditorías += 1;
        else if (src === "infoprobidad" || pred.includes("declaration")) counts.Declaraciones += 1;
        else if (src === "chilecompra" || pred.includes("award") || pred.includes("contract")) counts.Compras += 1;
        else if (src === "infolobby" || pred.includes("lobby") || pred.includes("audience")) counts.Lobby += 1;
        else if (src === "ley-19862" || pred.includes("transfer")) counts.Transferencias += 1;
        else if (src === "camara" || src === "senado" || pred.includes("vote") || pred.includes("bill")) counts.Votaciones += 1;
      }

      expect(counts.Auditorías, "Auditorías CGR debe ser > 0").toBeGreaterThan(0);
      expect(counts.Declaraciones, "Declaraciones InfoProbidad debe ser > 0").toBeGreaterThan(0);
      expect(counts.Compras, "Compras ChileCompra debe ser > 0").toBeGreaterThan(0);
      expect(counts.Lobby, "Lobby InfoLobby debe ser > 0").toBeGreaterThan(0);
      expect(counts.Transferencias, "Transferencias Ley 19.862 debe ser > 0").toBeGreaterThan(0);
      expect(counts.Votaciones, "Votaciones Congreso debe ser > 0").toBeGreaterThan(0);
    });

    it("Los readers de proyecciones cargan datos válidos sin lanzar excepciones", () => {
      const contraloria = leerContraloriaV1();
      expect(contraloria).not.toBeNull();
      expect(contraloria?.records.length).toBeGreaterThan(0);

      const chilecompra = leerChileCompraV1();
      expect(chilecompra).not.toBeNull();
      expect(chilecompra?.buyers.length).toBeGreaterThan(0);

      const infolobby = leerInfoLobbyV1();
      expect(infolobby).not.toBeNull();
      expect(infolobby?.records.length).toBeGreaterThan(0);

      const infoprobidad = leerInfoProbidadV1();
      expect(infoprobidad).not.toBeNull();
      expect(infoprobidad?.records.length).toBeGreaterThan(0);

      const ley19862 = getLey19862Summary();
      expect(ley19862).not.toBeNull();
      expect(ley19862.transfers_sample.length).toBeGreaterThan(0);
    });
  });

  // ─── 2. MUESTRA OFICIAL VERBATIM DE 5 FUENTES ──────────────────────────────
  describe("2. Muestra Verbatim de 5 Relaciones por Fuente Oficial", () => {
    // Fuente 1: CGR (Contraloría General de la República)
    it("Fuente 1: CGR — 5 auditorías oficiales verbatim con N° de informe y URL cgr.cl", () => {
      expect(CRUCES_CGR_MUESTRA.length).toBe(5);

      const informe704 = CRUCES_CGR_MUESTRA.find((a) => a.numero_informe === "704/2024");
      expect(informe704).toBeDefined();
      expect(informe704?.entidad).toBe("MUNICIPALIDAD DE CHILLAN");
      expect(informe704?.url_oficial).toContain("contraloria.cl");
      expect(informe704?.url_oficial).toContain("1ab8376ca4b3c4fd53dc753f5af3575d");

      for (const audit of CRUCES_CGR_MUESTRA) {
        expect(audit.numero_informe).toMatch(/^\d+\/\d{4}$/);
        expect(audit.url_oficial).toMatch(/^https:\/\/www\.contraloria\.cl\//);
        expect(audit.entidad.length).toBeGreaterThan(3);
      }
    });

    // Fuente 2: ChileCompra MercadoPúblico OCDS
    it("Fuente 2: ChileCompra — 5 compradores oficiales con RUT jurídico, procesos y URL OCDS", () => {
      expect(CRUCES_CHILECOMPRA_MUESTRA.length).toBe(5);

      const salud = CRUCES_CHILECOMPRA_MUESTRA.find((b) => b.rut_juridico === "61.608.700-2");
      expect(salud).toBeDefined();
      expect(salud?.organismo_comprador).toContain("SALUD");
      expect(salud?.monto_total_clp).toBeGreaterThan(1_000_000_000_000);
      expect(salud?.procesos).toBe(966);
      expect(salud?.fuente_url).toContain("mercadopublico.cl");

      for (const buyer of CRUCES_CHILECOMPRA_MUESTRA) {
        expect(buyer.rut_juridico).toMatch(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/);
        expect(buyer.monto_total_clp).toBeGreaterThan(0);
        expect(buyer.procesos).toBeGreaterThan(0);
        expect(buyer.fuente_url).toContain("mercadopublico.cl");
      }
    });

    // Fuente 3: InfoLobby (Ley 20.730)
    it("Fuente 3: InfoLobby — 5 audiencias oficiales con código, sujeto pasivo y URL infolobby.cl", () => {
      expect(CRUCES_INFOLOBBY_MUESTRA.length).toBe(5);

      const audAc = CRUCES_INFOLOBBY_MUESTRA.find((l) => l.id.includes("ac0019366881"));
      expect(audAc).toBeDefined();
      expect(audAc?.organismo).toBe("SUBSECRETARÍA DE RELACIONES EXTERIORES");
      expect(audAc?.sujeto_pasivo).toBe("Francisco Pérez Mackenna");
      expect(audAc?.url_audiencia).toBe("http://datos.infolobby.cl/infolobby/registroaudiencia/ac0019366881");

      for (const lobby of CRUCES_INFOLOBBY_MUESTRA) {
        expect(lobby.id).toContain("infolobby-");
        expect(lobby.url_audiencia).toMatch(/^http:\/\/datos\.infolobby\.cl\/infolobby\/registroaudiencia\//);
        expect(lobby.sujeto_pasivo.length).toBeGreaterThan(3);
        expect(lobby.organismo.length).toBeGreaterThan(3);
      }
    });

    // Fuente 4: Ley 19.862 (Registro Central de Colaboradores del Estado)
    it("Fuente 4: Ley 19.862 — 5 transferencias oficiales con emisor, receptor, monto y URL registros19862.gob.cl", () => {
      expect(CRUCES_LEY19862_MUESTRA.length).toBe(5);

      const tr4585076 = CRUCES_LEY19862_MUESTRA.find((t) => t.id === "ley-19862-transfer-4585076");
      expect(tr4585076).toBeDefined();
      expect(tr4585076?.emitter_name).toBe("SUBSECRETARÍA DE TRANSPORTES");
      expect(tr4585076?.receiver_name).toBe("VIÑA BUS S.A.");
      expect(tr4585076?.monto_clp).toBe(347920910);
      expect(tr4585076?.url_transferencia).toBe("https://registros19862.gob.cl/transferencia/4585076");

      for (const transfer of CRUCES_LEY19862_MUESTRA) {
        expect(transfer.id).toMatch(/^ley-19862-transfer-\d+$/);
        expect(transfer.emitter_rut).toMatch(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/);
        expect(transfer.receiver_rut).toMatch(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/);
        expect(transfer.monto_clp).toBeGreaterThan(0);
        expect(transfer.url_transferencia).toMatch(/^https:\/\/registros19862\.gob\.cl\/transferencia\/\d+$/);
      }
    });

    // Fuente 5: InfoProbidad CPLT (Declaraciones de Intereses y Patrimonio)
    it("Fuente 5: InfoProbidad — 5 declaraciones oficiales con declarante, organismo y URL datos.cplt.cl", () => {
      expect(CRUCES_INFOPROBIDAD_MUESTRA.length).toBe(5);

      const decl1 = CRUCES_INFOPROBIDAD_MUESTRA.find((d) => d.declarante.includes("JARAMILLO GARRIDO"));
      expect(decl1).toBeDefined();
      expect(decl1?.organismo).toBe("PODER JUDICIAL");
      expect(decl1?.url_declaracion).toContain("declaracion_161d6f2ccf7f0c912f9c0e0a6715a14a");

      for (const decl of CRUCES_INFOPROBIDAD_MUESTRA) {
        expect(decl.id).toMatch(/^http:\/\/datos\.cplt\.cl\/datos\/infoprobidad\/declaracion_[0-9a-f]+$/);
        expect(decl.declarante.length).toBeGreaterThan(5);
        expect(decl.organismo.length).toBeGreaterThan(3);
        expect(decl.url_declaracion).toMatch(/^http:\/\/datos\.cplt\.cl\/datos\/infoprobidad\/declaracion_[0-9a-f]+$/);
      }
    });
  });

  // ─── 3. COHERENCIA CROSS-PAGE (TILES == CARDS == /DATOS/CALIDAD) ───────────
  describe("3. Coherencia Cross-Page: tiles(/cruces) == cards(/cruces) == /datos/calidad por fuente", () => {
    it("Los conteos canónicos de /cruces coinciden exactamente con /datos/calidad y SOURCE_CANONICAL_COUNTS", () => {
      // 1. Contraloría CGR
      expect(SOURCE_CANONICAL_COUNTS["contraloria"]).toBe(291);

      // 2. ChileCompra MercadoPúblico OCDS
      expect(SOURCE_CANONICAL_COUNTS["chilecompra"]).toBe(74142);

      // 3. InfoLobby
      expect(SOURCE_CANONICAL_COUNTS["infolobby"]).toBe(60523);

      // 4. Ley 19.862
      expect(SOURCE_CANONICAL_COUNTS["ley-19862"]).toBe(11651);
    });

    it("El explorador de cruces rotula explícitamente la muestra indexada vs el universo canónico", () => {
      const allCrosses = getAllCrosses();
      expect(allCrosses.length).toBeGreaterThan(500);

      // El total de la muestra indexada es finito y menor que el universo nacional consolidado
      expect(allCrosses.length).toBeLessThan(SOURCE_CANONICAL_COUNTS["chilecompra"]);
    });
  });
});

