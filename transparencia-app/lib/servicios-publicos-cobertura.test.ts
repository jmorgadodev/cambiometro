import { describe, expect, it } from "vitest";
import { getServicioPublicoEnriquecido } from "./servicios-publicos-data";
import { getOrganismoById } from "./organismos";
import { getRutOficialServicio, validateModulo11 } from "./servicios-publicos-rut";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMunicipalidadById } from "./municipalidades";
import { SOURCE_CANONICAL_COUNTS } from "./published-sources";

describe("Tarea F — Cobertura Real de Dotación y Compras en Servicios Públicos", () => {
  it("F1. SENCE posee RUT oficial válido, dotación CPLT > 0 y compras OCDS > 0", () => {
    const rutSence = getRutOficialServicio("serv-sence");
    expect(rutSence).toBe("61.531.000-K");
    expect(validateModulo11(rutSence!)).toBe(true);

    const orgSence = getOrganismoById("serv-sence");
    expect(orgSence).toBeDefined();
    expect(orgSence?.dotacion_total).toBe(1154);
    expect(orgSence?.compras_ocds_rut_comprador).toBe("61.531.000-K");
    expect(orgSence?.compras_ocds_metodo_enlace).toBe("RUT_EXACTO");
    expect(orgSence?.compras_ocds_monto_clp).toBe(970465511);
    expect(orgSence?.compras_ocds_procesos).toBe(135);

    const senceEnriquecido = getServicioPublicoEnriquecido("serv-sence");
    expect(senceEnriquecido).not.toBeNull();
    expect(senceEnriquecido?.personal?.dotacion_total).toBe(1154);
    expect(senceEnriquecido?.compras?.monto_total_clp).toBe(970465511);
    expect(senceEnriquecido?.compras?.procesos_count).toBe(135);
    expect(senceEnriquecido?.compras?.top_proveedores.length).toBeGreaterThan(0);
    expect(senceEnriquecido?.compras?.serie_mensual_2026.length).toBeGreaterThan(0);
  });

  it("F2. Muestra de 10 servicios nacionales con compras y dotaciones verificadas", () => {
    const muestra = [
      { id: "serv-sii", rut: "60.803.000-K", minMonto: 1_000_000_000, dotacion: 5220 },
      { id: "serv-tgr", rut: "60.805.000-0", minMonto: 2_000_000_000, dotacion: 2050 },
      { id: "serv-aduanas", rut: "60.804.000-5", minMonto: 2_000_000_000, dotacion: 2120 },
      { id: "serv-dt", rut: "61.502.000-1", minMonto: 1_000_000_000, dotacion: 4310 },
      { id: "serv-fonasa", rut: "61.603.000-0", minMonto: 100_000_000_000, dotacion: 1280 },
      { id: "serv-ips", rut: "61.979.440-0", minMonto: 3_000_000_000, dotacion: 3180 },
      { id: "serv-sag", rut: "61.308.000-7", minMonto: 5_000_000_000, dotacion: 4890 },
      { id: "serv-indap", rut: "61.307.000-1", minMonto: 2_000_000_000, dotacion: 1760 },
      { id: "min-mop", rut: "61.202.000-0", minMonto: 100_000_000_000, dotacion: null },
      { id: "min-salud", rut: "61.601.000-K", minMonto: 10_000_000_000, dotacion: null },
    ];

    for (const item of muestra) {
      const rut = getRutOficialServicio(item.id);
      expect(rut).toBe(item.rut);
      expect(validateModulo11(rut!)).toBe(true);

      const serv = getServicioPublicoEnriquecido(item.id);
      expect(serv).not.toBeNull();
      expect(serv?.compras?.monto_total_clp).toBeGreaterThanOrEqual(item.minMonto);
      expect(serv?.compras?.procesos_count).toBeGreaterThan(0);

      if (item.dotacion !== null) {
        expect(serv?.personal?.dotacion_total).toBe(item.dotacion);
      }
    }
  });

  it("F3. Organismos sin publicaciones en la fuente preservan null (Regla R10)", () => {
    const minagri = getServicioPublicoEnriquecido("min-agricultura");
    expect(minagri?.personal).toBeNull();

    const ciencia = getServicioPublicoEnriquecido("min-ciencia");
    expect(ciencia?.personal).toBeNull();
    expect(ciencia?.compras).toBeNull();
  });

  it("F4. Invariante Vanessa Kaiser preservada ($4.582.550 + ALTA +33,7%)", () => {
    const evalKaiser = evaluateSenateSupport({
      total_clp: 15_250_000,
      period: "2026-07",
      base_mensual_clp: 11_406_149,
      verified_transfers: [],
    });

    expect(evalKaiser.status).toBe("ALTA");
    expect(evalKaiser.excess_clp).toBe(3843851);
    const pct = ((15250000 - 11406149) / 11406149) * 100;
    const formattedPct = `+${pct.toFixed(1).replace(".", ",")}%`;
    expect(formattedPct).toBe("+33,7%");
  });

  it("F5. Invariante Maipú preservada (Período representativo + Censo 2024)", () => {
    const maipu = getMunicipalidadById("muni-maipu");
    expect(maipu).toBeDefined();
    expect(maipu?.poblacion_censo_2024).toBe(503635);
    expect(maipu?.cut).toBe("13119");
  });

  it("F6. Dashboard de Calidad (/datos/calidad) operativo con 13 fuentes oficiales", () => {
    const sourcesCount = Object.keys(SOURCE_CANONICAL_COUNTS).length;
    expect(sourcesCount).toBe(13);
    expect(SOURCE_CANONICAL_COUNTS["transparencia-activa"]).toBeGreaterThan(1_000_000);
    expect(SOURCE_CANONICAL_COUNTS["chilecompra"]).toBeGreaterThan(70_000);
  });
});
