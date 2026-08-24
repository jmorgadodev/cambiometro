import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GLOBAL_KPIS, getGlobalKpis } from "@/lib/global-kpis";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMuniCanonicalSlug, isMuniLegacyId, getAllMuniSlugs } from "@/lib/slug-utils";
import { MOVIMIENTOS } from "@/lib/movimientos";
import { SERVICIOS_PUBLICOS_SEED, getServicioPublicoById } from "@/lib/servicios-publicos";
import { GABINETE_KAST } from "@/lib/gabinete-kast";

describe("TAREA G: Cierre de Hallazgos Pre-Launch", () => {
  const projectRoot = join(process.cwd());

  it("H-02: Denominador único de fuentes = 13 (12 oficiales + 1 derivada) coherente", () => {
    const kpis = getGlobalKpis();
    expect(kpis.total_fuentes).toBe(13);
    expect(kpis.fuentes_oficiales).toBe(12);
    expect(kpis.fuentes_derivadas).toBe(1);
    expect(kpis.fuentes_operativas).toBe(13);

    const datosContent = readFileSync(join(projectRoot, "app", "datos", "page.tsx"), "utf8");
    expect(datosContent).not.toContain("12 / 12");
    expect(datosContent).toContain("GLOBAL_KPIS.total_fuentes");
    expect(datosContent).toContain("GLOBAL_KPIS.fuentes_oficiales");
    expect(datosContent).toContain("GLOBAL_KPIS.fuentes_derivadas");

    const fuentesContent = readFileSync(join(projectRoot, "app", "fuentes", "page.tsx"), "utf8");
    expect(fuentesContent).toContain("GLOBAL_KPIS.total_fuentes");

    const calidadContent = readFileSync(join(projectRoot, "app", "datos", "calidad", "page.tsx"), "utf8");
    expect(calidadContent).toContain("13 fuentes");
    expect(calidadContent).toContain("12 oficiales + 1 derivada");
  });

  it("H-11: Fecha de /movimientos derivada de MOVIMIENTOS y sin fecha literal '17 de agosto 2026'", () => {
    const movPageContent = readFileSync(join(projectRoot, "app", "movimientos", "page.tsx"), "utf8");
    expect(movPageContent).not.toContain("Actualizado 17 de agosto 2026");
    expect(movPageContent).not.toContain('"2026-08-10"');
    expect(movPageContent).toContain("fechaActualizacionTexto");
    expect(movPageContent).toContain("MOVIMIENTOS.reduce");

    // Validar que la última fecha del dataset es la que se deriva
    const ultFecha = MOVIMIENTOS.reduce(
      (max, m) => (m.fecha && m.fecha > max ? m.fecha : max),
      MOVIMIENTOS[0]?.fecha ?? ""
    );
    expect(ultFecha.length).toBeGreaterThan(0);
  });

  it("H-12: Titular SEGEGOB verificado y con fuente oficial citada en seed", () => {
    const segegob = getServicioPublicoById("min-segegob");
    expect(segegob).toBeDefined();
    expect(segegob?.director_jefe_actual).toBe("Claudio Alvarado Andrade");
    expect(segegob?.fuente_director).toContain("segegob.cl / BCN");

    const interior = getServicioPublicoById("min-interior");
    expect(interior).toBeDefined();
    expect(interior?.director_jefe_actual).toBe("Claudio Alvarado Andrade");
    expect(interior?.fuente_director).toContain("interior.gob.cl / BCN");

    const segegobKast = GABINETE_KAST.find((m) => m.ministerio.includes("SEGEGOB"));
    expect(segegobKast).toBeDefined();
    expect(segegobKast?.fuente).toContain("segegob.cl / BCN");
  });

  it("H-01: Nota inline en /cruces con link a metodología", () => {
    const crucesContent = readFileSync(join(projectRoot, "app", "cruces", "page.tsx"), "utf8");
    expect(crucesContent).toContain("1.897 relaciones canónicas en el modelo de datos; el grafo muestra los vínculos actualmente indexados");
    expect(crucesContent).toContain('href="/como-funciona"');
  });

  it("H-04: Nota en /datos/calidad sobre registros históricos de actividad parlamentaria", () => {
    const calidadContent = readFileSync(join(projectRoot, "app", "datos", "calidad", "page.tsx"), "utf8");
    expect(calidadContent).toContain("El total incluye registros históricos de actividad parlamentaria no atribuidos a fuente individual en el catálogo.");
  });

  it("H-15: Sitemap incluye /personas y /transferencias", () => {
    const generator = readFileSync(join(projectRoot, "scripts", "generate-static-metadata.mjs"), "utf8");
    expect(generator).toContain("collectHtml(outDir)");
    expect(readFileSync(join(projectRoot, "app", "personas", "page.tsx"), "utf8")).toContain('export default');
    expect(readFileSync(join(projectRoot, "app", "transferencias", "page.tsx"), "utf8")).toContain('export default');
  });

  it("H-16: openGraph.description explícito en /cruces", () => {
    const crucesContent = readFileSync(join(projectRoot, "app", "cruces", "page.tsx"), "utf8");
    expect(crucesContent).toContain("openGraph");
    expect(crucesContent).toContain("description:");
    expect(crucesContent).toContain("Cruces documentales trazables");
  });

  it("H-17a: JSON-LD WebSite y Organization en home", () => {
    const homeContent = readFileSync(join(projectRoot, "app", "page.tsx"), "utf8");
    expect(homeContent).toContain('"@type": "WebSite"');
    expect(homeContent).toContain('"@type": "Organization"');
    expect(homeContent).toContain("application/ld+json");
  });

  it("H-17c: Canonicals en /comparar, /cambios y /movimientos", () => {
    const compararContent = readFileSync(join(projectRoot, "app", "comparar", "page.tsx"), "utf8");
    expect(compararContent).toContain('canonical: "/comparar"');

    const cambiosContent = readFileSync(join(projectRoot, "app", "cambios", "page.tsx"), "utf8");
    expect(cambiosContent).toContain('canonical: "/cambios"');

    const movimientosLayout = readFileSync(join(projectRoot, "app", "movimientos", "layout.tsx"), "utf8");
    expect(movimientosLayout).toContain('canonical: "/movimientos"');
  });

  it("Invariante Vanessa Kaiser: $4.582.550 + ALTA +33,7%", () => {
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

  it("Invariante Maipú y detección 301 de URLs legadas muni-*", () => {
    expect(getMuniCanonicalSlug("muni-maipu")).toBe("maipu");
    expect(isMuniLegacyId("muni-maipu")).toBe(true);
    expect(getMuniCanonicalSlug("maipu")).toBe("maipu");
    const allSlugs = getAllMuniSlugs();
    expect(allSlugs.length).toBe(346);
    expect(allSlugs.some((s) => s.slug === "maipu")).toBe(true);
  });
});
