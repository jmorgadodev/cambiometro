import { describe, expect, it } from "vitest";
import {
  buildMovementPayload,
  calculateMovimientoEstado,
  collectMovementSources,
  materializeKnownSignals,
  normalizeMovementPayload,
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

  it("lee titulares, fecha y resumen de una página de noticia", () => {
    const signals = parseMovementSignals(
      '<html><head><meta property="og:title" content="Alonso Velásquez renuncia como seremi de Vivienda de Tarapacá"><meta property="article:published_time" content="2026-09-03T09:00:00-04:00"><meta name="description" content="El Ministerio de Vivienda informó la salida de la autoridad regional."></head></html>',
      { url: "https://radio.example/noticia", contentType: "text/html" },
    );
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      title: "Alonso Velásquez renuncia como seremi de Vivienda de Tarapacá",
      date: "2026-09-03",
      summary: "El Ministerio de Vivienda informó la salida de la autoridad regional.",
    });
  });

  it("mantiene el estado provisional cuando no hay fuente oficial", () => {
    expect(calculateMovimientoEstado({ fuentes: [{ nivel: "prensa" }] })).toBe("en_confirmacion");
    expect(calculateMovimientoEstado({ fuentes: [{ nivel: "oficial" }] })).toBe("en_confirmacion");
    expect(calculateMovimientoEstado({ decreto_url: "https://www.bcn.cl/leychile/navegar?idNorma=1", fuentes: [{ nivel: "oficial" }] })).toBe("verificado");
  });

  it("materializa una señal oficial de nombramiento y corrige el anuncio previo no corroborado", () => {
    const previous = [
      {
        id: "mov-100",
        cargo: "Subsecretaria del Deporte",
        estado: "verificado",
        decreto_url: "https://www.bcn.cl/leychile/navegar?idNorma=1215435",
        entro: { nombre: "Sofía Rengifo Ottone", fecha: "2026-08-14" },
        fuentes: [{ nivel: "oficial", medio: "Ley Chile", url: "https://www.bcn.cl/leychile/navegar?idNorma=1215435", fecha: "2026-08-14" }],
      },
    ];
    const result = materializeKnownSignals(previous, [{
      title: "Presidente Kast nombra a María Paz Ríos Lama como nueva subsecretaria de Deportes",
      summary: "",
      url: "https://prensa.presidencia.cl/comunicado.aspx?id=339274",
    }], "2026-08-28T07:00:00.000Z");
    expect(result).toHaveLength(2);
    expect(result[0].tipo_evento).toBe("nombramiento-fallido");
    expect(result[0].estado).toBe("en_confirmacion");
    expect(result[0].decreto_url).toBeUndefined();
    expect(result[1]).toMatchObject({ id: "mov-rios-deportes-2026-08-27", entrante: "María Paz Ríos Lama", estado: "en_confirmacion", documento_pendiente: true });
    expect(result[1].fuentes.some((source) => source.medio === "Prensa Presidencia")).toBe(true);
  });

  it("materializa señales periodísticas conocidas como anuncios en confirmación", () => {
    const result = materializeKnownSignals([], [
      {
        title: "Alonso Velásquez renuncia como seremi de Vivienda de Tarapacá",
        summary: "El Ministerio de Vivienda informó la salida de la autoridad regional.",
        url: "https://radiopaulina.cl/2026/09/03/renuncia-seremi-vivienda-tarapaca/",
        date: "2026-09-03",
        source_label: "Radio Paulina",
        source_tier: "provisional",
      },
      {
        title: "Gobierno pide la renuncia a seremi de Transportes de Arica, Patricio Löhr",
        summary: "La salida ocurrió tras una denuncia de funcionarios de la DGAC.",
        url: "https://www.adnradio.cl/2026/09/01/gobierno-pide-renuncia-seremi-transportes-arica/",
        date: "2026-09-01",
        source_label: "ADN Radio",
        source_tier: "provisional",
      },
    ], "2026-09-05T07:00:00.000Z");
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "mov-alonso-velasquez-2026-09-03",
        estado: "en_confirmacion",
        fecha: "2026-09-02",
        salio: { nombre: "Alonso Velásquez", fecha: "2026-09-02" },
      }),
      expect.objectContaining({
        id: "mov-patricio-lohr-2026-09-01",
        estado: "en_confirmacion",
        fecha: "2026-09-01",
      }),
    ]));
    expect(result.every((movement) => movement.documento_pendiente)).toBe(true);
    expect(result.find((movement) => movement.id === "mov-alonso-velasquez-2026-09-03").fuentes).toEqual(expect.arrayContaining([
      expect.objectContaining({ medio: "Ministerio de Vivienda y Urbanismo", nivel: "oficial", fecha: "2026-09-02" }),
      expect.objectContaining({ medio: "Radio Paulina", fecha: "2026-09-03" }),
      expect.objectContaining({ medio: "Pauta", fecha: "2026-09-03" }),
    ]));
    expect(result.find((movement) => movement.id === "mov-patricio-lohr-2026-09-01").fuentes).toEqual(expect.arrayContaining([
      expect.objectContaining({ medio: "ADN Radio", fecha: "2026-09-01" }),
      expect.objectContaining({ medio: "BioBioChile", fecha: "2026-09-01" }),
      expect.objectContaining({ medio: "Emol", fecha: "2026-09-02" }),
    ]));
  });

  it("reconcilia un anuncio ya publicado y agrega la fuente oficial sin duplicarlo", () => {
    const previous = [{
      id: "mov-alonso-velasquez-2026-09-03",
      cargo: "Secretario Regional Ministerial de Vivienda y Urbanismo de Tarapacá",
      region: "Región de Tarapacá",
      salio: { nombre: "Alonso Velásquez", fecha: "2026-09-03" },
      fecha: "2026-09-03",
      estado: "en_confirmacion",
      fuentes: [{
        nivel: "prensa",
        medio: "Radio Paulina",
        url: "https://radiopaulina.cl/2026/09/03/entrevero-irreconciliable-ex-seremi-de-vivienda-de-tarapaca-justifico-su-salida-por-un-desencuentro-con-el-ministro-poduje/",
        fecha: "2026-09-03",
      }],
    }];
    const result = materializeKnownSignals(previous, [{
      title: "Alonso Velásquez renuncia como seremi de Vivienda de Tarapacá",
      url: "https://radiopaulina.cl/2026/09/03/entrevero-irreconciliable-ex-seremi-de-vivienda-de-tarapaca-justifico-su-salida-por-un-desencuentro-con-el-ministro-poduje/",
      date: "2026-09-03",
      source_label: "Radio Paulina",
      source_tier: "provisional",
    }], "2026-09-05T13:00:00.000Z");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fecha: "2026-09-02",
      salio: { nombre: "Alonso Velásquez", fecha: "2026-09-02" },
      estado: "en_confirmacion",
    });
    expect(result[0].fuentes).toEqual(expect.arrayContaining([
      expect.objectContaining({ medio: "Ministerio de Vivienda y Urbanismo", nivel: "oficial" }),
      expect.objectContaining({ medio: "Radio Paulina" }),
    ]));
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
    expect(result.results.map((source) => source.status)).toEqual([403, 403]);
  });

  it("usa sólo variantes oficiales de gob.cl cuando la ruta de noticias está bloqueada", async () => {
    const requested = [];
    const canonicalUrl = "https://www.gob.cl/noticias/";
    const result = await collectMovementSources({
      sources: [{ id: "gob-cl", label: "Gob.cl", tier: "official", url: canonicalUrl }],
      retries: 0,
      fetchImpl: async (url) => {
        requested.push(url);
        if (url === canonicalUrl) return new Response("blocked", { status: 403 });
        return new Response(
          `<html><a href="/noticia">Gobierno anuncia nombramiento de autoridad</a>${" ".repeat(128)}</html>`,
          { status: 200, headers: { "content-type": "text/html" } },
        );
      },
    });
    expect(result.hasOfficialSource).toBe(true);
    expect(result.results[0]).toMatchObject({ ok: true, status: 200, resolved_url: "https://www.gob.cl/" });
    expect(requested).toEqual([canonicalUrl, "https://www.gob.cl/"]);
    expect(result.signals).toHaveLength(1);
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

  it("normaliza snapshots históricos sin modificar sus movimientos", () => {
    const legacy = { ...baseline, last_run: "2026-08-17T03:00:00-04:00" };
    const normalized = normalizeMovementPayload(legacy);
    expect(normalized.movimientos).toEqual(legacy.movimientos);
    expect(normalized.last_attempt_at).toBe(legacy.last_run);
    expect(normalized.last_success_at).toBe(legacy.last_run);
    expect(normalized.checksum_sha256).toBe(sha256({ ...normalized, checksum_sha256: undefined }));
  });

  it("renombra duplicados históricos de forma estable sin eliminar filas", () => {
    const legacy = {
      ...baseline,
      movimientos: [baseline.movimientos[0], { ...baseline.movimientos[1], id: baseline.movimientos[0].id }],
    };
    const normalized = normalizeMovementPayload(legacy);
    expect(normalized.movimientos).toHaveLength(2);
    expect(new Set(normalized.movimientos.map((movement) => movement.id)).size).toBe(2);
    expect(normalized.movimientos[1].id).toMatch(/^mov-1-[a-f0-9]{12}$/);
  });
});
