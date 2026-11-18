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
import { loadCanonicalExpenseBaseline } from "./etl/canonical-expense-baseline.mjs";
import { createR2ManifestClient } from "./etl/r2-conditional-manifest.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = argument("--bucket", "transparencia-public-data");
const force = process.argv.includes("--force");
const hydrateOnly = process.argv.includes("--hydrate-only");
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
  return { date, day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute), shouldRun: [2, 12, 22].includes(Number(parts.day)) };
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

function readRemoteManifest(work) {
  const manifestPath = join(work, "static-site-manifest.json");
  wrangler(["r2", "object", "get", `${bucket}/${staticManifestKey}`, "--file", manifestPath], "EXPENSE_REMOTE_MANIFEST");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error("EXPENSE_REMOTE_MANIFEST_INVALID");
  return manifest;
}

async function downloadExpenseSubsets(work, { targetRoot = root, sourceIds = Object.keys(expenseFiles) } = {}) {
  const manifest = readRemoteManifest(work);
  const client = process.env.GITHUB_ACTIONS === "true" ? await createR2ManifestClient({ accountId: runtimeEnvironment.CLOUDFLARE_ACCOUNT_ID, token: runtimeEnvironment.CLOUDFLARE_API_TOKEN }) : null;
  for (const sourceId of sourceIds) {
    const subset = await loadCanonicalExpenseBaseline(manifest, sourceId, async entry => {
      if (client) {
        const response = await client.fetch(client.url(bucket, entry.key), { headers: { "Accept-Encoding": "identity" } });
        if (!response.ok) throw new Error(`EXPENSE_BASELINE_READ_${response.status}`);
        return Buffer.from(await response.arrayBuffer());
      }
      const downloaded = join(work, `${sourceId}-${entry.period}.json`);
      wrangler(["r2", "object", "get", `${bucket}/${entry.key}`, "--file", downloaded], `EXPENSE_REMOTE_${sourceId}`);
      return readFileSync(downloaded);
    });
    const target = resolve(targetRoot, expenseFiles[sourceId]);
    mkdirSync(dirname(target), { recursive: true });
    const staged = `${target}.download`;
    writeFileSync(staged, JSON.stringify(subset) + "\n");
    renameSync(staged, target);
  }
  return manifest;
}

function loadDeputies() {
  const rosterPath = join(root, "data", "diputados-ids.json");
  if (!existsSync(rosterPath)) throw new Error("EXPENSE_LOCAL_ROSTER_MISSING:data/diputados-ids.json");
  const roster = JSON.parse(readFileSync(rosterPath, "utf8"));
  const diputados = Object.entries(roster).map(([id, nombre]) => ({ id, nombre: String(nombre) })).filter((item) => item.id && item.nombre);
  if (diputados.length < 100) throw new Error(`EXPENSE_LOCAL_ROSTER_TOO_SMALL:${diputados.length}`);
  return diputados;
}

export function camaraExpensePromotionDispatchArgs(checksum, sourceSha) {
  if (!/^[a-f0-9]{64}$/.test(checksum) || !/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error("EXPENSE_PROMOTION_REFERENCE_INVALID");
  return ["workflow", "run", "etl-expenses.yml", "--ref", "main", "-f", `camara_candidate_sha256=${checksum}`, "-f", `camara_source_sha=${sourceSha}`];
}

export function camaraIncrementalPeriods(now = new Date()) {
  const latest = latestEligibleCamaraPeriod(now.toISOString());
  const month = Number(latest.slice(5));
  return [...new Set([`${latest.slice(0, 4)}-${String(Math.max(1, month - 1)).padStart(2, "0")}`, latest])];
}

export function camaraExpenseCandidateScope(previous, fresh, deputies, declaredPeriods) {
  const years = new Set(fresh.map(row => row.periodo.slice(0, 4)));
  const periods = [...new Set([...fresh, ...(previous?.records ?? [])]
    .filter(row => years.has(row.periodo.slice(0, 4))).map(row => row.periodo))].sort();
  return { sourceId: "gastos_camara", complete: true, periods: declaredPeriods ?? periods, identities: deputies.map(deputy => String(deputy.id)) };
}

export function expenseLocalExecutionMode(args = process.argv.slice(2)) {
  const flags = new Set(["--force", "--hydrate-only", "--prepare-only", "--use-wrangler-session"]);
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
  if (prepareOnly && options.has("--hydrate-only")) throw new Error("EXPENSE_LOCAL_PREPARE_MODE_CONFLICT");
  if (!prepareOnly && options.has("--candidate-dir")) throw new Error("EXPENSE_LOCAL_PREPARE_MODE_REQUIRED");
  if (!prepareOnly && (options.has("--use-wrangler-session") || options.has("--periods"))) throw new Error("EXPENSE_LOCAL_PREPARE_MODE_REQUIRED");
  const periods = options.get("--periods")?.split(",");
  if (periods && (periods.some(period => !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) || new Set(periods).size !== periods.length)) throw new Error("EXPENSE_LOCAL_PERIODS_INVALID");
  return { prepareOnly, candidateDirectory: prepareOnly ? expenseCandidateDirectory(options.get("--candidate-dir")) : null, useWranglerSession: options.has("--use-wrangler-session"), periods };
}

function extractionSourceSha() {
  const git = args => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
    if (result.status !== 0) throw new Error("EXPENSE_LOCAL_SOURCE_NOT_VERIFIED");
    return result.stdout.trim();
  };
  if (git(["branch", "--show-current"]) !== "main") throw new Error("EXPENSE_LOCAL_CANONICAL_MAIN_REQUIRED");
  const paths = ["scripts/etl-expenses-local.mjs", "scripts/etl/connectors/camara-gastos.mjs", "scripts/expense-release.mjs", "scripts/etl/expense-candidate.mjs", "scripts/etl/canonical-expense-baseline.mjs", "lib/expense-record-contract.mjs", "data/diputados-ids.json"];
  if (git(["status", "--porcelain=v1", "--", ...paths])) throw new Error("EXPENSE_LOCAL_SOURCE_DIRTY");
  return git(["rev-parse", "HEAD"]);
}

