import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
  {
    id: "prensa-presidencia",
    label: "Prensa Presidencia",
    tier: "official",
    url: "https://prensa.presidencia.cl/comunicados.aspx",
  },
  {
    id: "mindep",
    label: "Ministerio del Deporte",
    tier: "official",
    url: "https://www.mindep.cl/noticias",
  },
]);

// gob.cl sometimes applies its edge policy differently to the news path and
// the public home page. Keep recovery limited to the same official host; a
// failure of every URL remains visible in source_health.
const GOB_CL_URL_VARIANTS = Object.freeze([
  "https://www.gob.cl/",
  "https://www.gob.cl/noticias/?p=1",
  "https://www.gob.cl/noticias/?page=1",
  // The official RSS endpoint is served by a different edge path and can
  // remain available when the HTML news route rejects GitHub Actions.
  "https://www.gob.cl/noticias/feed/",
]);

const MOVEMENT_KEYWORDS = /\b(renuncia|renunció|renuncio|nombramiento|nombra|designa|designación|asume|asumió|remueve|remoción|decreto|subrogante|cambio de gabinete|salida de)\b/i;

const normalizeSignalText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const MARIA_PAZ_RIOS_SOURCES = Object.freeze([
  {
    nivel: "oficial",
    medio: "Prensa Presidencia",
    url: "https://prensa.presidencia.cl/comunicado.aspx?id=339274",
    fecha: "2026-08-26",
    titulo: "Presidente José Antonio Kast nombra a María Paz Ríos Lama como nueva subsecretaria de Deportes",
  },
  {
    nivel: "prensa",
    medio: "BioBioChile",
    url: "https://www.biobiochile.cl/noticias/nacional/chile/2026/08/26/presidente-kast-designa-a-abogada-y-atleta-maria-paz-rios-como-nueva-subsecretaria-de-deportes.shtml",
    fecha: "2026-08-26",
    titulo: "Presidente Kast designa a abogada y atleta María Paz Ríos como nueva subsecretaria de Deportes",
  },
  {
    nivel: "prensa",
    medio: "Cooperativa",
    url: "https://cooperativa.cl/noticias/deportes/gobierno/ministerio-del-deporte/presidente-kast-nombro-a-maria-paz-rios-como-nueva-subsecretaria-de/2026-08-26/183651.html",
    fecha: "2026-08-26",
    titulo: "Presidente Kast nombró a María Paz Ríos como nueva subsecretaria de Deportes",
  },
  {
    nivel: "prensa",
    medio: "Pauta",
    url: "https://www.pauta.cl/actualidad/2026/08/26/maria-paz-rios-lama-asumira-como-nueva-subsecretaria-de-deportes.html",
    fecha: "2026-08-26",
    titulo: "María Paz Ríos Lama asumirá como nueva subsecretaria de Deportes",
  },
  {
    nivel: "prensa",
    medio: "CNN Chile",
    url: "https://www.cnnchile.com/pais/presidente-kast-nombra-a-la-abogada-y-atleta-maria-paz-rios-lama-como-nueva-subsecretaria-de-deportes/",
    fecha: "2026-08-26",
    titulo: "Presidente Kast nombra a María Paz Ríos Lama como nueva subsecretaria de Deportes",
  },
  {
    nivel: "prensa",
    medio: "24 Horas",
    url: "https://www.24horas.cl/actualidad/politica/maria-paz-rios-es-nombrada-como-la-nueva-subsecretaria-de-deportes",
    fecha: "2026-08-26",
    titulo: "María Paz Ríos es designada como la nueva subsecretaria de Deportes",
  },
]);

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

/**
 * Migrate a previously published snapshot to the current release envelope.
 * Historical R2 releases predate checksum_sha256 and last_success_at. This
 * function only adds release metadata; it never changes movement rows.
 */
