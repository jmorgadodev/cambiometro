import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { splitPersonalApoyoJson, validatePersonalApoyoDataset } from "./etl/personal-apoyo-publication.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/\0/g, "").replace(/'/g, "''")}'`;
}

const database = argument("--database", "transparencia-db");
const bucket = argument("--bucket", "transparencia-public-data");
const input = resolve(argument("--input", "data/personal-apoyo.json"));
const remote = process.argv.includes("--remote");
const localAuth = process.argv.includes("--local-auth") && !process.env.CI;
if (database !== "transparencia-db") throw new Error(`PERSONAL_APOYO_D1_NOT_AUTHORIZED: ${database}`);
if (bucket !== "transparencia-public-data") throw new Error(`PERSONAL_APOYO_R2_NOT_AUTHORIZED: ${bucket}`);
if (remote && !localAuth) requireCloudflareDataCredentials();

const buffer = readFileSync(input);
const dataset = JSON.parse(buffer.toString("utf8"));
const summary = validatePersonalApoyoDataset(dataset);
const checksum = createHash("sha256").update(buffer).digest("hex");
const version = String(dataset.generado_en).replace(/[:.]/g, "-");
const manifest = Buffer.from(`${JSON.stringify({
  schemaVersion: "1.0.0",
  sourceId: "personal-apoyo",
  generatedAt: dataset.generado_en,
  version,
  checksumSha256: checksum,
  ...summary,
}, null, 2)}\n`);
const work = mkdtempSync(join(tmpdir(), "cambiometro-personal-apoyo-"));

function wrangler(args) {
  const result = spawnSync(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), ...args], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`PERSONAL_APOYO_WRANGLER_FAILED: ${result.status}`);
}

try {
  const manifestPath = join(work, "manifest.json");
  writeFileSync(manifestPath, manifest);
  if (remote) {
    wrangler(["r2", "object", "put", `${bucket}/projections/personal-apoyo-v1/versions/${version}/personal-apoyo.json`, "--file", input, "--remote"]);
    wrangler(["r2", "object", "put", `${bucket}/projections/personal-apoyo-v1/versions/${version}/manifest.json`, "--file", manifestPath, "--remote"]);
    wrangler(["r2", "object", "put", `${bucket}/projections/personal-apoyo-v1/personal-apoyo.json`, "--file", input, "--remote"]);
  }

  const chunks = splitPersonalApoyoJson(buffer.toString("utf8"));
  const runId = process.env.ETL_RUN_ID?.trim() || `personal-apoyo-${version}`;
  const statements = [
    "DELETE FROM kv_cache WHERE key='personal-apoyo.json' OR key LIKE 'personal-apoyo.json-part%';",
    ...chunks.map((chunk, index) => `INSERT INTO kv_cache (key,value_json,updated_at) VALUES (${sql(`personal-apoyo.json-part${String(index).padStart(4, "0")}`)},${sql(chunk)},CURRENT_TIMESTAMP);`),
    `INSERT OR REPLACE INTO sources (id,label,organization,official_url,license,expected_coverage,created_at,updated_at) VALUES ('personal-apoyo','Personal de apoyo parlamentario','Congreso Nacional','https://www.camara.cl/diputados/detalle/personaldepoyo.aspx','Datos públicos oficiales','Personal de apoyo y asesorías publicado por Cámara y Senado',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`,
    `INSERT OR REPLACE INTO etl_runs (id,cadence,status,started_at,finished_at,catalog_version,catalog_checksum,source_count,record_count,error) VALUES (${sql(runId)},'weekly','success',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,${sql(version)},${sql(checksum)},1,${summary.recordCount},NULL);`,
    `INSERT OR REPLACE INTO source_state (source_id,etl_run_id,status,record_count,checksum_sha256,generated_at,last_success_at,error,published_version,updated_at) VALUES ('personal-apoyo',${sql(runId)},'partial',${summary.recordCount},${sql(checksum)},${sql(dataset.generado_en)},CURRENT_TIMESTAMP,NULL,${sql(version)},CURRENT_TIMESTAMP);`,
  ];
  const sqlPath = join(work, "personal-apoyo.sql");
  writeFileSync(sqlPath, `${statements.join("\n")}\n`, "utf8");
  wrangler(["d1", "execute", database, remote ? "--remote" : "--local", "--file", sqlPath]);
  if (remote) {
    // El manifiesto corriente es el puntero de activacion y siempre se publica al final.
    try {
      wrangler(["r2", "object", "put", `${bucket}/projections/personal-apoyo-v1/manifest.json`, "--file", manifestPath, "--remote"]);
    } catch (error) {
      const failurePath = join(work, "personal-apoyo-failed.sql");
      writeFileSync(failurePath, [
        `UPDATE etl_runs SET status='failed',finished_at=CURRENT_TIMESTAMP,error='PERSONAL_APOYO_MANIFEST_ACTIVATION_FAILED' WHERE id=${sql(runId)};`,
        "UPDATE source_state SET status='error',error='PERSONAL_APOYO_MANIFEST_ACTIVATION_FAILED',updated_at=CURRENT_TIMESTAMP WHERE source_id='personal-apoyo';",
      ].join("\n"), "utf8");
      wrangler(["d1", "execute", database, "--remote", "--file", failurePath]);
      throw error;
    }
  }
  console.log(JSON.stringify({ database, bucket: remote ? bucket : null, version, checksumSha256: checksum, chunks: chunks.length, ...summary }, null, 2));
} finally {
  rmSync(work, { recursive: true, force: true });
}
