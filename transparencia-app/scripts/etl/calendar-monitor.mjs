import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { shouldRefreshStaticRelease } from "../static-refresh-decision.mjs";
import { syncUptimeIncidents } from "../uptime-smoke.mjs";

export function latestCalendarSlot(cron, now = new Date(), graceMinutes = 180) {
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(graceMinutes) || graceMinutes < 0 || graceMinutes > 1440) {
    throw new Error("INVALID_CALENDAR_CLOCK");
  }
  const fields = cron.split(" ");
  if (fields.length !== 5 || !/^\d+$/.test(fields[0]) || !/^\d+$/.test(fields[1])
    || fields.slice(2).some((field) => !/^(\*|\d+(,\d+)*)$/.test(field))
    || (fields[2] !== "*" && fields[4] !== "*")) throw new Error("UNSUPPORTED_CALENDAR_CRON");
  const [minute, hour] = fields.slice(0, 2).map(Number);
  const ranges = [[1, 31], [1, 12], [0, 6]];
  if (minute > 59 || hour > 23 || fields.slice(2).some((field, index) => field !== "*"
    && field.split(",").some((value) => Number(value) < ranges[index][0] || Number(value) > ranges[index][1]))) {
    throw new Error("UNSUPPORTED_CALENDAR_CRON");
  }
  const deadline = now.getTime() - graceMinutes * 60000;
  const day = new Date(deadline);
  day.setUTCHours(hour, minute, 0, 0);
  const matches = (field, value) => field === "*" || field.split(",").map(Number).includes(value);
  for (let offset = 0; offset < 370; offset += 1) {
    if (day.getTime() <= deadline && matches(fields[2], day.getUTCDate())
      && matches(fields[3], day.getUTCMonth() + 1) && matches(fields[4], day.getUTCDay())) return day.toISOString();
    day.setUTCDate(day.getUTCDate() - 1);
  }
  throw new Error("CALENDAR_SLOT_NOT_FOUND");
}

export function classifyCalendarExecution(entry, runs, now = new Date(), graceMinutes = 180) {
  const expectedAt = entry.cronUtc ? latestCalendarSlot(entry.cronUtc, now, graceMinutes) : null;
  const executions = runs.filter((run) => ["schedule", "workflow_dispatch"].includes(run.event))
    .sort((a, b) => Date.parse(b.run_started_at ?? b.created_at) - Date.parse(a.run_started_at ?? a.created_at));
  const latest = executions[0];
  let executionState = "manual";
  if (expectedAt) {
    executionState = !latest || !Number.isFinite(Date.parse(latest.run_started_at ?? latest.created_at))
      || Date.parse(latest.run_started_at ?? latest.created_at) < Date.parse(expectedAt) ? "missed"
      : latest.status !== "completed" ? "pending" : latest.conclusion === "success" ? "on_schedule" : "failed";
  }
  return { workflow: entry.workflow, name: entry.name, cronUtc: entry.cronUtc, expectedAt,
    executionState, lastRunId: latest?.id ?? null, lastConclusion: latest?.conclusion ?? null,
    lastExecutionAt: latest?.run_started_at ?? latest?.created_at ?? null,
    evidenceUrl: latest?.html_url ?? null, scope: "workflow-execution-only" };
}

export async function checkStaticReleaseConsistency({ accountId, token, productionUrl = "https://cambiometro.impulsacv.cl", fetchImpl = fetch } = {}) {
  let metadataReads = 0;
  const result = { scope: "static-release-consistency", path: "/data/release-set.json",
    url: `${productionUrl}/data/release-set.json`, rayId: "not applicable" };
  try {
    const changed = await shouldRefreshStaticRelease({ accountId, token, productionUrl,
      fetchImpl: (...args) => { metadataReads += 1; return fetchImpl(...args); } });
    return { ...result, state: changed ? "stale" : "healthy", isOk: !changed,
      status: 200, metadataReads, errorMsg: changed ? "STATIC_RELEASE_DIVERGENCE" : "" };
  } catch (error) {
    return { ...result, state: "failed_internal", isOk: false, status: 0,
      metadataReads, errorMsg: error.message };
  }
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) throw new Error("GITHUB_REPOSITORY_REQUIRED");
  const calendar = JSON.parse(readFileSync(new URL("../../../.github/etl-calendar.json", import.meta.url), "utf8"));
  const now = new Date();
  const graceMinutes = Number(process.env.ETL_MONITOR_GRACE_MINUTES ?? 180);
  let requests = 0;
  const sources = calendar.entries.map((entry) => {
    try {
      const runs = (entry.cronUtc ? ["schedule", "workflow_dispatch"] : ["workflow_dispatch"]).flatMap((event) => {
        requests += 1;
        const route = `repos/${repository}/actions/workflows/${encodeURIComponent(entry.workflow)}/runs?event=${event}&per_page=20`;
        const response = JSON.parse(execFileSync("gh", ["api", route], { encoding: "utf8", timeout: 15000 }));
        if (!Array.isArray(response.workflow_runs)) throw new Error("WORKFLOW_RUNS_INVALID");
        return response.workflow_runs;
      });
      return classifyCalendarExecution(entry, runs, now, graceMinutes);
    } catch {
      return { workflow: entry.workflow, name: entry.name, executionState: "unknown", scope: "workflow-execution-only" };
    }
  });
  sources.push({ workflow: null, name: "Votaciones Senado", executionState: "paused_local_only", scope: "workflow-execution-only" });
  const report = { schemaVersion: 1, generatedAt: now.toISOString(), scope: "workflow-execution-only",
    graceMinutes, requests, sources };
  if (process.argv.includes("--release-check")) {
    report.staticRelease = await checkStaticReleaseConsistency({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN,
      productionUrl: process.env.PROD_URL || "https://cambiometro.impulsacv.cl",
    });
    if (!report.staticRelease.isOk) process.exitCode = 1;
  }
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex >= 0) {
    if (!process.argv[outputIndex + 1]) throw new Error("OUTPUT_REQUIRED");
    writeFileSync(process.argv[outputIndex + 1], `${JSON.stringify(report, null, 2)}\n`);
  }
  const summary = ["## Calendario ETL — ejecuciones, no cobertura de datos", "",
    `Consultas GitHub: ${requests}. Gracia del calendario UTC: ${graceMinutes} minutos.`, "",
    "| Fuente | Estado de ejecución | Última ejecución |", "| --- | --- | --- |",
    ...sources.map((source) => `| ${source.name} | ${source.executionState} | ${source.lastExecutionAt ?? "no medida"} |`),
    "", ...(report.staticRelease ? [`Pin estático R2/Pages: ${report.staticRelease.state}; ${report.staticRelease.metadataReads} lecturas de metadatos.`] : []),
    "No verifica cobertura, frescura del origen, contenido del candidato, manifiestos externos ni costes. No ejecuta ETL.", ""].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  if (report.staticRelease && process.argv.includes("--sync-incidents")) syncUptimeIncidents([report.staticRelease]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
