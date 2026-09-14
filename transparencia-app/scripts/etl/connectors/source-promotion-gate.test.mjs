import { describe, expect, it } from "vitest";
import { evaluateSourcePromotion } from "../source-promotion-gate.mjs";

const green = { testsPassed: true, checksumOk: true, paginationOk: true, d1BulkReads: false };

describe("compuerta de promoción por fuente", () => {
  it("promueve sólo un release completo y verificable", () => {
    expect(evaluateSourcePromotion({
      sourceId: "votaciones_camara",
      release: { status: "complete", recordCount: 100 },
      previous: { recordCount: 90 },
      checks: green,
    })).toMatchObject({ action: "promote", currentCount: 100, previousCount: 90 });
  });

  it("conserva el release anterior ante una respuesta vacía", () => {
    const decision = evaluateSourcePromotion({
      sourceId: "senado",
      release: { status: "empty", recordCount: 0, expectedCount: 1428 },
      previous: { recordCount: 1428 },
      checks: green,
    });
    expect(decision.action).toBe("preserve_previous");
    expect(decision.reasons).toContain("empty_release_would_hide_previous");
  });

  it("mantiene en espera un release parcial aunque tenga datos", () => {
    const decision = evaluateSourcePromotion({
      sourceId: "camara",
      release: { status: "partial", recordCount: 155, expectedCount: 58751 },
      previous: { recordCount: 155 },
      checks: green,
    });
    expect(decision.action).toBe("hold");
    expect(decision.reasons).toContain("partial_release_requires_explicit_approval");
  });

  it("permite una ventana histórica menor sin confundirla con una caída", () => {
    const decision = evaluateSourcePromotion({
      sourceId: "votaciones_senado",
      release: { status: "complete", recordCount: 10 },
      previous: { recordCount: 1000 },
      checks: green,
      compareCount: false,
    });
    expect(decision.action).toBe("promote");
  });
});
