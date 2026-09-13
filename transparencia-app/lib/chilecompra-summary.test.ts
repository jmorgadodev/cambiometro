import { describe, expect, it } from "vitest";
import { getChileCompraResumen } from "@/lib/chilecompra";

describe("resumen público ChileCompra", () => {
  it("usa agregados publicados y no devuelve el universo de registros", () => {
    const summary = getChileCompraResumen(5);
    expect(summary.months.length).toBeGreaterThan(0);
    expect(summary.topBuyers).toHaveLength(5);
    expect(summary.topSuppliers).toHaveLength(5);
    expect(summary.anomalies).toBeGreaterThanOrEqual(0);
    expect(summary.topBuyers[0]?.procesos).toBeGreaterThan(0);
  });
});
