/**
 * ETL diario de Movimientos de Autoridades.
 *
 * El catálogo histórico vive en data/movimientos.json; este proceso no
 * inventa registros cuando una fuente responde parcialmente. Consulta las
 * fuentes oficiales, guarda su salud y publica un snapshot idempotente sólo
 * cuando al menos una fuente oficial pudo ser leída.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildMovementPayload,
  collectMovementSources,
  MOVIMIENTOS_SOURCES,
  validateMovementPayload,
} from "./movimientos-pipeline.mjs";

const root = resolve(import.meta.dirname, "..");
const inputPath = resolve(root, process.env.MOVIMIENTOS_INPUT ?? "data/movimientos.json");
const outputPath = resolve(root, process.env.MOVIMIENTOS_OUTPUT ?? "data/movimientos.json");
const reportPath = resolve(root, process.env.MOVIMIENTOS_RUN_REPORT ?? "data/generated/movimientos-run.json");
const now = new Date().toISOString();

function configuredSources() {
  const raw = process.env.MOVIMIENTOS_PROVISIONAL_SOURCES?.trim();
  if (!raw) return MOVIMIENTOS_SOURCES;
  const provisional = raw.split(",").map((url) => url.trim()).filter(Boolean).map((url, index) => ({
    id: `provisional-${index + 1}`,
    label: `Fuente provisional ${index + 1}`,
    tier: "provisional",
    url,
  }));
  return [...MOVIMIENTOS_SOURCES, ...provisional];
}

function writeReport(report) {
  return mkdir(resolve(reportPath, ".."), { recursive: true })
    .then(() => writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"));
}

async function main() {
  if (!existsSync(inputPath)) throw new Error(`MOVIMIENTOS_INPUT_MISSING:${inputPath}`);
  const previous = JSON.parse(await readFile(inputPath, "utf8"));
  const collected = await collectMovementSources({ sources: configuredSources(), retries: Number(process.env.MOVIMIENTOS_SOURCE_RETRIES ?? 2) });
  const report = {
    pipeline: "etl_movimientos_autoridades",
    attemptedAt: now,
    sources: collected.results,
    signals: collected.signals.length,
    published: false,
  };

  if (collected.allOfficialBlocked || !collected.hasOfficialSource) {
    report.reason = "ALL_OFFICIAL_SOURCES_BLOCKED";
    await writeReport(report);
    throw new Error("MOVIMIENTOS_ALL_OFFICIAL_SOURCES_BLOCKED");
  }

  const payload = validateMovementPayload(buildMovementPayload(previous, {
    now,
    sourceResults: collected.results,
    signals: collected.signals,
  }));
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  report.published = true;
  report.total = payload.movimientos.length;
  report.checksum_sha256 = payload.checksum_sha256;
  await writeReport(report);
  console.log(JSON.stringify({
    ok: true,
    total: payload.movimientos.length,
    signals: collected.signals.length,
    checksum_sha256: payload.checksum_sha256,
    sourceHealth: collected.results.map(({ id, ok, status, error }) => ({ id, ok, status, error })),
  }, null, 2));
}

main().catch(async (error) => {
  console.error(`❌ ETL Movimientos detenido: ${error.message}`);
  process.exitCode = 1;
});
