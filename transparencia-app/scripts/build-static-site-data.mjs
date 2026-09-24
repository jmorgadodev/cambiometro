import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeChunkedJson } from "./static-site-data.mjs";
import { buildTransferenciasStatic, hasFullTransferSource } from "./build-transferencias-static.mjs";
import { chunkJsonRows, listUnavailableMunicipalities } from "./static-payroll.mjs";
import { readExpenseSubset } from "./expense-release.mjs";
import { normalizeMovementPayload, sha256, validateMovementPayload } from "./movimientos-pipeline.mjs";
import { buildCpltAggregateSummary, isPlausiblePeriod } from "./cplt-transparency-summary.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = (file) => readFile(join(root, file), "utf8").then(JSON.parse);
await import("./generate-static-params.mjs");

function summarizeTransferSample(rows, generatedAt) {
  const byYear = {};
  const receivers = new Set();
  const emitters = new Set();
  for (const row of rows) {
    const year = row.fecha?.slice?.(0, 4) ?? row.period ?? row.periodo ?? "";
    if (year) {
      byYear[year] ??= { count: 0, total: 0 };
      byYear[year].count += 1;
      byYear[year].total += Number(row.monto_clp ?? 0);
    }
    if (row.receiver_name ?? row.receptor_nombre) receivers.add(row.receiver_name ?? row.receptor_nombre);
    if (row.emitter_name ?? row.emisor_nombre) emitters.add(row.emitter_name ?? row.emisor_nombre);
  }
  return {
    generatedAt,
    kpis: {
      total_monto_clp: rows.reduce((sum, row) => sum + Number(row.monto_clp ?? 0), 0),
      total_transfers: rows.length,
      total_receptores: receivers.size,
      total_emisores: emitters.size,
    },
    by_year: byYear,
    top_receptores: [],
    top_emisores: [],
    transfers_sample: rows,
  };
}

const generatedDir = join(root, "data", "generated");
const publicDataDir = join(root, "public", "data");
const transferDir = join(publicDataDir, "transferencias");
const expenseDir = join(publicDataDir, "gastos-operacionales");
const publicFuncionariosDir = join(publicDataDir, "funcionarios");
const allowSample = process.env.ALLOW_STATIC_SAMPLE === "1";
const checksum = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
await mkdir(join(generatedDir, "transferencias"), { recursive: true });
await mkdir(publicDataDir, { recursive: true });

// El snapshot de movimientos se publica como un asset verificable además de
// importarse en el bundle estático. Así el navegador, los verificadores y el
// build pueden comparar exactamente el mismo contenido publicado.
const movimientosSourceContent = await readFile(join(root, "data", "movimientos.json"), "utf8");
const movimientosSourcePayload = JSON.parse(movimientosSourceContent);
const movimientosPayload = normalizeMovementPayload(movimientosSourcePayload);
const sourceMovimientosChecksum = movimientosPayload.checksum_sha256 ?? null;
const movimientosScopePolicy = JSON.parse(await readFile(join(root, "data", "movimientos-scope-policy.json"), "utf8"));
const movimientosPublicationBlocked = !["validated", "validated_reference", "validated_reconciled"].includes(movimientosScopePolicy.status);
if (!movimientosPublicationBlocked && (!Array.isArray(movimientosPayload.movimientos) || movimientosPayload.movimientos.length < 46)) {
  throw new Error("STATIC_MOVIMIENTOS_RELEASE_INCOMPLETE");
}
if (!allowSample && !movimientosPublicationBlocked) validateMovementPayload(movimientosPayload);
const publicMovimientosPayload = movimientosPublicationBlocked
  ? {
      ...movimientosPayload,
      movimientos: [],
      source_health: [],
      signals: [],
      conectores: {},
      last_run: null,
      last_attempt_at: null,
      last_success_at: null,
      last_event_date: null,
      stats: { ...(movimientosPayload.stats ?? {}), total_movimientos: 0, verificados: 0, en_confirmacion: 0 },
      release_status: "blocked_pending_official_reconciliation",
      release_scope: movimientosScopePolicy.scopeId,
    }
  : movimientosPayload;
