/**
 * Runner local para la extracción WebForms de gastos operacionales de Cámara.
 *
 * Cámara bloquea con frecuencia las IP efímeras de GitHub Actions. Este
 * proceso se ejecuta en un equipo persistente, descarga el último release
 * válido desde R2, reanuda el progreso del conector, valida el universo y
 * publica únicamente el subconjunto completo. No escribe datasets en Git.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { readExpenseSubset } from "./expense-release.mjs";
import { fetchGastosCamara } from "./etl/connectors/camara-gastos.mjs";
import { prepareExpenseCandidate, planCamaraExpensePublication } from "./etl/expense-candidate.mjs";
import { expenseCandidateDirectory, writeExpenseCandidateArtifacts } from "./prepare-expense-candidate.mjs";
import { latestEligibleCamaraPeriod } from "./etl/expense-window.mjs";
import { selectCamaraAdvisoriesCredentials } from "./etl/camara-local-auth.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = argument("--bucket", "transparencia-public-data");
const force = process.argv.includes("--force");
const hydrateOnly = process.argv.includes("--hydrate-only");
const triggerPages = process.argv.includes("--trigger-pages");
const staticManifestKey = "projections/static-site-v1/manifest.json";
const expenseFiles = {
  gastos_camara: "data/lake-subsets/gastos-camara.subset.json",
  gastos_senado: "data/lake-subsets/gastos-senado.subset.json",
};
let runtimeEnvironment = process.env;

export function expenseRuntimeEnvironment(environment, session, { hydrateOnly = false } = {}) {
  if (environment.GITHUB_ACTIONS === "true" && hydrateOnly && environment.CLOUDFLARE_API_TOKEN?.trim()) return { ...environment };
  const credentials = selectCamaraAdvisoriesCredentials(environment, session);
  return { ...environment, CLOUDFLARE_API_TOKEN: credentials.token };
}

function resolveRuntimeEnvironment(useWranglerSession) {
  if (process.env.GITHUB_ACTIONS === "true" && hydrateOnly) return expenseRuntimeEnvironment(process.env, null, { hydrateOnly: true });
  if (!useWranglerSession && process.env.CLOUDFLARE_DATA_API_TOKEN?.trim()) return expenseRuntimeEnvironment(process.env, null);
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_API_KEY;
  delete env.CLOUDFLARE_EMAIL;
  const session = spawnSync(process.execPath, [resolve(root, "node_modules/wrangler/bin/wrangler.js"), "auth", "token", "--json"], { cwd: root, env, encoding: "utf8", windowsHide: true });
  if (session.error || session.status !== 0) throw new Error("EXPENSE_LOCAL_REAUTH_REQUIRED");
  let parsed;
  try { parsed = JSON.parse(session.stdout); } catch { throw new Error("EXPENSE_LOCAL_REAUTH_REQUIRED"); }
  return expenseRuntimeEnvironment({ ...process.env, ...(useWranglerSession ? { CLOUDFLARE_DATA_API_TOKEN: "" } : {}) }, parsed);
}

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

export function chileExpenseSchedule(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute), shouldRun: Number(parts.day) === 2 };
}

export function mergeExpenseRecords(previous = [], incoming = []) {
  const merged = new Map();
  for (const record of [...previous, ...incoming]) {
    if (record?.id) merged.set(String(record.id), record);
  }
  return [...merged.values()];
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function run(binary, args, label, env = runtimeEnvironment) {
  const result = spawnSync(binary, args, { cwd: root, encoding: "utf8", stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`${label}_FAILED:${result.status ?? result.error?.message ?? "unknown"}`);
  return result;
}

function wrangler(args, label = "WRANGLER") {
  const bin = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
  return run(process.execPath, [bin, ...args, "--remote"], label);
}

function npm(args, label) {
  const npmCli = resolveNpmCliPath({
    localNpmCli: resolve(root, "node_modules", "npm", "bin", "npm-cli.js"),
    npmExecPath: process.env.npm_execpath,
  });
  if (!npmCli) throw new Error("EXPENSE_LOCAL_NPM_CLI_NOT_FOUND: ejecuta el ETL mediante npm run");
  return run(process.execPath, [npmCli, ...args], label);
}

export function resolveNpmCliPath({ localNpmCli, npmExecPath, isFile = existsSync } = {}) {
  return [localNpmCli, npmExecPath].find((candidate) => candidate && isFile(candidate)) ?? null;
}

function readRemoteManifest(work) {
  const manifestPath = join(work, "static-site-manifest.json");
  wrangler(["r2", "object", "get", `${bucket}/${staticManifestKey}`, "--file", manifestPath], "EXPENSE_REMOTE_MANIFEST");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error("EXPENSE_REMOTE_MANIFEST_INVALID");
  return manifest;
}

function downloadExpenseSubsets(work, { targetRoot = root } = {}) {
  const manifest = readRemoteManifest(work);
  for (const [sourceId, relativePath] of Object.entries(expenseFiles)) {
    const entry = manifest.files.find((item) => item.path === relativePath);
    if (!entry) throw new Error(`EXPENSE_REMOTE_SUBSET_MISSING:${sourceId}`);
    const downloaded = join(work, `${sourceId}.subset.json`);
    wrangler(["r2", "object", "get", `${bucket}/${entry.key}`, "--file", downloaded], `EXPENSE_REMOTE_${sourceId}`);
    const data = readFileSync(downloaded);
    if (data.byteLength !== entry.size || sha256(data) !== entry.checksumSha256) {
      throw new Error(`EXPENSE_REMOTE_CHECKSUM_MISMATCH:${sourceId}`);
    }
    const target = resolve(targetRoot, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    const staged = `${target}.download`;
    writeFileSync(staged, data);
    renameSync(staged, target);
  }
  return manifest;
}

function writeSubset(sourceId, subset) {
  const target = resolve(root, expenseFiles[sourceId]);
  mkdirSync(dirname(target), { recursive: true });
  const staged = `${target}.next`;
  writeFileSync(staged, `${JSON.stringify(subset)}\n`, "utf8");
  renameSync(staged, target);
}

function loadDeputies() {
  const rosterPath = join(root, "data", "diputados-ids.json");
  if (!existsSync(rosterPath)) throw new Error("EXPENSE_LOCAL_ROSTER_MISSING:data/diputados-ids.json");
  const roster = JSON.parse(readFileSync(rosterPath, "utf8"));
  const diputados = Object.entries(roster).map(([id, nombre]) => ({ id, nombre: String(nombre) })).filter((item) => item.id && item.nombre);
  if (diputados.length < 100) throw new Error(`EXPENSE_LOCAL_ROSTER_TOO_SMALL:${diputados.length}`);
  return diputados;
}

export function pagesRefreshWorkflowDispatchArgs() {
  return [
    "workflow",
    "run",
    "Pages estático - refresco automático verificable",
    "--ref",
    "main",
    "-f",
    "deployment_mode=data-refresh",
    "-f",
    "confirm_data_refresh=CAMBIOMETRO_DATA_REFRESH",
    "-f",
    "publish_pages=true",
    "-f",
    "confirm_cutover=CAMBIOMETRO_CONFIRM_CUTOVER",
  ];
}

export function camaraExpenseCandidateScope(previous, fresh, deputies, declaredPeriods) {
  const years = new Set(fresh.map(row => row.periodo.slice(0, 4)));
  const periods = [...new Set([...fresh, ...(previous?.records ?? [])]
    .filter(row => years.has(row.periodo.slice(0, 4))).map(row => row.periodo))].sort();
  return { sourceId: "gastos_camara", complete: true, periods: declaredPeriods ?? periods, identities: deputies.map(deputy => String(deputy.id)) };
}

export function expenseLocalExecutionMode(args = process.argv.slice(2)) {
  const flags = new Set(["--force", "--hydrate-only", "--trigger-pages", "--prepare-only", "--use-wrangler-session"]);
  const values = new Set(["--bucket", "--candidate-dir", "--periods"]);
  const options = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (options.has(name) || (!flags.has(name) && !values.has(name))) throw new Error("EXPENSE_LOCAL_ARGUMENTS_INVALID");
    if (flags.has(name)) options.set(name, true);
    else {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error("EXPENSE_LOCAL_ARGUMENTS_INVALID");
      options.set(name, value);
    }
  }
  const prepareOnly = options.has("--prepare-only");
  if (prepareOnly && (options.has("--trigger-pages") || options.has("--hydrate-only"))) throw new Error("EXPENSE_LOCAL_PREPARE_MODE_CONFLICT");
  if (!prepareOnly && options.has("--candidate-dir")) throw new Error("EXPENSE_LOCAL_PREPARE_MODE_REQUIRED");
  if (!prepareOnly && (options.has("--use-wrangler-session") || options.has("--periods"))) throw new Error("EXPENSE_LOCAL_PREPARE_MODE_REQUIRED");
  const periods = options.get("--periods")?.split(",");
  if (periods && (periods.some(period => !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) || new Set(periods).size !== periods.length)) throw new Error("EXPENSE_LOCAL_PERIODS_INVALID");
  return { prepareOnly, candidateDirectory: prepareOnly ? expenseCandidateDirectory(options.get("--candidate-dir")) : null, useWranglerSession: options.has("--use-wrangler-session"), periods };
}

function triggerPagesRefresh() {
  run("gh", pagesRefreshWorkflowDispatchArgs(), "PAGES_REFRESH");
}

export async function main() {
  const { prepareOnly, candidateDirectory, useWranglerSession, periods: requestedPeriods } = expenseLocalExecutionMode();
  if (process.env.GITHUB_ACTIONS === "true" && !hydrateOnly) throw new Error("EXPENSE_LOCAL_GITHUB_FORBIDDEN: Cámara debe ejecutarse fuera de GitHub Actions");
  const schedule = chileExpenseSchedule();
  if (!force && !prepareOnly && !schedule.shouldRun) {
    console.log(JSON.stringify({ status: "skipped", reason: "not-expense-day", chileDate: schedule.date }, null, 2));
    return;
  }
  if (!process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
    throw new Error("EXPENSE_LOCAL_MISSING_CLOUDFLARE_CREDENTIALS");
  }
  runtimeEnvironment = resolveRuntimeEnvironment(useWranglerSession);

  const work = mkdtempSync(join(tmpdir(), "cambiometro-expenses-local-"));
  try {
    const dataRoot = prepareOnly ? join(work, "baseline") : root;
    const remoteManifest = downloadExpenseSubsets(work, { targetRoot: dataRoot });
    if (hydrateOnly) {
      console.log(JSON.stringify({ status: "hydrated", files: Object.values(expenseFiles), remoteChecksum: remoteManifest.checksumSha256 }, null, 2));
      return;
    }

    const previous = readExpenseSubset(dataRoot, "gastos_camara");
    const deputies = loadDeputies();
    const periods = prepareOnly ? requestedPeriods ?? [latestEligibleCamaraPeriod(new Date().toISOString())] : undefined;
    const fresh = await fetchGastosCamara({ diputados: deputies, ...(prepareOnly ? { progressDir: join(work, "checkpoints"), periods } : {}) });
    if (!fresh.length) throw new Error("EXPENSE_LOCAL_EMPTY_EXTRACTION");
    console.log(`[etl-expenses-local] extracción Cámara recibida: ${fresh.length} registros`);
    if (prepareOnly) {
      const result = prepareExpenseCandidate({ baseline: previous, incoming: fresh, scope: camaraExpenseCandidateScope(previous, fresh, deputies, periods) });
      result.review.baselineManifestChecksumSha256 = remoteManifest.checksumSha256;
      const output = writeExpenseCandidateArtifacts(result, candidateDirectory);
      console.log(JSON.stringify({ status: result.review.status, automaticPublication: false, output, reasons: result.review.reasons }, null, 2));
      if (result.review.status === "requires-review") process.exitCode = 2;
      return;
    }
    const plan = planCamaraExpensePublication({ baseline: previous, incoming: fresh });
    if (!plan.shouldPublish) {
      const output = writeExpenseCandidateArtifacts(plan, resolve(root, "artifacts", "expense-candidates", `camara-auto-review-${Date.now()}`));
      console.log(JSON.stringify({ status: plan.review.status, automaticPublication: false, output, excludedPeriods: plan.review.excludedPeriods, reasons: plan.review.reasons }, null, 2));
      if (plan.review.status === "requires-review") process.exitCode = 2;
      return;
    }
    const subset = plan.candidate;
    if (previous && subset.recordCount < previous.recordCount) throw new Error(`EXPENSE_LOCAL_RECORDS_DECREASED:${previous.recordCount}->${subset.recordCount}`);
    if (subset.recordCount === 0) throw new Error("EXPENSE_LOCAL_EMPTY");
    console.log(`[etl-expenses-local] subset validado en memoria: ${subset.recordCount} registros (${subset.checksumSha256})`);
    writeSubset("gastos_camara", subset);

    console.log("[etl-expenses-local] verificando release antes de publicar");
    run(process.execPath, ["scripts/verify-expense-release.mjs", "--required"], "EXPENSE_VERIFY");
    console.log("[etl-expenses-local] publicando grupo estático gastos en R2");
    npm(["run", "data:publish:static", "--", "--groups", "gastos"], "EXPENSE_STATIC_PUBLISH");

    const verifyWork = mkdtempSync(join(tmpdir(), "cambiometro-expenses-verify-"));
    try {
      console.log("[etl-expenses-local] comprobando checksum publicado en R2");
      downloadExpenseSubsets(verifyWork);
      const published = readExpenseSubset(root, "gastos_camara");
      if (published?.checksumSha256 !== subset.checksumSha256) throw new Error("EXPENSE_LOCAL_PUBLISHED_CHECKSUM_MISMATCH:gastos_camara");
    } finally {
      rmSync(verifyWork, { recursive: true, force: true });
    }

    if (triggerPages) triggerPagesRefresh();
    console.log(JSON.stringify({ status: "published", source: "gastos_camara", records: subset.recordCount, checksumSha256: subset.checksumSha256, pagesRefreshTriggered: triggerPages }, null, 2));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error("[etl-expenses-local] error fatal:", error);
    process.exit(1);
  });
}
