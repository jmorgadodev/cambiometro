import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { shouldRefreshStaticRelease } from "../static-refresh-decision.mjs";
import { syncUptimeIncidents } from "../uptime-smoke.mjs";
import { SOURCE_BINDINGS } from "../build-source-registry.mjs";
import { assertRemoteR2WriteBudget } from "./r2-account-budget.mjs";

const DAY_HOURS = 24;
const NON_SCHEDULED_SOURCES = { ine: null, senado: null };
const API_SOURCE_ALIASES = { "transparencia-activa": "cplt", ley19862: "ley-19862" };
export const PUBLIC_API_SOURCE_IDS = ["camara", "chilecompra", "contraloria", "cplt", "dipres", "ine", "infolobby", "infoprobidad", "ley-19862", "senado", "servel", "sinim"];

function freshnessHoursForCron(cron) {
  if (!cron) return null;
  const fields = cron.split(" ");
  if (fields.length !== 5) throw new Error("UNSUPPORTED_CALENDAR_CRON");
  const [, , day, month, weekday] = fields;
  if (day === "*" && month === "*" && weekday === "*") return 36;
  if (day === "*" && month === "*" && weekday !== "*") return 9 * DAY_HOURS;
  if (day !== "*" && month === "*" && weekday === "*") return 45 * DAY_HOURS;
  if (day !== "*" && month !== "*" && weekday === "*") {
    return month.split(",").length === 4 ? 150 * DAY_HOURS : 240 * DAY_HOURS;
  }
  throw new Error("UNSUPPORTED_CALENDAR_CRON");
}

export function sourceFreshnessLimits(calendar, bindings = SOURCE_BINDINGS, allowedIds = PUBLIC_API_SOURCE_IDS) {
  const limits = { ...NON_SCHEDULED_SOURCES };
  for (const entry of calendar.entries ?? []) {
    const binding = bindings[entry.workflow];
    if (!binding) continue;
    const limit = freshnessHoursForCron(entry.cronUtc);
    for (const rawId of binding.ids ?? []) {
      const sourceId = API_SOURCE_ALIASES[rawId] ?? rawId;
      if (!allowedIds.includes(sourceId)) continue;
      const current = limits[sourceId];
      limits[sourceId] = current == null ? limit : limit == null ? current : Math.min(current, limit);
    }
  }
  return limits;
}

export function evaluateSourceFreshness(sources, { limits, now = new Date() } = {}) {
  if (!Array.isArray(sources) || !sources.length || !limits || !Number.isFinite(now.getTime())) {
    return { state: "failed_internal", isOk: false, sources: [], errorMsg: "SOURCE_METADATA_INVALID" };
  }
  const ids = new Set();
  const rows = [];
  for (const source of sources) {
    const id = String(source?.id ?? "");
    const count = Number(source?.recordCount);
    if (!id || ids.has(id) || !Number.isSafeInteger(count) || count < 0) {
      return { state: "failed_internal", isOk: false, sources: rows, errorMsg: "SOURCE_METADATA_INVALID" };
    }
    ids.add(id);
    if (!Object.hasOwn(limits, id)) {
      rows.push({ id, state: "unconfigured", lastUpdated: source.lastUpdated ?? null, recordCount: count });
      continue;
    }
    const limitHours = limits[id];
    const lastUpdated = source.lastUpdated ?? null;
    const updatedMillis = lastUpdated ? Date.parse(lastUpdated) : Number.NaN;
    const ageHours = Number.isFinite(updatedMillis) ? (now.getTime() - updatedMillis) / 3_600_000 : null;
    const state = limitHours == null ? "not_scheduled"
      : ageHours == null || ageHours < -1 ? "unknown"
        : ageHours > limitHours ? "stale" : "healthy";
    rows.push({ id, state, lastUpdated, lastUpdatedKind: source.lastUpdatedKind ?? "unknown",
      recordCount: count, checksumAvailable: /^[a-f0-9]{64}$/i.test(source.checksumSha256 ?? ""),
      ageHours: ageHours == null ? null : Math.round(Math.max(0, ageHours) * 10) / 10,
      freshnessLimitHours: limitHours });
  }
  const expected = Object.keys(limits).filter((id) => limits[id] != null);
  const missing = expected.filter((id) => !ids.has(id));
  if (missing.length) return { state: "failed_internal", isOk: false, sources: rows, missing, errorMsg: "SOURCE_METADATA_MISSING" };
  const bad = rows.some((row) => !["healthy", "not_scheduled"].includes(row.state));
  const state = rows.some((row) => row.state === "stale") ? "stale"
    : rows.some((row) => ["unknown", "unconfigured"].includes(row.state)) ? "unknown" : "healthy";
  return { state, isOk: !bad, sources: rows, missing: [] };
}

