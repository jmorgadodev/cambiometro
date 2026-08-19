import { describe, expect, it } from "vitest";
import { evaluateDataHealth, publicDataHealth } from "@/lib/data-health";

describe("salud de datos", () => {
  it("marca saludable cuando D1 coincide y las fuentes estan frescas", () => {
    const result = evaluateDataHealth({
      now: new Date("2026-08-12T12:00:00Z"),
      latestRun: { id: "1", status: "success", started_at: "2026-08-12T05:15:00Z", finished_at: "2026-08-12T05:20:00Z" },
      states: [{ source_id: "camara", status: "partial", record_count: 152, generated_at: "2026-08-12T05:19:00Z", last_success_at: "2026-08-12T05:20:00Z", error: null, published_version: "v1" }],
      counts: [{ source_id: "camara", count: 152 }],
    });
    expect(result.healthy).toBe(true);
    expect(result.sources[0]).toMatchObject({ stale: false, parity: true });
  });

  it("marca degradado si falta materializacion o la fuente diaria esta atrasada", () => {
    const result = evaluateDataHealth({
      now: new Date("2026-08-12T12:00:00Z"),
      latestRun: { id: "1", status: "success", started_at: "2026-08-10T05:15:00Z", finished_at: "2026-08-10T05:20:00Z" },
      states: [{ source_id: "camara", status: "partial", record_count: 152, generated_at: "2026-08-10T05:19:00Z", last_success_at: "2026-08-10T05:20:00Z", error: null, published_version: "v1" }],
      counts: [{ source_id: "camara", count: 100 }],
    });
    expect(result.healthy).toBe(false);
    expect(result.sources[0]).toMatchObject({ stale: true, parity: false });
  });

  it("trata la transparencia financiera del Senado como fuente mensual", () => {
    const result = evaluateDataHealth({
      now: new Date("2026-08-14T01:00:00Z"),
      latestRun: { id: "1", status: "success", started_at: "2026-08-14T00:15:00Z", finished_at: "2026-08-14T00:20:00Z" },
      states: [{ source_id: "senado", status: "partial", record_count: 1_428, generated_at: "2026-08-12T09:00:00Z", last_success_at: "2026-08-12T09:00:00Z", error: null, published_version: "v1" }],
      counts: [{ source_id: "senado", count: 1_428 }],
    });

    expect(result.healthy).toBe(true);
    expect(result.sources[0]).toMatchObject({ stale: false, parity: true });
  });

  it("marca degradado si una fuente declarada sigue sin registros", () => {
    const result = evaluateDataHealth({
      now: new Date("2026-08-12T12:00:00Z"),
      latestRun: { id: "1", status: "success", started_at: "2026-08-12T05:15:00Z", finished_at: "2026-08-12T05:20:00Z" },
      states: [{ source_id: "senado", status: "partial", record_count: 0, generated_at: "2026-08-12T05:19:00Z", last_success_at: "2026-08-12T05:20:00Z", error: null, published_version: "v1" }],
      counts: [{ source_id: "senado", count: 0 }],
    });
    expect(result.healthy).toBe(false);
    expect(result.summary.emptySources).toBe(1);
  });

  it("no expone errores internos, ids de ejecucion ni versiones de almacenamiento", () => {
    const health = evaluateDataHealth({
      now: new Date("2026-08-12T12:00:00Z"),
      latestRun: { id: "run-secret", status: "failed", started_at: "2026-08-12T05:15:00Z", finished_at: "2026-08-12T05:20:00Z" },
      states: [{ source_id: "camara", status: "error", record_count: 1, generated_at: null, last_success_at: null, error: "token=secret upstream trace", published_version: "internal-r2-key" }],
      counts: [{ source_id: "camara", count: 0 }],
    });

    const exposed = JSON.stringify(publicDataHealth(health));
    expect(exposed).not.toContain("run-secret");
    expect(exposed).not.toContain("token=secret");
    expect(exposed).not.toContain("internal-r2-key");
    expect(exposed).toContain('"hasError":true');
  });

  it("acepta una fuente archivada en R2 sin exigir duplicarla en D1", () => {
    const result = evaluateDataHealth({
      now: new Date("2026-08-12T12:00:00Z"),
      latestRun: { id: "1", status: "success", started_at: "2026-08-12T05:15:00Z", finished_at: "2026-08-12T05:20:00Z" },
      states: [{ source_id: "servel", status: "archive_only", record_count: 23_894, generated_at: "2026-08-12T05:19:00Z", last_success_at: "2026-08-12T05:20:00Z", error: null, published_version: "v1" }],
      counts: [{ source_id: "servel", count: 0 }],
    });
    expect(result.healthy).toBe(true);
    expect(result.summary.emptySources).toBe(0);
    expect(result.sources[0]).toMatchObject({ archiveOnly: true, parity: true, manifestRecordCount: 23_894, actualRecordCount: 0 });
  });

  it("acepta la proyeccion de personal almacenada en KV sin exigir filas canonicas", () => {
    const result = evaluateDataHealth({
      now: new Date("2026-08-13T23:00:00Z"),
      latestRun: { id: "1", status: "success", started_at: "2026-08-13T22:00:00Z", finished_at: "2026-08-13T22:05:00Z" },
      states: [{ source_id: "personal-apoyo", status: "partial", record_count: 4_092, generated_at: "2026-08-13T22:00:00Z", last_success_at: "2026-08-13T22:05:00Z", error: null, published_version: "v1" }],
      counts: [],
    });

    expect(result.healthy).toBe(true);
    expect(result.summary.emptySources).toBe(0);
    expect(result.sources[0]).toMatchObject({ projectionOnly: true, parity: true, manifestRecordCount: 4_092, actualRecordCount: 0 });
  });
});
