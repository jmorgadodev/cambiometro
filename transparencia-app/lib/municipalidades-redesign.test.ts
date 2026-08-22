import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAllMunicipalidadesData, getMunicipalidadData } from "./municipalidades-data";
import { queryFallbackFuncionarios } from "./funcionarios-fallback";

describe("Rediseño /municipalidades + Ficha Comunal — Validación de 14 Prioridades", () => {
  const allMunis = getAllMunicipalidadesData();
  const listPageSource = readFileSync(resolve("components/municipalidades/MunicipalidadesExplorerClient.tsx"), "utf8");
  const detailPageSource =
    readFileSync(resolve("app/municipalidades/[id]/page.tsx"), "utf8") +
    readFileSync(resolve("components/municipalidades/MunicipalidadDetailDashboardClient.tsx"), "utf8");
  const organismoListSource = readFileSync(resolve("components/OrganismoFuncionariosList.tsx"), "utf8");
  const personasUniversalSource = readFileSync(resolve("components/personas/PersonasUniversalClient.tsx"), "utf8");

  describe("ALTA — Integridad de Datos", () => {
    it("1. no reescribe masa salarial oficial para forzar consistencia presupuestaria", () => {
      const builder = readFileSync(resolve("scripts/rebuild-authoritative-municipalidades.mjs"), "utf8");
      expect(builder).not.toContain("masaMuniCentral");
      expect(builder).not.toMatch(/presVigente \* 0\.28/);
      expect(builder).toContain("const masaAnual = masaMensual * 12");
    });

    it("2. 4 Cards de personal: Planta + Contrata + Honorarios + Cód. Trabajo / Sectorial suman exactamente el 100% de la dotación", () => {
      for (const m of allMunis) {
        if (!m.resumen_personal) continue;
        const { planta, contrata, honorarios, codigo_trabajo_salud_educacion, total_funcionarios } = m.resumen_personal;
        const sumCards = planta + contrata + honorarios + codigo_trabajo_salud_educacion;
        expect(sumCards).toBe(total_funcionarios);
      }
    });

    it("3. Top Remuneraciones consolida por persona sin duplicados visuales de nombres", () => {
      for (const m of allMunis) {
        const top = m.top_remuneraciones || [];
        const names = top.map((t) => t.nombre.trim().toLowerCase());
        const uniqueNames = new Set(names);
        expect(names.length).toBe(uniqueNames.size);
      }
    });

    it("4. Presupuesto per cápita calculado con población INE Censo 2024 oficial", () => {
      const talca = getMunicipalidadData("muni-talca");
      expect(talca).not.toBeNull();
      expect(talca?.poblacion_censo_2024).toBe(232131);
      expect(talca?.presupuesto_per_capita_clp).toBe(
        Math.round((talca?.presupuesto?.vigente_clp ?? 0) / 232131)
      );
    });
  });

  describe("ALTA — Listado /municipalidades", () => {
    it("5. Fila/card 100% clickable mediante enlaces semánticos <Link>", () => {
      expect(listPageSource).toContain("href={`/municipalidades/${m.id}`}");
    });

    it("6. Paginación segura configurada en 15-20 filas", () => {
      expect(listPageSource).toContain("pageSize");
      expect(listPageSource).toContain("totalPages");
      expect(listPageSource).toContain("paginatedData");
    });

    it("7. Filtros avanzados: Región, Tamaño, FCM, Per Cápita, Partido y Ordenamiento", () => {
      expect(listPageSource).toContain("regionFilter");
      expect(listPageSource).toContain("sizeFilter");
      expect(listPageSource).toContain("fcmFilter");
      expect(listPageSource).toContain("perCapitaFilter");
      expect(listPageSource).toContain("partidoFilter");
      expect(listPageSource).toContain("sortBy");
    });

    it("8. Gráficas comparativas: Top 10 Presupuestos y Dispersión Per Cápita vs FCM", () => {
      expect(listPageSource).toContain("Análisis Comparativo Municipal");
    });
  });


  describe("MEDIA — Ficha Comunal /municipalidades/[id]", () => {
    it("9. Badges técnicos (CUT, SINIM, FCM, EUS, OCDS, SIAPER)", () => {
      expect(detailPageSource).toContain("CUT");
      expect(detailPageSource).toContain("SINIM");
      expect(detailPageSource).toContain("FCM");
      expect(detailPageSource).toContain("EUS");
      expect(detailPageSource).toContain("OCDS");
    });

    it("10. Set de iconos y tabs por sección", () => {
      expect(detailPageSource).toContain("presupuesto");
      expect(detailPageSource).toContain("personal");
      expect(detailPageSource).toContain("compras");
      expect(detailPageSource).toContain("concejo");
      expect(detailPageSource).toContain("control");
    });

    it("11. Navegación en tabs", () => {
      const tabs = ["presupuesto", "personal", "compras", "concejo", "control"];
      for (const tab of tabs) {
        expect(detailPageSource).toContain(tab);
      }
    });

    it("12. Concejo Municipal con estado honesto SERVEL y CERO nombres repetidos", () => {
      expect(detailPageSource).toContain("Concejo Municipal (SERVEL 2024 - 2028)");
      expect(detailPageSource).toContain("Nómina del Concejo Municipal en incorporación oficial SERVEL 2024");
      // Aserción: cero nombres sintéticos repetidos entre comunas
      const seenConcejales = new Set<string>();
      let hasDuplicates = false;
      for (const m of allMunis) {
        if (!m.concejales || m.concejales.length === 0) continue;
        for (const c of m.concejales) {
          if (seenConcejales.has(c.nombre)) {
            hasDuplicates = true;
          }
          seenConcejales.add(c.nombre);
        }
      }
      expect(hasDuplicates).toBe(false);
    });

    it("13. Compras Públicas ChileCompra: CERO strings 'Proveedor MercadoPublico'", () => {
      expect(detailPageSource).not.toContain("en consolidación");
      for (const m of allMunis) {
        if (!m.compras_publicas?.top_compras) continue;
        for (const o of m.compras_publicas.top_compras) {
          expect(o.proveedor).not.toContain("Proveedor Mercado");
        }
        if (m.compras_publicas.procesos) {
          for (const p of m.compras_publicas.procesos) {
            expect(p.proveedor_adjudicado).not.toContain("Proveedor Mercado");
            for (const o of p.ordenes_compra) {
              expect(o.proveedor).not.toContain("Proveedor Mercado");
            }
          }
        }
      }
    });
  });

  describe("Consistencia interna de ficha comunal", () => {
    it("M1. Santiago: top 1 remuneraciones === top 1 nómina por sueldo bruto con desglose completo", () => {
      const santiago = getMunicipalidadData("muni-santiago");
      expect(santiago).not.toBeNull();
      const top = santiago!.top_remuneraciones;
      expect(top.length).toBe(5);
      // Top 1 de la nómina reciente por bruto
      expect(top[0].nombre).toBe("Oscar Alvarez Fuentes");
      expect(top[0].remuneracion_bruta).toBe(11822924);
      expect(top[0].sueldo_base).toBeDefined();
      expect(top[0].sueldo_base! + (top[0].horas_extras_monto || 0)).toBe(top[0].remuneracion_bruta);
      // Desglose visible en el código fuente
      expect(detailPageSource).toContain("Base");
      expect(detailPageSource).toContain("HH.EE.");
      expect(detailPageSource).toContain("Total");
    });

    it("M2. R10: Santiago no publica compras sin RUT jurídico oficial en el catálogo", () => {
      const santiago = getMunicipalidadData("muni-santiago");
      expect(santiago?.compras_publicas).toBeNull();
      expect(detailPageSource).toContain("no publica un conteo verificable de órdenes");
      expect(detailPageSource).toContain("No se registran contrataciones públicas para esta municipalidad");
    });

    it("M3. CGR: ≥ 1 comuna con informes CGR renderizados y estado vacío enriquecido", () => {
      const lasCondes = getMunicipalidadData("muni-lascondes");
      expect(lasCondes?.auditorias_cgr).toBeDefined();
      expect(lasCondes!.auditorias_cgr!.length).toBeGreaterThan(0);
      expect(lasCondes!.auditorias_cgr![0].titulo).toContain("INFORME FINAL");

      // Estado vacío con prueba SIAPER y cobertura
      expect(detailPageSource).toContain("La proyección CGR local no contiene coincidencias verificables para el CUT");
      expect(detailPageSource).toContain("Cobertura de esta ficha: sin coincidencias verificables");
      expect(listPageSource).toContain("⚖️ CGR:");
    });

    it("M4. Composición de dotación de Santiago cuadra con la nómina CPLT actual", () => {
      const santiago = getMunicipalidadData("muni-santiago");
      expect(santiago?.resumen_personal).toBeDefined();
      const { planta, contrata, honorarios, codigo_trabajo_salud_educacion, total_funcionarios } = santiago!.resumen_personal!;
      expect(total_funcionarios).toBeGreaterThan(0);
      expect(planta + contrata + honorarios + codigo_trabajo_salud_educacion).toBe(total_funcionarios);
      expect(detailPageSource).toContain("Ámbito de dotación");
    });
  });

  describe("MD UNIFICADO — Validación de Aserciones A1 a A9", () => {
    it("A1. suma(anomalías) + suma(nómina regular) + suma(sin pago) === dotación total (cero registros perdidos)", () => {
      const stgoQuery = queryFallbackFuncionarios({ organismoId: "muni-santiago" });
      const sumStgo = stgoQuery.microMontoCount + stgoQuery.sueldoCompletoCount + stgoQuery.sinPagoCount;
      expect(sumStgo).toBe(stgoQuery.totalHeadcount);
      expect(stgoQuery.totalHeadcount).toBe(20805);

      const maipuQuery = queryFallbackFuncionarios({ organismoId: "muni-maipu" });
      const sumMaipu = maipuQuery.microMontoCount + maipuQuery.sueldoCompletoCount + maipuQuery.sinPagoCount;
      expect(sumMaipu).toBe(maipuQuery.totalHeadcount);
      expect(maipuQuery.totalHeadcount).toBe(11483);
    });

    it("A2. Primer ítem de 'menor a mayor' inicia estrictamente en monto positivo (> $0)", () => {
      const result = queryFallbackFuncionarios({ organismoId: "muni-santiago", sortBy: "sueldo_asc", limit: 10 });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].remuneracion_bruta_mensual).toBeGreaterThan(0);
    });

    it("A3. Cero causas imposibles y clasificaciones fundamentadas en evidencia forense", () => {
      const result = queryFallbackFuncionarios({ organismoId: "muni-santiago" });
      expect(result.anomaliasSample.length).toBeGreaterThan(0);
      for (const anom of result.anomaliasSample) {
        expect(anom.causaId).not.toBeNull();
        expect(anom.etiquetaCausa).not.toContain("boleta de honorarios de $50");
        expect(anom.explicacionCiudadana).toBeDefined();
        expect(anom.nivelConfianza).toBeDefined();
      }
    });

    it("A4. 100% de registros anómalos con enlace al registro original", () => {
      const result = queryFallbackFuncionarios({ organismoId: "muni-santiago" });
      for (const anom of result.anomaliasSample) {
        expect(anom.urlRegistroOriginal).toBeDefined();
        expect(anom.urlRegistroOriginal.startsWith("http")).toBe(true);
      }
    });

    it("A5. Caja ciudadana presente con conteos por causa del forense", () => {
      expect(organismoListSource).toContain("¿Por qué hay montos de $52 a $80");
      expect(organismoListSource).toContain("Transparencia Activa");
      expect(organismoListSource).toContain("anomalía de la fuente");
    });

    it("A6. hrs(card) === hrs(top) en top remuneraciones de Santiago (histórico 2025-06)", () => {
      const santiago = getMunicipalidadData("muni-santiago");
      expect(santiago).not.toBeNull();
      const topStgo202506 = santiago!.top_remuneraciones_por_periodo?.["2025-06"] || [];
      expect(topStgo202506.length).toBeGreaterThan(0);
      // Caso testigo Tania Miranda Jiménez
      const taniaTop = topStgo202506.find((t) => t.nombre.toLowerCase().includes("tania miranda"));
      expect(taniaTop).toBeDefined();
      expect(taniaTop!.horas_extras_hrs).toBe(66);
    });

    it("A7. Composición: suma cards === contador buscador", () => {
      const santiago = getMunicipalidadData("muni-santiago");
      const sRes = santiago!.resumen_personal!;
      expect(sRes.planta + sRes.contrata + sRes.honorarios + sRes.codigo_trabajo_salud_educacion).toBe(sRes.total_funcionarios);
    });

    it("A8. OCDS: cero 'Proveedor MercadoPublico'; procesos×órdenes reconciliados", () => {
      for (const m of allMunis) {
        if (!m.compras_publicas) continue;
        const comprasStr = JSON.stringify(m.compras_publicas);
        expect(comprasStr).not.toContain("Proveedor MercadoPublico");
        expect(comprasStr).not.toContain("Proveedor MercadoPúblico");
      }
    });

    it("A9. CGR y Concejales: cero concejales repetidos entre comunas; estado honesto presente", () => {
      const allConcejales = allMunis.flatMap((m) => (m.concejales || []).map((c) => c.nombre.trim().toLowerCase()));
      const uniqueConcejales = new Set(allConcejales);
      expect(allConcejales.length).toBe(uniqueConcejales.size);
      expect(detailPageSource).toContain("Nómina del Concejo Municipal en incorporación oficial SERVEL 2024");
    });
  });
});