export function normalizeMovementPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const usedIds = new Set();
  const movimientos = Array.isArray(payload.movimientos)
    ? payload.movimientos.map((movement) => {
      const originalId = String(movement?.id ?? "");
      let id = originalId;
      if (usedIds.has(id)) {
        id = `${originalId}-${sha256(`${originalId}|${movement?.fecha ?? ""}|${movement?.cargo ?? ""}|${movement?.organismo ?? ""}`).slice(0, 12)}`;
        let suffix = 2;
        while (usedIds.has(id)) id = `${originalId}-${suffix++}`;
      }
      usedIds.add(id);
      return id === movement?.id ? movement : { ...movement, id };
    })
    : payload.movimientos;
  const normalized = {
    ...payload,
    movimientos,
    last_attempt_at: payload.last_attempt_at ?? payload.last_run ?? null,
    last_success_at: payload.last_success_at ?? payload.last_run ?? null,
    checksum_sha256: undefined,
  };
  normalized.checksum_sha256 = sha256(normalized);
  return normalized;
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

function readHtmlMeta(body, attribute, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`<meta\\b[^>]*${attribute}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  const reverseExpression = new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escaped}["'][^>]*>`, "i");
  return decodeHtml(body.match(expression)?.[1] ?? body.match(reverseExpression)?.[1] ?? "");
}

function readHtmlArticleDate(body) {
  const raw = readHtmlMeta(body, "property", "article:published_time")
    || readHtmlMeta(body, "name", "date")
    || readHtmlMeta(body, "itemprop", "datePublished")
    || body.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1]
    || "";
  const match = String(raw).match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function sourceUrls(source) {
  if (source.id !== "gob-cl") return [source.url];
  return [...new Set([source.url, ...GOB_CL_URL_VARIANTS])];
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

    // Las fuentes provisionales suelen recibirse como URL de un artículo,
    // no como un índice RSS. Lee sólo sus metadatos públicos para no perder
    // anuncios cuando la página no contiene un enlace al propio titular.
    const metaTitle = readHtmlMeta(text, "property", "og:title")
      || readHtmlMeta(text, "name", "twitter:title")
      || decodeHtml(text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const metaSummary = readHtmlMeta(text, "name", "description") || readHtmlMeta(text, "property", "og:description");
    if (metaTitle && MOVEMENT_KEYWORDS.test(`${metaTitle} ${metaSummary}`)) {
      items.push({
        title: metaTitle,
        url: source.url,
        date: readHtmlArticleDate(text),
        summary: metaSummary,
      });
    }
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.url ?? source.url}|${item.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 100).map((item) => ({
    ...item,
    fase: "anunciado",
    status: "en_confirmacion",
  }));
}

/**
 * Some official sources reject Node's request profile on GitHub-hosted
 * runners. Use the runner's curl (which validates certificates against the
 * operating-system trust store) as a narrow fallback for the allowlisted
 * official sources below. This does not disable TLS verification and is
 * intentionally not used for arbitrary URLs.
 */
