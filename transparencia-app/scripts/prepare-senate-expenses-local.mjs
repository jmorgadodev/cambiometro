import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildReleaseSet } from "./release-set.mjs";
import { sha256Buffer, resolveSafeStaticPath } from "./static-site-inputs.mjs";
import { readExpensePeriodArtifacts } from "./expense-release.mjs";
import { discoverSenatePublishedPeriods, fetchSenateOperationalExpenses } from "./etl/connectors/senado.mjs";
import { selectSenateExpensePeriods } from "./etl/expense-window.mjs";
import { prepareExpenseCandidate } from "./etl/expense-candidate.mjs";
import { expenseCandidateDirectory, writeExpenseCandidateArtifacts } from "./prepare-expense-candidate.mjs";

const root = resolve(import.meta.dirname, "..");

/** Reads published artifacts and the official API; has no publication path. */
export async function main(args = process.argv.slice(2)) {
  const options = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (options.has(key) || !["--manifest-file", "--candidate-dir", "--full-history"].includes(key)) throw new Error("SENATE_PREPARE_ARGUMENTS_INVALID");
    if (key === "--full-history") options.set(key, true);
    else {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error("SENATE_PREPARE_ARGUMENTS_INVALID");
      options.set(key, value);
    }
  }
  const output = expenseCandidateDirectory(options.get("--candidate-dir"));
  if (!options.get("--manifest-file")) throw new Error("SENATE_PREPARE_MANIFEST_REQUIRED");
  const manifest = JSON.parse(readFileSync(resolve(root, options.get("--manifest-file")), "utf8"));
  const release = buildReleaseSet(manifest);
  if (!release.domains.gastos) throw new Error("SENATE_PREPARE_PUBLISHED_EXPENSES_REQUIRED");
  for (const file of release.domains.gastos.files) {
    const bytes = readFileSync(resolveSafeStaticPath(root, file.path));
    if (bytes.byteLength !== file.size || sha256Buffer(bytes) !== file.checksumSha256) throw new Error(`SENATE_PREPARE_BASELINE_MISMATCH:${file.path}`);
  }
  // The subset may be deliberately older than the canonical monthly shards.
  const baseline = readExpensePeriodArtifacts(root)?.sources.find(source => source.sourceId === "gastos_senado")?.subset;
  if (!baseline) throw new Error("SENATE_PREPARE_MONTHLY_BASELINE_REQUIRED");
  const published = await discoverSenatePublishedPeriods();
  const periods = selectSenateExpensePeriods(published, { latest: published.at(-1), fullHistory: options.has("--full-history") });
  const observations = [];
  for (const period of periods) {
    const observed = await fetchSenateOperationalExpenses(period);
    observations.push(observed);
    console.log(JSON.stringify({ period: observed.period, records: observed.records.length }));
  }
  const incoming = observations.flatMap(month => month.records.map(row => ({
    id: `${row.period}-${row.id}`, nombre: row.person.name, periodo: row.period, fecha: row.fecha,
    item: row.title, monto_clp: row.monto_clp, url: row.url, fuente: row.fuente,
  })));
  const result = prepareExpenseCandidate({ baseline, incoming,
    scope: { sourceId: "gastos_senado", complete: true, periods: observations.map(month => month.period) } });
  result.review.sourceVerification = "official-api-pagination-validated";
  result.review.baselineReleaseSetId = release.releaseSetId;
  result.review.baselineManifestChecksumSha256 = manifest.checksumSha256;
  result.review.sourceReceipts = observations.map(month => ({ period: month.period, recordCount: month.records.length, original: month.original }));
  writeExpenseCandidateArtifacts(result, output);
  console.log(JSON.stringify({ status: result.review.status, automaticPublication: false, output, reasons: result.review.reasons }, null, 2));
  return result.review.status === "requires-review" ? 2 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
