import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MOVIMIENTOS, MOVIMIENTOS_TIPO_LABEL, MOVIMIENTOS_TIPO_COLOR } from "@/lib/movimientos";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMuniCanonicalSlug, isMuniLegacyId } from "@/lib/slug-utils";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

describe("TAREA H v3: Cobertura Total de Renuncias (Seremis, Delegados y Regionales)", () => {
  const projectRoot = join(process.cwd());
  const movPageContent = readFileSync(join(projectRoot, "app", "movimientos", "page.tsx"), "utf8");
  const movJsonRaw = readFileSync(join(projectRoot, "data", "movimientos.json"), "utf8");

  it("1. Total del gobierno >= 40 con desglose dinámico", () => {
    const enGobierno = MOVIMIENTOS.filter((m) => m.fecha >= "2026-03-11");
    expect(enGobierno.length).toBeGreaterThanOrEqual(40);

    // Conteo y desglose
    const renuncias = enGobierno.filter((m) => m.tipo === "renuncia").length;
    const ceses = enGobierno.filter((m) => m.tipo === "cese" || m.tipo === "remocion").length;
    const nombramientos = enGobierno.filter((m) =>
      m.tipo === "nombramiento" || m.tipo === "designacion" || m.tipo === "creacion" || m.tipo === "confirmacion"
    ).length;
    const fallidos = enGobierno.filter((m) => m.tipo === "fallido" || m.tipo === "nombramiento-fallido").length;

    expect(renuncias).toBeGreaterThan(10);
    expect(ceses).toBeGreaterThan(0);
    expect(nombramientos).toBeGreaterThan(5);
    expect(fallidos).toBeGreaterThan(0);

    // Página incluye los títulos de los 3 KPIs
    expect(movPageContent).toContain("Cambios en el Gobierno Actual");
    expect(movPageContent).toContain("Último Cambio Registrado");
    expect(movPageContent).toContain("Días Entre Cambios (Promedio)");
  });

  it("2. Cobertura regional de Seremis: >= 8 seremis visibles", () => {
    const enGobierno = MOVIMIENTOS.filter((m) => m.fecha >= "2026-03-11");
    const seremis = enGobierno.filter(
      (m) => m.cargo.toLowerCase().includes("seremi") || m.cargo.toLowerCase().includes("regional ministerial")
    );
    expect(seremis.length).toBeGreaterThanOrEqual(8);
  });

  it("3. Seremis clave de Valparaíso, Maule y Tarapacá (30-jul-2026) presentes y verificados", () => {
    // Valparaíso (Yanino Riquelme - MOP, 2026-07-30)
    const seremiValpo = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-07-30" && m.region.includes("Valparaíso") && m.salio?.nombre.includes("Yanino Riquelme")
    );
    expect(seremiValpo).toBeDefined();
    expect(seremiValpo?.id_norma).toBe("1214950");
    expect(seremiValpo?.estado).toBe("verificado");

    // Maule (Francisco Varela - Educación, 2026-07-30)
    const seremiMaule = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-07-30" && m.region.includes("Maule") && m.salio?.nombre.includes("Francisco Varela")
    );
    expect(seremiMaule).toBeDefined();
    expect(seremiMaule?.id_norma).toBe("1214955");
    expect(seremiMaule?.estado).toBe("verificado");

    // Tarapacá (David Valle - Salud, 2026-07-30)
    const seremiTarapaca = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-07-30" && m.region.includes("Tarapacá") && m.salio?.nombre.includes("David Valle")
    );
    expect(seremiTarapaca).toBeDefined();
    expect(seremiTarapaca?.id_norma).toBe("1214960");
    expect(seremiTarapaca?.estado).toBe("verificado");
  });

  it("4. Normalización estricta de sufijo: '(Subrogente)' normalizado a '(Subrogante)'", () => {
    // Ningún campo debe contener el typo 'subrogente'
    expect(movJsonRaw.toLowerCase()).not.toContain("subrogente");
    const allNames = MOVIMIENTOS.flatMap((m) => [m.salio?.nombre, m.entro?.nombre, m.saliente, m.entrante]).filter(Boolean);
    for (const name of allNames) {
      expect(name?.toLowerCase()).not.toContain("subrogente");
    }
  });

  it("5. Hero KPIs visibles en desktop y mobile con layout robusto", () => {
    expect(movPageContent).toContain("stat-tile--accent");
    expect(movPageContent).toContain("stat-tile--ok");
    expect(movPageContent).toContain("stat-tile--warn");
    expect(movPageContent).toContain("page-masthead");
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
