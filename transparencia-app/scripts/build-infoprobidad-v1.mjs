/**
 * Proyección v1: declaraciones InfoProbidad (particiones del lake) para la
 * evidencia por persona en la ficha del político. Salida:
 * data/lake/projections/v1/infoprobidad.json
 *
 * Del registro completo se proyecta solo lo que consume la ficha
 * (lib/data-source.ts), sin el payload crudo CPLT (campo `declaracion`),
 * para mantener el archivo en ~7 MB.
 *
 * Uso: node scripts/build-infoprobidad-v1.mjs [--output ...]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lakeRoot = join(root, "data", "lake");
const outputPath = resolve(argument("--output") ?? join(lakeRoot, "projections", "v1", "infoprobidad.json"));
if (!outputPath.startsWith(`${lakeRoot}${sep}`)) throw new Error("INVALID_OUTPUT_PATH");

const catalog = JSON.parse(readFileSync(join(lakeRoot, "catalog", "v1", "manifest.json"), "utf8"));
const generatedAt = catalog.generatedAt ?? new Date().toISOString();
const partitions = (catalog.partitions ?? []).filter((partition) =>
  partition.id.startsWith("infoprobidad/"),
);

const records = [];
for (const partition of partitions) {
  const partitionDir = join(lakeRoot, "partitions", partition.id);
  if (!existsSync(partitionDir)) continue;
  let recordsFile = null;
  const partitionManifestPath = join(partitionDir, "manifest.json");
  if (existsSync(partitionManifestPath)) {
    const partitionManifest = JSON.parse(readFileSync(partitionManifestPath, "utf8"));
    const artifactKey = partitionManifest?.artifacts?.[0]?.key;
    if (artifactKey) recordsFile = basename(artifactKey);
  }
  if (!recordsFile) continue;
  const dataFile = join(partitionDir, recordsFile);
  if (!existsSync(dataFile)) continue;
  let content;
  try {
    content = gunzipSync(readFileSync(dataFile)).toString("utf8");
  } catch {
    continue;
  }
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let raw;
    try {
      raw = JSON.parse(line);
    } catch {
      continue;
    }
    const data = raw.data ?? {};
    records.push({
      id: data.id ?? raw.id,
      kind: data.kind ?? "declaration",
      fecha: data.fecha,
      title: data.title,
      nombre: data.nombre,
      organizations: data.organizations ?? [],
      url: data.url,
      reconciliation_method: data.reconciliation_method ?? "person_official_id",
    });
  }
}

records.sort((a, b) => String(a.id).localeCompare(String(b.id)));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify({ generatedAt, count: records.length, records }));
console.log(`[infoprobidad-v1] ${records.length} declaraciones proyectadas (${partitions.length} particiones) → ${outputPath}`);