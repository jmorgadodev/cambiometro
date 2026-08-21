import { createHash } from "node:crypto";

const API_ROOT = "https://api.mercadopublico.cl/APISOCDS/OCDS";
const LIST_ENDPOINTS = {
  licitacion: "listaOCDSAgnoMes",
  trato_directo: "listaOCDSAgnoMesTratoDirecto",
  convenio_marco: "listaOCDSAgnoMesConvenio",
};
const DEFAULT_TYPES = Object.keys(LIST_ENDPOINTS);

function assertPeriod(year, month) {
  if (!Number.isInteger(year) || year < 2009 || year > 2100) throw new Error("CHILECOMPRA_INVALID_YEAR");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("CHILECOMPRA_INVALID_MONTH");
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function httpsUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.href;
  } catch {
    return null;
  }
}

function finiteNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedValue(value) {
  const amount = finiteNumber(value?.amount);
  const currency = cleanText(value?.currency).toUpperCase() || null;
  return {
    monto_clp: amount !== null && currency === "CLP" ? Math.round(amount) : null,
    monto_original: amount === null && !currency ? null : {
      amount: amount === null ? "" : String(amount),
      currency,
      unit: "currency_unit",
    },
  };
}

function partyById(release, id) {
  return Array.isArray(release.parties) ? release.parties.find((party) => party?.id === id) : null;
}

