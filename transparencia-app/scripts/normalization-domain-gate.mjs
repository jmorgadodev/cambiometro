import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const NORMALIZATION_DOMAIN_CHECKS = Object.freeze([
  { id: "movimientos", script: "scripts/verify-movimientos-normalization.mjs" },
  { id: "camara-senado", script: "scripts/verify-legislative-normalization.mjs" },
  { id: "remuneraciones-historial", script: "scripts/verify-remuneraciones-history.mjs" },
  { id: "remuneraciones-unificadas", script: "scripts/verify-remuneraciones-unified.mjs" },
  { id: "entradas-estaticas", script: "scripts/verify-static-input-quality.mjs" },
  { id: "municipalidades-fallback", script: "scripts/verify-static-input-fallback.mjs" },
]);

const root = resolve(import.meta.dirname, "..");

function parseJsonOutput(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { output: text.slice(-500) };
  }
}

function compactReport(id, report) {
  if (!report || typeof report !== "object") return report;
  if (id === "movimientos") {
    return {
      records: report.records,
      verified: report.verified,
      pending: report.pending,
      releaseId: report.releaseId,
      checksum: report.checksum,
    };
  }
  if (id === "camara-senado") {
    return { records: report.totals?.records, categories: report.totals?.categories };
  }
  if (id === "remuneraciones-historial") {
    return { current: report.current?.comparison, historyEntries: report.history?.entries, policy: report.policy };
  }
  if (id === "remuneraciones-unificadas") {
    return {
      totalRows: report.totalRows,
      source38BisRows: report.source38BisRows,
      source38BisPeriods: report.source38BisPeriods?.length,
      sofiaPumpinPeriods: report.sofiaPumpinPeriods,
    };
  }
  if (id === "entradas-estaticas") return { files: report.files };
  if (id === "municipalidades-fallback") return { detailCount: report.detailCount, listCount: report.listCount, uniqueIds: report.uniqueIds };
  return report;
}

export function summarizeDomainResults(results) {
  const failed = results.filter((result) => result.status === "failed");
  const skipped = results.filter((result) => result.status === "skipped");
  return {
    status: failed.length > 0 ? "blocked" : skipped.length > 0 ? "partial" : "ok",
    checks: results.map(({ id, script, status, exitCode, report }) => ({ id, script, status, exitCode, report: compactReport(id, report) })),
    failed: failed.map((result) => result.id),
    skipped: skipped.map((result) => result.id),
    publicD1Reads: 0,
    publicR2Writes: 0,
    note: "Compuerta local de normalización; no publica ni materializa datos.",
  };
}

export function runNormalizationDomainChecks({
  checks = NORMALIZATION_DOMAIN_CHECKS,
  spawn = spawnSync,
  allowMissingArtifacts = process.argv.includes("--allow-missing-artifacts") || process.env.ALLOW_MISSING_NORMALIZATION_ARTIFACTS === "1",
} = {}) {
  const results = [];
  for (const check of checks) {
    const child = spawn(process.execPath, [resolve(root, check.script)], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env },
    });
    const exitCode = child.status ?? 1;
    const stderr = String(child.stderr ?? "").trim().slice(-500) || null;
    const missingArtifact = /ENOENT|no such file or directory|FILE_NOT_FOUND/i.test(stderr ?? "");
    results.push({
      id: check.id,
      script: check.script,
      status: exitCode === 0 ? "ok" : allowMissingArtifacts && missingArtifact ? "skipped" : "failed",
      exitCode,
      report: parseJsonOutput(child.stdout),
      stderr,
    });
  }
  return summarizeDomainResults(results);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runNormalizationDomainChecks();
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "blocked") process.exitCode = 2;
}
