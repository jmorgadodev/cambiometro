import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MOVIMIENTOS, MOVIMIENTOS_TIPO_LABEL, MOVIMIENTOS_TIPO_COLOR } from "@/lib/movimientos";
import { GABINETE_KAST } from "@/lib/gabinete-kast";
import { SERVICIOS_PUBLICOS_SEED } from "@/lib/servicios-publicos";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMuniCanonicalSlug, isMuniLegacyId } from "@/lib/slug-utils";
import { GLOBAL_KPIS } from "@/lib/global-kpis";
import { verifyConsistencyGabineteMovimientos } from "../../scripts/audit/pipeline-guard.mjs";

describe("TAREA H v5: Cierre Correcto de Sucesiones + Regla Verbatim", () => {
  const projectRoot = join(process.cwd());
  const repoRoot = join(process.cwd(), "..");
  const movPageContent = readFileSync(join(projectRoot, "app", "movimientos", "page.tsx"), "utf8");
  const movJsonRaw = readFileSync(join(projectRoot, "data", "movimientos.json"), "utf8");

  it("1. SEGEGOB 19-may: Salió Mara Sedini, Asume Claudio Alvarado Andrade (Biministro Interior-Segegob), CERO Müller", () => {
    const segebog = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-05-19" && (m.cargo.includes("Secretaria General de Gobierno") || m.organismo.includes("SEGEGOB"))
    );
    expect(segebog).toBeDefined();
    expect(segebog?.salio?.nombre).toContain("Mara Sedini");
    expect(segebog?.entro?.nombre).toContain("Claudio Alvarado");
    expect(segebog?.decreto_numero).toContain("189");
    expect(segebog?.decreto_url).toContain("prensa.presidencia.cl/comunicado.aspx?id=329127");

    // CERO Müller en todo el dataset y catálogo
    expect(movJsonRaw.toLowerCase()).not.toContain("müller");
    expect(movJsonRaw.toLowerCase()).not.toContain("muller");
  });

  it("2. Deporte 14-ago: Duco -> Francisco Riveros Cantuarias; Otero -> Sofía Rengifo Ottone", () => {
    // Ministro del Deporte
    const depMin = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-08-14" && m.cargo.includes("Ministro del Deporte")
    );
    expect(depMin).toBeDefined();
    expect(depMin?.salio?.nombre).toContain("Natalia Duco");
    expect(depMin?.entro?.nombre).toContain("Francisco Riveros Cantuarias");
    expect(depMin?.id_norma).toBe("1215432");

    // Subsecretaria de Deportes
    const depSub = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-08-14" && m.cargo.includes("Subsecretaria del Deporte")
    );
    expect(depSub).toBeDefined();
    expect(depSub?.salio?.nombre).toContain("Nicolás Otero");
    expect(depSub?.entro?.nombre).toContain("Sofía Rengifo Ottone");
    expect(depSub?.id_norma).toBe("1215435");
  });

  it("3. Mujer (Marcia Raphael Mora) y Ciencia (Carolina Rossi ratificada) 16-junio", () => {
    const mujer = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-06-16" && m.cargo.includes("Ministra de la Mujer")
    );
    expect(mujer).toBeDefined();
    expect(mujer?.entro?.nombre).toContain("Marcia Raphael Mora");
    expect(mujer?.id_norma).toBe("1213500");

    const ciencia = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-06-16" && m.cargo.includes("Ministra de Ciencia")
    );
    expect(ciencia).toBeDefined();
    expect(ciencia?.entro?.nombre).toContain("Carolina Rossi");
    expect(ciencia?.id_norma).toBe("1213520");
  });

  it("4. Guard de Consistencia Institucional: Gabinete / Servicios Públicos / Movimientos pasan sin errores", () => {
    const guardRes = verifyConsistencyGabineteMovimientos(repoRoot);
    expect(guardRes.ok).toBe(true);
    expect(guardRes.errors).toEqual([]);
    expect(guardRes.checkedMinisters).toBe(25);
    expect(guardRes.checkedServicios).toBe(25);
  });

  it("5. Cobertura de Salidas del Gobierno >= 43 y Oleada de Abril", () => {
    const enGobierno = MOVIMIENTOS.filter((m) => m.fecha >= "2026-03-11");
    const salidas = enGobierno.filter((m) => m.tipo === "renuncia" || m.tipo === "cese" || m.tipo === "remocion");
    expect(salidas.length).toBeGreaterThanOrEqual(43);

    const abril = MOVIMIENTOS.filter((m) => m.fecha.startsWith("2026-04"));
    expect(abril.length).toBeGreaterThanOrEqual(15);
  });

  it("6. Hero Masthead: Botón Compartir, Desglose de Salidas y Nota Metodológica", () => {
    expect(movPageContent).toContain("Compartir");
    expect(movPageContent).toContain("handleShare");
    expect(movPageContent).toContain("Las salidas se contrastan con registros públicos de seguimiento; la confirmación proviene de decretos");
  });

  it("7. Invariantes de plataforma: Vanessa Kaiser, Maipú y 13 fuentes globales", () => {
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

    expect(getMuniCanonicalSlug("muni-maipu")).toBe("maipu");
    expect(isMuniLegacyId("muni-maipu")).toBe(true);

    expect(GLOBAL_KPIS.total_fuentes).toBe(13);
    expect(GLOBAL_KPIS.fuentes_oficiales).toBe(12);
    expect(GLOBAL_KPIS.fuentes_derivadas).toBe(1);
  });
});
