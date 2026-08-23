import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { GLOBAL_KPIS } from "@/lib/global-kpis";
import { SOURCE_CANONICAL_COUNTS, SOURCE_HISTORICAL_COUNTS } from "@/lib/published-sources";
import { getDataQualityDashboardData } from "@/lib/data-quality-dashboard";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMuniCanonicalSlug, isMuniLegacyId, getAllMuniSlugs } from "@/lib/slug-utils";

describe("Blindaje Anti-Regresión — Coherencia Global del Sitio", () => {
  const projectRoot = resolve(process.cwd());

  // ─── 1. COHERENCIA DE NÚMEROS PÚBLICOS Y UNIVERSOS CANÓNICOS ───────────────
  describe("1. Coherencia de Cifras Públicas (Cross-Page)", () => {
    it("El total de fuentes es exactamente 13 (12 oficiales + 1 derivada)", async () => {
      expect(GLOBAL_KPIS.total_fuentes).toBe(13);
      expect(GLOBAL_KPIS.fuentes_oficiales).toBe(12);
      expect(GLOBAL_KPIS.fuentes_derivadas).toBe(1);

      const { summary, sources } = await getDataQualityDashboardData();
      expect(summary.totalFuentes).toBe(13);
      expect(summary.fuentesOficiales).toBe(12);
      expect(summary.fuentesDerivadas).toBe(1);
      expect(sources.length).toBe(13);
    });

    it("La suma de conteos canónicos por fuente coincide exactamente con el resumen del dashboard de calidad", async () => {
      const canonicalSum = Object.values(SOURCE_CANONICAL_COUNTS).reduce((sum, n) => sum + n, 0);
      const { summary } = await getDataQualityDashboardData();
      expect(summary.totalRegistrosCanonicos).toBe(canonicalSum);
      expect(summary.totalRegistrosCanonicos).toBe(1487224);
      expect(GLOBAL_KPIS.registros_canonicos).toBe(1753013);
    });

    it("Cada fuente individual mantiene su cifra canónica e histórica exacta", () => {
      expect(SOURCE_CANONICAL_COUNTS["chilecompra"]).toBe(74142);
      expect(SOURCE_CANONICAL_COUNTS["transparencia-activa"]).toBe(1203287);
      expect(SOURCE_CANONICAL_COUNTS["ley-19862"]).toBe(59361);
      expect(SOURCE_CANONICAL_COUNTS["dipres"]).toBe(15689);
      expect(SOURCE_CANONICAL_COUNTS["sinim"]).toBe(3105);
      expect(SOURCE_CANONICAL_COUNTS["infolobby"]).toBe(60523);
      expect(SOURCE_CANONICAL_COUNTS["infoprobidad"]).toBe(15331);
      expect(SOURCE_CANONICAL_COUNTS["contraloria"]).toBe(291);
      expect(SOURCE_CANONICAL_COUNTS["camara"]).toBe(19025);
      expect(SOURCE_CANONICAL_COUNTS["senado"]).toBe(8138);
      expect(SOURCE_CANONICAL_COUNTS["servel"]).toBe(23894);
      expect(SOURCE_CANONICAL_COUNTS["personal-apoyo"]).toBe(4092);
      expect(SOURCE_CANONICAL_COUNTS["ine-censo-2024"]).toBe(346);

      // Históricos consolidados
      expect(SOURCE_HISTORICAL_COUNTS["chilecompra"]).toBe(888693);
      expect(SOURCE_HISTORICAL_COUNTS["transparencia-activa"]).toBe(1218136);
      expect(SOURCE_HISTORICAL_COUNTS["ley-19862"]).toBe(59361);
    });

    it("Invariante de integridad parlamentaria (Vanessa Kaiser)", () => {
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

    it("Invariante de cobertura municipal (346 comunas)", () => {
      const allSlugs = getAllMuniSlugs();
      expect(allSlugs.length).toBe(346);
      expect(getMuniCanonicalSlug("muni-maipu")).toBe("maipu");
      expect(isMuniLegacyId("muni-maipu")).toBe(true);
    });
  });

  // ─── 2. AUDITORÍA Y CRAWL INTERNO DEL FOOTER ──────────────────────────────
  describe("2. Auditoría y Crawl Interno del Footer", () => {
    const layoutSource = readFileSync(resolve(projectRoot, "app/layout.tsx"), "utf8");

    it("Créditos oficiales: Contiene 'Creado por Jorge Morgado' con enlace a LinkedIn", () => {
      expect(layoutSource).toContain("Creado por");
      expect(layoutSource).toContain("Jorge Morgado");
      expect(layoutSource).toContain("https://www.linkedin.com/in/jorge-morgado/");
      expect(layoutSource).toContain('rel="noopener noreferrer"');
    });

    it("Cero links rotos (404) en la navegación del footer", () => {
      // Extraer todos los paths internos ["Texto", "/path"]
      const linkRegex = /\["[^"]+",\s*"(\/[^"]+)"\]/g;
      const internalLinks: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(layoutSource)) !== null) {
        internalLinks.push(match[1]);
      }

      expect(internalLinks.length).toBeGreaterThan(10);

      // Verificar que no haya rutas duplicadas
      const uniqueLinks = new Set(internalLinks);
      expect(uniqueLinks.size).toBe(internalLinks.length);

      // Verificar que cada ruta exista en app/
      for (const route of internalLinks) {
        const routeClean = route.split("?")[0].replace(/^\//, "");
        const pagePath = join(projectRoot, "app", routeClean, "page.tsx");
        const routePath = join(projectRoot, "app", routeClean, "route.ts");
        const exists = existsSync(pagePath) || existsSync(routePath);
        expect(exists, `La ruta del footer '${route}' debe existir en app/`).toBe(true);
      }
    });
  });

  // ─── 3. SCAN CERO FS SIN FALLBACK EN LIBRERÍAS SSR ─────────────────────────
  describe("3. Scan Cero FS sin fallback estático en runtime de Worker", () => {
    it("Toda función de lectura en lib/ que use 'fs' implementa salvaguarda try/catch y fallback", () => {
      const libDir = resolve(projectRoot, "lib");
      const files = readdirSync(libDir).filter(
        (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts")
      );

      for (const file of files) {
        const fullPath = join(libDir, file);
        const content = readFileSync(fullPath, "utf8");

        // Si el archivo importa fs
        if (content.includes('from "fs"') || content.includes('from "node:fs"') || content.includes('require("fs")')) {
          // Si llama a readFileSync o existsSync, debe estar dentro de un bloque try o tener fallback estático
          if (content.includes("readFileSync") || content.includes("existsSync")) {
            const hasTryCatch = content.includes("try {") || content.includes("try{");
            expect(
              hasTryCatch,
              `El archivo ${file} usa 'fs' y debe envolverlo en try/catch con fallback para Cloudflare Workers`
            ).toBe(true);
          }
        }
      }
    });
  });
});
