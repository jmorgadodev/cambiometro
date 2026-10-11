import { describe, expect, it } from "vitest";
import { buildFallbackDataQualitySummary } from "@/lib/data-quality-summary";
import { getDataQualityConfig } from "@/lib/data-quality-summary";

describe("alcance agregado de DIPRES", () => {
  it("no reutiliza cifras históricas si el catálogo DIPRES falta en el build", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "dipres");

    expect(source?.canonicalCount).toBe(0);
    expect(source?.catalogDeclaredCount).toBeUndefined();
    expect(source?.status).toBe("no_disponible");
    expect(source?.reconciliation.note).toContain("Sin catálogo DIPRES conciliado");
    const configured = getDataQualityConfig().find((item) => item.id === "dipres");
    expect(configured?.canonicalCount).toBe(0);
    expect(configured?.period).toBe("Período por confirmar");
  });
});
