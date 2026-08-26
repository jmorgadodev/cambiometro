import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";
import { assertMinimumTransferRows } from "./etl/transfer-release-guard.mjs";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";

const root = resolve(import.meta.dirname, "..");
const source = resolve(process.env.LEY19862_SOURCE_ROOT ?? join(root, "data", "lake", "partitions", "ley-19862"));
const database = argument("--database", "transparencia-db");
const isRemote = process.argv.includes("--remote");
const dryRun = process.argv.includes("--dry-run");
const runId = process.env.ETL_RUN_ID?.trim() || `transfer-${Date.now()}`;
const wranglerBin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
const wranglerConfig = resolve(root, "wrangler.d1.jsonc");
const work = mkdtempSync(join(root, ".tmp-transfer-d1-"));
const stageBatchSize = 500;

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/\0/g, "").replaceAll("'", "''")}'`;
}

function command(args, allowFailure = false) {
  const result = spawnSync(process.execPath, [wranglerBin, "--config", wranglerConfig, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: allowFailure ? "pipe" : "inherit",
  });
  if (!allowFailure && result.status !== 0) throw new Error(`D1_COMMAND_FAILED:${args.join(" ")}`);
  return result;
}

function executeSql(text, label) {
  if (dryRun) return;
  const file = join(work, `${label}.sql`);
  writeFileSync(file, `${text.trim()}\n`, "utf8");
  command(["d1", "execute", database, isRemote ? "--remote" : "--local", "--file", file]);
}

function queryRows(sqlText) {
  if (dryRun) return [];
  const result = command(["d1", "execute", database, isRemote ? "--remote" : "--local", "--command", sqlText, "--json"], true);
  if (result.status !== 0) throw new Error("D1_QUERY_FAILED");
  return JSON.parse(result.stdout)?.[0]?.results ?? [];
}

function transferRowValues(row) {
  const amount = Number(row.monto_clp);
  if (!row?.id || !Number.isSafeInteger(amount) || amount < 0 || !row.url) throw new Error(`D1_TRANSFER_ROW_INVALID:${row?.id ?? "missing"}`);
  return [
    row.id,
    row.folio ?? null,
    row.fecha ?? null,
    row.period ?? null,
    row.emitter_name ?? null,
    row.emitter_rut ?? null,
    row.receiver_name ?? null,
    row.receiver_rut ?? null,
    row.title ?? null,
    amount,
    row.url,
    row.classification ?? null,
    row.municipality ?? null,
  ];
}

export function buildTransferStageSql(rows, run = runId) {
  return rows.map((row) => {
    const values = [run, ...transferRowValues(row)];
    return `INSERT OR REPLACE INTO stage_transferencias_19862 (run_id,id,folio,fecha,periodo,emisor_nombre,emisor_rut,receptor_nombre,receptor_rut,materia,monto_clp,url_registro,clasificacion,comuna) VALUES (${values.map(sql).join(",")});`;
  }).join("\n");
}

export function releaseParity({ rows, manifest }) {
  const totalMontoClp = rows.reduce((sum, row) => sum + Number(row.monto_clp), 0);
  return {
    totalRows: rows.length,
    totalMontoClp,
    rowsMatch: rows.length === manifest.totalRows,
    amountMatches: totalMontoClp === manifest.expected?.totalMontoClp,
  };
}

async function main() {
  if (isRemote && !dryRun) requireCloudflareDataCredentials();
  if (!existsSync(source)) throw new Error(`D1_TRANSFER_SOURCE_MISSING:${source}`);
  const staging = mkdtempSync(join(work, "release-"));
  try {
    const release = await buildTransferenciasStatic({ source, output: staging });
    if (!release) throw new Error("D1_TRANSFER_RELEASE_EMPTY");
    assertMinimumTransferRows(release.manifest.totalRows);
    const pages = readdirSync(staging).filter((file) => /^p-\d{4}\.json$/.test(file)).sort();
    const rows = pages.flatMap((file) => JSON.parse(readFileSync(join(staging, file), "utf8")));
    const parity = releaseParity({ rows, manifest: release.manifest });
    if (!parity.rowsMatch || !parity.amountMatches) throw new Error(`D1_TRANSFER_RELEASE_PARITY_FAILED:${JSON.stringify(parity)}`);
    if (dryRun) {
      console.log(JSON.stringify({ action: "validated", runId, ...parity, checksumSha256: release.manifest.checksumSha256 }, null, 2));
      return;
    }
    command(["d1", "migrations", "apply", database, isRemote ? "--remote" : "--local"]);
    executeSql(`DELETE FROM stage_transferencias_19862 WHERE run_id=${sql(runId)};`, "clear-stage");
    for (let offset = 0, chunk = 0; offset < rows.length; offset += stageBatchSize, chunk += 1) {
      executeSql(buildTransferStageSql(rows.slice(offset, offset + stageBatchSize)), `stage-${String(chunk).padStart(4, "0")}`);
    }
    const count = Number(queryRows(`SELECT COUNT(*) AS total FROM stage_transferencias_19862 WHERE run_id=${sql(runId)};`)[0]?.total ?? 0);
    if (count !== rows.length) throw new Error(`D1_TRANSFER_STAGE_COUNT_FAILED:${count}/${rows.length}`);
    const checksum = release.manifest.checksumSha256;
    const amount = release.manifest.expected.totalMontoClp;
    executeSql(`DELETE FROM transferencias_19862;
INSERT INTO transferencias_19862 (id,folio,fecha,periodo,emisor_nombre,emisor_rut,receptor_nombre,receptor_rut,materia,monto_clp,url_registro,clasificacion,comuna)
SELECT id,folio,fecha,periodo,emisor_nombre,emisor_rut,receptor_nombre,receptor_rut,materia,monto_clp,url_registro,clasificacion,comuna FROM stage_transferencias_19862 WHERE run_id=${sql(runId)};
DELETE FROM stage_transferencias_19862 WHERE run_id=${sql(runId)};
INSERT OR REPLACE INTO transferencias_19862_release (singleton,checksum_sha256,total_rows,total_monto_clp,generated_at,updated_at) VALUES (1,${sql(checksum)},${rows.length},${amount},${sql(release.manifest.generatedAt)},CURRENT_TIMESTAMP);`, "publish");
    console.log(JSON.stringify({ action: "materialized", database, runId, ...parity, checksumSha256: checksum }, null, 2));
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error("[materialize-transferencias-d1]", error);
    process.exitCode = 1;
  }).finally(() => rmSync(work, { recursive: true, force: true }));
}
