import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const data = vi.hoisted(() => ({
  sources: [],
  summary: {
    totalRegistrosCanonicos: 42 as number | null,
    totalFuentes: 2, fuentesOficiales: 1, fuentesDerivadas: 1,
    releaseChecksum: "a".repeat(16), ultimaValidacionFormatted: "1 oct 2026",
    metrics: {
      published: { label: "No calculable", count: null, denominator: null },
      queryable: { label: "No calculable", count: null, denominator: null },
      related: { label: "No calculable", count: null, denominator: null },
    },
  },
}));
vi.mock("@/lib/data-quality-dashboard", () => ({ getDataQualityDashboardData: async () => data }));
import FuentesPage from "@/app/fuentes/page";

describe("Fuentes uses the publication summary, not fixed global KPIs", () => {
  it("renders release counts and source totals without a global data cutoff", async () => {
    const html = renderToStaticMarkup(await FuentesPage());
    expect(html).toContain("42");
    expect(html).toContain("2 (1 oficiales + 1 derivada)");
    expect(html).toContain("Cortes por fuente");
    expect(html).not.toContain("incluye actividad parlamentaria");
    expect(html).not.toContain("GLOBAL_KPIS");
  });
  it("does not replace an unreconciled total with a fixed number or zero", async () => {
    data.summary.totalRegistrosCanonicos = null;
    const html = renderToStaticMarkup(await FuentesPage());
    expect(html).toContain("Conteo conjunto no calculable");
    expect(html).not.toContain("consolidado ");
    data.summary.totalRegistrosCanonicos = 42;
  });
  it("keeps an absent release distinct from a current version", async () => {
    data.summary.releaseChecksum = "pendiente";
    const html = renderToStaticMarkup(await FuentesPage());
    expect(html).toContain("Versión no informada");
    data.summary.releaseChecksum = "a".repeat(16);
  });
  it("never imports stale global KPIs or attributes differences to deduplication without evidence", () => {
    const source = readFileSync(resolve("app/fuentes/page.tsx"), "utf8");
    expect(source).not.toContain("GLOBAL_KPIS");
    expect(source).not.toContain("Diferencia por deduplicación");
  });
});
