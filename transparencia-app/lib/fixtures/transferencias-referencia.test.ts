import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getLey19862Summary } from "@/lib/transferencias-data";
import { SOURCE_CANONICAL_COUNTS } from "@/lib/published-sources";
import { queryTransferencias } from "@/lib/transferencias-d1";

describe("Fixture de Referencia Oficial — Transferencias Ley 19.862", () => {
  const pageSource = readFileSync(resolve("app/transferencias/page.tsx"), "utf8");
  const explorerSource = readFileSync(resolve("components/transferencias/TransferenciasExplorerClient.tsx"), "utf8");

  it("1. Coherencia Cross-Page: el release actual conserva el baseline oficial", async () => {
    const summary = getLey19862Summary();
    expect(summary.kpis.total_transfers).toBeGreaterThanOrEqual(SOURCE_CANONICAL_COUNTS["ley-19862"]);
    expect(SOURCE_CANONICAL_COUNTS["ley-19862"]).toBe(59361);

    const res = await queryTransferencias({ limit: 50 });
    expect(res.total).toBe(summary.kpis.total_transfers);
    expect(res.totalPages).toBe(Math.ceil(summary.kpis.total_transfers / 50));
  });

  it("2. Serie anual: los totales de cada año coinciden con el universo publicado", () => {
    const summary = getLey19862Summary();
    const years = Object.entries(summary.by_year);
    expect(years.length).toBeGreaterThan(0);

    for (const [, info] of years) {
      expect(info).toBeDefined();
      expect(info.count).toBeGreaterThan(0);
      expect(info.total).toBeGreaterThan(0);
    }
    expect(years.reduce((sum, [, info]) => sum + info.count, 0)).toBe(summary.kpis.total_transfers);
    expect(years.reduce((sum, [, info]) => sum + info.total, 0)).toBe(summary.kpis.total_monto_clp);
  });

  it("3. Muestra Verbatim de 5 Transferencias Oficiales (Ronda 4)", () => {
    const summary = getLey19862Summary();
    const sample = summary.transfers_sample;

    // 1. ID 4571380 - Andacollo
    const t4571380 = sample.find((t) => t.id.includes("4571380"));
    expect(t4571380).toBeDefined();
    expect(t4571380?.emitter_name).toBe("MUNICIPALIDAD DE ANDACOLLO");
    expect(t4571380?.receiver_name).toBe("AGRUPACION DEPORTIVA COLOCOLINA DE ANDACOLLO");
    expect(t4571380?.monto_clp).toBe(2000000);
    expect(t4571380?.url).toBe("https://registros19862.gob.cl/transferencia/4571380");

    // 2. ID 4585076 - Viña Bus S.A.
    const t4585076 = sample.find((t) => t.id.includes("4585076"));
    expect(t4585076).toBeDefined();
    expect(t4585076?.emitter_name).toBe("SUBSECRETARÍA DE TRANSPORTES");
    expect(t4585076?.receiver_name).toBe("VIÑA BUS S.A.");
    expect(t4585076?.monto_clp).toBe(347920910);
    expect(t4585076?.url).toBe("https://registros19862.gob.cl/transferencia/4585076");

    // 3. ID 4585077 - Transportes Sol y Mar S.A.
    const t4585077 = sample.find((t) => t.id.includes("4585077"));
    expect(t4585077).toBeDefined();
    expect(t4585077?.emitter_name).toBe("SUBSECRETARÍA DE TRANSPORTES");
    expect(t4585077?.receiver_name).toBe("TRANSPORTES SOL Y MAR S.A.");
    expect(t4585077?.monto_clp).toBe(198329345);
    expect(t4585077?.url).toBe("https://registros19862.gob.cl/transferencia/4585077");

    // 4. ID 4585078 - Viña Bus S.A.
    const t4585078 = sample.find((t) => t.id.includes("4585078"));
    expect(t4585078).toBeDefined();
    expect(t4585078?.emitter_name).toBe("SUBSECRETARÍA DE TRANSPORTES");
    expect(t4585078?.receiver_name).toBe("VIÑA BUS S.A.");
    expect(t4585078?.monto_clp).toBe(176656174);
    expect(t4585078?.url).toBe("https://registros19862.gob.cl/transferencia/4585078");

    // 5. ID 4585079 - Buses del Gran Valparaíso S.A.
    const t4585079 = sample.find((t) => t.id.includes("4585079"));
    expect(t4585079).toBeDefined();
    expect(t4585079?.emitter_name).toBe("SUBSECRETARÍA DE TRANSPORTES");
    expect(t4585079?.receiver_name).toBe("BUSES DEL GRAN VALPARAISO S.A");
    expect(t4585079?.monto_clp).toBe(219462458);
    expect(t4585079?.url).toBe("https://registros19862.gob.cl/transferencia/4585079");
  });

  it("4. Paginación default 10 filas, selector 10/25/50 y serie anual", async () => {
    expect(explorerSource).toContain("DEFAULT_PAGE_SIZE = 10");
    expect(explorerSource).toContain("PAGE_SIZE_OPTIONS = [10, 25, 50]");
    expect(explorerSource).toContain("handlePageSizeChange");
    expect(explorerSource).toContain("Serie Anual de Transferencias (2023–2026)");
    expect(explorerSource).toContain("handleYearChange");
    expect(explorerSource).toContain("handleSortChange");

    const res10 = await queryTransferencias({ limit: 10 });
    expect(res10.totalPages).toBeGreaterThanOrEqual(5930);

    const res50 = await queryTransferencias({ limit: 50 });
    expect(res50.totalPages).toBeGreaterThanOrEqual(1187);
  });
});
