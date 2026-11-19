import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertMovementCandidate } from "../scripts/movimientos-publication.mjs";
import { calculateMovimientoEstado, sha256 } from "../scripts/movimientos-pipeline.mjs";
import { latestMovementPublicationDate } from "./movimientos";

describe("Movimientos: confirmación y conservación del corte", () => {
  it("una URL de decreto no equivale a revisión documental", () => {
    expect(calculateMovimientoEstado({ estado: "en_confirmacion", decreto_url: "https://www.bcn.cl/leychile/navegar?idNorma=1", fuentes: [{ nivel: "oficial" }] })).toBe("en_confirmacion");
    expect(calculateMovimientoEstado({ estado: "corroborado", decreto_url: "https://example.test" })).toBe("corroborado");
  });
  it("no permite reemplazar una identidad publicada por otra con el mismo total", () => {
    const previous = JSON.parse(readFileSync("data/movimientos.json", "utf8"));
    const candidate = structuredClone(previous);
    candidate.movimientos[0].id = "replacement-unrelated";
    candidate.checksum_sha256 = sha256({ ...candidate, checksum_sha256: undefined });
    expect(() => assertMovementCandidate(previous, candidate)).toThrow("MOVIMIENTOS_PUBLISHED_HISTORY_LOSS");
  });
  it("admite evidencia nueva en la misma identidad sin cambiar su fecha efectiva", () => {
    const previous = JSON.parse(readFileSync("data/movimientos.json", "utf8"));
    const candidate = structuredClone(previous);
    candidate.movimientos[0].fuentes.push({ nivel: "prensa", medio: "Ejemplo", url: "https://example.test/document", fecha: "2026-11-18", titulo: "Nueva evidencia" });
    candidate.checksum_sha256 = sha256({ ...candidate, checksum_sha256: undefined });
    expect(assertMovementCandidate(previous, candidate).movimientos[0].fecha).toBe(previous.movimientos[0].fecha);
  });
  it("una fecha imposible no se muestra como la última publicación", () => {
    expect(latestMovementPublicationDate([], [{ date: "2026-11-18" }, { date: "2026-02-30" }, { date: "2026-99-99" }])).toBe("2026-11-18");
    expect(latestMovementPublicationDate([], [{ date: "2026-02-30" }])).toBeNull();
  });
});
