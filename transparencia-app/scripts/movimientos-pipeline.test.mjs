import { describe, expect, it } from "vitest";
import {
  buildMovementPayload,
  calculateMovimientoEstado,
  collectMovementSources,
  parseMovementSignals,
  sha256,
  validateMovementPayload,
} from "./movimientos-pipeline.mjs";

const baseline = {
  pipeline: "etl_movimientos_autoridades",
  movimientos: [
    { id: "mov-1", estado: "verificado", fuentes: [{ nivel: "oficial", url: "https://example.test/a" }], fecha: "2026-08-15", tipo_evento: "renuncia", organismo: "Ministerio" },
    { id: "mov-2", estado: "en_confirmacion", fuentes: [{ nivel: "prensa", url: "https://example.test/b" }], fecha: "2026-08-14", tipo_evento: "cambio", organismo: "Ministerio" },
  ],
  stats: {},
};

describe("pipeline automático de movimientos", () => {
  it("detecta señales de cambio sin convertirlas en hechos oficiales", () => {
    const signals = parseMovementSignals(
      '<html><a href="/a">Gobierno anuncia nombramiento de autoridad</a><a href="/a">Gobierno anuncia nombramiento de autoridad</a></html>',
      { url: "https://fuente.test/noticias", contentType: "text/html" },
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].title).toContain("nombramiento");
    expect(signals[0].fase).toBe("anunciado");
    expect(signals[0].status).toBe("en_confirmacion");
  });

  it("mantiene el estado provisional cuando no hay fuente oficial", () => {
    expect(calculateMovimientoEstado({ fuentes: [{ nivel: "prensa" }] })).toBe("en_confirmacion");
    expect(calculateMovimientoEstado({ fuentes: [{ nivel: "oficial" }] })).toBe("verificado");
  });

  it("declara bloqueo cuando ninguna fuente oficial responde", async () => {
    const result = await collectMovementSources({
      sources: [
        { id: "a", label: "A", tier: "official", url: "https://a.test" },
        { id: "b", label: "B", tier: "official", url: "https://b.test" },
      ],
      retries: 0,
      fetchImpl: async () => new Response("blocked", { status: 403 }),
    });
    expect(result.allOfficialBlocked).toBe(true);
    expect(result.hasOfficialSource).toBe(false);
  });

  it("actualiza metadata, preserva el baseline y genera checksum", () => {
    const payload = buildMovementPayload(baseline, {
      now: "2026-08-28T07:00:00.000Z",
      sourceResults: [{ id: "ley-chile", tier: "official", ok: true, signals: [] }],
      signals: [{ signal_id: "signal-1", status: "en_confirmacion" }],
    });
    expect(payload.movimientos).toHaveLength(2);
    expect(payload.last_success_at).toBe("2026-08-28T07:00:00.000Z");
    expect(payload.stats.signals_en_confirmacion).toBe(1);
    expect(payload.conectores.t1_ley_chile.estado).toBe("Disponible");
    expect(payload.conectores.t1_ley_chile.http_status).toBeNull();
    expect(payload.checksum_sha256).toBe(sha256({ ...payload, checksum_sha256: undefined }));
    expect(() => validateMovementPayload({ ...payload, movimientos: Array(78).fill(payload.movimientos[0]) })).toThrow("MOVIMIENTOS_UNIVERSE_INCOMPLETE");
  });
});
