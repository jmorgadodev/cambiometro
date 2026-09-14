import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function countComparisonRows(file) {
  const comparison = readJson(file);
  return {
    entradas: Array.isArray(comparison.entradas) ? comparison.entradas.length : -1,
    salidas_observadas: Array.isArray(comparison.salidas_observadas) ? comparison.salidas_observadas.length : -1,
    cambios: Array.isArray(comparison.cambios) ? comparison.cambios.length : -1,
    invalidChanges: Array.isArray(comparison.cambios)
      ? comparison.cambios.filter((row) => row.bruto_anterior === null || row.bruto_actual === null).length
      : -1,
  };
}

function compareCounts(expected, actual, label, errors) {
  for (const key of ["entradas", "salidas_observadas", "cambios"]) {
    if (expected[key] !== actual[key]) errors.push(`${label}.${key}: contador ${expected[key]} != detalle ${actual[key]}`);
  }
}

/**
 * Verifica únicamente artefactos públicos ya construidos. No ejecuta ETL,
 * no descarga R2 y no abre D1; su objetivo es impedir publicar tablas
 * comparativas con contadores o historiales incompletos.
 */
export function auditRemuneracionesArtifacts({ root = process.cwd() } = {}) {
  const publicRoot = path.join(root, "public", "data", "remuneraciones-38bis");
  const manifest = readJson(path.join(publicRoot, "manifest.json"));
  const errors = [];
  const periodReports = [];

  for (const period of manifest.periodos ?? []) {
    const periodManifest = readJson(path.join(publicRoot, period.manifest_key));
    const comparisonPath = path.join(publicRoot, period.comparison_key);
    const actual = countComparisonRows(comparisonPath);
    compareCounts(period.comparison ?? {}, actual, `${period.mes}.comparison`, errors);
    if (actual.invalidChanges > 0) errors.push(`${period.mes}.cambios: ${actual.invalidChanges} filas no tienen ambos montos publicados`);
    if (periodManifest.mes !== period.mes) errors.push(`${period.mes}.manifest: período inconsistente`);
    periodReports.push({ mes: period.mes, expected: period.comparison, actual });
  }

  const currentComparisonPath = path.join(publicRoot, manifest.comparison_key);
  const currentActual = countComparisonRows(currentComparisonPath);
  compareCounts(manifest.comparison ?? {}, currentActual, "manifest.comparison", errors);
  if (currentActual.invalidChanges > 0) errors.push(`manifest.cambios: ${currentActual.invalidChanges} filas no tienen ambos montos publicados`);

  const historyPath = path.join(publicRoot, manifest.history_base_path, "index.json");
  const history = readJson(historyPath);
  const historyEntries = Object.values(history).filter((rows) => Array.isArray(rows));
  for (const [hash, rows] of Object.entries(history)) {
    if (!Array.isArray(rows)) {
      errors.push(`history.${hash}: entrada no es una lista`);
      continue;
    }
    const months = rows.map((row) => row.mes);
    const sorted = [...months].sort();
    if (months.some((month, index) => month !== sorted[index])) errors.push(`history.${hash}: meses fuera de orden`);
  }

  return {
    ok: errors.length === 0,
    errors,
    current: {
      comparison: {
        periodo: manifest.mes,
        anterior: manifest.comparison?.periodo_anterior ?? null,
        entradas: currentActual.entradas,
        salidas_observadas: currentActual.salidas_observadas,
        cambios: currentActual.cambios,
      },
      periods: periodReports,
    },
    history: { path: path.relative(root, historyPath), entries: historyEntries.length },
    policy: { d1Reads: 0, d1Writes: 0 },
  };
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const report = auditRemuneracionesArtifacts();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}