function formattedRut(value) {
  const compact = cleanText(value).replace(/[^0-9kK]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(compact)) return null;
  const body = compact.slice(0, -1);
  let factor = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  if (expected !== compact.at(-1)) return null;
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${compact.at(-1)}`;
}

function isLegalName(value) {
  return /(?:\bS\.?P\.?A\.?\b|\bS\.?A\.?\b|\bLTDA\.?\b|\bE\.?I\.?R\.?L\.?\b|\bSOCIEDAD\b|\bCORPORACI[ÓO]N\b|\bFUNDACI[ÓO]N\b|\bCOOPERATIVA\b)/i.test(cleanText(value));
}

function publicParty(release, reference, role) {
  if (!reference?.id) return null;
  const party = partyById(release, reference.id);
  const result = {
    id: cleanText(reference.id),
    name: cleanText(reference.name || party?.name),
  };
  // El RUT de un proveedor puede corresponder a una persona natural: sólo se
  // publica si la razón social oficial identifica una forma jurídica.
  const legalName = cleanText(party?.identifier?.legalName);
  const rut = party?.identifier?.scheme === "CL-RUT" ? formattedRut(party.identifier.id) : null;
  if (rut && (role === "buyer" || (role === "supplier" && isLegalName(legalName)))) {
    result.rut_juridico = rut;
    result.legal_name = legalName || result.name;
  }
  return result;
}

function publicItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    id: cleanText(item?.id),
    description: cleanText(item?.description),
    quantity: finiteNumber(item?.quantity),
    unit: cleanText(item?.unit?.name) || null,
    unitValue: item?.unit?.value ? normalizedValue(item.unit.value).monto_original : null,
    classification: item?.classification?.id ? {
      id: cleanText(item.classification.id),
      scheme: cleanText(item.classification.scheme),
    } : null,
  }));
}

function publicDocuments(documents) {
  if (!Array.isArray(documents)) return [];
  return documents.map((document) => ({
    id: cleanText(document?.id),
    type: cleanText(document?.documentType),
    title: cleanText(document?.title),
    url: httpsUrl(document?.url),
  })).filter((document) => document.url);
}

function dateRank(record) {
  const timestamp = Date.parse(record.fecha ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function keepLatest(records, record) {
  const previous = records.get(record.id);
  if (!previous || dateRank(record) >= dateRank(previous)) records.set(record.id, record);
}

function collisionIdentity(record) {
  return JSON.stringify([
    cleanText(record.stage),
    cleanText(record.buyer?.id),
    cleanText(record.buyer?.rut_juridico),
    cleanText(record.buyer?.name),
  ]);
}

function preferredRecord(records) {
  return [...records].sort((left, right) => {
    const byDate = dateRank(right) - dateRank(left);
    if (byDate !== 0) return byDate;
    const leftText = JSON.stringify(left);
    const rightText = JSON.stringify(right);
    return leftText < rightText ? 1 : leftText > rightText ? -1 : 0;
  })[0];
}

/**
 * El API OCDS ha reutilizado algunos OCID entre organismos compradores. Una
 * actualización del mismo comprador reemplaza la versión anterior; una
 * colisión entre compradores se conserva con un sufijo opaco y determinista.
 */
export function reconcileChileCompraRecords(inputRecords) {
  const byOfficialId = new Map();
  for (const record of inputRecords) {
    const group = byOfficialId.get(record.id) ?? [];
    group.push(record);
    byOfficialId.set(record.id, group);
  }

  const reconciled = [];
  for (const [officialId, records] of byOfficialId) {
    const byIdentity = new Map();
    for (const record of records) {
      const identity = collisionIdentity(record);
      const variants = byIdentity.get(identity) ?? [];
      variants.push(record);
      byIdentity.set(identity, variants);
    }
    if (byIdentity.size === 1) {
      reconciled.push(preferredRecord(records));
      continue;
    }
    for (const [identity, variants] of byIdentity) {
      const suffix = createHash("sha256").update(identity).digest("hex").slice(0, 16);
      reconciled.push({
        ...preferredRecord(variants),
        id: `${officialId}-party-${suffix}`,
        original_record_id: officialId,
        source_id_collision: true,
      });
    }
  }

  reconciled.sort((left, right) => left.id.localeCompare(right.id));
  const uniqueIds = new Set(reconciled.map((record) => record.id));
  if (uniqueIds.size !== reconciled.length) throw new Error("CHILECOMPRA_UNRESOLVED_ID_COLLISION");
  return reconciled;
}

export function buildChileCompraListUrl(type, year, month, offset, limit) {
  assertPeriod(year, month);
  const endpoint = LIST_ENDPOINTS[type];
  if (!endpoint) throw new Error(`CHILECOMPRA_INVALID_TYPE: ${type}`);
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("CHILECOMPRA_INVALID_OFFSET");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) throw new Error("CHILECOMPRA_INVALID_PAGE_SIZE");
  return `${API_ROOT}/${endpoint}/${year}/${String(month).padStart(2, "0")}/${offset}/${limit}`;
}

export function normalizeOcdsPackage(packageData, context) {
  if (!packageData || !Array.isArray(packageData.releases)) throw new Error("CHILECOMPRA_INVALID_PACKAGE_SCHEMA");
  const records = new Map();
  for (const release of packageData.releases) {
    const ocid = cleanText(release?.ocid);
    if (!ocid) throw new Error("CHILECOMPRA_RELEASE_WITHOUT_OCID");
    const fecha = release.date ?? packageData.publishedDate ?? null;
    const buyerReference = release.buyer ?? release.tender?.procuringEntity ?? null;
    const buyer = publicParty(release, buyerReference, "buyer");
    const sourceUrl = httpsUrl(context.sourceUrl ?? packageData.uri) ?? "";

    if (release.tender?.id) {
      const tender = release.tender;
      keepLatest(records, {
        id: `${ocid}-tender`,
        fecha,
        period: fecha?.slice(0, 7) ?? null,
        kind: "purchase",
        stage: "tender",
        procurement_type: context.procurementType,
        ocid,
        process_id: cleanText(tender.id),
        title: cleanText(tender.title) || cleanText(tender.description) || cleanText(tender.id),
        description: cleanText(tender.description) || null,
        status: cleanText(tender.status) || null,
        status_detail: cleanText(tender.statusDetails) || null,
        procurement_method: cleanText(tender.procurementMethod) || null,
        procurement_method_details: cleanText(tender.procurementMethodDetails) || null,
        procurement_method_rationale: cleanText(tender.procurementMethodRationale) || null,
        buyer,
        suppliers: [],
        items: publicItems(tender.items),
        documents: publicDocuments(tender.documents),
        monto_clp: null,
        monto_original: null,
        url: sourceUrl,
        fuente: "ChileCompra · Estándar OCDS",
      });
    }

    for (const award of Array.isArray(release.awards) ? release.awards : []) {
      if (!award?.id) continue;
      const value = normalizedValue(award.value);
      const suppliers = (Array.isArray(award.suppliers) ? award.suppliers : [])
        .map((supplier) => publicParty(release, supplier, "supplier"))
        .filter(Boolean);
      keepLatest(records, {
        id: `${ocid}-award-${cleanText(award.id)}`,
        fecha: award.date ?? fecha,
        period: (award.date ?? fecha)?.slice(0, 7) ?? null,
        kind: "contract",
        stage: "award",
        procurement_type: context.procurementType,
        ocid,
        process_id: cleanText(release.tender?.id) || null,
        award_id: cleanText(award.id),
        title: cleanText(award.title) || cleanText(award.description) || `Adjudicación ${award.id}`,
        description: cleanText(award.description) || null,
        status: cleanText(award.status) || null,
        status_detail: cleanText(award.statusDetails) || null,
        procurement_method: cleanText(release.tender?.procurementMethod) || null,
        procurement_method_rationale: cleanText(release.tender?.procurementMethodRationale) || null,
        buyer,
        suppliers,
        items: publicItems(award.items),
        documents: publicDocuments(award.documents),
        ...value,
        url: sourceUrl,
        fuente: "ChileCompra · Estándar OCDS",
      });
    }

    for (const contract of Array.isArray(release.contracts) ? release.contracts : []) {
      if (!contract?.id) continue;
      const value = normalizedValue(contract.value);
      const relatedAward = (Array.isArray(release.awards) ? release.awards : []).find((award) => String(award?.id) === String(contract.awardID));
      const suppliers = (Array.isArray(relatedAward?.suppliers) ? relatedAward.suppliers : [])
        .map((supplier) => publicParty(release, supplier, "supplier"))
        .filter(Boolean);
      keepLatest(records, {
        id: `${ocid}-contract-${cleanText(contract.id)}`,
        fecha: contract.dateSigned ?? contract.period?.startDate ?? fecha,
        period: (contract.dateSigned ?? contract.period?.startDate ?? fecha)?.slice(0, 7) ?? null,
        kind: "contract",
        stage: "contract",
        procurement_type: context.procurementType,
        ocid,
        process_id: cleanText(release.tender?.id) || null,
        award_id: cleanText(contract.awardID) || null,
        contract_id: cleanText(contract.id),
        title: cleanText(contract.title) || `Contrato ${contract.id}`,
        description: cleanText(contract.description) || null,
        status: cleanText(contract.status) || null,
        buyer,
        suppliers,
        items: publicItems(contract.items),
        documents: publicDocuments(contract.documents),
        ...value,
        url: sourceUrl,
        fuente: "ChileCompra · Estándar OCDS",
      });
    }
  }
  return [...records.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function createRequestCoordinator(requestsPerSecond) {
  const intervalMs = 1000 / requestsPerSecond;
  let nextSlot = 0;
  let blockedUntil = 0;
  let queue = Promise.resolve();
  return {
    schedule() {
      const scheduled = queue.then(async () => {
        const now = Date.now();
        const waitMs = Math.max(nextSlot, blockedUntil) - now;
        if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
        nextSlot = Date.now() + intervalMs;
      });
      queue = scheduled.catch(() => {});
      return scheduled;
    },
    block(milliseconds) {
      blockedUntil = Math.max(blockedUntil, Date.now() + milliseconds);
    },
  };
}

function retryAfterMs(response, fallbackMs) {
  const value = response.headers.get("retry-after");
  if (!value) return fallbackMs;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(fallbackMs, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(fallbackMs, date - Date.now()) : fallbackMs;
}

async function requestJson(url, { fetchImpl, timeoutMs, retries = 8, retryBaseMs = 1000, coordinator }) {
  if (typeof fetchImpl.peekJson === "function") {
    const cached = await fetchImpl.peekJson(url);
    if (cached !== undefined) return cached;
  }
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await coordinator?.schedule();
      const response = await fetchImpl(url, {
        headers: { "User-Agent": "TransparenciaChile-ETL/3.0", Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        if (response.status !== 429 && response.status < 500) throw new Error(`CHILECOMPRA_HTTP_${response.status}: ${url}`);
        const fallbackMs = Math.min(60_000, retryBaseMs * (2 ** (attempt - 1)));
        coordinator?.block(retryAfterMs(response, fallbackMs));
        throw new Error(`CHILECOMPRA_RETRYABLE_HTTP_${response.status}: ${url}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, Math.min(60_000, retryBaseMs * (2 ** (attempt - 1)))));
    }
  }
  throw lastError;
}

