import { createHash } from "node:crypto";

export const MOVIMIENTOS_SOURCES = Object.freeze([
  {
    id: "ley-chile",
    label: "Ley Chile / BCN",
    tier: "official",
    url: "https://www.bcn.cl/leychile/navegar/",
  },
  {
    id: "diario-oficial",
    label: "Diario Oficial",
    tier: "official",
    url: "https://www.diariooficial.interior.gob.cl/edicionelectronica/",
  },
  {
    id: "gob-cl",
    label: "Gob.cl Noticias",
    tier: "official",
    url: "https://www.gob.cl/noticias/",
  },
]);

const MOVEMENT_KEYWORDS = /\b(renuncia|renunció|renuncio|nombramiento|nombra|designa|designación|asume|asumió|remueve|remoción|decreto|subrogante|cambio de gabinete|salida de)\b/i;

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

export function classifySignalType(title) {
  const value = String(title ?? "").toLowerCase();
  if (/renunci|salida/.test(value)) return "renuncia";
  if (/remoc|remueve|cese/.test(value)) return "remocion";
  if (/nombra|nombramiento|designa|designación|asume/.test(value)) return "nombramiento";
  if (/decreto/.test(value)) return "confirmacion";
  return "cambio";
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(href, baseUrl) {
  try {
    const url = new URL(href, baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseMovementSignals(body, source) {
  const text = String(body ?? "");
  const contentType = /json|rss|xml/i.test(source.contentType ?? "") || /^\s*[\[{]/.test(text)
    ? "structured"
    : "html";
  const items = [];

  if (contentType === "structured") {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const rows = Array.isArray(parsed) ? parsed : parsed?.items ?? parsed?.results ?? [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const title = decodeHtml(row.title ?? row.name ?? row.headline);
        if (!title || !MOVEMENT_KEYWORDS.test(title)) continue;
        const url = normalizeUrl(row.link ?? row.url ?? source.url, source.url);
        const date = String(row.date ?? row.pubDate ?? row.published ?? "").slice(0, 10) || null;
        items.push({ title, url, date, summary: decodeHtml(row.description ?? row.summary ?? "") });
      }
    }
    if (!parsed && /xml|rss/i.test(source.contentType ?? "")) {
      for (const item of text.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
        const block = item[1];
        const readTag = (tag) => decodeHtml(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "");
        const title = readTag("title");
        if (!title || !MOVEMENT_KEYWORDS.test(title)) continue;
        items.push({
          title,
          url: normalizeUrl(readTag("link") || source.url, source.url),
          date: (readTag("pubDate") || readTag("date") || "").slice(0, 10) || null,
          summary: readTag("description"),
        });
      }
    }
  } else {
    const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of text.matchAll(anchorPattern)) {
      const title = decodeHtml(match[2]);
      if (!title || !MOVEMENT_KEYWORDS.test(title)) continue;
      items.push({ title, url: normalizeUrl(match[1], source.url), date: null, summary: "" });
    }
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.url ?? source.url}|${item.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 100);
}

export async function fetchSource(source, { fetchImpl = fetch, retries = 2, timeoutMs = 20_000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(source.url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "El-Cambiometro-MovimientosETL/1.0 (+https://cambiometro.impulsacv.cl/fuentes)",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      if (body.length < 128) throw new Error("SOURCE_BODY_TOO_SHORT");
      if (/cf-chl-|challenge-platform|just a moment\.\.\.|enable javascript and cookies/i.test(body)) {
        throw new Error("SOURCE_CHALLENGE_PAGE");
      }
      return {
        ...source,
        ok: true,
        status: response.status,
        bytes: Buffer.byteLength(body),
        fetchedAt: new Date().toISOString(),
        signals: parseMovementSignals(body, { ...source, contentType: response.headers.get("content-type") ?? "" }),
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  return {
    ...source,
    ok: false,
    status: null,
    bytes: 0,
    fetchedAt: new Date().toISOString(),
    signals: [],
    error: lastError?.message ?? String(lastError),
  };
}

export async function collectMovementSources({ sources = MOVIMIENTOS_SOURCES, fetchImpl = fetch, retries = 2 } = {}) {
  const results = await Promise.all(sources.map((source) => fetchSource(source, { fetchImpl, retries })));
  const official = results.filter((source) => source.tier === "official");
  const officialOk = official.filter((source) => source.ok);
  const signals = results.flatMap((source) => source.signals.map((signal) => ({
    ...signal,
    source_id: source.id,
    source_label: source.label,
    source_tier: source.tier,
    detected_at: source.fetchedAt,
    fase: "anunciado",
    status: "en_confirmacion",
    signal_id: `signal-${sha256(`${source.id}|${signal.url}|${signal.title}|${signal.date ?? ""}`).slice(0, 24)}`,
    tipo: classifySignalType(signal.title),
  })));
  return {
    results,
    signals,
    hasOfficialSource: officialOk.length > 0,
    allOfficialBlocked: official.length > 0 && officialOk.length === 0,
  };
}

export function calculateMovimientoEstado(movimiento) {
  const hasOfficial = Boolean(movimiento.decreto_url)
    || (movimiento.fuentes ?? []).some((source) => ["oficial", "semioficial"].includes(source.nivel));
  return hasOfficial ? "verificado" : "en_confirmacion";
}

function enrichMovimiento(movimiento, now) {
  const estado = calculateMovimientoEstado(movimiento);
  const saliente = movimiento.salio?.nombre ?? movimiento.saliente;
  const entrante = movimiento.entro?.nombre ?? movimiento.entrante;
  const fecha = movimiento.fecha ?? movimiento.salio?.fecha ?? movimiento.entro?.fecha ?? now.slice(0, 10);
  return {
    ...movimiento,
    estado,
    fecha,
    fechaExacta: movimiento.fechaExacta ?? true,
    tipo: movimiento.tipo ?? movimiento.tipo_evento,
    organo: movimiento.organo ?? movimiento.organismo,
    saliente: saliente || undefined,
    entrante: entrante || undefined,
    motivo: movimiento.motivo ?? movimiento.salio?.motivo_texto ?? "Cambio en la conducción institucional.",
    verificado: estado === "verificado",
    fecha_deteccion: movimiento.fecha_deteccion ?? now,
  };
}

function connectorKeyForSource(sourceId) {
  if (sourceId === "ley-chile") return "t1_ley_chile";
  if (sourceId === "diario-oficial") return "t1_diario_oficial";
  if (sourceId === "gob-cl") return "t1_gob_cl";
  return null;
}

function buildConnectorMetadata(previousConnectors, sourceResults, now) {
  const connectors = { ...(previousConnectors ?? {}) };
  for (const source of sourceResults) {
    const key = connectorKeyForSource(source.id);
    if (!key) continue;
    connectors[key] = {
      ...(connectors[key] ?? {}),
      estado: source.ok ? "Disponible" : "Bloqueado temporalmente",
      ultima_consulta: source.fetchedAt ?? now,
      http_status: source.status ?? null,
      error: source.ok ? null : source.error ?? "SOURCE_UNAVAILABLE",
    };
  }
  return connectors;
}

export function buildMovementPayload(previous, { now = new Date().toISOString(), sourceResults = [], signals = [] } = {}) {
  if (!previous || !Array.isArray(previous.movimientos) || previous.movimientos.length === 0) {
    throw new Error("MOVIMIENTOS_BASELINE_EMPTY");
  }
  const usedIds = new Set();
  const movimientos = previous.movimientos.map((movement) => {
    const enriched = enrichMovimiento(movement, now);
    let id = enriched.id;
    if (usedIds.has(id)) id = `${id}-${sha256(`${id}|${enriched.fecha}|${enriched.cargo}|${enriched.organismo}`).slice(0, 12)}`;
    usedIds.add(id);
    return { ...enriched, id };
  });
  const lastEventDate = movimientos.map((movement) => movement.fecha).filter(Boolean).sort().at(-1) ?? null;
  const sourceHealth = sourceResults.map((source) => Object.fromEntries(
    Object.entries(source).filter(([key]) => key !== "signals"),
  ));
  const nowMs = Date.parse(now);
  const payload = {
    ...previous,
    version: "5.0.0",
    pipeline: "etl_movimientos_autoridades",
    last_run: now,
    last_attempt_at: now,
    last_success_at: now,
    last_event_date: lastEventDate,
    frecuencia: "Diario 03:00 CLT (07:00 UTC)",
    conectores: buildConnectorMetadata(previous.conectores, sourceResults, now),
    source_health: sourceHealth,
    signals: signals.slice(0, 250),
    stats: {
      ...(previous.stats ?? {}),
      total_movimientos: movimientos.length,
      verificados: movimientos.filter((movement) => movement.estado === "verificado").length,
      en_confirmacion: movimientos.filter((movement) => movement.estado !== "verificado").length,
      ultimos_7_dias: movimientos.filter((movement) => {
        const eventMs = Date.parse(`${movement.fecha}T12:00:00Z`);
        return Number.isFinite(eventMs) && eventMs <= nowMs && nowMs - eventMs <= 7 * 86_400_000;
      }).length,
      signals_en_confirmacion: signals.length,
    },
    movimientos,
  };
  payload.checksum_sha256 = sha256(payload);
  return payload;
}

export function validateMovementPayload(payload) {
  if (!payload || payload.pipeline !== "etl_movimientos_autoridades") throw new Error("MOVIMIENTOS_PIPELINE_INVALID");
  if (!Array.isArray(payload.movimientos) || payload.movimientos.length < 79) throw new Error("MOVIMIENTOS_UNIVERSE_INCOMPLETE");
  if (!/^[a-f0-9]{64}$/i.test(payload.checksum_sha256 ?? "")) throw new Error("MOVIMIENTOS_CHECKSUM_MISSING");
  if (sha256({ ...payload, checksum_sha256: undefined }) !== payload.checksum_sha256) throw new Error("MOVIMIENTOS_CHECKSUM_INVALID");
  const ids = new Set();
  for (const movement of payload.movimientos) {
    if (!movement.id || ids.has(movement.id)) throw new Error(`MOVIMIENTOS_DUPLICATE_ID:${movement.id ?? "missing"}`);
    ids.add(movement.id);
    if (!["verificado", "en_confirmacion"].includes(movement.estado)) throw new Error(`MOVIMIENTOS_STATE_INVALID:${movement.id}`);
    if (!movement.fuentes?.length) throw new Error(`MOVIMIENTOS_SOURCE_MISSING:${movement.id}`);
  }
  return payload;
}
