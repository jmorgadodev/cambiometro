#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "out");
const required = [
  "index.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "_redirects",
  "_headers",
  "municipalidades/index.html",
  "municipalidades/maipu/index.html",
  "politico/index.html",
  "politico/vanessa-kaiser-barents-von-hohenhagen/index.html",
  "politico/carlos-bianchi-chelech/index.html",
  "entidades/public-body-camara/index.html",
  "transferencias/index.html",
];

async function exists(file) {
  try {
    await access(path.join(root, file));
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, result = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, result);
    else result.push(path.relative(root, absolute).replaceAll("\\", "/"));
  }
  return result;
}

const missing = (await Promise.all(required.map(async (file) => (await exists(file) ? null : file)))).filter(Boolean);
const files = await walk(root);
const dynamicMarkers = files.filter((file) => file.endsWith("/index.html") === false && /(^|\/)ƒ/.test(file));
const nextRouteTextFiles = files.filter((file) => {
  const name = path.basename(file);
  return name === "index.txt" || name === "__PAGE__.txt" || name.startsWith("__next.");
});
const htmlCount = files.filter((file) => file.endsWith(".html")).length;
const maxPagesAssetBytes = 25 * 1024 * 1024;
const fileStats = await Promise.all(files.map(async (file) => ({ file, bytes: (await stat(path.join(root, file))).size })));
const oversizedAssets = fileStats.filter(({ bytes }) => bytes > maxPagesAssetBytes).map(({ file, bytes }) => ({ file, bytes }));
let transferManifestError = null;
try {
  const manifest = JSON.parse(await readFile(path.join(root, "data", "transferencias", "manifest.json"), "utf8"));
  const expectedPages = Math.ceil(manifest.totalRows / manifest.pageSize);
  const missingChunks = manifest.pages.filter((page) => !files.includes(page.path.replace(/^\//, ""))).map((page) => page.path);
  let materializedRows = 0;
  let materializedAmount = 0;
  const ids = new Set();
  const badChunks = [];
  for (const page of manifest.pages) {
    const relative = page.path.replace(/^\//, "");
    if (!files.includes(relative)) continue;
    const chunkText = await readFile(path.join(root, relative), "utf8");
    const rows = JSON.parse(chunkText);
    const checksum = createHash("sha256").update(chunkText).digest("hex");
    if (!Array.isArray(rows) || rows.length !== page.count || checksum !== page.sha256) {
      badChunks.push({ page: page.page, count: Array.isArray(rows) ? rows.length : null, expectedCount: page.count, checksum });
      continue;
    }
    for (const row of rows) {
      if (ids.has(row.id)) badChunks.push({ page: page.page, duplicateId: row.id });
      ids.add(row.id);
      materializedAmount += Number(row.monto_clp ?? 0);
    }
    materializedRows += rows.length;
  }
  const summary = JSON.parse(await readFile(path.join(root, "data", "transferencias", "summary.json"), "utf8"));
  const coherent = materializedRows === manifest.totalRows
    && materializedAmount === manifest.expected?.totalMontoClp
    && summary.kpis?.total_transfers === manifest.totalRows
    && summary.kpis?.total_monto_clp === manifest.expected?.totalMontoClp;
  if (manifest.schemaVersion !== 1 || manifest.dataset !== "ley-19862-transferencias" || manifest.totalRows <= 0 || manifest.totalPages !== expectedPages || manifest.searchIndex?.count !== manifest.totalRows || missingChunks.length > 0 || badChunks.length > 0 || !coherent) {
    transferManifestError = { expectedPages, missingChunks, badChunks: badChunks.slice(0, 10), totalRows: manifest.totalRows, totalPages: manifest.totalPages, searchIndexCount: manifest.searchIndex?.count, materializedRows, materializedAmount, expectedAmount: manifest.expected?.totalMontoClp, summaryRows: summary.kpis?.total_transfers, summaryAmount: summary.kpis?.total_monto_clp };
  }
} catch (error) {
  transferManifestError = String(error);
}
let funcionariosManifestError = null;
try {
  const manifest = JSON.parse(await readFile(path.join(root, "data", "funcionarios", "manifest.json"), "utf8"));
  const municipalityIds = [
    ...(manifest.availableMunicipalities ?? []),
    ...(manifest.unavailableMunicipalities ?? []),
    ...(manifest.notApplicableMunicipalities ?? []),
  ];
  const municipalityIdSet = new Set(municipalityIds);
  const municipalityDirs = (await readdir(path.join(root, "data", "funcionarios"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const municipalityErrors = [];
  if (manifest.municipalities !== 346 || municipalityIds.length !== 346 || municipalityIdSet.size !== 346 || municipalityDirs.length !== 346) {
    municipalityErrors.push({ reason: "MUNICIPALITY_CENSUS_MISMATCH", declared: manifest.municipalities, ids: municipalityIds.length, uniqueIds: municipalityIdSet.size, dirs: municipalityDirs.length });
  }
  for (const municipalityId of municipalityIds) {
    const municipalityManifestPath = path.join(root, "data", "funcionarios", municipalityId, "manifest.json");
    try {
      const municipalityManifest = JSON.parse(await readFile(municipalityManifestPath, "utf8"));
      if (municipalityManifest.municipalityId !== municipalityId || !["available", "unavailable", "not_applicable"].includes(municipalityManifest.sourceStatus)) {
        municipalityErrors.push({ municipalityId, reason: "MUNICIPALITY_MANIFEST_INVALID", sourceStatus: municipalityManifest.sourceStatus });
        continue;
      }
      const periods = municipalityManifest.periods ?? {};
      const periodEntries = Object.entries(periods);
      if (municipalityManifest.sourceStatus === "available" && (!municipalityManifest.defaultPeriod || !periods[municipalityManifest.defaultPeriod])) {
        municipalityErrors.push({ municipalityId, reason: "MUNICIPALITY_DEFAULT_PERIOD_MISSING" });
      }
      if (municipalityManifest.sourceStatus !== "available" && (municipalityManifest.defaultPeriod || periodEntries.length > 0)) {
        municipalityErrors.push({ municipalityId, reason: "MUNICIPALITY_EMPTY_STATUS_HAS_DATA", sourceStatus: municipalityManifest.sourceStatus });
      }
      for (const [period, periodEntry] of periodEntries) {
        const expectedPath = `data/funcionarios/${municipalityId}/${period}.json`;
        const payloadPath = String(periodEntry.path ?? "").replace(/^\//, "");
        if (payloadPath !== expectedPath || !files.includes(payloadPath)) {
          municipalityErrors.push({ municipalityId, period, reason: "MUNICIPALITY_PAYLOAD_MISSING", path: periodEntry.path });
          continue;
        }
        const payload = JSON.parse(await readFile(path.join(root, payloadPath), "utf8"));
        const rowCount = Array.isArray(payload.data) ? payload.data.length : -1;
        if (payload.schemaVersion !== 1 || payload.meta?.periodo !== period || payload.meta?.total !== rowCount || payload.meta?.totalHeadcount !== periodEntry.totalRows || rowCount !== periodEntry.completeRows || payload.meta?.partial !== periodEntry.partial) {
          municipalityErrors.push({ municipalityId, period, reason: "MUNICIPALITY_PAYLOAD_INCOHERENT", rowCount, meta: payload.meta, manifest: periodEntry });
        }
      }
    } catch (error) {
      municipalityErrors.push({ municipalityId, reason: "MUNICIPALITY_MANIFEST_UNREADABLE", error: String(error) });
    }
  }
  const muniManifest = JSON.parse(await readFile(path.join(root, "data", "funcionarios", "muni-maipu", "manifest.json"), "utf8"));
  const antarticaManifest = JSON.parse(await readFile(path.join(root, "data", "funcionarios", "muni-antartica", "manifest.json"), "utf8"));
  const defaultPeriod = muniManifest.defaultPeriod;
  const period = defaultPeriod ? muniManifest.periods?.[defaultPeriod] : null;
  const payloadPath = period?.path?.replace(/^\//, "");
  const payload = payloadPath ? JSON.parse(await readFile(path.join(root, payloadPath), "utf8")) : null;
  if (manifest.schemaVersion !== 1 || manifest.dataset !== "funcionarios-cplt" || !Array.isArray(manifest.availableMunicipalities) || !Array.isArray(manifest.unavailableMunicipalities) || !Array.isArray(manifest.notApplicableMunicipalities) || manifest.coverage?.complete !== (manifest.unavailableMunicipalities.length === 0) || !manifest.notApplicableMunicipalities.includes("muni-antartica") || antarticaManifest.sourceStatus !== "not_applicable" || !defaultPeriod || !period || !payloadPath || !files.includes(payloadPath) || payload?.meta?.periodo !== defaultPeriod || payload?.meta?.totalHeadcount !== period.totalRows || municipalityErrors.length > 0) {
    funcionariosManifestError = {
      municipalities: manifest.municipalities,
      dataset: manifest.dataset,
      defaultPeriod,
      defaultPeriodEntry: period ?? null,
      payloadPresent: payloadPath ? files.includes(payloadPath) : false,
      payloadPeriod: payload?.meta?.periodo ?? null,
      payloadHeadcount: payload?.meta?.totalHeadcount ?? null,
      unavailableMunicipalities: manifest.unavailableMunicipalities ?? null,
      notApplicableMunicipalities: manifest.notApplicableMunicipalities ?? null,
      antarticaSourceStatus: antarticaManifest.sourceStatus ?? null,
      municipalityErrors: municipalityErrors.slice(0, 20),
      municipalityErrorCount: municipalityErrors.length,
    };
  }
  const allowPartialCplt = process.env.ALLOW_PARTIAL_CPLT === "1" || process.env.CPLT_ALLOW_UNAVAILABLE === "1";
  if (!allowPartialCplt && manifest.unavailableMunicipalities.length > 0) {
    funcionariosManifestError = {
      reason: "FUNCIONARIOS_STATIC_COVERAGE_INCOMPLETE",
      unavailableMunicipalities: manifest.unavailableMunicipalities,
    };
  }
} catch (error) {
  funcionariosManifestError = String(error);
}
let politicoSlicesError = null;
try {
  const indexPath = path.join(process.cwd(), "data", "politicos-votaciones-index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const politicianEntries = Object.values(index);
  const errors = [];
  if (politicianEntries.length !== 205) errors.push({ reason: "POLITICIAN_CENSUS_MISMATCH", count: politicianEntries.length });
  for (const entry of politicianEntries) {
    const aliases = [String(entry.id), String(entry.slug)];
    const payloads = [];
    for (const alias of aliases) {
      const relative = `data/politico-slices/${alias}.json`;
      if (!files.includes(relative)) {
        errors.push({ id: entry.id, reason: "POLITICIAN_SLICE_MISSING", alias });
        continue;
      }
      const text = await readFile(path.join(root, relative), "utf8");
      const payload = JSON.parse(text);
      payloads.push({ alias, text, payload });
      if (payload.id !== entry.id || payload.slug !== entry.slug || payload.totalVotaciones !== payload.votos?.length || payload.desglose?.total !== payload.totalVotaciones) {
        errors.push({ id: entry.id, reason: "POLITICIAN_SLICE_INCOHERENT", alias, totalVotaciones: payload.totalVotaciones, votos: payload.votos?.length, desgloseTotal: payload.desglose?.total });
      }
    }
    const route = `politico/${entry.slug}/index.html`;
    if (!files.includes(route)) errors.push({ id: entry.id, reason: "POLITICIAN_HTML_MISSING", route });
    if (payloads.length === 2 && payloads[0].text !== payloads[1].text) errors.push({ id: entry.id, reason: "POLITICIAN_ALIAS_MISMATCH" });
  }
  if (errors.length > 0) politicoSlicesError = { errors: errors.slice(0, 20), errorCount: errors.length, count: politicianEntries.length };
} catch (error) {
  politicoSlicesError = String(error);
}

const freePagesFileLimit = 20_000;
if (missing.length > 0 || htmlCount === 0 || dynamicMarkers.length > 0 || nextRouteTextFiles.length > 0 || files.length > freePagesFileLimit || oversizedAssets.length > 0 || transferManifestError || funcionariosManifestError || politicoSlicesError) {
  console.error(JSON.stringify({ ok: false, missing, htmlCount, fileCount: files.length, freePagesFileLimit, maxPagesAssetBytes, oversizedAssets: oversizedAssets.slice(0, 20), nextRouteTextFiles: nextRouteTextFiles.slice(0, 20), dynamicMarkers, transferManifestError, funcionariosManifestError, politicoSlicesError }, null, 2));
  process.exit(1);
}

const largestAsset = fileStats.sort((left, right) => right.bytes - left.bytes)[0] ?? null;
console.log(JSON.stringify({ ok: true, htmlCount, fileCount: files.length, freePagesFileLimit, maxPagesAssetBytes, largestAsset, nextRouteTextFiles: 0, required: required.length }, null, 2));