async function fetchListing({ type, year, month, pageSize, fetchImpl, timeoutMs, onProgress, retryBaseMs, coordinator }) {
  const entries = [];
  let offset = 0;
  let total = null;
  do {
    const url = buildChileCompraListUrl(type, year, month, offset, pageSize);
    const page = await requestJson(url, { fetchImpl, timeoutMs, retryBaseMs, coordinator });
    if (page?.status === 404 || /no se encontraron/i.test(page?.detail || "")) {
      total = 0;
      break;
    }
    if (!page?.pagination || !Number.isSafeInteger(page.pagination.total) || !Array.isArray(page.data)) {
      throw new Error(`CHILECOMPRA_INVALID_LIST_SCHEMA: ${url}`);
    }
    total = page.pagination.total;
    entries.push(...page.data.map((item) => ({ ...item, procurementType: type })));
    onProgress?.({ phase: "listing", type, completed: entries.length, total });
    if (page.data.length === 0 && entries.length < total) throw new Error(`CHILECOMPRA_INCOMPLETE_PAGE: ${url}`);
    offset += page.data.length;
  } while (offset < total);
  if (entries.length !== total) throw new Error(`CHILECOMPRA_COUNT_MISMATCH: ${type} expected=${total} actual=${entries.length}`);
  return entries;
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function fetchChileCompraMonth({
  year,
  month,
  types = DEFAULT_TYPES,
  pageSize = 1000,
  concurrency = 12,
  fetchImpl = fetch,
  timeoutMs = 60_000,
  onProgress,
  requestsPerSecond = 20,
  retryBaseMs = 1000,
  bulkLicitacionDocuments = null,
}) {
  assertPeriod(year, month);
  if (!Array.isArray(types) || types.length === 0 || types.some((type) => !LIST_ENDPOINTS[type])) throw new Error("CHILECOMPRA_INVALID_TYPES");
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 64) throw new Error("CHILECOMPRA_INVALID_CONCURRENCY");
  if (!Number.isFinite(requestsPerSecond) || requestsPerSecond <= 0 || requestsPerSecond > 100) throw new Error("CHILECOMPRA_INVALID_RATE");
  const coordinator = createRequestCoordinator(requestsPerSecond);
  const listings = (await Promise.all(types.map((type) => fetchListing({ type, year, month, pageSize, fetchImpl, timeoutMs, onProgress, retryBaseMs, coordinator })))).flat();
  const requests = [];
  const seen = new Set();
  const bulkCoverage = { used: 0, missing: 0 };
  for (const item of listings) {
    if (item.procurementType === "licitacion" && bulkLicitacionDocuments) {
      const source = httpsUrl(item.urlTender ?? item.urlAward);
      const processId = source ? decodeURIComponent(new URL(source).pathname.split("/").filter(Boolean).at(-1) ?? "") : "";
      const bulk = bulkLicitacionDocuments.get(processId);
      if (bulk?.url && bulk?.payload) {
        bulkCoverage.used += 1;
        if (!seen.has(bulk.url)) {
          seen.add(bulk.url);
          requests.push({ url: bulk.url, stage: "record", procurementType: item.procurementType, ocid: item.ocid, payload: bulk.payload });
        }
        continue;
      }
      bulkCoverage.missing += 1;
    }
    for (const [stage, rawUrl] of [["tender", item.urlTender], ["award", item.urlAward]]) {
      const url = httpsUrl(rawUrl);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      requests.push({ url, stage, procurementType: item.procurementType, ocid: item.ocid });
    }
  }
  let completedDocuments = 0;
  const documents = await mapConcurrent(requests, concurrency, async (request) => {
    const document = request.payload
      ? request
      : { ...request, payload: await requestJson(request.url, { fetchImpl, timeoutMs, retryBaseMs, coordinator }) };
    completedDocuments += 1;
    if (completedDocuments === requests.length || completedDocuments % 500 === 0) {
      onProgress?.({ phase: "documents", completed: completedDocuments, total: requests.length });
    }
    return document;
  });
  const records = [];
  const rejectedDocuments = [];
  for (const document of documents) {
    try {
      records.push(...normalizeOcdsPackage(document.payload, {
        procurementType: document.procurementType,
        sourceUrl: document.url,
      }));
    } catch (error) {
      if ((error instanceof Error ? error.message : String(error)) !== "CHILECOMPRA_INVALID_PACKAGE_SCHEMA") throw error;
      rejectedDocuments.push({
        url: document.url,
        ocid: document.ocid ?? null,
        stage: document.stage,
        procurementType: document.procurementType,
        reason: "CHILECOMPRA_INVALID_PACKAGE_SCHEMA",
      });
    }
  }
  return {
    sourceId: "chilecompra",
    year,
    month,
    period: `${year}-${String(month).padStart(2, "0")}`,
    listingCounts: Object.fromEntries(types.map((type) => [type, listings.filter((entry) => entry.procurementType === type).length])),
    records: reconcileChileCompraRecords(records),
    documents,
    rejectedDocuments,
    bulkCoverage,
    license: "CC0-1.0",
  };
}
