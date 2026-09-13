import { describe, expect, it } from "vitest";

import { evaluateD1Usage, parseAnalyticsResponse } from "../scripts/check-d1-usage.mjs";

describe("check-d1-usage", () => {
  it("agrega el consumo por cuenta y clasifica aviso y crítico", () => {
    const report = evaluateD1Usage([
      { dimensions: { date: "2026-09-04", databaseId: "db-a" }, sum: { rowsRead: 2_100_000, rowsWritten: 20_000 } },
      { dimensions: { date: "2026-09-04", databaseId: "db-b" }, sum: { rowsRead: 1_100_000, rowsWritten: 45_000 } },
    ]);

    expect(report.rowsRead).toBe(3_200_000);
    expect(report.rowsWritten).toBe(65_000);
    expect(report.readPercent).toBe(64);
    expect(report.writePercent).toBe(65);
    expect(report.level).toBe("warning");
  });

  it("marca crítico al alcanzar 80% de cualquiera de los límites gratuitos", () => {
    const report = evaluateD1Usage([
      { dimensions: { date: "2026-09-04", databaseId: "db-a" }, sum: { rowsRead: 4_000_000, rowsWritten: 1 } },
    ]);

    expect(report.level).toBe("critical");
  });

  it("rechaza respuestas sin autorización en lugar de informar consumo cero", () => {
    expect(() => parseAnalyticsResponse({ data: null, errors: [{ message: "not authorized for that account" }] }))
      .toThrow("D1_ANALYTICS_UNAUTHORIZED");
  });
});
