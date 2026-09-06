import { describe, expect, it } from "vitest";
import { classifyD1MaterializationFailure, summaryForD1Deferral } from "./d1-materialization-policy.mjs";

describe("política de materialización D1 opcional", () => {
  it("degrada el límite diario de rows_read a advertencia", () => {
    expect(classifyD1MaterializationFailure("Cloudflare API error code: 7500 rows_read limit")).toBe("daily_rows_read_limit");
  });

  it("reconoce el mensaje actual del límite gratuito de D1", () => {
    expect(classifyD1MaterializationFailure("Your account has exceeded D1's free tier daily row read limit. [code: 7500]")).toBe("daily_rows_read_limit");
  });

  it("degrada un asset ausente sin ocultar la causa", () => {
    expect(classifyD1MaterializationFailure("D1_ASSET_UNAVAILABLE: entities/v1/source.jsonl.gz")).toBe("asset_unavailable");
  });

  it("degrada el límite de tamaño de D1", () => {
    expect(classifyD1MaterializationFailure("Exceeded maximum DB size")).toBe("database_size_limit");
  });

  it("mantiene fatales credenciales y errores desconocidos", () => {
    expect(classifyD1MaterializationFailure("Authentication error code: 10000")).toBeNull();
  });

  it("genera un resumen accionable para Actions", () => {
    expect(summaryForD1Deferral("asset_unavailable", "infolobby")).toContain("infolobby");
    expect(summaryForD1Deferral("asset_unavailable", "infolobby")).toContain("R2/Pages");
  });
});