if (movimientosPublicationBlocked) {
  publicMovimientosPayload.checksum_sha256 = sha256({ ...publicMovimientosPayload, checksum_sha256: undefined });
}
const movimientosContent = `${JSON.stringify(publicMovimientosPayload, null, 2)}\n`;
await writeFile(join(publicDataDir, "movimientos.json"), movimientosContent);
const movimientosRelease = {
  count: publicMovimientosPayload.movimientos.length,
  checksumSha256: crypto.createHash("sha256").update(movimientosContent).digest("hex"),
  pipelineChecksumSha256: sourceMovimientosChecksum,
  lastSuccessAt: movimientosPayload.last_success_at ?? movimientosPayload.last_run ?? null,
  lastEventDate: movimientosPayload.last_event_date ?? null,
  status: movimientosPublicationBlocked ? "blocked_pending_official_reconciliation" : "published",
};

// El universo completo se consulta en R2 mediante la API paginada. Pages no
// debe duplicar cada fila en miles de objetos estáticos ni enviar un índice
// masivo al navegador; aquí sólo generamos el resumen que alimenta las cifras
// de la página.
const expenseSubsets = ["gastos_camara", "gastos_senado"].map((sourceId) => {
  const subset = readExpenseSubset(root, sourceId);
  return { sourceId, subset };
});
const expenseRecords = expenseSubsets.flatMap(({ sourceId, subset }) => (subset?.records ?? []).map((record) => ({ ...record, sourceId })));
if (!expenseRecords.length && !allowSample) {
  throw new Error([
    "STATIC_EXPENSE_RELEASE_EMPTY: no hay un release de gastos operacionales en este checkout.",
    "Este dato no se versiona en Git; hidrátalo desde R2 antes de construir Pages:",
    "npm run data:hydrate:static -- --required --required-files data/lake-subsets/gastos-camara.subset.json,data/lake-subsets/gastos-senado.subset.json",
    "Luego vuelve a ejecutar npm run pages:build.",
  ].join("\n"));
}
await rm(expenseDir, { recursive: true, force: true });
const expenseSummary = {
  generatedAt: new Date().toISOString(),
  totalRows: expenseRecords.length,
  totalMontoClp: expenseRecords.reduce((sum, row) => sum + (row.monto_clp ?? 0), 0),
  montoNoInformado: expenseRecords.filter((row) => row.monto_clp === null || row.monto_clp === undefined).length,
  bySource: Object.fromEntries(expenseSubsets.map(({ sourceId, subset }) => [sourceId, subset?.recordCount ?? 0])),
  periodsBySource: Object.fromEntries(expenseSubsets.map(({ sourceId, subset }) => [sourceId, subset?.periods ?? []])),
};
await writeFile(join(generatedDir, "gastos-operacionales-summary.json"), `${JSON.stringify(expenseSummary)}\n`);

const pinnedSummary = await readJson("data/lake/projections/v1/ley19862-summary.json");
const registeredThrough = process.env.TRANSFER_RELEASE_REGISTERED_THROUGH
  ?? process.env.LEY_19862_REGISTERED_THROUGH
  ?? null;
// Do not inherit the cutoff embedded in the previous projection summary.
// That summary can be older than the freshly hydrated lake and would make
// Pages publish fewer rows than the API release built from the same source.
// When no explicit cutoff is supplied, both publishers derive metadata from
// the complete hydrated lake without excluding newer official records.
const canonicalManifestFile = process.env.TRANSFER_STATIC_CANONICAL_MANIFEST_FILE
  ? resolve(process.env.TRANSFER_STATIC_CANONICAL_MANIFEST_FILE)
  : null;
const canonicalManifest = canonicalManifestFile && existsSync(canonicalManifestFile)
  ? JSON.parse(readFileSync(canonicalManifestFile, "utf8"))
  : null;
const fullSource = join(root, "data", "lake", "partitions", "ley-19862");
const fullSourceAvailable = hasFullTransferSource(fullSource);
if (!fullSourceAvailable && !canonicalManifest && !allowSample) {
  throw new Error("STATIC_DATA_FULL_TRANSFER_SOURCE_MISSING: hydrate the complete Ley 19.862 lake or the canonical paginated release before building Pages");
}
const fullRelease = canonicalManifest
  ? { manifest: canonicalManifest, summary: JSON.parse(readFileSync(join(transferDir, "summary.json"), "utf8")) }
  : fullSourceAvailable
    ? await buildTransferenciasStatic({ source: fullSource, output: transferDir, registeredThrough })
    : null;
