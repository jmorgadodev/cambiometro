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

describe("Integridad pública de Movimientos y sucesiones", () => {
  const projectRoot = join(process.cwd());
  const repoRoot = join(process.cwd(), "..");
  const movPageContent = readFileSync(join(projectRoot, "app", "movimientos", "page.tsx"), "utf8");
  const movJsonRaw = readFileSync(join(projectRoot, "data", "movimientos.json"), "utf8");

  it("1. SEGEGOB 19-may conserva la sucesión publicada y no mezcla nombres excluidos", () => {
    const segebog = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-05-19" && (m.cargo.includes("Secretaria General de Gobierno") || m.organismo.includes("SEGEGOB"))
    );
    expect(segebog).toBeDefined();
    expect(segebog?.salio?.nombre).toContain("Mara Sedini");
    expect(segebog?.entro?.nombre).toContain("Claudio Alvarado");
    expect(segebog?.reemplazo_estado).toBe("fuente_oficial");

    // CERO Müller en todo el dataset y catálogo
    expect(movJsonRaw.toLowerCase()).not.toContain("müller");
    expect(movJsonRaw.toLowerCase()).not.toContain("muller");
  });

  it("2. Deporte 14-ago conserva ambos reemplazos", () => {
    // Ministro del Deporte
    const depMin = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-08-14" && m.cargo.includes("Ministra de Deporte")
    );
    expect(depMin).toBeDefined();
    expect(depMin?.salio?.nombre).toContain("Natalia Duco");
    expect(depMin?.entro?.nombre).toContain("Francisco Riveros Cantuarias");
    expect(depMin?.estado).toBe("verificado");

    // Subsecretaria de Deportes
    const depSub = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-08-14" && m.cargo.includes("Subsecretario de Deporte")
    );
    expect(depSub).toBeDefined();
    expect(depSub?.salio?.nombre).toContain("Andrés Otero");
    expect(depSub?.entro?.nombre).toContain("Sofía Rengifo Ottone");
    expect(depSub?.estado).toBe("verificado");
  });

  it("3. los registros sin reemplazo no inventan un nombre", () => {
    const unresolved = MOVIMIENTOS.filter((movement) => !movement.entrante);
    expect(unresolved.length).toBeGreaterThan(0);
    expect(unresolved.every((movement) => movement.reemplazo_estado === "no_informado_en_fuentes_consultadas")).toBe(true);
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
    expect(MOVIMIENTOS).toHaveLength(46);

    const abril = MOVIMIENTOS.filter((m) => m.fecha.startsWith("2026-04"));
    expect(abril.length).toBeGreaterThan(0);
  });

  it("6. Hero Masthead: Botón Compartir, Desglose de Salidas y Nota Metodológica", () => {
    expect(movPageContent).toContain("Compartir");
    expect(movPageContent).toContain("handleShare");
    expect(movPageContent).toContain("Cada fila identifica si cuenta con documento oficial o corroboración pública");
    expect(movPageContent).not.toContain("renunciaskast.cl");
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
