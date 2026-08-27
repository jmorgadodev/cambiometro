import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeChunkedJson } from "./static-site-data.mjs";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";
import { chunkJsonRows, listUnavailableMunicipalities } from "./static-payroll.mjs";
import { readExpenseSubset } from "./expense-release.mjs";

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

// Publicar el universo completo de rendiciones operacionales en chunks. Las
// fichas actuales consumen sus propios slices; este índice conserva además
// las rendiciones históricas de autoridades que ya no pertenecen al
// directorio vigente, sin inventar una atribución.
const expenseRows = ["gastos_camara", "gastos_senado"].flatMap((sourceId) => {
  const subset = readExpenseSubset(root, sourceId);
  return (subset?.records ?? []).map((record) => ({ ...record, sourceId }));
}).sort((left, right) => String(right.fecha ?? "").localeCompare(String(left.fecha ?? "")) || right.monto_clp - left.monto_clp || left.id.localeCompare(right.id));
if (!expenseRows.length && !allowSample) throw new Error("STATIC_EXPENSE_RELEASE_EMPTY");
await rm(expenseDir, { recursive: true, force: true });
await mkdir(expenseDir, { recursive: true });
const expensePageSize = 50;
const expensePages = [];
for (let offset = 0; offset < expenseRows.length; offset += expensePageSize) {
  const page = Math.floor(offset / expensePageSize) + 1;
  const filename = `p-${String(page).padStart(4, "0")}.json`;
  const content = `${JSON.stringify(expenseRows.slice(offset, offset + expensePageSize))}\n`;
  await writeFile(join(expenseDir, filename), content);
  expensePages.push({ page, path: `/data/gastos-operacionales/${filename}`, count: Math.min(expensePageSize, expenseRows.length - offset), sha256: crypto.createHash("sha256").update(content).digest("hex") });
}
const expenseSearchRows = expenseRows.map((row, index) => ({
  i: index,
  p: Math.floor(index / expensePageSize) + 1,
  n: row.nombre ?? null,
  y: row.periodo,
  d: row.fecha,
  t: row.item,
  m: row.monto_clp,
  s: row.sourceId,
}));
const expenseSearchContent = `${JSON.stringify(expenseSearchRows)}\n`;
await writeFile(join(expenseDir, "search-index.json"), expenseSearchContent);
const expenseManifest = {
  schemaVersion: 1,
  dataset: "gastos-operacionales-rendidos",
  generatedAt: new Date().toISOString(),
  totalRows: expenseRows.length,
  pageSize: expensePageSize,
  totalPages: expensePages.length,
  pages: expensePages,
  searchIndex: { path: "/data/gastos-operacionales/search-index.json", count: expenseSearchRows.length, sha256: crypto.createHash("sha256").update(expenseSearchContent).digest("hex") },
  checksumSha256: crypto.createHash("sha256").update(JSON.stringify(expenseRows)).digest("hex"),
  expected: {
    totalMontoClp: expenseRows.reduce((sum, row) => sum + row.monto_clp, 0),
    bySource: Object.fromEntries(["gastos_camara", "gastos_senado"].map((sourceId) => [sourceId, expenseRows.filter((row) => row.sourceId === sourceId).length])),
  },
};
await writeFile(join(expenseDir, "manifest.json"), `${JSON.stringify(expenseManifest, null, 2)}\n`);

const fullSource = join(root, "data", "lake", "partitions", "ley-19862");
if (!existsSync(fullSource) && !allowSample) {
  throw new Error("STATIC_DATA_FULL_TRANSFER_SOURCE_MISSING: hydrate the complete Ley 19.862 lake before building Pages");
}
const pinnedSummary = await readJson("data/lake/projections/v1/ley19862-summary.json");
const registeredThrough = process.env.TRANSFER_RELEASE_REGISTERED_THROUGH
  ?? process.env.LEY_19862_REGISTERED_THROUGH
  ?? pinnedSummary.source?.registeredThrough
  ?? null;
const fullRelease = existsSync(fullSource)
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
if (existsSync(cpltManifestPath)) {
  try {
    const cpltManifest = JSON.parse(await readFile(cpltManifestPath, "utf8"));
    cpltCoverage = Array.isArray(cpltManifest.coverage) ? cpltManifest.coverage : [];
  } catch {
    cpltCoverage = [];
  }
}
await rm(publicFuncionariosDir, { recursive: true, force: true });
await mkdir(publicFuncionariosDir, { recursive: true });
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
  },
  expectedUniverse: { politicos: 205, municipalidades: 346, serviciosPublicos: 72, entidades: entities.length },
};
await writeFile(join(publicDataDir, "static-site-manifest.json"), `${JSON.stringify(siteManifest, null, 2)}\n`);
console.log(`Generated static data: ${entities.length} entities, ${transferManifest.totalRows} transfer rows, ${funcionariosFiles.length} static payroll payloads.`);
