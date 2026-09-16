/**
 * Prepara sólo la partición de asistencia Cámara de un período.
 *
 * Consulta la fuente oficial y genera artefactos locales. No escribe R2, D1,
 * Pages ni el snapshot ETL principal. La publicación se hace con el workflow
 * de reparación aislada después de validar conteos y checksum.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fetchCamaraAttendance } from "./connectors/camara-attendance.mjs";
import { buildLakePlan } from "./lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const year = Number(argument("--year") ?? "2026");
const period = String(argument("--period") ?? `${year}-09`);
const outputArgument = argument("--output");
const output = resolve(outputArgument ?? "");
if (!Number.isInteger(year) || year < 1990 || year > 2100) throw new Error("CAMARA_INVALID_YEAR");
if (!/^\d{4}-\d{2}$/.test(period) || Number(period.slice(0, 4)) !== year) throw new Error("CAMARA_INVALID_PERIOD");
if (!outputArgument) throw new Error("CAMARA_OUTPUT_REQUIRED");

const result = await fetchCamaraAttendance({ year, concurrency: 8 });
const rows = result.records.filter((row) => row.period === period).map((row) => ({ ...row, source_period: period }));
if (rows.length === 0) throw new Error(`CAMARA_ATTENDANCE_EMPTY:${period}`);
const ids = new Set(rows.map((row) => row.id));
if (ids.size !== rows.length) throw new Error(`CAMARA_ATTENDANCE_DUPLICATE_IDS:${period}`);

const snapshot = {
  generado_por: "prepare-camara-attendance-release.mjs",
  actualizado_en: new Date().toISOString(),
  fuentes: { asistencia_camara: rows },
};
const plan = buildLakePlan(snapshot);
const prefix = `partitions/camara/asistencia_camara/${year}/${period.slice(5)}/`;
const assets = plan.assets
  .filter((asset) => asset.key.startsWith(prefix))
  .map(({ key, checksumSha256, size, releaseTag, releaseAssetName }) => ({ key, checksumSha256, size, releaseTag, releaseAssetName }));
const partitions = plan.catalog.partitions.filter((partition) => partition.id === `camara/asistencia_camara/${year}/${period.slice(5)}`);
if (partitions.length !== 1 || assets.length < 3) throw new Error(`CAMARA_ATTENDANCE_PLAN_INVALID:${partitions.length}:${assets.length}`);

const summary = {
  schemaVersion: "camara-attendance-release-v1",
  generatedAt: snapshot.actualizado_en,
  sourceId: "camara",
  variant: "asistencia_camara",
  period,
  recordCount: rows.length,
  officialSource: "Cámara de Diputadas y Diputados · WSSala",
  periods: [{ period, recordCount: rows.length }],
  partitions,
  assets,
  publication: { status: "staged_not_published", writesToCloudflare: false },
};

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

for (const item of plan.assets.filter((asset) => asset.key.startsWith(prefix))) {
  const target = resolve(output, item.key);
  if (!target.startsWith(`${output}${sep}`)) throw new Error(`INVALID_ASSET_KEY:${item.key}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, item.data);
}
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, output, period, records: rows.length, assets: assets.length, checksum: partitions[0].checksumSha256 }, null, 2));