async function fetchOfficialWithSystemCurl(source, timeoutMs) {
  let lastError;
  for (const url of sourceUrls(source)) {
    try {
      const { stdout } = await execFileAsync("curl", [
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        String(Math.max(1, Math.ceil(timeoutMs / 1000))),
        "--user-agent",
        "El-Cambiometro-MovimientosETL/1.0 (+https://cambiometro.impulsacv.cl/fuentes)",
        "--write-out",
        "\n__CAMBIOMETRO_STATUS__:%{http_code}\n__CAMBIOMETRO_TYPE__:%{content_type}\n",
        url,
      ], { maxBuffer: 4 * 1024 * 1024, windowsHide: true });
      const statusMarker = "\n__CAMBIOMETRO_STATUS__:";
      const typeMarker = "\n__CAMBIOMETRO_TYPE__:";
      const statusIndex = stdout.lastIndexOf(statusMarker);
      const typeIndex = stdout.lastIndexOf(typeMarker);
      if (statusIndex < 0 || typeIndex < 0 || typeIndex < statusIndex) throw new Error("CURL_RESPONSE_METADATA_MISSING");
      const body = stdout.slice(0, statusIndex);
      const status = Number.parseInt(stdout.slice(statusIndex + statusMarker.length, typeIndex).trim(), 10);
      const contentType = stdout.slice(typeIndex + typeMarker.length).trim();
      if (!Number.isInteger(status)) throw new Error("CURL_STATUS_INVALID");
      if (status < 200 || status >= 300) throw new Error(`HTTP_${status}`);
      if (body.length < 128) throw new Error("SOURCE_BODY_TOO_SHORT");
      if (/cf-chl-|challenge-platform|just a moment\.\.\.|enable javascript and cookies/i.test(body)) {
        throw new Error("SOURCE_CHALLENGE_PAGE");
      }
      return {
        ...source,
        ok: true,
        status,
        bytes: Buffer.byteLength(body),
        fetchedAt: new Date().toISOString(),
        resolved_url: url === source.url ? undefined : url,
        signals: parseMovementSignals(body, { ...source, url, contentType }),
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("CURL_SOURCE_UNAVAILABLE");
}

function statusFromError(error) {
  const match = String(error?.message ?? error ?? "").match(/^HTTP_(\d{3})$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export async function fetchSource(source, { fetchImpl = fetch, retries = 2, timeoutMs = 20_000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    for (const url of sourceUrls(source)) {
      try {
        const response = await fetchImpl(url, {
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
          resolved_url: url === source.url ? undefined : url,
          signals: parseMovementSignals(body, { ...source, url, contentType: response.headers.get("content-type") ?? "" }),
        };
      } catch (error) {
        lastError = error;
      }
    }
    if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  // Keep the workaround narrow: only the two known official hosts that
  // reject Node's runner request get the system-curl fallback, and only for
  // real production fetches. Tests that inject fetchImpl remain deterministic.
  if (["gob-cl", "prensa-presidencia"].includes(source.id) && fetchImpl === globalThis.fetch) {
    try {
      return await fetchOfficialWithSystemCurl(source, timeoutMs);
    } catch (error) {
      lastError = error;
    }
  }
  return {
    ...source,
    ok: false,
    status: statusFromError(lastError),
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
  // Una nota oficial o un comunicado confirma el anuncio, pero no reemplaza
  // el acto administrativo que acredita el nombramiento en el catálogo.
  return movimiento.decreto_url ? "verificado" : "en_confirmacion";
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
  if (sourceId === "prensa-presidencia") return "t1_prensa_presidencia";
  if (sourceId === "mindep") return "t1_mindep";
  return null;
}

function markUnconfirmedSofiaAnnouncement(movimiento) {
  const incoming = normalizeSignalText(movimiento.entro?.nombre ?? movimiento.entrante);
  const cargo = normalizeSignalText(movimiento.cargo);
  if (!incoming.includes("sofia rengifo") || !cargo.includes("subsecret")) return movimiento;

  const withoutNorma = Object.fromEntries(
    Object.entries(movimiento).filter(([key]) => !["decreto_url", "id_norma", "decreto_numero"].includes(key)),
  );
  const fuentes = (withoutNorma.fuentes ?? []).filter((source) => source.nivel !== "oficial");
  return {
    ...withoutNorma,
    tipo_evento: "nombramiento-fallido",
    tipo: "nombramiento-fallido",
    estado: "en_confirmacion",
    documento_pendiente: true,
    fecha_verificacion: null,
    fuentes,
    motivo: "Anuncio de reemplazo difundido el 14 de agosto de 2026; no se encontró un decreto normativo verificable que acreditara este nombramiento.",
    fuente: fuentes.map((source) => source.medio + " (" + source.fecha + ")").join(" · "),
    verificado: false,
  };
}

const KNOWN_ANNOUNCED_MOVEMENTS = Object.freeze([
  {
    id: "mov-alonso-velasquez-2026-09-03",
    matches: /alonso vel[aá]squez|seremi.{0,80}vivienda.{0,80}tarapac[aá].{0,80}renunc|renunc.{0,80}seremi.{0,80}vivienda.{0,80}tarapac[aá]/i,
    prefer: /alonso vel[aá]squez/i,
    build: (signal, now) => ({
      id: "mov-alonso-velasquez-2026-09-03",
      tipo_evento: "renuncia",
      cargo: "Secretario Regional Ministerial de Vivienda y Urbanismo de Tarapacá",
      organismo: "SEREMI de Vivienda y Urbanismo de Tarapacá",
      ministerio: "Ministerio de Vivienda y Urbanismo",
      region: "Región de Tarapacá",
      salio: { nombre: "Alonso Velásquez", fecha: "2026-09-02" },
      fuentes: mergeMovementSources(ALONSO_VELASQUEZ_SOURCES, signal),
      estado: "en_confirmacion",
      fecha_deteccion: now,
      fecha_verificacion: null,
      fecha: "2026-09-02",
      fechaExacta: true,
      tipo: "renuncia",
      organo: "SEREMI de Vivienda y Urbanismo de Tarapacá",
      saliente: "Alonso Velásquez",
      motivo: "Renuncia voluntaria informada públicamente; los motivos no están detallados en la comunicación oficial disponible.",
      fuente: sourceLabelsForMovement(mergeMovementSources(ALONSO_VELASQUEZ_SOURCES, signal)),
      documento_pendiente: true,
      verificado: false,
    }),
  },
  {
    id: "mov-patricio-lohr-2026-09-01",
    matches: /patricio l[oö]hr|seremi.{0,80}transportes.{0,80}arica.{0,80}renunc|gobierno.{0,80}renuncia.{0,80}seremi.{0,80}transportes.{0,80}arica/i,
    prefer: /patricio l[oö]hr/i,
    build: (signal, now) => ({
      id: "mov-patricio-lohr-2026-09-01",
      tipo_evento: "renuncia",
      cargo: "Secretario Regional Ministerial de Transportes y Telecomunicaciones de Arica y Parinacota",
      organismo: "SEREMI de Transportes y Telecomunicaciones de Arica y Parinacota",
      ministerio: "Ministerio de Transportes y Telecomunicaciones",
      region: "Región de Arica y Parinacota",
      salio: { nombre: "Patricio Löhr Tapia", fecha: "2026-09-01" },
      fuentes: mergeMovementSources(PATRICIO_LOHR_SOURCES, sourceFromSignal(signal, "2026-09-01")),
      estado: "en_confirmacion",
      fecha_deteccion: now,
      fecha_verificacion: null,
      fecha: "2026-09-01",
      fechaExacta: true,
      tipo: "renuncia",
      organo: "SEREMI de Transportes y Telecomunicaciones de Arica y Parinacota",
      saliente: "Patricio Löhr Tapia",
      motivo: "Renuncia solicitada por el Gobierno tras una denuncia reportada por funcionarios de la DGAC; el acto administrativo queda pendiente de verificación.",
      fuente: sourceLabelsForMovement([sourceFromSignal(signal, "2026-09-01")]),
      documento_pendiente: true,
      verificado: false,
    }),
  },
]);

const ALONSO_VELASQUEZ_SOURCES = Object.freeze([
  {
    nivel: "oficial",
    medio: "Ministerio de Vivienda y Urbanismo",
    url: "https://www.minvu.gob.cl/noticia/declaracion-publica-6/",
    fecha: "2026-09-02",
    titulo: "Declaración pública: Alonso Velásquez presenta su renuncia al cargo de Seremi de Tarapacá",
  },
  {
    nivel: "prensa",
    medio: "Radio Paulina",
    url: "https://radiopaulina.cl/2026/09/03/entrevero-irreconciliable-ex-seremi-de-vivienda-de-tarapaca-justifico-su-salida-por-un-desencuentro-con-el-ministro-poduje/",
    fecha: "2026-09-03",
    titulo: "Ex seremi de Vivienda de Tarapacá justificó su salida por un desencuentro con el ministro Poduje",
  },
  {
    nivel: "prensa",
    medio: "Pauta",
    url: "https://www.pauta.cl/actualidad/2026/09/03/renuncia-seremi-de-vivienda-de-tarapaca-ya-son-35-las-salidas-en-el-gobierno-de-kast.html",
    fecha: "2026-09-03",
    titulo: "Renuncia seremi de Vivienda de Tarapacá: ya son 35 las salidas en el Gobierno de Kast",
  },
]);

const PATRICIO_LOHR_SOURCES = Object.freeze([
  {
    nivel: "prensa",
    medio: "ADN Radio",
    url: "https://www.adnradio.cl/2026/09/01/gobierno-pide-renuncia-a-seremi-de-transportes-de-arica-tras-denuncia-por-presuntas-presiones-a-funcionaria-de-la-dgac/",
    fecha: "2026-09-01",
    titulo: "Gobierno pide renuncia a seremi de Transportes de Arica tras denuncia por presiones a funcionaria de la DGAC",
  },
  {
    nivel: "prensa",
    medio: "BioBioChile",
    url: "https://www.biobiochile.cl/noticias/nacional/region-de-arica-y-parinacota/2026/09/01/gobierno-pide-renuncia-a-seremi-de-transportes-de-arica-tras-denuncia-por-presiones-en-aeropuerto.shtml",
    fecha: "2026-09-01",
    titulo: "Gobierno pide la renuncia al seremi de Transportes de Arica por presuntas presiones",
  },
  {
    nivel: "prensa",
    medio: "Emol",
    url: "https://www.emol.com/noticias/Nacional/2026/09/02/1210280/renuncia-seremi-transportes-de-arica.html",
    fecha: "2026-09-02",
    titulo: "Van 34: Renuncia seremi de Transportes de Arica tras acusaciones de conflicto de interés",
  },
]);

function sourceFromSignal(signal, fallbackDate) {
  return {
    nivel: signal.source_tier === "official" ? "oficial" : "prensa",
    medio: signal.source_label ?? signal.source_id ?? "Fuente provisional",
    url: signal.url,
    fecha: signal.date ?? fallbackDate,
    titulo: signal.title,
  };
}

function mergeMovementSources(sources, signal) {
  const candidates = [...(sources ?? [])];
  if (signal?.url && !candidates.some((source) => source.url === signal.url)) candidates.push(sourceFromSignal(signal, signal.date));
  return candidates;
}

function mergeMovementSourceLists(...lists) {
  const sources = [];
  const seen = new Set();
  for (const list of lists) {
    for (const source of Array.isArray(list) ? list : []) {
      if (!source?.url || seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push(source);
    }
  }
  return sources;
}

function sourceLabelsForMovement(sources) {
  return sources
    .map((source) => `${source.medio ?? "Fuente"} (${source.fecha ?? "fecha no indicada"})`)
    .join(" · ");
}

export function materializeKnownSignals(movimientos, signals, now) {
  const normalizedExisting = movimientos.map(markUnconfirmedSofiaAnnouncement);
  const riosMovementId = "mov-rios-deportes-2026-08-27";
  const knownRiosExists = normalizedExisting.some((movement) => (
    movement.id === riosMovementId
    || (
      normalizeSignalText(movement.entro?.nombre ?? movement.entrante ?? "").includes("maria paz rios")
      && normalizeSignalText(movement.cargo ?? "").includes("subsecretaria de deporte")
      && movement.fecha === "2026-08-27"
    )
  ));
  const riosSignal = signals.find((signal) => {
    const title = normalizeSignalText((signal.title ?? "") + " " + (signal.summary ?? ""));
    return title.includes("maria paz rios") && title.includes("subsecretaria de deporte");
  });
  const result = [...normalizedExisting];
  if (!knownRiosExists && riosSignal) result.push({
      id: riosMovementId,
      tipo_evento: "nombramiento",
      cargo: "Subsecretaria de Deportes",
      organismo: "Subsecretaría de Deportes",
      ministerio: "Ministerio del Deporte",
      region: "Nacional",
      salio: {
        nombre: "Andrés Otero Klein",
        fecha: "2026-08-13",
        fecha_inicio: "2026-03-11",
        motivo_categoria: "Cambio dentro del gobierno",
        motivo_texto: "Renuncia informada en el marco del cambio de conducción del Ministerio del Deporte.",
        dias_en_cargo: 155,
        dias_en_cargo_origen: "estimado",
      },
      entro: {
        nombre: "María Paz Ríos Lama",
        fecha: "2026-08-27",
      },
      fuentes: MARIA_PAZ_RIOS_SOURCES,
      estado: "en_confirmacion",
      fecha_deteccion: now,
      fecha_verificacion: null,
      fecha: "2026-08-27",
      fechaExacta: true,
      tipo: "nombramiento",
      organo: "Subsecretaría del Deporte",
      saliente: "Andrés Otero Klein",
      entrante: "María Paz Ríos Lama",
      motivo: "Designación anunciada oficialmente el 26 de agosto de 2026; María Paz Ríos Lama asumió el 27 de agosto. El decreto de nombramiento queda pendiente de verificación normativa.",
      fuente: MARIA_PAZ_RIOS_SOURCES.map((source) => source.medio + " (" + source.fecha + ")").join(" · "),
      documento_pendiente: true,
      verificado: false,
    });

  for (const definition of KNOWN_ANNOUNCED_MOVEMENTS) {
    const candidates = signals.filter((candidate) => definition.matches.test(normalizeSignalText(`${candidate.title ?? ""} ${candidate.summary ?? ""}`)));
    const signal = candidates.find((candidate) => definition.prefer?.test(normalizeSignalText(`${candidate.title ?? ""} ${candidate.summary ?? ""}`)) && candidate.date)
      ?? candidates.find((candidate) => candidate.date)
      ?? candidates[0];
    if (!signal) continue;

    const existingIndex = result.findIndex((movement) => (
      movement.id === definition.id
      || definition.matches.test(normalizeSignalText(`${movement.saliente ?? movement.salio?.nombre ?? ""} ${movement.cargo ?? ""} ${movement.region ?? ""}`))
    ));
    const rebuilt = definition.build(signal, now);
    if (existingIndex === -1) {
      result.push(rebuilt);
      continue;
    }

    // Reconcile known signals on every run. A previous provisional row must
    // receive newly discovered sources instead of being skipped by its ID.
    // Never downgrade a row that already has a decree or verified status.
    const existing = result[existingIndex];
    const mergedSources = mergeMovementSourceLists(existing.fuentes, rebuilt.fuentes);
    if (existing.decreto_url || existing.estado === "verificado") {
      result[existingIndex] = {
        ...existing,
        fuentes: mergedSources,
        fuente: sourceLabelsForMovement(mergedSources),
        fecha_deteccion: now,
      };
    } else {
      result[existingIndex] = {
        ...existing,
        ...rebuilt,
        fuentes: mergedSources,
        fuente: sourceLabelsForMovement(mergedSources),
      };
    }
  }
  return result;
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
  const movimientosBase = previous.movimientos.map((movement) => {
    const enriched = enrichMovimiento(movement, now);
    let id = enriched.id;
    if (usedIds.has(id)) id = `${id}-${sha256(`${id}|${enriched.fecha}|${enriched.cargo}|${enriched.organismo}`).slice(0, 12)}`;
    usedIds.add(id);
    return { ...enriched, id };
  });
  const movimientos = materializeKnownSignals(movimientosBase, signals, now);
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
    frecuencia: "Diario 03:00 CLT",
    frecuencia_utc: "07:00 UTC",
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
  payload.checksum_sha256 = sha256({ ...payload, checksum_sha256: undefined });
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
