import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hasMovementPublicChanges, shouldRefreshMovements } from "../scripts/movimientos-publication.mjs";
import { buildMovementPayload, validateMovementPayload } from "../scripts/movimientos-pipeline.mjs";

const baseline = { movimientos: [{ id: "one", estado: "en_confirmacion" }], signals: [{ id: "signal", status: "en_confirmacion", last_seen_at: "yesterday" }] };
describe("Movimientos publication decision", () => {
  it("does not publish review timestamps or source diagnostics alone", () => {
    expect(hasMovementPublicChanges(baseline, { ...baseline, last_run: "today", source_health: [], signals: [{ ...baseline.signals[0], last_seen_at: "today" }] })).toBe(false);
  });
  it("publishes a new press announcement", () => {
    expect(hasMovementPublicChanges(baseline, { ...baseline, signals: [...baseline.signals, { id: "new", status: "en_confirmacion" }] })).toBe(true);
  });
  it("publishes confirmation on the same identity", () => {
    expect(hasMovementPublicChanges(baseline, { ...baseline, movimientos: [{ id: "one", estado: "verificado_oficial" }] })).toBe(true);
  });
  it("ignores object key and record ordering, not changed evidence", () => {
    expect(hasMovementPublicChanges(baseline, { signals: baseline.signals, movimientos: [{ estado: "en_confirmacion", id: "one" }] })).toBe(false);
    expect(hasMovementPublicChanges(baseline, { ...baseline, movimientos: [{ ...baseline.movimientos[0], fuentes: [{ url: "official" }] }] })).toBe(true);
  });
  it.each(["skipped", "success"])("refreshes Pages only if the ETL upload succeeded (%s)", (conclusion) => {
    expect(shouldRefreshMovements([{ steps: [{ name: "Validar snapshot y publicar grupo estático", conclusion }] }])).toBe(conclusion === "success");
  });
  it("blocks ambiguous or missing upload results", () => {
    expect(() => shouldRefreshMovements([])).toThrow("MOVIMIENTOS_PUBLICATION_RESULT_MISSING");
    expect(() => shouldRefreshMovements([{ steps: [{ name: "Validar snapshot y publicar grupo estático", conclusion: "failure" }] }])).toThrow("MOVIMIENTOS_PUBLICATION_RESULT_INVALID");
  });
  it("replays the existing fixture without sources, R2 writes or D1", () => {
    const input = JSON.parse(readFileSync(new URL("../data/movimientos.json", import.meta.url), "utf8"));
    const first = validateMovementPayload(buildMovementPayload(input, { now: "2026-10-01T10:00:00Z" }));
    const second = validateMovementPayload(buildMovementPayload(first, { now: "2026-10-02T10:00:00Z" }));
    expect(hasMovementPublicChanges(first, second)).toBe(false);
    expect(second.movimientos).toHaveLength(first.movimientos.length);
    expect(() => validateMovementPayload({ ...second, movimientos: [] })).toThrow("MOVIMIENTOS_UNIVERSE_INCOMPLETE");
    expect(() => validateMovementPayload({ ...second, movimientos: second.movimientos.slice(1) })).toThrow("MOVIMIENTOS_UNIVERSE_INCOMPLETE");
  });
});
