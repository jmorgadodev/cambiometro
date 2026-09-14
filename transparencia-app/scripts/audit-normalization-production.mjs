import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeLocalHealth, productionSourcesPayload, reconcileSourceSnapshots } from "../lib/source-reconciliation.mjs";

const DEFAULT_BASE_URL = "https://cambiometro.impulsacv.cl";
const DEFAULT_LOCAL_QUALITY = "data/data-quality-sources.json";
const DEFAULT_LOCAL_HEALTH = "data/etl/source-health.json";
const DEFAULT_SAMPLE_LIMIT = 1;
const EXTRA_SAMPLE_SOURCES = ["movimientos"];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function canonicalId(value) {
  const id = String(value ?? "").trim();
  if (id === "cplt") return "transparencia-activa";
  if (id === "ine") return "ine-censo-2024";
  if (id === "ley19862") return "ley-19862";
  return id;
}

function shortChecksum(value) {
  return typeof value === "string" && value.length > 12 ? `${value.slice(0, 12)}…` : value ?? null;
}

function recordKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).sort();
}

async function fetchJson(fetchImpl, url, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      bytes: Buffer.byteLength(text),
      body,
      error: response.ok ? null : `HTTP_${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      bytes: 0,
      body: null,
      error: error instanceof Error ? error.name : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function sampleResult(sourceId, response) {
  const metadata = response.body?.meta ?? {};
  const rows = Array.isArray(response.body?.data) ? response.body.data : [];
  return {
    sourceId,
    httpStatus: response.status,
    responseBytes: response.bytes,
    error: response.error,
    backend: metadata.sourceBackend ?? null,
    sourceStatus: metadata.sourceStatus ?? null,
    publishedRows: Number.isSafeInteger(metadata.publishedRows) ? metadata.publishedRows : null,
    expectedRows: Number.isSafeInteger(metadata.expectedRows) ? metadata.expectedRows : null,
    missingPartitions: Number.isSafeInteger(metadata.missingPartitions) ? metadata.missingPartitions : null,
    availability: metadata.availability ?? null,
    reason: metadata.reason ?? null,
    sampleCount: rows.length,
    sampleFieldNames: recordKeys(rows[0]),
  };
}

function buildSourceMap(rows) {
  return new Map(rows.map((row) => [canonicalId(row.id ?? row.sourceId), row]));
}

function classifyAvailability(sample) {
  if (sample.error) return "request-failed";
  if (sample.availability === "summary-only-or-d1-quota") return "summary-only";
  if (sample.expectedRows !== null && sample.publishedRows !== null && sample.publishedRows < sample.expectedRows) {
    return "partial-release";
  }
  if (sample.sampleCount === 0) return "empty-sample";
  return "sample-ok";
}

export function buildProductionNormalizationAudit({
  productionPayload,
  productionHealth,
  localQualitySources,
  localSourceHealth,
  sampleResults = [],
  baseUrl = DEFAULT_BASE_URL,
  generatedAt = new Date().toISOString(),
}) {
  const productionSources = productionSourcesPayload(productionPayload);
  const localSources = mergeLocalHealth(
    { sources: localQualitySources.map((source) => ({
      id: source.id,
      recordCount: source.canonicalCount ?? 0,
      status: null,
      foundPeriods: [],
    })), generatedAt: null },
    { sources: localSourceHealth },
  );
  const reconciliation = reconcileSourceSnapshots({ production: productionSources, local: localSources });
  const productionById = buildSourceMap(productionPayload.data ?? productionPayload);
  const localById = buildSourceMap(localSources);
  const samplesById = buildSourceMap(sampleResults);
  const rows = reconciliation.rows.map((row) => {
    const production = productionById.get(row.id) ?? {};
    const local = localById.get(row.id) ?? {};
    const sample = samplesById.get(row.id) ?? null;
    return {
      ...row,
      productionChecksum: shortChecksum(production.checksumSha256 ?? production.indexChecksumSha256),
      localChecksum: shortChecksum(local.checksumSha256 ?? null),
      productionPeriod: production.period ?? production.lastCutoff ?? null,
      localPeriod: local.period ?? null,
      sample: sample ? { ...sample, availabilityClass: classifyAvailability(sample) } : null,
    };
  });
  return {
    schemaVersion: 1,
    generatedAt,
    baseUrl,
    policy: {
      dataPath: "r2-public-endpoints",
      d1Used: false,
      maxRowsRequestedPerSource: DEFAULT_SAMPLE_LIMIT,
      releasesMutated: false,
      valuesRedactedInSample: true,
    },
    health: {
      ok: productionHealth?.ok ?? null,
      publicDataBackend: productionHealth?.publicDataBackend ?? null,
      publicD1Reads: productionHealth?.publicD1Reads ?? null,
      r2: productionHealth?.r2 ?? null,
      generatedAt: productionHealth?.generatedAt ?? null,
    },
    summary: {
      sourceCount: rows.length,
      sampleOk: rows.filter((row) => row.sample?.sample?.sampleCount > 0 || row.sample?.sampleCount > 0).length,
      summaryOnly: rows.filter((row) => row.sample?.availabilityClass === "summary-only").length,
      partialRelease: rows.filter((row) => row.sample?.availabilityClass === "partial-release").length,
      emptySample: rows.filter((row) => row.sample?.availabilityClass === "empty-sample").length,
      requestFailed: rows.filter((row) => row.sample?.availabilityClass === "request-failed").length,
      reconciliation: reconciliation.summary,
    },
    rows,
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

export async function collectProductionNormalizationAudit({
  baseUrl = DEFAULT_BASE_URL,
  localQualityPath = DEFAULT_LOCAL_QUALITY,
  localHealthPath = DEFAULT_LOCAL_HEALTH,
  fetchImpl = globalThis.fetch,
  sampleSources = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("FETCH_UNAVAILABLE");
  const [sourcesResponse, healthResponse, localQualitySources, localHealthDocument] = await Promise.all([
    fetchJson(fetchImpl, `${baseUrl.replace(/\/$/, "")}/api/v1/sources?audit=normalization`, 30_000),
    fetchJson(fetchImpl, `${baseUrl.replace(/\/$/, "")}/api/v1/health?audit=normalization`, 30_000),
    readJson(localQualityPath),
    readJson(localHealthPath),
  ]);
  if (!sourcesResponse.ok || !sourcesResponse.body) throw new Error(`PRODUCTION_SOURCES_${sourcesResponse.error ?? "INVALID"}`);
  if (!healthResponse.ok || !healthResponse.body) throw new Error(`PRODUCTION_HEALTH_${healthResponse.error ?? "INVALID"}`);

  const productionSources = productionSourcesPayload(sourcesResponse.body);
  const ids = sampleSources
    ? sampleSources.map(canonicalId)
    : [...new Set([...productionSources.map((source) => source.id), ...EXTRA_SAMPLE_SOURCES])];
  const samples = [];
  for (const sourceId of ids) {
    const encoded = encodeURIComponent(sourceId === "transparencia-activa" ? "cplt" : sourceId);
    const response = await fetchJson(fetchImpl, `${baseUrl.replace(/\/$/, "")}/api/v1/records?source=${encoded}&limit=${DEFAULT_SAMPLE_LIMIT}`, 30_000);
    samples.push(sampleResult(sourceId, response));
  }

  return buildProductionNormalizationAudit({
    productionPayload: sourcesResponse.body,
    productionHealth: healthResponse.body.data ?? healthResponse.body,
    localQualitySources,
    localSourceHealth: localHealthDocument.sources ?? {},
    sampleResults: samples,
    baseUrl,
    generatedAt,
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  collectProductionNormalizationAudit({
    baseUrl: option("--base-url", DEFAULT_BASE_URL),
    localQualityPath: option("--local-quality", DEFAULT_LOCAL_QUALITY),
    localHealthPath: option("--local-health", DEFAULT_LOCAL_HEALTH),
    sampleSources: process.argv.includes("--sources")
      ? option("--sources", "").split(",").map((source) => source.trim()).filter(Boolean)
      : null,
  })
    .then((report) => process.stdout.write(`${JSON.stringify(report, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`[audit-normalization-production] ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