export async function checkPublishedApiHealth({ productionUrl = "https://cambiometro.impulsacv.cl", fetchImpl = fetch,
  limits, now = new Date() } = {}) {
  const base = productionUrl.replace(/\/$/, "");
  let httpStatus = 0;
  const read = async (path) => {
    const response = await fetchImpl(`${base}${path}`, { cache: "no-store", headers: { "User-Agent": "Cambiometro-SourceMonitor/1.0" }, signal: AbortSignal.timeout(15000) });
    httpStatus = response.status;
    if (!response.ok) throw new Error(`PUBLISHED_API_HTTP_${response.status}`);
    return response.json();
  };
  try {
    const sourcesPayload = await read("/api/v1/sources?r2Only=1");
    const healthPayload = await read("/api/v1/health");
    const sources = evaluateSourceFreshness(sourcesPayload?.data, { limits, now });
    const health = healthPayload?.data;
    const transferSource = health?.transferSource ?? null;
    const transferRows = Number(health?.transferRows);
    const transferAt = Date.parse(health?.generatedAt ?? "");
    const transfer = health?.ok === true && health?.publicDataBackend === "r2" && transferSource === "r2"
      && Number.isSafeInteger(transferRows) && transferRows > 0 && Number.isFinite(transferAt);
    const transferRow = sourcesPayload.data.find((source) => source.id === "ley-19862");
    const transferParity = transferRow && Number(transferRow.recordCount) === transferRows
      && transferRow.lastUpdated === health.generatedAt;
    const apiState = !transfer || !transferParity ? "failed_internal" : sources.state;
    return { apiState, httpStatus, isOk: apiState === "healthy" || apiState === "not_scheduled_only",
      sourceCount: sources.sources.length, sources, transferSource, transferRows,
      transferGeneratedAt: health?.generatedAt ?? null,
      errorMsg: !transfer ? "TRANSFER_API_RELEASE_INVALID" : !transferParity ? "TRANSFER_API_MANIFEST_MISMATCH" : sources.errorMsg ?? "" };
  } catch (error) {
    return { apiState: "failed_internal", httpStatus, isOk: false, sourceCount: 0,
      sources: { state: "failed_internal", isOk: false, sources: [], errorMsg: error.message },
      transferSource: null, transferRows: null, transferGeneratedAt: null, errorMsg: error.message };
  }
}

