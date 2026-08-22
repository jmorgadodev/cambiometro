import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MOVIMIENTOS, MOVIMIENTOS_TIPO_LABEL, MOVIMIENTOS_TIPO_COLOR } from "@/lib/movimientos";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMuniCanonicalSlug, isMuniLegacyId } from "@/lib/slug-utils";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

describe("TAREA H v2: ETL Automático, KPIs de Rotación y Timeline Multifuente en /movimientos", () => {
  const projectRoot = join(process.cwd());
  const movPageContent = readFileSync(join(projectRoot, "app", "movimientos", "page.tsx"), "utf8");

  it("1. KPIs Hero 100% Dinámicos desde el dataset", () => {
    const enGobierno = MOVIMIENTOS.filter((m) => m.fecha >= "2026-03-11");
    expect(enGobierno.length).toBeGreaterThan(15);

    // Conteo y desglose
    const renuncias = enGobierno.filter((m) => m.tipo === "renuncia").length;
    const ceses = enGobierno.filter((m) => m.tipo === "cese" || m.tipo === "remocion").length;
    const nombramientos = enGobierno.filter((m) =>
      m.tipo === "nombramiento" || m.tipo === "designacion" || m.tipo === "creacion" || m.tipo === "confirmacion"
    ).length;
    const fallidos = enGobierno.filter((m) => m.tipo === "fallido" || m.tipo === "nombramiento-fallido").length;

    expect(renuncias).toBeGreaterThan(0);
    expect(ceses).toBeGreaterThan(0);
    expect(nombramientos).toBeGreaterThan(0);
    expect(fallidos).toBeGreaterThan(0);

    // Página incluye los títulos de los 3 KPIs
    expect(movPageContent).toContain("Cambios en el Gobierno Actual");
    expect(movPageContent).toContain("Último Cambio Registrado");
    expect(movPageContent).toContain("Días Entre Cambios (Promedio)");

    // Página no contiene fechas literales hardcodeadas para el último cambio
    expect(movPageContent).not.toContain("Actualizado 17 de agosto 2026");
    expect(movPageContent).not.toContain('"hace 5 días"');
    expect(movPageContent).toContain("haceTexto");
    expect(movPageContent).toContain("diasEntreCambios");
  });

  it("2. Cobertura de los 5 tipos canónicos con etiquetas y colores propios", () => {
    const tipos = MOVIMIENTOS.map((m) => m.tipo);
    expect(tipos.includes("renuncia")).toBe(true);
    expect(tipos.some((t) => t === "cese" || t === "remocion")).toBe(true);
    expect(tipos.some((t) => t === "cambio" || t === "cambio-puesto" || t === "enroque" || t === "cambio-mando")).toBe(true);
    expect(tipos.some((t) => t === "nombramiento" || t === "designacion" || t === "creacion")).toBe(true);
    expect(tipos.some((t) => t === "fallido" || t === "nombramiento-fallido")).toBe(true);

    expect(MOVIMIENTOS_TIPO_LABEL.renuncia).toBe("Renuncia");
    expect(MOVIMIENTOS_TIPO_COLOR.renuncia).toBe("var(--alert)");
    expect(MOVIMIENTOS_TIPO_COLOR.fallido).toBe("var(--text-muted)");
  });

  it("3. Modelo Multifuente: Detección temprana, confirmación con decreto y regla de 30 días", () => {
    // Detección temprana con proveniencia
    const enConfirmacion = MOVIMIENTOS.filter((m) => m.estado === "en_confirmacion" || m.estado === "corroborado");
    expect(enConfirmacion.length).toBeGreaterThan(0);
    for (const m of enConfirmacion) {
      expect(m.detectado_por).toBeDefined();
      expect(m.verificado).toBe(false);
    }

    // Verificados oficiales tienen URL de decreto o documento oficial
    const verificados = MOVIMIENTOS.filter((m) => m.estado === "verificado");
    expect(verificados.length).toBeGreaterThan(15);
    for (const m of verificados) {
      expect(m.decreto_url).toBeDefined();
      expect(m.decreto_url?.startsWith("http")).toBe(true);
      expect(m.verificado).toBe(true);
    }

    // Regla de los 30 días: eventos no verificados con detección > 30d tienen documento_pendiente = true
    const conDocPendiente = MOVIMIENTOS.filter((m) => m.documento_pendiente === true);
    expect(conDocPendiente.length).toBeGreaterThan(0);
  });

  it("4. Casos Específicos: Deporte (13-ago) y Hacienda (23-jul) con decreto oficial enlazado", () => {
    // Deporte 13-ago
    const deporte = MOVIMIENTOS.find((m) => m.ministerio.includes("Deporte") || m.organismo.includes("Deporte"));
    expect(deporte).toBeDefined();
    expect(deporte?.fecha).toBe("2026-08-13");
    expect(deporte?.decreto_url).toContain("bcn.cl/leychile");
    expect(deporte?.id_norma).toBe("1215432");
    expect(deporte?.estado).toBe("verificado");

    // Hacienda 23-jul
    const hacienda = MOVIMIENTOS.find((m) => m.id === "mov-044" || (m.ministerio.includes("Hacienda") && m.fecha === "2026-07-23"));
    expect(hacienda).toBeDefined();
    expect(hacienda?.fecha).toBe("2026-07-23");
    expect(hacienda?.decreto_url).toContain("bcn.cl/leychile");
    expect(hacienda?.id_norma).toBe("1214890");
    expect(hacienda?.estado).toBe("verificado");
  });

  it("5. Timeline vertical cuenta con enlaces 'Ver decreto oficial ↗' y nodos por tipo", () => {
    expect(movPageContent).toContain("Ver decreto oficial ↗");
    expect(movPageContent).toContain("movimientos-month");
    expect(movPageContent).toContain("stat-tile--accent");
    expect(movPageContent).toContain("stat-tile--ok");
    expect(movPageContent).toContain("stat-tile--warn");
    expect(movPageContent).toContain("badge-ok");
    expect(movPageContent).toContain("badge-warn");
    expect(movPageContent).toContain("badge-alert");
  });

  it("6. Invariantes de plataforma: Vanessa Kaiser, Maipú y 13 fuentes", () => {
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
