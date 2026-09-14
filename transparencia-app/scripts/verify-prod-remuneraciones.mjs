/**
 * Smoke de remuneraciones después de una promoción.
 * Sólo consulta Pages/Worker; no escribe en Cloudflare ni usa D1.
 */

const baseUrl = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const headers = {
  "User-Agent": "Cambiometro-RemuneracionesVerifier/1.0",
  "Cache-Control": "no-cache",
};

function assert(condition, message) {
  if (!condition) throw new Error(`REMUNERACIONES_VERIFY_FAILED:${message}`);
  console.log(`✅ ${message}`);
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}${path.includes("?") ? "&" : "?"}verify=${Date.now()}`, { headers, signal: AbortSignal.timeout(20_000) });
  const body = response.ok ? await response.json().catch(() => null) : null;
  return { response, body };
}

const pageResponse = await fetch(`${baseUrl}/remuneraciones-publicas/?verify=${Date.now()}`, { headers, signal: AbortSignal.timeout(20_000) });
const pageHtml = await pageResponse.text();
assert(pageResponse.status === 200, `/remuneraciones-publicas responde ${pageResponse.status}`);
assert(!pageHtml.includes("Evolución mensual de los últimos 12 cortes"), "no reaparece la tabla de doce cortes");
assert(!pageHtml.includes("Ver detalle mensual de los últimos 12 cortes"), "no reaparece el enlace de doce cortes");
assert(pageHtml.includes("Nuevos registros") && pageHtml.includes("Registros que ya no aparecen") && pageHtml.includes("Cambios de monto"), "la página conserva los tres indicadores de comparación");

const manifestResult = await getJson("/data/remuneraciones-38bis/manifest.json");
assert(manifestResult.response.status === 200 && manifestResult.body, `manifiesto 38 bis responde ${manifestResult.response.status}`);
const manifest = manifestResult.body;
assert(manifest.comparison?.estado === "comparado", `comparación publicada para ${manifest.mes ?? "corte desconocido"}`);
assert(Number.isInteger(manifest.comparison?.entradas) && Number.isInteger(manifest.comparison?.salidas_observadas) && Number.isInteger(manifest.comparison?.cambios), "comparación contiene valores numéricos");

const unifiedResult = await getJson("/data/remuneraciones-unified/manifest.json");
assert(unifiedResult.response.status === 200 && unifiedResult.body, `manifiesto unificado responde ${unifiedResult.response.status}`);
assert(Number(unifiedResult.body.totalRows) > 0 && Array.isArray(unifiedResult.body.pages) && unifiedResult.body.pages.length > 0, "índice unificado publicado con páginas");

const historyResult = await getJson("/api/v1/remuneraciones/history?q=Río%20Sebastián%20Torrealba%20del");
assert(historyResult.response.status === 200 && historyResult.body, `historial bajo demanda responde ${historyResult.response.status}`);
assert(historyResult.body.meta?.d1Used === false && historyResult.body.meta?.sourceBackend === "r2-search-history", "historial servido desde R2 sin D1");

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  period: manifest.mes,
  comparison: manifest.comparison,
  unifiedRows: unifiedResult.body.totalRows,
  historyRows: historyResult.body.data?.length ?? 0,
}, null, 2));
