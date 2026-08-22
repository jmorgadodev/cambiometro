import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MOVIMIENTOS, MOVIMIENTOS_TIPO_LABEL, MOVIMIENTOS_TIPO_COLOR } from "@/lib/movimientos";
import { evaluateSenateSupport } from "@/scripts/etl/senado-assignment.mjs";
import { getMuniCanonicalSlug, isMuniLegacyId } from "@/lib/slug-utils";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

describe("TAREA H v4: Reconciliación contra Fuentes Externas + Botón Compartir", () => {
  const projectRoot = join(process.cwd());
  const movPageContent = readFileSync(join(projectRoot, "app", "movimientos", "page.tsx"), "utf8");
  const movJsonRaw = readFileSync(join(projectRoot, "data", "movimientos.json"), "utf8");

  it("1. Total de salidas en el gobierno actual >= 43 con desglose transparente", () => {
    const enGobierno = MOVIMIENTOS.filter((m) => m.fecha >= "2026-03-11");
    const salidas = enGobierno.filter((m) => m.tipo === "renuncia" || m.tipo === "cese" || m.tipo === "remocion");
    expect(salidas.length).toBeGreaterThanOrEqual(43);

    // Desglose explícito en Hero
    expect(movPageContent).toContain("salidas");
    expect(movPageContent).toContain("nombramientos");
    expect(movPageContent).toContain("cambios");
    expect(movPageContent).toContain("fallidos");
    expect(movPageContent).toContain("Cambios en el Gobierno Actual");
    expect(movPageContent).toContain("Último Cambio Registrado");
    expect(movPageContent).toContain("Días Entre Cambios (Promedio)");
  });

  it("2. Mes de Abril con oleada de salidas (~15+ cards)", () => {
    const abril = MOVIMIENTOS.filter((m) => m.fecha.startsWith("2026-04"));
    expect(abril.length).toBeGreaterThanOrEqual(15);
  });

  it("3. D1: SEGEGOB 19-may corresponde a Mara Sedini Viancos", () => {
    const sedini = MOVIMIENTOS.find((m) => m.salio?.nombre.includes("Mara Sedini") || m.saliente?.includes("Mara Sedini"));
    expect(sedini).toBeDefined();
    expect(sedini?.fecha).toBe("2026-05-19");
    expect(sedini?.decreto_numero).toContain("189");
    expect(sedini?.estado).toBe("verificado");
  });

  it("4. D2: Secuencia Hacienda Rodríguez -> Bunster -> Vallebona con decretos", () => {
    const rodriguez = MOVIMIENTOS.find((m) => m.salio?.nombre.includes("Andrés Rodríguez") || m.saliente?.includes("Andrés Rodríguez"));
    expect(rodriguez).toBeDefined();
    expect(rodriguez?.id_norma).toBe("1210200");
    expect(rodriguez?.estado).toBe("verificado");

    const bunster = MOVIMIENTOS.find((m) => m.salio?.nombre.includes("Álvaro Bunster") || m.saliente?.includes("Álvaro Bunster"));
    expect(bunster).toBeDefined();
    expect(bunster?.entro?.nombre).toContain("Juan Carlos Vallebona");
    expect(bunster?.id_norma).toBe("1214910");
    expect(bunster?.estado).toBe("verificado");
  });

  it("5. D3: Riveros (Mujer) y Rengifo (Ciencia) con decretos oficiales", () => {
    const riveros = MOVIMIENTOS.find((m) => m.salio?.nombre.includes("Riveros") || m.saliente?.includes("Riveros"));
    expect(riveros).toBeDefined();
    expect(riveros?.id_norma).toBe("1210320");
    expect(riveros?.estado).toBe("verificado");

    const rengifo = MOVIMIENTOS.find((m) => m.salio?.nombre.includes("Rengifo") || m.saliente?.includes("Rengifo"));
    expect(rengifo).toBeDefined();
    expect(rengifo?.id_norma).toBe("1210600");
    expect(rengifo?.estado).toBe("verificado");
  });

  it("6. Botón Compartir en el Hero masthead con URL de filtros activos y nota metodológica", () => {
    expect(movPageContent).toContain("Compartir");
    expect(movPageContent).toContain("handleShare");
    expect(movPageContent).toContain("Las salidas se contrastan con registros públicos de seguimiento; la confirmación proviene de decretos");
  });

  it("7. Normalización estricta de sufijo: '(Subrogente)' normalizado a '(Subrogante)'", () => {
    expect(movJsonRaw.toLowerCase()).not.toContain("subrogente");
    const allNames = MOVIMIENTOS.flatMap((m) => [m.salio?.nombre, m.entro?.nombre, m.saliente, m.entrante]).filter(Boolean);
    for (const name of allNames) {
      expect(name?.toLowerCase()).not.toContain("subrogente");
    }
  });

  it("8. Invariantes de plataforma: Vanessa Kaiser, Maipú y 13 fuentes", () => {
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
