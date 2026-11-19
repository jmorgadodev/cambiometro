import { describe, expect, it, vi } from "vitest";
import { sourceAutomation } from "./source-automation";
import { getDataQualityDashboardData } from "./data-quality-dashboard";
import * as quality from "./data-quality-summary";

describe("automatización separada de cobertura y publicación", () => {
  it.each(["transparencia-activa", "chilecompra", "contraloria", "dipres", "infolobby", "infoprobidad", "ley-19862", "sinim"])("%s conserva su pausa", (id) => {
    expect(sourceAutomation(id)).toMatchObject({ mode: "paused", label: "Actualización automática pausada" });
  });
  it("distingue el cron remoto, la tarea local y la ejecución manual", () => {
    expect(sourceAutomation("camara").mode).toBe("scheduled");
    expect(sourceAutomation("senado").mode).toBe("mixed");
    expect(sourceAutomation("gastos_senado").mode).toBe("local-only");
    expect(sourceAutomation("personal-apoyo").mode).toBe("mixed");
    expect(sourceAutomation("servel").mode).toBe("manual");
    expect(sourceAutomation("not-documented").mode).toBe("unknown");
  });
  it("un calendario incompleto no se sustituye por una cadencia antigua", () => {
    expect(sourceAutomation("camara", { entries: [] }).mode).toBe("unknown");
  });
  it("la pausa no cambia los conteos, el corte ni la cobertura", async () => {
    const fallback = quality.buildFallbackDataQualitySummary();
    const read = vi.spyOn(quality, "readGeneratedDataQualitySummary").mockReturnValue(fallback);
    try {
      const result = await getDataQualityDashboardData();
      const original = fallback.sources.find(source => source.id === "chilecompra")!;
      expect(result.sources.find(source => source.id === original.id)).toMatchObject({ canonicalCount: original.canonicalCount, periodoReciente: original.period, lastSync: original.lastUpdatedAt, automation: { mode: "paused" } });
    } finally { read.mockRestore(); }
  });
});
