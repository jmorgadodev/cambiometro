/**
 * Prepara un release aislado de votaciones del Senado.
 *
 * Este script sólo consulta la fuente oficial y genera artefactos locales.
 * No escribe en R2, D1, Pages ni en el snapshot ETL principal. La publicación
 * debe hacerse después de revisar los conteos, checksums y el rollback.
 *
 * Ejemplo:
 *   node scripts/etl/prepare-senado-votaciones-release.mjs \
 *     --from 2026-08-01 --to 2026-09-15 \
 *     --output C:/ruta/staging/senado-votaciones-2026-09-16
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fetchVotacionesSenado } from "./connectors/senado-votaciones.mjs";
import { buildLakePlan } from "./lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function isoDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${name} debe usar YYYY-MM-DD`);
  }
  return value;
}

function outputPath() {
  const value = argument("--output");
  if (!value) throw new Error("Falta --output; el release debe tener un destino explícito");
  return resolve(value);
}

function groupByPeriod(rows) {
  return rows.reduce((groups, row) => {
    const period = String(row.fecha ?? "").slice(0, 7);
    const values = groups.get(period) ?? [];
    values.push(row);
    groups.set(period, values);
    return groups;
  }, new Map());
}

function assertRows(rows, from, to) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("La fuente oficial no devolvió votaciones");
  const ids = new Set();
  for (const row of rows) {
    const id = String(row?.votacion_id ?? "").trim();
    const date = String(row?.fecha ?? "").trim();
    if (!/^\d+$/.test(id)) throw new Error(`Votación sin ID oficial: ${JSON.stringify(row)}`);
    if (ids.has(id)) throw new Error(`ID de votación duplicado: ${id}`);
    ids.add(id);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < from || date > to) {
      throw new Error(`Votación fuera del rango solicitado: ${id} / ${date}`);
    }
    if (!Array.isArray(row.votos)) throw new Error(`Votación sin padrón de votos: ${id}`);
  }
}

const from = isoDate(argument("--from"), "--from");
const to = isoDate(argument("--to"), "--to");
if (from > to) throw new Error("--from no puede ser posterior a --to");

const rows = await fetchVotacionesSenado({ legislatura: 374, desde: from, to });
assertRows(rows, from, to);

const sourceRows = rows.map((row) => ({ ...row, source_period: String(row.fecha).slice(0, 7) }));
const snapshot = {
  generado_por: "prepare-senado-votaciones-release.mjs",
  actualizado_en: new Date().toISOString(),
  fuentes: { votaciones_senado: sourceRows },
};
const plan = buildLakePlan(snapshot, { replaceSourceIds: ["votaciones_senado"] });
const periods = [...groupByPeriod(sourceRows).entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([period, periodRows]) => ({
    period,
    recordCount: periodRows.length,
    ids: periodRows.map((row) => String(row.votacion_id)).sort((left, right) => Number(left) - Number(right)),
  }));
const summary = {
  schemaVersion: "senado-votaciones-release-v1",
  generatedAt: snapshot.actualizado_en,
  sourceId: "votaciones_senado",
  officialSource: "Senado de la República · web-back.senado.cl (API votaciones y asistencia, legislatura 374)",
  requestedRange: { from, to },
  recordCount: sourceRows.length,
  periods,
  partitions: plan.catalog.partitions,
  assets: plan.assets.map(({ key, checksumSha256, size, releaseTag }) => ({ key, checksumSha256, size, releaseTag })),
  publication: {
    status: "staged_not_published",
    writesToCloudflare: false,
    requiresReview: ["IDs", "conteos por período", "checksums", "catálogo productivo", "rollback"],
  },
};

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const root = outputPath();
for (const item of plan.assets) {
  const target = resolve(root, item.key);
  if (!target.startsWith(`${root}${sep}`)) throw new Error(`INVALID_ASSET_KEY: ${item.key}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, item.data);
}
mkdirSync(root, { recursive: true });
writeFileSync(resolve(root, "release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ok: true,
  output: root,
  sourceId: summary.sourceId,
  recordCount: summary.recordCount,
  periods: summary.periods.map(({ period, recordCount }) => ({ period, recordCount })),
  assets: plan.assets.length,
}, null, 2));
