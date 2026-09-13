import { describe, expect, it } from "vitest";
import { buildFallbackDataQualitySummary } from "@/lib/data-quality-summary";

describe("alcance agregado de DIPRES", () => {
  it("conserva la diferencia entre catálogo declarado y release público", () => {
    const source = buildFallbackDataQualitySummary().sources.find((item) => item.id === "dipres");

    expect(source?.canonicalCount).toBe(15_689);
    expect(source?.catalogDeclaredCount).toBe(247_287);
    expect(source?.status).toBe("parcial");
    expect(source?.coverageNote).toContain("ejecución mensual");
  });
});
