import { createHash } from "node:crypto";
import { decodeEntitiesOnce, externalText } from "../safe-text.mjs";

export const OFFICIAL_SOURCE_INDEXES = {
  camara: { label: "Cámara", url: "https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes", hosts: ["camara.cl", "opendata.camara.cl", "opendata.congreso.cl"] },
  senado: { label: "Senado", url: "https://www.senado.cl/transparencia/transparencia-activa", hosts: ["senado.cl"] },
  chilecompra: { label: "ChileCompra OCDS", url: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds", hosts: ["chilecompra.cl"] },
  dipres: { label: "DIPRES", url: "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25910-37782.html", hosts: ["dipres.gob.cl"] },
  sinim: { label: "SINIM", url: "https://datos.sinim.gov.cl/datos_municipales.php", hosts: ["sinim.gov.cl"] },
  contraloria: { label: "Contraloría", url: "https://www.contraloria.cl/web/cgr/informes-de-auditoria", hosts: ["contraloria.cl"] },
  "ley-19862": { label: "Registro Ley 19.862", url: "https://www.registros19862.cl/", hosts: ["registros19862.cl"] },
  "transparencia-activa": { label: "Portal de Transparencia", url: "https://www.consejotransparencia.cl/datosabiertos-respaldo/", hosts: ["portaltransparencia.cl", "consejotransparencia.cl"] },
  servel: { label: "SERVEL", url: "https://www.servel.cl/biblioteca-de-documentos/resultados-electorales-historicos/", hosts: ["servel.cl"] },
};

export function extractOfficialAssets(html, indexUrl, allowedHosts) {
  const assets = new Map();
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    try {
      const url = new URL(decodeEntitiesOnce(match[1]), indexUrl);
      if (!allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) continue;
      if (url.pathname.includes("https&")) continue;
      const label = externalText(match[2]);
      const searchable = `${url.pathname} ${url.search} ${label}`.toLocaleLowerCase("es-CL");
      if (!/\.(csv|xml|json|xlsx?|zip|rar|pdf)(?:$|\?)/i.test(url.href)
        && !/(descarg|datos|ocds|ejecuci|presupuest|auditor|informe|n[oó]mina|remuner|resultado|candidat|gasto|votaci)/.test(searchable)) continue;
      url.hash = "";
      if (!assets.has(url.href)) assets.set(url.href, { url: url.href, label: label || url.pathname.split("/").at(-1) || "Recurso oficial" });
    } catch {
      // Un href inválido no invalida el resto del índice oficial.
    }
  }
  return [...assets.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function periodsFrom(text) {
  const currentYear = new Date().getUTCFullYear();
  return [...new Set(text.match(/\b(?:19|20)\d{2}\b/g) ?? [])]
    .filter((year) => Number(year) >= 1990 && Number(year) <= currentYear)
    .sort();
}

export async function discoverOfficialSource(sourceId, { fetchImpl = fetch, timeoutMs = 30_000, maxAssets = 80 } = {}) {
  const source = OFFICIAL_SOURCE_INDEXES[sourceId];
  if (!source) throw new Error(`UNKNOWN_OFFICIAL_SOURCE: ${sourceId}`);
  const response = await fetchImpl(source.url, {
    headers: { "User-Agent": "TransparenciaChile-ETL/3.0", Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`SOURCE_INDEX_HTTP_${response.status}: ${sourceId}`);
  const html = await response.text();
  if (html.length < 100) throw new Error(`SOURCE_INDEX_INVALID_BODY: ${sourceId}`);
  const assets = extractOfficialAssets(html, source.url, source.hosts).slice(0, maxAssets);
  const indexChecksumSha256 = createHash("sha256").update(html).digest("hex");
  const optionText = [...html.matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, " "))
    .join(" ");
  return {
    id: sourceId,
    label: source.label,
    status: "partial",
    indexUrl: source.url,
    indexChecksumSha256,
    periods: periodsFrom(`${optionText} ${assets.map((asset) => `${asset.url} ${asset.label}`).join(" ")}`),
    assetCount: assets.length,
    assets,
  };
}

export async function inventoryOfficialSources(sourceIds = Object.keys(OFFICIAL_SOURCE_INDEXES), options = {}) {
  const sources = [];
  for (const sourceId of sourceIds) {
    try {
      sources.push(await discoverOfficialSource(sourceId, options));
    } catch (error) {
      const source = OFFICIAL_SOURCE_INDEXES[sourceId];
      sources.push({
        id: sourceId,
        label: source?.label ?? sourceId,
        status: "unavailable",
        indexUrl: source?.url ?? null,
        indexChecksumSha256: null,
        periods: [],
        assetCount: 0,
        assets: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return sources;
}

export function mergeInventoryOutcomes(previousInventory, currentSources, generatedAt) {
  const previousById = new Map((previousInventory?.sources ?? []).map((source) => [source.id, source]));
  return currentSources.map((source) => {
    const previous = previousById.get(source.id);
    if (source.status !== "unavailable" || !previous || !["partial", "stale"].includes(previous.status)) return source;
    return {
      ...previous,
      status: "stale",
      error: source.error,
      lastSuccessfulAt: previous.lastSuccessfulAt ?? previousInventory.generatedAt ?? null,
      lastAttemptAt: generatedAt,
    };
  });
}