if (!fullRelease && !allowSample) throw new Error("STATIC_DATA_FULL_TRANSFER_RELEASE_EMPTY");

const sampleRows = pinnedSummary.transfers_sample ?? [];
const transferManifest = fullRelease?.manifest ?? writeChunkedJson({
  outputDir: transferDir,
  dataset: "ley-19862-transferencias",
  rows: sampleRows,
  pageSize: 50,
});
const summary = fullRelease?.summary ?? summarizeTransferSample(sampleRows, pinnedSummary.generatedAt);

const compactSummary = {
  generatedAt: summary.generatedAt,
  registeredThrough: summary.registeredThrough ?? registeredThrough,
  sourceRows: summary.sourceRows ?? transferManifest.sourceRows ?? null,
  excludedAfterCutoff: summary.excludedAfterCutoff ?? transferManifest.excludedAfterCutoff ?? 0,
  kpis: summary.kpis,
  by_year: summary.by_year,
  top_receptores: (summary.top_receptores ?? []).slice(0, 10),
  top_emisores: (summary.top_emisores ?? []).slice(0, 10),
  transfers_sample: summary.transfers_sample ?? [],
};
const summaryContent = `${JSON.stringify(compactSummary)}\n`;
await writeFile(join(generatedDir, "transferencias", "summary.json"), summaryContent);
await writeFile(join(transferDir, "summary.json"), summaryContent);

