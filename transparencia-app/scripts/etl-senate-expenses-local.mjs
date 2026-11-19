import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expenseRuntimeEnvironment, chileExpenseSchedule } from "./etl-expenses-local.mjs";
import { loadCanonicalExpenseBaseline } from "./etl/canonical-expense-baseline.mjs";
import { discoverSenatePublishedPeriods, fetchSenateOperationalExpenses } from "./etl/connectors/senado.mjs";
import { selectSenateExpensePeriods } from "./etl/expense-window.mjs";
import { prepareExpenseCandidate } from "./etl/expense-candidate.mjs";
import { writeExpenseCandidateArtifacts } from "./prepare-expense-candidate.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";
import { sha256Buffer } from "./static-site-inputs.mjs";

const root = resolve(import.meta.dirname, "..");
function git(...args) { return execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim(); }
function run(args, env, capture = false) {
  const result = spawnSync(process.execPath, [resolve(root, "node_modules/wrangler/bin/wrangler.js"), ...args], { cwd: root, env, encoding: "utf8", ...(capture ? {} : { stdio: "inherit" }), windowsHide: true });
  if (result.status !== 0) throw new Error("SENATE_LOCAL_WRANGLER_FAILED");
  return result.stdout;
}
export async function main() {
  if (process.env.GITHUB_ACTIONS === "true") throw new Error("SENATE_LOCAL_GITHUB_FORBIDDEN");
  if (!process.argv.includes("--force") && !chileExpenseSchedule().shouldRun) { console.log(JSON.stringify({ status: "skipped", reason: "not-expense-day" })); return; }
  if (git("branch", "--show-current") !== "main" || git("status", "--porcelain", "--", "scripts", "lib/expense-record-contract.mjs", "data/diputados-ids.json")) throw new Error("SENATE_LOCAL_CLEAN_MAIN_REQUIRED");
  const sourceSha = git("rev-parse", "HEAD");
  const authEnv = { ...process.env }; delete authEnv.CLOUDFLARE_API_TOKEN; delete authEnv.CLOUDFLARE_API_KEY; delete authEnv.CLOUDFLARE_EMAIL;
  const session = process.env.CLOUDFLARE_DATA_API_TOKEN?.trim() ? null : JSON.parse(run(["auth", "token", "--json"], authEnv, true));
  const env = expenseRuntimeEnvironment(process.env, session);
  const bucket = "transparencia-public-data";
  async function read(key) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${bucket}/objects/${key}`, { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`SENATE_LOCAL_R2_READ_${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  const manifest = JSON.parse(await read("projections/static-site-v1/manifest.json"));
  const baseline = await loadCanonicalExpenseBaseline(manifest, "gastos_senado", file => read(file.key));
  const published = await discoverSenatePublishedPeriods();
  const periods = selectSenateExpensePeriods(published, { latest: published.at(-1), fullHistory: process.argv.includes("--full-history") });
  const observations = [];
  for (const period of periods) {
    const observed = await fetchSenateOperationalExpenses(period); observations.push(observed);
    console.log(JSON.stringify({ period: observed.period, records: observed.records.length }));
  }
  const incoming = observations.flatMap(month => month.records.map(row => ({ id: `${row.period}-${row.id}`, nombre: row.person.name, periodo: row.period, fecha: row.fecha, item: row.title, monto_clp: row.monto_clp, url: row.url, fuente: row.fuente })));
  const result = prepareExpenseCandidate({ baseline, incoming, scope: { sourceId: "gastos_senado", complete: true, periods: observations.map(m => m.period) } });
  result.review.sourceVerification = "official-api-pagination-validated";
  result.review.baselineManifestChecksumSha256 = manifest.checksumSha256;
  result.review.sourceReceipts = observations.map(m => ({ period: m.period, records: m.records.length, original: m.original }));
  const directory = resolve(root, "artifacts/expense-candidates", `senado-auto-${Date.now()}`);
  writeExpenseCandidateArtifacts(result, directory);
  const envelope = { schemaVersion: 1, sourceId: "gastos_senado", sourceSha, ...result };
  const bytes = Buffer.from(JSON.stringify(envelope) + "\n");
  const checksum = sha256Buffer(bytes);
  const file = resolve(directory, "envelope.json"); writeFileSync(file, bytes);
  if (result.review.status === "requires-review") { console.log(JSON.stringify({ status: "requires-review", output: directory, reasons: result.review.reasons })); process.exitCode = 2; return; }
  if (JSON.stringify(baseline.records) === JSON.stringify(result.candidate.records)) { console.log(JSON.stringify({ status: "unchanged", output: directory })); return; }
  if (git("rev-parse", "HEAD") !== sourceSha) throw new Error("SENATE_LOCAL_SOURCE_CHANGED");
  const key = `projections/staging/expense-candidates/${checksum}.json`;
  await assertRemoteR2WriteBudget({ accountId: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN, buckets: configuredR2BudgetBuckets(bucket), puts: [{ bucket, key, size: bytes.length }] });
  run(["r2", "object", "put", `${bucket}/${key}`, "--file", file, "--content-type", "application/json", "--remote"], env);
  if (sha256Buffer(await read(key)) !== checksum) throw new Error("SENATE_LOCAL_STAGING_MISMATCH");
  execFileSync("gh", ["workflow", "run", "etl-expenses.yml", "--ref", "main", "-f", `expense_candidate_sha256=${checksum}`, "-f", `expense_source_sha=${sourceSha}`], { cwd: root, stdio: "inherit", windowsHide: true });
  console.log(JSON.stringify({ status: "promotion-dispatched", sourceSha, candidateSha256: checksum, output: directory }));
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
