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

const pinnedSummary = await readJson("data/lake/projections/v1/ley19862-summary.json");
const generatedDir = join(root, "data", "generated");
const publicDataDir = join(root, "public", "data");
const transferDir = join(publicDataDir, "transferencias");
await mkdir(join(generatedDir, "transferencias"), { recursive: true });
await mkdir(publicDataDir, { recursive: true });

const fullSource = join(root, "data", "lake", "partitions", "ley-19862");
const fullRelease = existsSync(fullSource)
  ? await buildTransferenciasStatic({ source: fullSource, output: transferDir })
  : null;
const summary = fullRelease?.summary ?? pinnedSummary;

const compactSummary = {
  generatedAt: summary.generatedAt,
  kpis: summary.kpis,
  by_year: summary.by_year,
  top_receptores: (summary.top_receptores ?? []).slice(0, 10),
  top_emisores: (summary.top_emisores ?? []).slice(0, 10),
  transfers_sample: summary.transfers_sample ?? [],
};
await writeFile(join(generatedDir, "transferencias", "summary.json"), `${JSON.stringify(compactSummary)}\n`);
const transferManifest = fullRelease?.manifest ?? writeChunkedJson({
    outputDir: transferDir,
    dataset: "ley-19862-transferencias",
    rows: summary.transfers_sample ?? [],
    pageSize: 50,
  });

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
