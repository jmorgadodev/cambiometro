import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";
import { assertCanonicalTransferRelease } from "./etl/transfer-release-guard.mjs";

const root = resolve(import.meta.dirname, "..");
const database = argument("--database", "transparencia-db");
const source = resolve(argument("--source", join(root, "data", "lake", "partitions", "ley-19862")));
const dryRun = process.argv.includes("--dry-run");
const batchSize = Number(argument("--batch-size", "500"));
if (!Number.isSafeInteger(batchSize) || batchSize < 50 || batchSize > 1000) throw new Error("TRANSFER_D1_INVALID_BATCH_SIZE");

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("\0", "").replaceAll("'", "''")}'`;
}

function runWrangler(args, allowFailure = false) {
  const bin = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
  try {
    return execFileSync(process.execPath, [bin, "--config", "wrangler.d1.jsonc", ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: allowFailure ? "pipe" : "inherit",
    });
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function executeSql(work, text, label) {
  if (dryRun) return;
  const file = join(work, `${label}.sql`);
  writeFileSync(file, `${text}\n`, "utf8");
  runWrangler(["d1", "execute", database, "--remote", "--file", file]);
}

function releaseRows(staging, manifest) {
  const rows = [];
  for (const page of manifest.pages) {
    const filename = page.path.split("/").pop();
    const pageRows = JSON.parse(readFileSync(join(staging, filename), "utf8"));
    if (!Array.isArray(pageRows) || pageRows.length !== page.count) throw new Error(`TRANSFER_D1_PAGE_INVALID:${page.page}`);
    rows.push(...pageRows);
  }
  if (rows.length !== manifest.totalRows) throw new Error(`TRANSFER_D1_ROW_COUNT_INVALID:${rows.length}:${manifest.totalRows}`);
  return rows;
}

const work = mkdtempSync(join(tmpdir(), "cambiometro-transfer-d1-"));
const staging = join(work, "release");
try {
  if (!existsSync(source)) throw new Error(`TRANSFER_D1_SOURCE_MISSING:${source}`);
  const release = await buildTransferenciasStatic({ source, output: staging });
  if (!release) throw new Error("TRANSFER_D1_RELEASE_EMPTY");
  const { manifest } = release;
  assertCanonicalTransferRelease({ totalRows: manifest.totalRows, totalMontoClp: manifest.expected.totalMontoClp });
  const rows = releaseRows(staging, manifest);
  const releaseChecksum = createHash("sha256").update(rows.map((row) => JSON.stringify(row)).join("\n")).digest("hex");
  if (releaseChecksum !== manifest.checksumSha256) throw new Error("TRANSFER_D1_RELEASE_CHECKSUM_INVALID");

  if (!dryRun) runWrangler(["d1", "migrations", "apply", database, "--remote"]);
  executeSql(work, "DELETE FROM transferencias_19862;", "clear");
  for (let offset = 0, batch = 0; offset < rows.length; offset += batchSize, batch += 1) {
    const values = rows.slice(offset, offset + batchSize).map((row) => `(${[row.id, row.fecha, row.period, row.emitter_name, row.emitter_rut, row.receiver_name, row.receiver_rut, row.title, row.monto_clp, row.url, row.classification, row.municipality].map(sql).join(",")})`).join(",\n");
    executeSql(work, `INSERT INTO transferencias_19862 (id,fecha,periodo,emisor_nombre,emisor_rut,receptor_nombre,receptor_rut,materia,monto_clp,url_registro,clasificacion,comuna) VALUES\n${values}\nON CONFLICT(id) DO UPDATE SET fecha=excluded.fecha, periodo=excluded.periodo, emisor_nombre=excluded.emisor_nombre, emisor_rut=excluded.emisor_rut, receptor_nombre=excluded.receptor_nombre, receptor_rut=excluded.receptor_rut, materia=excluded.materia, monto_clp=excluded.monto_clp, url_registro=excluded.url_registro, clasificacion=excluded.clasificacion, comuna=excluded.comuna;`, `batch-${String(batch).padStart(4, "0")}`);
  }
  executeSql(work, `INSERT INTO transferencias_19862_release (singleton,checksum_sha256,total_rows,total_monto_clp,generated_at) VALUES (1,${sql(manifest.checksumSha256)},${manifest.totalRows},${manifest.expected.totalMontoClp},${sql(manifest.generatedAt)}) ON CONFLICT(singleton) DO UPDATE SET checksum_sha256=excluded.checksum_sha256,total_rows=excluded.total_rows,total_monto_clp=excluded.total_monto_clp,generated_at=excluded.generated_at;`, "release");
  console.log(JSON.stringify({ status: dryRun ? "validated" : "materialized", database, totalRows: manifest.totalRows, totalMontoClp: manifest.expected.totalMontoClp, checksumSha256: manifest.checksumSha256, batchSize }, null, 2));
} finally {
  rmSync(work, { recursive: true, force: true });
}
