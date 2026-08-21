#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = ["V1", "V2", "V3", "V4", "V5", "V6", "V7"];
const DEFAULT_REPORTS = ["01-parlamentarios.json", "02-agregados.json", "03-entidades.json"];

export function evaluatePipelineReports(reports) {
  const findings = reports.flatMap((report) => Array.isArray(report?.findings) ? report.findings : []);
  const covered = REQUIRED.filter((validation) => findings.some((finding) => finding.validation === validation));
  const missing = REQUIRED.filter((validation) => !covered.includes(validation));
  const criticalFindings = findings.filter((finding) => finding.status === "CRITICA" || finding.severity === "CRITICA");
  return {
    ok: missing.length === 0 && criticalFindings.length === 0,
    findings: findings.length,
    covered,
    missing,
    critical: criticalFindings.length,
    criticalIds: criticalFindings.map((finding) => String(finding.id ?? "SIN_ID")).sort(),
  };
}

async function main(argv = process.argv.slice(2)) {
  const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const docs = resolve(root, "docs", "auditoria");
  const paths = argv.length ? argv.map((path) => resolve(path)) : DEFAULT_REPORTS.map((name) => resolve(docs, name));
  const reports = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, "utf8"))));
  const result = evaluatePipelineReports(reports);
  const { criticalIds, ...summary } = result;
  console.log(JSON.stringify({ guard: "V1-V7", reports: paths, ...summary, critical_ids_sample: criticalIds.slice(0, 25) }, null, 2));
  if (!result.ok) process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}