export async function checkR2Budget({ accountId, token, checkBudget = assertRemoteR2WriteBudget } = {}) {
  try {
    const budget = await checkBudget({ accountId, token });
    return { state: budget.blocked ? "blocked" : "healthy", isOk: !budget.blocked,
      currentBytes: budget.currentBytes, thresholdBytes: budget.thresholdBytes,
      currentRatio: budget.currentRatio, operationsBudget: budget.operationsBudget,
      method: "read-only-account-inventory; no analytics token" };
  } catch (error) {
    const blocked = String(error?.message ?? "").startsWith("R2_WRITE_BLOCKED_AT_95_PERCENT");
    return { state: blocked ? "blocked" : "failed_internal", isOk: false,
      errorMsg: String(error?.message ?? "R2_BUDGET_CHECK_FAILED"),
      method: "read-only-account-inventory; no analytics token" };
  }
}

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
  const report = { schemaVersion: 2, generatedAt: now.toISOString(), scope: "workflow-release-metadata-and-budget",
    graceMinutes, requests, sources };
  if (process.argv.includes("--release-check")) {
    report.staticRelease = await checkStaticReleaseConsistency({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN,
      productionUrl: process.env.PROD_URL || "https://cambiometro.impulsacv.cl",
    });
    if (!report.staticRelease.isOk) process.exitCode = 1;
  }
  if (process.argv.includes("--source-check")) {
    report.publishedApi = await checkPublishedApiHealth({
      productionUrl: process.env.API_URL || process.env.PROD_URL || "https://cambiometro.impulsacv.cl",
      limits: sourceFreshnessLimits(calendar), now,
    });
    if (!report.publishedApi.isOk) process.exitCode = 1;
  }
  if (process.argv.includes("--budget-check")) {
    report.r2Budget = await checkR2Budget({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      token: process.env.CLOUDFLARE_API_TOKEN,
    });
    if (!report.r2Budget.isOk) process.exitCode = 1;
  }
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex >= 0) {
    if (!process.argv[outputIndex + 1]) throw new Error("OUTPUT_REQUIRED");
    writeFileSync(process.argv[outputIndex + 1], `${JSON.stringify(report, null, 2)}\n`);
  }
  const summary = ["## Monitor operativo ETL y releases — no certifica cobertura", "",
    `Consultas GitHub: ${requests}. Gracia del calendario UTC: ${graceMinutes} minutos.`, "",
    "| Fuente | Estado de ejecución | Última ejecución |", "| --- | --- | --- |",
    ...sources.map((source) => `| ${source.name} | ${source.executionState} | ${source.lastExecutionAt ?? "no medida"} |`),
    "", ...(report.staticRelease ? [`Pin estático R2/Pages: ${report.staticRelease.state}; ${report.staticRelease.metadataReads} lecturas de metadatos.`] : []),
    ...(report.publishedApi ? ["", "### Releases publicados y frescura (API R2-only)", "",
      `API/transferencias: ${report.publishedApi.apiState}; fuente ${report.publishedApi.transferSource ?? "no verificada"}; ${report.publishedApi.transferRows ?? "sin conteo"} filas.`,
      "| Fuente | Estado de frescura | Último release verificable | Filas | SHA disponible |", "| --- | --- | --- | ---: | --- |",
      ...report.publishedApi.sources.sources.map((source) => `| ${source.id} | ${source.state} | ${source.lastUpdated ?? "desconocido"} | ${source.recordCount ?? "—"} | ${source.checksumAvailable ? "sí" : "no"} |`)] : []),
    ...(report.r2Budget ? ["", "### Presupuesto de almacenamiento R2", "",
      `Estado: ${report.r2Budget.state}; uso: ${report.r2Budget.currentBytes ?? "no medido"} bytes (${report.r2Budget.currentRatio == null ? "no medido" : `${(report.r2Budget.currentRatio * 100).toFixed(2)} %`}); umbral de bloqueo: ${report.r2Budget.thresholdBytes ?? "10 GB × 95 %"}.`,
      `Estimación de esta comprobación: ${report.r2Budget.operationsBudget?.estimatedClassA ?? "no disponible"} operaciones A / ${report.r2Budget.operationsBudget?.estimatedClassB ?? "no disponible"} B. Total mensual de operaciones: revisión manual en Cloudflare; sin Analytics.`] : []),
    "No ejecuta ETL, no escribe R2 y nunca consulta D1. ‘Fresco’ describe la fecha del release publicado, no cobertura completa ni disponibilidad del origen.", ""].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  console.log(summary);
  if (process.argv.includes("--sync-incidents")) {
    const incidents = [];
    if (report.staticRelease) incidents.push({ ...report.staticRelease, durationMs: 0, rayId: "not applicable" });
    if (report.publishedApi) incidents.push({ path: "/api/v1/sources", url: `${process.env.API_URL || process.env.PROD_URL || "https://cambiometro.impulsacv.cl"}/api/v1/sources?r2Only=1`,
      status: report.publishedApi.httpStatus, durationMs: 0, rayId: "not applicable", isOk: report.publishedApi.isOk,
      errorMsg: report.publishedApi.errorMsg || report.publishedApi.sources.sources.filter((source) => !["healthy", "not_scheduled"].includes(source.state)).map((source) => `${source.id}:${source.state}`).join(", ") });
    if (report.r2Budget) incidents.push({ path: "/r2/storage-budget", url: "Cloudflare R2 account inventory", status: report.r2Budget.isOk ? 200 : 507,
      durationMs: 0, rayId: "not applicable", isOk: report.r2Budget.isOk, errorMsg: report.r2Budget.errorMsg ?? `R2 budget ${report.r2Budget.state}` });
    const actions = syncUptimeIncidents(incidents);
    console.log(JSON.stringify({ event: "source_monitor_incidents_synced", actions: actions.length }));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
