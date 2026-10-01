import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildMovementReviewReport,
  buildMovementPayload,
  calculateMovimientoEstado,
  collectMovementSources,
  materializeKnownSignals,
  MOVIMIENTOS_SOURCES,
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

const publishedMovements = JSON.parse(readFileSync(new URL("../data/movimientos.json", import.meta.url), "utf8"));

describe("pipeline automático de movimientos", () => {
  it("consulta prensa regional de Antofagasta sin usar el agregador como fuente", () => {
    expect(MOVIMIENTOS_SOURCES).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "desierto-fm", tier: "press", url: "https://www.desiertofm.cl/feed/" }),
    ]));
    expect(MOVIMIENTOS_SOURCES.some((source) => source.url.includes("renunciaskast"))).toBe(false);
  });
  it("permite contar anuncios de prensa aunque el origen oficial esté bloqueado", async () => {
    const result = await collectMovementSources({
      sources: [
        { id: "official", tier: "official", url: "https://official.test" },
        { id: "press", tier: "press", url: "https://press.test" },
      ],
      retries: 0,
      fetchImpl: async (url) => url.includes("official")
        ? new Response("blocked", { status: 403 })
        : new Response(JSON.stringify([{ title: "Seremi anuncia su renuncia", date: "2026-10-01", url: "https://press.test/renuncia", description: "Anuncio de salida de la autoridad regional." }]), { headers: { "content-type": "application/json" } }),
    });
    expect(result.allOfficialBlocked).toBe(true);
    expect(result.canPublishAnnouncements).toBe(true);
    const payload = buildMovementPayload(baseline, { signals: result.signals });
    expect(payload.stats.total_eventos_publicados).toBe(3);
    expect(payload.signals[0].status).toBe("en_confirmacion");
  });
  it("no habilita publicación por una página de prensa sin anuncios válidos", async () => {
    const result = await collectMovementSources({
      sources: [{ id: "press", tier: "press", url: "https://press.test" }],
      retries: 0,
      fetchImpl: async () => new Response("<html>Sin anuncios de autoridades</html>".padEnd(160)),
    });
    expect(result.canPublishAnnouncements).toBe(false);
  });
  it("conserva la primera fecha de detección al releer una señal conocida", () => {
    const movement = publishedMovements.movimientos.find((row) => row.id === "mov-kast-2026-2026-09-01-patricio-lohr");
    const signals = [{ title: "Patricio Löhr renuncia como seremi de Transportes de Arica", date: "2026-09-01", url: "https://source.test/noticia", source_label: "Prensa", source_tier: "press" }];
    const first = materializeKnownSignals([movement], signals, "2026-10-01T10:00:00Z");
    const second = materializeKnownSignals(first, signals, "2026-10-02T10:00:00Z");
    expect(second[0].fecha_deteccion).toBe(first[0].fecha_deteccion);
  });
  it("no presenta todos los eventos del corte como confirmados", () => {
    const payload = buildMovementPayload(publishedMovements);
    const backed = payload.movimientos.filter((row) => ["verificado", "verificado_oficial", "corroborado"].includes(row.estado)).length
      + payload.signals.filter((row) => row.status === "verificado_oficial").length;
    const pending = payload.movimientos.filter((row) => row.estado === "en_confirmacion").length
      + payload.signals.filter((row) => row.status === "en_confirmacion").length;
    expect(payload.stats.eventos_con_respaldo).toBe(backed);
    expect(payload.stats.en_confirmacion).toBe(pending);
  });
  it("no cuenta noticias internacionales ni críticas sin anuncio de salida", () => {
    const signals = parseMovementSignals(JSON.stringify([
      { title: 'Irán: salida de EE.UU. de Irak', description: 'El Gobierno de Bagdad celebra la salida de tropas.', url: 'https://www.cooperativa.cl/noticias/mundo/iran/salida.html', date: '2026-10-01' },
      { title: 'Heraldo Muñoz acusó doble estándar del Gobierno por mantener a Zaliasnik', description: 'Se menciona la renuncia de una embajadora y un nombramiento anterior de autoridades.', url: 'https://www.cooperativa.cl/noticias/pais/critica.html', date: '2026-10-01' },
      { title: 'Ministro renuncia en Irak', description: 'El Gobierno informa su salida.', url: 'https://www.cooperativa.cl/noticias/mundo/irak/ministro.html', date: '2026-10-01' },
      { title: 'Seremi descarta renuncia', url: 'https://www.cooperativa.cl/noticias/pais/desmentido.html', date: '2026-10-01' },
    ]), { id: 'cooperativa', tier: 'press', url: 'https://www.cooperativa.cl/noticias/site/tax/port/all/rss__1.xml', contentType: 'application/json' });
    expect(signals).toEqual([]);
  });
  it("mantiene 46 salidas y añade evidencia oficial a Jorge Olivares", () => {
    const jorge = publishedMovements.movimientos.find((movement) => movement.id === "mov-kast-2026-2026-09-14-jorge-olivares");

    expect(publishedMovements.movimientos).toHaveLength(46);
    expect(jorge?.fuentes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        nivel: "oficial",
        medio: "Ministerio de Vivienda y Urbanismo",
        url: "https://www.minvu.gob.cl/noticia/declaracion-publica-14-septiembre-2026/",
        fecha: "2026-09-14",
      }),
    ]));
    expect(jorge).toMatchObject({ estado: "corroborado", verificado: false, documento_pendiente: true });
  });

  it("mantiene a José Bravo como señal oficial pendiente, sin sumarlo a las salidas", () => {
    const minsalUrl = "https://www.minsal.cl/el-ministerio-de-salud-informa-que-solicito-la-renuncia-del-secretario-regional-ministerial-de-salud-de-la-region-de-la-araucania/";
    const joseRows = publishedMovements.movimientos.filter((movement) => /jos[eé] bravo/i.test(`${movement.saliente ?? ""} ${movement.salio?.nombre ?? ""}`));
    const signal = publishedMovements.signals?.find((item) => item.url === minsalUrl);

    expect(joseRows).toHaveLength(0);
    expect(signal).toMatchObject({
      source_id: "minsal",
      source_label: "Ministerio de Salud de Chile",
      source_tier: "official",
      date: "2026-09-15",
      fase: "anunciado",
      status: "en_confirmacion",
      tipo: "renuncia",
    });
    expect(publishedMovements.stats.total_eventos_publicados).toBe(51);
    expect(publishedMovements.stats.eventos_con_respaldo).toBe(46);
    expect(publishedMovements.stats.en_confirmacion).toBe(5);
    expect(publishedMovements.stats.signals_en_confirmacion).toBe(5);
    expect(validateMovementPayload(publishedMovements)).toBe(publishedMovements);
  });

  it("conserva como tres eventos pendientes los anuncios del 30 de septiembre aunque el ETL parta del release anterior", () => {
    const seeds = publishedMovements.signals;
    const previousCooperativaArticle = {
      source_id: "cooperativa",
      source_label: "Cooperativa",
      source_tier: "press",
      title: "El Gobierno perdió tres seremis en sólo un día",
      url: "https://www.cooperativa.cl/noticias/seremis-30-septiembre/",
      date: "2026-09-30",
      summary: "Kattia Durán dejó Desarrollo Social; Sebastián Norambuena salió de Vivienda y Juan Carlos Meléndez dejó Economía en O'Higgins.",
      status: "en_confirmacion",
      fase: "anunciado",
    };
    const payload = buildMovementPayload({ ...publishedMovements, signals: [previousCooperativaArticle] }, {
      now: "2026-10-01T03:00:00.000Z",
      signalSeeds: seeds,
      signals: [
        {
          source_id: "radio-uchile",
          source_label: "Radio Universidad de Chile",
          source_tier: "press",
          title: "Por razones familiares: renuncia seremi de Desarrollo Social de la RM, Kattia Durán",
          url: "https://radio.uchile.cl/2026/09/30/kattia-duran/",
          date: "2026-09-30",
          summary: "Kattia Durán deja la Seremi de Desarrollo Social.",
          status: "en_confirmacion",
          fase: "anunciado",
        },
      ],
    });

    const septemberSignals = payload.signals.filter((signal) => signal.date === "2026-09-30");
    expect(septemberSignals).toHaveLength(3);
    expect(septemberSignals.map((signal) => signal.person_name).sort()).toEqual([
      "Juan Carlos Meléndez Santelices",
      "Kattia Durán",
      "Sebastián Norambuena",
    ]);
    expect(septemberSignals.every((signal) => signal.status === "en_confirmacion")).toBe(true);
    expect(septemberSignals.every((signal) => signal.related_sources?.some((source) => source.source_id === "cooperativa"))).toBe(true);
    expect(payload.signals.some((signal) => signal.title === "El Gobierno perdió tres seremis en sólo un día")).toBe(false);
    expect(payload.stats.total_eventos_publicados).toBe(51);
    expect(payload.stats.signals_en_confirmacion).toBe(5);
    expect(payload.last_event_date).toBe("2026-09-30");
    expect(payload.stats.ultimos_7_dias).toBe(3);
  });

  it("registra la salida reportada de Fabián Páez como señal pendiente sin alterar las 46 salidas reconciliadas", () => {
    const signal = publishedMovements.signals?.find((item) => /fabi[aá]n p[aá]ez/i.test(`${item.title} ${item.summary}`));

    expect(publishedMovements.movimientos).toHaveLength(46);
    expect(publishedMovements.movimientos.some((movement) => /fabi[aá]n p[aá]ez/i.test(`${movement.saliente ?? ""} ${movement.salio?.nombre ?? ""}`))).toBe(false);
    expect(signal).toMatchObject({
      source_id: "media-review",
      source_label: "Chilevisión (comunicado DPR citado)",
      source_tier: "provisional",
      date: "2026-09-17",
      fase: "anunciado",
      status: "en_confirmacion",
      tipo: "renuncia",
      url: "https://www.chilevision.cl/noticias/nacional/seremi-de-energia-de-coquimbo-renuncia-tras-observaciones-de-contraloria-por-su-experiencia-profesional/",
    });
    expect(signal.summary).toContain("falta localizar el comunicado primario enlazable");
    expect(publishedMovements.stats.signals_en_confirmacion).toBe(5);
    expect(validateMovementPayload(publishedMovements)).toBe(publishedMovements);
  });

  it("registra las tres novedades del 30-09 como señales pendientes, separadas del corte oficial", () => {
    const novedades = [
      { name: "Sebastián Norambuena", source: "Ministerio de Vivienda y Urbanismo", effectiveDate: "2026-09-30" },
      { name: "Kattia Durán", source: "Radio Universidad de Chile", effectiveDate: "2026-10-01" },
      { name: "Juan Carlos Meléndez Santelices", source: "Ministerio de Economía, Fomento y Turismo", effectiveDate: "2026-09-30" },
    ];

    expect(publishedMovements.movimientos).toHaveLength(46);
    for (const item of novedades) {
      const signal = publishedMovements.signals?.find((entry) => entry.person_name === item.name);
      expect(signal).toMatchObject({
        date: "2026-09-30",
        effective_date: item.effectiveDate,
        fase: "anunciado",
        status: "en_confirmacion",
        tipo: "renuncia",
        source_label: item.source,
      });
      expect(signal.url).toMatch(/^https:\/\//);
    }
    expect(publishedMovements.stats.signals_en_confirmacion).toBe(5);
    expect(validateMovementPayload(publishedMovements)).toBe(publishedMovements);
  });

  it("monitorea prensa confiable y páginas institucionales para captar señales y su respaldo", () => {
    expect(MOVIMIENTOS_SOURCES).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "radio-uchile", tier: "press", url: "https://radio.uchile.cl/feed/" }),
      expect.objectContaining({ id: "cooperativa", tier: "press", url: "https://www.cooperativa.cl/noticias/site/tax/port/all/rss____1.xml" }),
      expect.objectContaining({ id: "midesof-registros", tier: "official", url: "https://www.midesof.gob.cl/feed/" }),
      expect.objectContaining({ id: "economia-registros", tier: "official", url: "https://www.economia.gob.cl/category/noticias-ministerio/feed/" }),
    ]));
  });

  it("lee titulares fechados de RSS y mantiene las señales en confirmación", () => {
    const signals = parseMovementSignals(`<?xml version="1.0"?><rss><channel><item><title><![CDATA[Comunicado de prensa]]></title><link>https://radio.uchile.cl/noticia-kattia</link><pubDate>Wed, 30 Sep 2026 15:44:00 +0000</pubDate><description><![CDATA[El Ministerio informa que la Seremi Kattia Durán presenta su renuncia efectiva el 1 de octubre.]]></description></item><item><title><![CDATA[Trump califica una retirada como el fin de una incursión]]></title><link>https://radio.uchile.cl/noticia-ruido</link><pubDate>Wed, 30 Sep 2026 15:44:00 +0000</pubDate><description><![CDATA[La nota menciona la renuncia de un funcionario extranjero.]]></description></item></channel></rss>`, {
      id: "radio-uchile",
      url: "https://radio.uchile.cl/feed/",
      contentType: "application/rss+xml",
    });
    expect(signals).toEqual([expect.objectContaining({
      title: "Comunicado de prensa",
      url: "https://radio.uchile.cl/noticia-kattia",
      date: "2026-09-30",
      status: "en_confirmacion",
      fase: "anunciado",
      summary: "El Ministerio informa que la Seremi Kattia Durán presenta su renuncia efectiva el 1 de octubre.",
    })]);
  });

  it("conserva pendientes entre revisiones y sólo propone coincidencias normativas exactas para revisión", () => {
    const pending = {
      signal_id: "signal-person",
      person_name: "Kattia Durán",
      role: "Seremi de Desarrollo Social y Familia",
      status: "en_confirmacion",
      title: "Kattia Durán presenta su renuncia",
    };
    const legalEvidence = {
      signal_id: "signal-legal",
      source_id: "diario-oficial",
      source_label: "Diario Oficial",
      title: "Decreto de cese de Kattia Durán Álvarez",
      summary: "Se acepta la renuncia de la Seremi de Desarrollo Social Kattia Durán Álvarez.",
      url: "https://diariooficial.interior.gob.cl/ejemplo",
      date: "2026-10-01",
      status: "en_confirmacion",
    };
    const report = buildMovementReviewReport({
      collected: { hasOfficialSource: true, results: [], signals: [legalEvidence] },
      pendingSignals: [pending],
    });
    expect(report.pending_signals).toEqual([expect.objectContaining({
      signal_id: "signal-person",
      related_sources: expect.arrayContaining([expect.objectContaining({ url: legalEvidence.url })]),
    })]);
    expect(report.legal_followups).toEqual([expect.objectContaining({
      signal_id: "signal-person",
      source_id: "diario-oficial",
      requires_manual_review: true,
      status: "posible_respaldo_normativo",
    })]);
    expect(report.published).toBe(false);
  });

  it("agrega una nueva fuente al pendiente existente de la misma persona sin duplicar el evento", () => {
    const existing = {
      signal_id: "signal-kattia-curated",
      person_name: "Kattia Durán",
      role: "Seremi de Desarrollo Social y Familia",
      title: "Kattia Durán renuncia a la Seremi",
      url: "https://ministerio.example/comunicado",
      source_label: "Ministerio",
      status: "en_confirmacion",
    };
    const payload = buildMovementPayload({ ...baseline, signals: [existing] }, {
      now: "2026-10-01T07:00:00.000Z",
      signals: [{
        signal_id: "signal-kattia-rss",
        title: "Kattia Durán deja su cargo de Seremi de Desarrollo Social",
        url: "https://radio.example/noticia-kattia",
        source_label: "Radio Universidad de Chile",
        detected_at: "2026-10-01T07:00:00.000Z",
        status: "en_confirmacion",
      }],
    });
    expect(payload.signals).toHaveLength(1);
    expect(payload.signals[0]).toMatchObject({ signal_id: "signal-kattia-curated", person_name: "Kattia Durán", status: "en_confirmacion" });
    expect(payload.signals[0].related_sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: existing.url }),
      expect.objectContaining({ url: "https://radio.example/noticia-kattia" }),
    ]));
  });

  it("confirma el mismo evento cuando un acto legal oficial coincide con persona, cargo y causal", () => {
    const pending = {
      signal_id: "signal-kattia-duran-2026-09-30",
      person_name: "Kattia Durán",
      role: "Seremi de Desarrollo Social y Familia",
      ministry: "Ministerio de Desarrollo Social y Familia",
      region: "Metropolitana",
      title: "Kattia Durán renuncia a la Seremi de Desarrollo Social de la Región Metropolitana",
      url: "https://radio.uchile.cl/2026/09/30/por-razones-familiares-renuncia-seremi-de-desarrollo-social-de-la-rm-kattia-duran/",
      date: "2026-09-30",
      status: "en_confirmacion",
      source_id: "radio-uchile",
      source_tier: "press",
      source_label: "Radio Universidad de Chile",
      detected_at: "2026-09-30T07:00:00.000Z",
    };
    const legalDocument = {
      signal_id: "legal-kattia-duran",
      title: "Decreto acepta renuncia de Kattia Durán a la Seremi de Desarrollo Social de la Región Metropolitana",
      summary: "Acéptase, a contar del 30 de septiembre, la renuncia presentada por Kattia Durán al cargo de Seremi de Desarrollo Social de la Región Metropolitana.",
      url: "https://www.diariooficial.interior.gob.cl/publicaciones/2026/10/01/",
      date: "2026-10-01",
      status: "en_confirmacion",
      source_id: "diario-oficial",
      source_tier: "official",
      source_label: "Diario Oficial",
      detected_at: "2026-10-01T07:00:00.000Z",
    };

    const payload = buildMovementPayload({ ...baseline, signals: [pending] }, {
      now: "2026-10-01T07:00:00.000Z",
      sourceResults: [{ id: "diario-oficial", tier: "official", ok: true, signals: [legalDocument] }],
      signals: [legalDocument],
    });

    expect(payload.signals).toHaveLength(1);
    expect(payload.signals[0]).toMatchObject({
      signal_id: pending.signal_id,
      status: "verificado_oficial",
      verification: {
        source_id: "diario-oficial",
        url: legalDocument.url,
        date: legalDocument.date,
      },
    });
    expect(payload.stats.signals_en_confirmacion).toBe(0);
    expect(payload.stats.signals_verificadas_oficialmente).toBe(1);
    expect(payload.stats.total_eventos_publicados).toBe(3);
    expect(payload.stats.eventos_con_respaldo).toBe(2);
    expect(payload.movimientos.filter((movement) => /Kattia Durán/i.test(movement.saliente ?? ""))).toHaveLength(0);
  });

  it("no confirma un anuncio sólo por encontrar el nombre en un documento legal sin acto de cese", () => {
    const pending = {
      signal_id: "signal-person",
      person_name: "Kattia Durán",
      role: "Seremi de Desarrollo Social y Familia",
      region: "Metropolitana",
      title: "Kattia Durán deja la Seremi de Desarrollo Social",
      status: "en_confirmacion",
      source_id: "radio-uchile",
      source_tier: "press",
    };
    const unrelatedLegalMention = {
      signal_id: "legal-mention",
      person_name: "Kattia Durán",
      role: "Seremi de Desarrollo Social y Familia",
      region: "Metropolitana",
      title: "Kattia Durán participa en una reunión de coordinación regional",
      summary: "La autoridad participó en una actividad del ministerio.",
      url: "https://www.diariooficial.interior.gob.cl/publicaciones/2026/10/01/",
      date: "2026-10-01",
      status: "en_confirmacion",
      source_id: "diario-oficial",
      source_tier: "official",
    };

    const payload = buildMovementPayload({ ...baseline, signals: [pending] }, {
      now: "2026-10-01T07:00:00.000Z",
      signals: [unrelatedLegalMention],
    });

    expect(payload.signals).toHaveLength(1);
    expect(payload.signals[0].status).toBe("en_confirmacion");
    expect(payload.signals[0]).not.toHaveProperty("verification");
  });

  it("deja el modo de revisión en verde y no publica señales como movimientos", () => {
    const signal = {
      signal_id: "signal-jose-bravo",
      title: "Minsal solicita la renuncia del seremi José Bravo",
      status: "en_confirmacion",
    };
    const report = buildMovementReviewReport({
      now: "2026-09-23T13:00:00.000Z",
      collected: {
        hasOfficialSource: true,
        results: [{ id: "minsal", tier: "official", ok: true, signals: [signal] }],
        signals: [signal],
      },
    });

    expect(report).toMatchObject({
      status: "review_only",
      published: false,
      signal_count: 1,
      signals: [signal],
    });
    expect(report).not.toHaveProperty("movimientos");
    expect(report.sources[0]).not.toHaveProperty("signals");
  });

  it("registra indisponibilidad de fuentes sin fallar ni intentar publicación", () => {
    const report = buildMovementReviewReport({
      now: "2026-09-23T13:00:00.000Z",
      collected: {
        hasOfficialSource: false,
        results: [{ id: "minsal", tier: "official", ok: false, status: 403, signals: [] }],
        signals: [],
      },
    });

    expect(report).toMatchObject({
      status: "review_only_sources_unavailable",
      published: false,
      signal_count: 0,
    });
  });

  it("acepta sólo señales fechadas desde el inicio del gobierno vigente", () => {
    const signals = parseMovementSignals(
      JSON.stringify([
        { title: "Presidente Boric nombra al director del IND", url: "https://fuente.test/boric", date: "2023-07-15" },
        { title: "Nombran autoridad regional", url: "https://fuente.test/sin-fecha", date: null },
        { title: "Gobierno anuncia nuevo nombramiento", url: "https://fuente.test/vigente", date: "2026-03-11T10:30:00-03:00" },
      ]),
      { url: "https://fuente.test/noticias", contentType: "application/json" },
    );
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      title: "Gobierno anuncia nuevo nombramiento",
      date: "2026-03-11",
      fase: "anunciado",
      status: "en_confirmacion",
    });
  });

  it("conserva el día publicado de fechas ISO con zona horaria", () => {
    const signals = parseMovementSignals(
      JSON.stringify([{
        title: "Gobierno anuncia nuevo nombramiento",
        url: "https://fuente.test/vigente",
        date: "2026-03-11T00:30:00+03:00",
      }]),
      { url: "https://fuente.test/noticias", contentType: "application/json" },
    );
    expect(signals[0]?.date).toBe("2026-03-11");
  });

  it("conserva el día publicado de fechas RSS RFC 2822", () => {
    const signals = parseMovementSignals(
      '<rss><channel><item><title>Gobierno anuncia nuevo nombramiento</title><link>https://fuente.test/vigente</link><pubDate>Wed, 11 Mar 2026 00:30:00 +0300</pubDate></item></channel></rss>',
      { url: "https://fuente.test/feed.xml", contentType: "application/rss+xml" },
    );
    expect(signals[0]?.date).toBe("2026-03-11");
  });

  it("no convierte titulares HTML sin fecha verificable en señales nuevas", () => {
    const signals = parseMovementSignals(
      '<html><a href="/boric">Presidente Boric nombra a través de Alta Dirección Pública al director del IND</a></html>',
      { url: "https://fuente.test/noticias", contentType: "text/html" },
    );
    expect(signals).toEqual([]);
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
    expect(result.signals).toHaveLength(0);
  });

  it("actualiza metadata, preserva el baseline y genera checksum", () => {
    const existingPending = { signal_id: "signal-older", title: "Renuncia de autoridad", status: "en_confirmacion" };
    const payload = buildMovementPayload({ ...baseline, signals: [existingPending] }, {
      now: "2026-08-28T07:00:00.000Z",
      sourceResults: [{ id: "ley-chile", tier: "official", ok: true, signals: [] }],
      signals: [{ signal_id: "signal-1", status: "en_confirmacion" }],
    });
    expect(payload.movimientos).toHaveLength(2);
    expect(payload.last_success_at).toBe("2026-08-28T07:00:00.000Z");
    expect(payload.stats.signals_en_confirmacion).toBe(2);
    expect(payload.signals.map((signal) => signal.signal_id)).toEqual(["signal-older", "signal-1"]);
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
