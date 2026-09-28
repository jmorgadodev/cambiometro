const API_ROOT = "https://api.mercadopublico.cl/APISOCDS/OCDS";
const TYPES = Object.freeze({
  licitacion: "listaOCDSAgnoMes",
  trato_directo: "listaOCDSAgnoMesTratoDirecto",
  convenio_marco: "listaOCDSAgnoMesConvenio",
});
const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function periodNumber(period) {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) throw new Error(`CHILECOMPRA_PERIOD_INVALID:${period}`);
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function periodString(value) {
  const year = Math.floor(value / 12);
  const month = value % 12 + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function catalogPartitions(catalog) {
  if (!Array.isArray(catalog?.partitions)) throw new Error("CHILECOMPRA_PERIOD_CATALOG_INVALID");
  return new Set(catalog.partitions
    .filter((partition) => partition?.sourceId === "chilecompra")
    .map((partition) => String(partition.period ?? partition.sourcePeriod ?? ""))
    .filter((period) => PERIOD_PATTERN.test(period)));
}

async function probeListingCount(fetchImpl, period, endpoint) {
  const [year, month] = period.split("-");
  const url = `${API_ROOT}/${endpoint}/${year}/${month}/0/1`;
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "TransparenciaChile-ETL/3.0", Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`CHILECOMPRA_PERIOD_PROBE_HTTP_${response.status}:${url}`);

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`CHILECOMPRA_PERIOD_PROBE_INVALID_JSON:${url}`);
  }
  if (body?.status === 404 && /no se encontraron resultados/i.test(String(body.detail ?? ""))) return 0;
  if (!body?.pagination || !Number.isSafeInteger(body.pagination.total) || body.pagination.total < 0 || !Array.isArray(body.data)) {
    throw new Error(`CHILECOMPRA_PERIOD_PROBE_INVALID_SCHEMA:${url}`);
  }
  if (body.data.length > body.pagination.total || (body.pagination.total > 0 && body.data.length === 0)) {
    throw new Error(`CHILECOMPRA_PERIOD_PROBE_INVALID_COUNT:${url}`);
  }
  return body.pagination.total;
}

/**
 * Selects the newest source month that has data and still needs publication.
 * The current month is always probed so a growing open month can refresh; older
 * published months are skipped to avoid repeatedly downloading closed releases.
 */
export async function selectChileCompraPeriod({
  catalog,
  currentPeriod,
  explicitPeriod,
  fetchImpl = fetch,
  lookbackMonths,
} = {}) {
  const currentIndex = periodNumber(currentPeriod);
  const scanMonths = lookbackMonths ?? Number(currentPeriod.slice(5, 7));
  if (!Number.isSafeInteger(scanMonths) || scanMonths < 1 || scanMonths > 36) {
    throw new Error("CHILECOMPRA_PERIOD_LOOKBACK_INVALID");
  }
  const published = catalogPartitions(catalog);
  const candidates = explicitPeriod
    ? [explicitPeriod]
    : Array.from({ length: scanMonths }, (_, index) => periodString(currentIndex - index));
  const listingTypes = Object.entries(TYPES);

  for (const period of candidates) {
    const index = periodNumber(period);
    if (index > currentIndex) throw new Error(`CHILECOMPRA_PERIOD_IN_FUTURE:${period}`);
    if (!explicitPeriod && period !== currentPeriod && published.has(period)) continue;

    const listingCounts = {};
    for (const [type, endpoint] of listingTypes) {
      listingCounts[type] = await probeListingCount(fetchImpl, period, endpoint);
    }
    if (Object.values(listingCounts).some((count) => count > 0)) return { period, listingCounts };
  }

  return null;
}
