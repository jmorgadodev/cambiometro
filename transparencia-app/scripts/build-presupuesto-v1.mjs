/**
 * Proyección v1: ejecución presupuestaria DIPRES 2026 (particiones del lake)
 * agregada por programa para la ficha de entidad (tab Dinero público).
 * Salida: data/lake/projections/v1/presupuesto.json
 *
 * Solo nivel `subtitle` del período vigente (2026); cada programa lleva la
 * serie mensual (presupuesto inicial / vigente / ejecución acumulada) y el
 * desglose por subtítulo del último mes disponible.
 *
 * Uso: node scripts/build-presupuesto-v1.mjs [--output ...]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { latestBudgetSnapshot } from "./etl/presupuesto-snapshots.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lakeRoot = join(root, "data", "lake");
const outputPath = resolve(argument("--output") ?? join(lakeRoot, "projections", "v1", "presupuesto.json"));
if (!outputPath.startsWith(`${lakeRoot}${sep}`)) throw new Error("INVALID_OUTPUT_PATH");

const catalog = JSON.parse(readFileSync(join(lakeRoot, "catalog", "v1", "manifest.json"), "utf8"));
const generatedAt = catalog.generatedAt ?? new Date().toISOString();
const partitions = (catalog.partitions ?? []).filter((partition) =>
  partition.id.startsWith("dipres/"),
);

const programs = new Map();

function ensureProgram(programId) {
  let entry = programs.get(programId);
  if (!entry) {
    entry = { programId, partida: "", capitulo: "", programa: "", budgetSide: "", meses: [], subtitleSnapshots: [] };
    programs.set(programId, entry);
  }
  return entry;
}

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
    const d = raw.data ?? {};
    if (d.classification_level !== "subtitle") continue;
    const period = String(d.period ?? "");
    if (!period.startsWith("2026")) continue;
    const programId = (d.subject_entity_ids ?? []).find((id) => String(id).startsWith("public-body-dipres-program-"));
    if (!programId) continue;
    const entry = ensureProgram(String(programId));
    entry.partida = String(d.partida ?? "");
    entry.capitulo = String(d.capitulo ?? "");
    entry.programa = String(d.programa ?? "");
    entry.budgetSide = String(d.budget_side ?? "");
    const month = entry.meses.find((m) => m.period === period);
    const inicial = Number(d.presupuesto_inicial_clp ?? 0);
    const vigente = Number(d.presupuesto_vigente_clp ?? 0);
    const ejecutado = Number(d.ejecucion_acumulada_clp ?? 0);
    if (month) {
      month.inicial += inicial;
      month.vigente += vigente;
      month.ejecutado += ejecutado;
    } else {
      entry.meses.push({ period, inicial, vigente, ejecutado });
    }
    const subtitulo = String(d.subtitulo ?? "");
    const denominacion = String(d.denominacion ?? "");
    entry.subtitleSnapshots.push({ period, subtitulo, denominacion, inicial, vigente, ejecutado });
  }
}

const programsOut = [...programs.values()].map((entry) => {
  const latest = latestBudgetSnapshot(entry.subtitleSnapshots);
  return {
    programId: entry.programId,
    partida: entry.partida,
    capitulo: entry.capitulo,
    programa: entry.programa,
    budgetSide: entry.budgetSide,
    meses: entry.meses.sort((a, b) => a.period.localeCompare(b.period)),
    subtitulos_periodo: latest.period,
    subtitulos: latest.subtitulos,
  };
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify({ generatedAt, period: "2026", count: programsOut.length, programs: programsOut }));
console.log(`[presupuesto-v1] ${programsOut.length} programas DIPRES 2026 → ${outputPath}`);
