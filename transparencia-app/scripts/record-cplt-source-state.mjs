import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\0/g, "").replace(/'/g, "''")}'`;
}

const database = argument("--database", "transparencia-db");
const manifestPath = resolve(argument("--manifest", "data/lake-cplt/projections/funcionarios-v1/manifest.json"));
const remote = process.argv.includes("--remote");
const allowLocalAuth = process.argv.includes("--local-auth") && !process.env.CI;
if (database !== "transparencia-db") throw new Error(`CPLT_D1_NOT_AUTHORIZED: ${database}`);
if (remote && !allowLocalAuth) requireCloudflareDataCredentials();

const manifestBuffer = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBuffer.toString("utf8"));
if (!Number.isSafeInteger(manifest.recordCount) || manifest.recordCount < 1) throw new Error("CPLT_STATE_INVALID_RECORD_COUNT");
if (!Array.isArray(manifest.coverage) || manifest.coverage.length !== 346) throw new Error("CPLT_STATE_INVALID_COVERAGE");
if (!Array.isArray(manifest.sources) || manifest.sources.length !== 4) throw new Error("CPLT_STATE_INVALID_SOURCES");

const manifestChecksum = createHash("sha256").update(manifestBuffer).digest("hex");
const runId = process.env.ETL_RUN_ID?.trim() || `cplt-${manifest.version}`;
const cadence = process.env.ETL_CADENCE?.trim() || "monthly";
const status = "archive_only";
const statement = `INSERT OR REPLACE INTO etl_runs
(id,cadence,status,started_at,finished_at,catalog_version,catalog_checksum,source_count,record_count,error)
VALUES (${sql(runId)},${sql(cadence)},'success',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,${sql(manifest.version)},${sql(manifestChecksum)},1,${manifest.recordCount},NULL);
INSERT OR REPLACE INTO source_state
(source_id,etl_run_id,status,record_count,checksum_sha256,generated_at,last_success_at,error,published_version,updated_at)
VALUES ('transparencia-activa',${sql(runId)},${sql(status)},${manifest.recordCount},${sql(manifestChecksum)},${sql(manifest.generatedAt)},CURRENT_TIMESTAMP,NULL,${sql(manifest.version)},CURRENT_TIMESTAMP);
`;

const work = mkdtempSync(join(tmpdir(), "cambiometro-cplt-state-"));
try {
  const filePath = join(work, "state.sql");
  writeFileSync(filePath, statement, "utf8");
  const result = spawnSync(process.execPath, [
    resolve("node_modules/wrangler/bin/wrangler.js"), "d1", "execute", database,
    remote ? "--remote" : "--local", "--file", filePath,
  ], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`CPLT_STATE_D1_FAILED: ${result.status}`);
  console.log(JSON.stringify({ database, sourceId: "transparencia-activa", status, records: manifest.recordCount, version: manifest.version }));
} finally {
  rmSync(work, { recursive: true, force: true });
}
