import { describe, expect, it } from "vitest";
import { getLey19862Summary } from "./transferencias-data";

describe("Módulo /transferencias — Validación y aserciones", () => {
  it("0. Carga autoritativa en build-time con datos no vacíos", () => {
    const summary = getLey19862Summary();
    expect(summary).toBeDefined();
    expect(summary.kpis).toBeDefined();
    expect(summary.kpis.total_monto_clp).toBeGreaterThan(1_000_000_000_000);
    expect(summary.kpis.total_transfers).toBe(361101);
    expect(summary.kpis.total_receptores).toBe(61336);
    expect(summary.kpis.total_emisores).toBe(419);
  });

  it("1. Top 10 Receptoras y Top 10 Emisores presentes con montos válidos", () => {
    const summary = getLey19862Summary();
    expect(summary.top_receptores.length).toBeGreaterThanOrEqual(10);
    expect(summary.top_emisores.length).toBeGreaterThanOrEqual(10);

    const top10Rec = summary.top_receptores.slice(0, 10);
    for (const r of top10Rec) {
      expect(r.name).toBeDefined();
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.total_clp).toBeGreaterThan(0);
      expect(r.count).toBeGreaterThan(0);
    }

    const top10Emis = summary.top_emisores.slice(0, 10);
    for (const e of top10Emis) {
      expect(e.name).toBeDefined();
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.total_clp).toBeGreaterThan(0);
      expect(e.count).toBeGreaterThan(0);
    }
  });

  it("2. Muestra de transferencias con 1.000 registros y 100% de filas con URL oficial", () => {
    const summary = getLey19862Summary();
    expect(summary.transfers_sample.length).toBe(1000);

    for (const t of summary.transfers_sample) {
      expect(t.id).toBeDefined();
      expect(t.monto_clp).toBeGreaterThan(0);
      expect(t.url).toBeDefined();
      expect(t.url).toMatch(/^https:\/\/registros19862\.gob\.cl\/transferencia\/\d+$/);
      expect(t.emitter_name).toBeDefined();
      expect(t.receiver_name).toBeDefined();
    }
  });
});