async function forwardCamaraCandidate(plan, work, sourceSha) {
  const body = Buffer.from(JSON.stringify({ schemaVersion: 1, sourceId: "gastos_camara", sourceSha, candidate: plan.candidate, review: plan.review }) + "\n");
  const checksum = sha256(body);
  const key = `projections/staging/camara-expense-candidates/${checksum}.json`;
  await assertRemoteR2WriteBudget({ accountId: runtimeEnvironment.CLOUDFLARE_ACCOUNT_ID, token: runtimeEnvironment.CLOUDFLARE_API_TOKEN,
    buckets: configuredR2BudgetBuckets(bucket), puts: [{ bucket, key, size: body.length }] });
  const file = join(work, "promotion-envelope.json");
  writeFileSync(file, body);
  wrangler(["r2", "object", "put", `${bucket}/${key}`, "--file", file, "--content-type", "application/json"], "EXPENSE_STAGE");
  const readback = join(work, "promotion-readback.json");
  wrangler(["r2", "object", "get", `${bucket}/${key}`, "--file", readback], "EXPENSE_STAGE_VERIFY");
  if (sha256(readFileSync(readback)) !== checksum) throw new Error("EXPENSE_STAGE_CHECKSUM_MISMATCH");
  run("gh", camaraExpensePromotionDispatchArgs(checksum, sourceSha), "EXPENSE_PROMOTION_DISPATCH");
  console.log(JSON.stringify({ status: "promotion-dispatched", sourceSha, checksum, workflow: "etl-expenses.yml", automaticLocalPublication: false }));
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
  const sourceSha = !prepareOnly && !hydrateOnly ? extractionSourceSha() : null;

  const work = mkdtempSync(join(tmpdir(), "cambiometro-expenses-local-"));
  try {
    const dataRoot = hydrateOnly ? root : join(work, "baseline");
    const remoteManifest = await downloadExpenseSubsets(work, { targetRoot: dataRoot, sourceIds: hydrateOnly ? Object.keys(expenseFiles) : ["gastos_camara"] });
    if (hydrateOnly) {
      console.log(JSON.stringify({ status: "hydrated", files: Object.values(expenseFiles), remoteChecksum: remoteManifest.checksumSha256 }, null, 2));
      return;
    }

    const previous = readExpenseSubset(dataRoot, "gastos_camara");
    const deputies = loadDeputies();
    const periods = prepareOnly ? requestedPeriods ?? [latestEligibleCamaraPeriod(new Date().toISOString())] : camaraIncrementalPeriods();
    const fresh = await fetchGastosCamara({ diputados: deputies, periods, ...(prepareOnly ? { progressDir: join(work, "checkpoints") } : {}) });
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
    if (extractionSourceSha() !== sourceSha) throw new Error("EXPENSE_LOCAL_SOURCE_CHANGED_DURING_EXTRACTION");
    await forwardCamaraCandidate(plan, work, sourceSha);
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