// La ficha municipal usa el Worker como fuente primaria. Estos payloads son
// un respaldo estático oficial para que una caída o un cold start del Worker
// no deje la pestaña de nómina pegada en un spinner. Se generan desde la
// proyección publicada/hidratada, nunca desde datos inventados.
const cpltRoots = [];
const versionedCpltRoot = join(root, "data", "lake-cplt", "projections", "funcionarios-v1", "versions");
try {
  const versions = (await readdir(versionedCpltRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));
  if (versions[0]) cpltRoots.push(join(versionedCpltRoot, versions[0]));
} catch {
  // Use the checked-in projection if the latest R2 hydration is absent.
}
cpltRoots.push(join(root, "data", "lake", "projections", "funcionarios-v1"));
const cpltRoot = cpltRoots.find((candidate) => existsSync(candidate));
if (!cpltRoot) throw new Error("STATIC_CPLT_PROJECTION_SOURCE_MISSING: hydrate funcionarios-v1 before building Pages");
const cpltManifestPath = join(root, "data", "lake-cplt", "projections", "funcionarios-v1", "manifest.json");
let cpltCoverage = [];
let cpltGeneratedAt = new Date().toISOString();
if (existsSync(cpltManifestPath)) {
  try {
    const cpltManifest = JSON.parse(await readFile(cpltManifestPath, "utf8"));
    cpltCoverage = Array.isArray(cpltManifest.coverage) ? cpltManifest.coverage : [];
    cpltGeneratedAt = cpltManifest.generatedAt ?? cpltGeneratedAt;
  } catch {
    cpltCoverage = [];
  }
}
try {
  const communeCatalog = await readJson("data/catalog/communes.json");
  const names = new Map((communeCatalog.communes ?? []).flatMap((commune) => [
    [String(commune.id), commune.nombre_comuna],
    [String(commune.administracion_municipal_id), commune.nombre_comuna],
    [String(commune.cut), commune.nombre_comuna],
  ]));
  cpltCoverage = cpltCoverage.map((item) => ({
    ...item,
    name: item.name ?? names.get(String(item.communeId)) ?? item.communeId,
  }));
} catch {
  // El manifiesto de cobertura sigue siendo válido aunque el catálogo no esté disponible.
}
await rm(publicFuncionariosDir, { recursive: true, force: true });
await mkdir(publicFuncionariosDir, { recursive: true });
let cpltTransparencySummary = null;
const cpltSummaryStats = {
  recordCount: 0,
  periods: new Map(),
  contractCounts: {},
  issueCounts: {},
  recordsWithIssues: 0,
  invalidPeriodCount: 0,
  positiveAmountCount: 0,
  zeroAmountCount: 0,
  missingAmountCount: 0,
};
const cpltTransparencySummarySource = join(cpltRoot, "transparency-summary.json");
if (existsSync(cpltTransparencySummarySource)) {
  const summaryContent = await readFile(cpltTransparencySummarySource);
  try {
    const summary = JSON.parse(summaryContent.toString("utf8"));
    if (summary?.dataset === "transparencia-activa-funcionarios-summary"
      && Number.isSafeInteger(summary.recordCount)
      && Array.isArray(summary.periods)
      && summary.coverage?.total === 346) {
      const summaryOutput = join(publicFuncionariosDir, "transparency-summary.json");
      await writeFile(summaryOutput, summaryContent);
      cpltTransparencySummary = {
        path: "/data/funcionarios/transparency-summary.json",
        bytes: summaryContent.byteLength,
        checksumSha256: crypto.createHash("sha256").update(summaryContent).digest("hex"),
        recordCount: summary.recordCount,
        latestPeriod: summary.latestPeriod ?? null,
      };
    }
  } catch {
    cpltTransparencySummary = null;
  }
}
const funcionariosFiles = [];
for (const entry of await readdir(cpltRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
  const source = join(cpltRoot, entry.name);
  const content = await readFile(source);
  let parsed;
  try {
    parsed = JSON.parse(content.toString("utf8"));
  } catch {
    continue;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) continue;
  for (const row of parsed) {
    cpltSummaryStats.recordCount += 1;
    const period = String(row.fuente_periodo ?? row.periodo ?? "").trim().slice(0, 7);
    const validPeriod = isPlausiblePeriod(period, cpltGeneratedAt);
    if (!validPeriod) cpltSummaryStats.invalidPeriodCount += 1;
    const rawAmount = row.remuneracion_bruta_mensual;
    const amount = rawAmount === null || rawAmount === undefined || String(rawAmount).trim() === "" ? null : Number(rawAmount);
    if (amount === null || !Number.isFinite(amount)) cpltSummaryStats.missingAmountCount += 1;
    else if (amount === 0) cpltSummaryStats.zeroAmountCount += 1;
    else cpltSummaryStats.positiveAmountCount += 1;
    const contract = String(row.tipo_contrato ?? "").trim() || "No informado";
    cpltSummaryStats.contractCounts[contract] = (cpltSummaryStats.contractCounts[contract] ?? 0) + 1;
    const issues = Array.isArray(row.calidad_datos?.incidencias) ? row.calidad_datos.incidencias : [];
    if (issues.length > 0) cpltSummaryStats.recordsWithIssues += 1;
    for (const issue of issues) cpltSummaryStats.issueCounts[issue] = (cpltSummaryStats.issueCounts[issue] ?? 0) + 1;
    if (validPeriod) {
      const current = cpltSummaryStats.periods.get(period) ?? {
        rows: 0,
        withAmount: 0,
        withoutAmount: 0,
        grossTotal: 0,
        organisms: new Set(),
        contracts: {},
      };
      current.rows += 1;
      if (amount === null || !Number.isFinite(amount)) current.withoutAmount += 1;
      else {
        current.withAmount += 1;
        current.grossTotal += amount;
      }
      const organism = String(row.organo_nombre ?? row.organo_id ?? "").trim().toLocaleLowerCase("es-CL");
      if (organism) current.organisms.add(organism);
      current.contracts[contract] = (current.contracts[contract] ?? 0) + 1;
      cpltSummaryStats.periods.set(period, current);
    }
  }
  const id = entry.name.replace(/\.json$/, "");
  const chunks = chunkJsonRows(parsed);
  if (chunks.length === 1) {
    const output = join(publicFuncionariosDir, entry.name);
    await writeFile(output, content);
    funcionariosFiles.push({
      id,
      path: `/data/funcionarios/${entry.name}`,
      rows: parsed.length,
      bytes: content.byteLength,
      checksumSha256: crypto.createHash("sha256").update(content).digest("hex"),
    });
  } else {
    const chunkDir = join(publicFuncionariosDir, id);
    await mkdir(chunkDir, { recursive: true });
    const chunkManifest = [];
    for (const [index, rows] of chunks.entries()) {
      const chunkName = `p-${String(index + 1).padStart(4, "0")}.json`;
      const chunkContent = `${JSON.stringify(rows)}\n`;
      await writeFile(join(chunkDir, chunkName), chunkContent);
      chunkManifest.push({
        path: `/data/funcionarios/${id}/${chunkName}`,
        rows: rows.length,
        bytes: Buffer.byteLength(chunkContent),
        checksumSha256: crypto.createHash("sha256").update(chunkContent).digest("hex"),
      });
    }
    funcionariosFiles.push({
      id,
      chunks: chunkManifest,
      rows: parsed.length,
      bytes: content.byteLength,
      checksumSha256: crypto.createHash("sha256").update(content).digest("hex"),
    });
  }
}
if (!cpltTransparencySummary && cpltSummaryStats.recordCount > 0) {
  const summary = buildCpltAggregateSummary(cpltSummaryStats, cpltCoverage, cpltGeneratedAt);
  const summaryContent = `${JSON.stringify(summary, null, 2)}\n`;
  const summaryOutput = join(publicFuncionariosDir, "transparency-summary.json");
  await writeFile(summaryOutput, summaryContent);
  cpltTransparencySummary = {
    path: "/data/funcionarios/transparency-summary.json",
    bytes: Buffer.byteLength(summaryContent),
    checksumSha256: crypto.createHash("sha256").update(summaryContent).digest("hex"),
    recordCount: summary.recordCount,
    latestPeriod: summary.latestPeriod ?? null,
  };
}
funcionariosFiles.sort((left, right) => left.id.localeCompare(right.id));
const funcionariosManifest = {
  schemaVersion: 1,
  dataset: "cplt-funcionarios-static-fallback",
  generatedAt: new Date().toISOString(),
  expectedMunicipalities: 346,
  availableMunicipalities: funcionariosFiles.length,
  // Cobertura significa que la fuente reportó la municipalidad; available
  // significa que la proyección trae al menos un registro. Son universos
  // distintos y deben quedar visibles para que la UI no prometa datos que la
  // fuente oficial no publicó.
  coverage: cpltCoverage,
  unavailableMunicipalities: listUnavailableMunicipalities(cpltCoverage, funcionariosFiles),
  transparencySummary: cpltTransparencySummary,
  files: funcionariosFiles,
  checksumSha256: checksum(funcionariosFiles),
};
await writeFile(join(publicFuncionariosDir, "manifest.json"), `${JSON.stringify(funcionariosManifest, null, 2)}\n`);

const canonical = await readJson("data/entidades-canonica.json").catch(() => readJson("data/catalog/entities-routes.json"));
const entities = Array.isArray(canonical) ? canonical : canonical.entities ?? [];
const entityCountsByKind = {};
for (const entity of entities) entityCountsByKind[entity.kind] = (entityCountsByKind[entity.kind] ?? 0) + 1;
const entityPageSize = 40;
const entityCatalogSummary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  total: entities.length,
  pageSize: entityPageSize,
  firstPage: entities.slice(0, entityPageSize),
  countsByKind: entityCountsByKind,
  sourceChecksumSha256: checksum(entities.map(({ id }) => id)),
};
await writeFile(join(generatedDir, "entity-catalog.json"), `${JSON.stringify(entityCatalogSummary)}\n`);
await writeFile(join(publicDataDir, "search-index.json"), `${JSON.stringify(entities.map(({ id, kind, name }) => ({ id, kind, name })))}\n`);
const siteManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  datasets: {
    entities: { count: entities.length, checksumSha256: checksum(entities.map(({ id }) => id)) },
    transferencias: transferManifest,
    funcionarios: { count: funcionariosFiles.length, expectedMunicipalities: 346, checksumSha256: funcionariosManifest.checksumSha256 },
    search: { count: entities.length, checksumSha256: checksum(entities.map(({ id, name }) => ({ id, name }))) },
    movimientos: movimientosRelease,
  },
  expectedUniverse: { politicos: 205, municipalidades: 346, serviciosPublicos: 72, entidades: entities.length },
};
await writeFile(join(publicDataDir, "static-site-manifest.json"), `${JSON.stringify(siteManifest, null, 2)}\n`);
console.log(`Generated static data: ${entities.length} entities, ${transferManifest.totalRows} transfer rows, ${funcionariosFiles.length} static payroll payloads.`);
