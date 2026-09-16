import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const centralScope = process.argv.includes("--central");
const municipalScope = process.argv.includes("--municipal") || !centralScope;
if (centralScope && municipalScope) throw new Error("CPLT_DUPLICATE_SCOPE_AMBIGUOUS");

const scope = centralScope ? "central" : "municipal";
const inputRoot = resolve("data/raw", centralScope ? "transparencia_activa_central" : "transparencia_activa");
const projectionRoot = join(inputRoot, "projections", "funcionarios-v1");
const metadataFiles = new Set(["search_index.json", "transparency-summary.json", "coverage-index.json"]);
const files = readdirSync(projectionRoot)
  .filter((name) => name.endsWith(".json") && !metadataFiles.has(name))
  .sort();
const fingerprints = new Map();
const malformedFiles = [];
let rows = 0;
let duplicateRows = 0;

for (const file of files) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(projectionRoot, file), "utf8"));
  } catch (error) {
    malformedFiles.push({ file, reason: error instanceof Error ? error.message : String(error) });
    continue;
  }
  if (!Array.isArray(parsed)) {
    malformedFiles.push({ file, reason: "not-an-array" });
    continue;
  }
  for (const row of parsed) {
    rows += 1;
    const semantic = {
      name: row.nombre_completo ?? null,
      organism: row.organo_nombre ?? null,
      role: row.cargo ?? null,
      period: row.fuente_periodo ?? row.periodo ?? null,
      gross: row.remuneracion_bruta_mensual ?? null,
      net: row.remuneracion_liquida_mensual ?? null,
      contract: row.tipo_contrato ?? null,
      start: row.fecha_ingreso ?? null,
      end: row.fecha_termino ?? null,
      url: row.url ?? row.url_fuente ?? null,
    };
    const fingerprint = createHash("sha256").update(JSON.stringify(semantic)).digest("hex");
    const previous = fingerprints.get(fingerprint) ?? 0;
    if (previous > 0) duplicateRows += 1;
    fingerprints.set(fingerprint, previous + 1);
  }
}

const duplicateGroups = [...fingerprints.values()].filter((count) => count > 1).length;
console.log(JSON.stringify({
  schemaVersion: 1,
  scope,
  projectionRoot,
  files: files.length,
  rows,
  uniqueFingerprints: fingerprints.size,
  duplicateGroups,
  duplicateRows,
  malformedFiles,
}, null, 2));
