import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJson = (file) => readFile(join(root, file), "utf8").then(JSON.parse);
await import("./generate-static-params.mjs");

const generatedDir = join(root, "data", "generated");
const publicDataDir = join(root, "public", "data");
const transferDir = join(publicDataDir, "transferencias");
await mkdir(join(generatedDir, "transferencias"), { recursive: true });
await mkdir(publicDataDir, { recursive: true });

const fullSource = join(root, "data", "lake", "partitions", "ley-19862");
if (!existsSync(fullSource)) {
  throw new Error("STATIC_DATA_FULL_TRANSFER_SOURCE_MISSING: hydrate the complete Ley 19.862 lake before building Pages");
}
const fullRelease = await buildTransferenciasStatic({ source: fullSource, output: transferDir });
if (!fullRelease) throw new Error("STATIC_DATA_FULL_TRANSFER_RELEASE_EMPTY");
const summary = fullRelease.summary;

const compactSummary = {
  generatedAt: summary.generatedAt,
  kpis: summary.kpis,
  by_year: summary.by_year,
  top_receptores: (summary.top_receptores ?? []).slice(0, 10),
  top_emisores: (summary.top_emisores ?? []).slice(0, 10),
  transfers_sample: summary.transfers_sample ?? [],
};
await writeFile(join(generatedDir, "transferencias", "summary.json"), `${JSON.stringify(compactSummary)}\n`);
const transferManifest = fullRelease.manifest;

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
