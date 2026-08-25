import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeChunkedJson } from "./static-site-data.mjs";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";

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
await mkdir(join(generatedDir, "transferencias"), { recursive: true });
await mkdir(publicDataDir, { recursive: true });

const fullSource = join(root, "data", "lake", "partitions", "ley-19862");
const allowSample = process.env.ALLOW_STATIC_SAMPLE === "1";
if (!existsSync(fullSource) && !allowSample) {
  throw new Error("STATIC_DATA_FULL_TRANSFER_SOURCE_MISSING: hydrate the complete Ley 19.862 lake before building Pages");
}
const pinnedSummary = await readJson("data/lake/projections/v1/ley19862-summary.json");
const fullRelease = existsSync(fullSource)
  ? await buildTransferenciasStatic({ source: fullSource, output: transferDir })
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
  kpis: summary.kpis,
  by_year: summary.by_year,
  top_receptores: (summary.top_receptores ?? []).slice(0, 10),
  top_emisores: (summary.top_emisores ?? []).slice(0, 10),
  transfers_sample: summary.transfers_sample ?? [],
};
const summaryContent = `${JSON.stringify(compactSummary)}\n`;
await writeFile(join(generatedDir, "transferencias", "summary.json"), summaryContent);
await writeFile(join(transferDir, "summary.json"), summaryContent);

const canonical = await readJson("data/entidades-canonica.json").catch(() => readJson("data/catalog/entities-routes.json"));
const entities = Array.isArray(canonical) ? canonical : canonical.entities ?? [];
await writeFile(join(publicDataDir, "search-index.json"), `${JSON.stringify(entities.map(({ id, kind, name }) => ({ id, kind, name })))}\n`);
const checksum = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const siteManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  datasets: {
    entities: { count: entities.length, checksumSha256: checksum(entities.map(({ id }) => id)) },
    transferencias: transferManifest,
    search: { count: entities.length, checksumSha256: checksum(entities.map(({ id, name }) => ({ id, name }))) },
  },
  expectedUniverse: { politicos: 205, municipalidades: 346, serviciosPublicos: 72, entidades: entities.length },
};
await writeFile(join(publicDataDir, "static-site-manifest.json"), `${JSON.stringify(siteManifest, null, 2)}\n`);
console.log(`Generated static data: ${entities.length} entities, ${transferManifest.totalRows} transfer rows.`);
