import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { buildTransferenciasStatic } from "./build-transferencias-static.mjs";
import { assertCanonicalTransferRelease } from "./etl/transfer-release-guard.mjs";

const root = resolve(import.meta.dirname, "..");
const database = argument("--database", "transparencia-db");
const wranglerConfig = resolve(root, argument("--config", "wrangler.d1.jsonc"));
const source = resolve(
  argument("--source", join(root, "data", "lake", "partitions", "ley-19862")),
);
const dryRun = process.argv.includes("--dry-run");
const batchSize = Number(argument("--batch-size", "500"));
if (!Number.isSafeInteger(batchSize) || batchSize < 50 || batchSize > 1000)
  throw new Error("TRANSFER_D1_INVALID_BATCH_SIZE");

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("\0", "").replaceAll("'", "''")}'`;
}

function runWrangler(args, allowFailure = false) {
  const bin = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
  try {
    return execFileSync(
      process.execPath,
      [bin, "--config", wranglerConfig, ...args],
      {
        cwd: root,
        encoding: "utf8",
        stdio: allowFailure ? "pipe" : "inherit",
      },
    );
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
    if (!Array.isArray(pageRows) || pageRows.length !== page.count)
      throw new Error(`TRANSFER_D1_PAGE_INVALID:${page.page}`);
    rows.push(...pageRows);
  }
  if (rows.length !== manifest.totalRows)
    throw new Error(
      `TRANSFER_D1_ROW_COUNT_INVALID:${rows.length}:${manifest.totalRows}`,
    );
  return rows;
}

const work = mkdtempSync(join(tmpdir(), "cambiometro-transfer-d1-"));
const staging = join(work, "release");
try {
  if (!existsSync(source))
    throw new Error(`TRANSFER_D1_SOURCE_MISSING:${source}`);
  const release = await buildTransferenciasStatic({ source, output: staging });
  if (!release) throw new Error("TRANSFER_D1_RELEASE_EMPTY");
  const { manifest } = release;
  assertCanonicalTransferRelease({
    totalRows: manifest.totalRows,
    totalMontoClp: manifest.expected.totalMontoClp,
  });
  const rows = releaseRows(staging, manifest);
  const releaseChecksum = createHash("sha256")
    .update(rows.map((row) => JSON.stringify(row)).join("\n"))
    .digest("hex");
  if (releaseChecksum !== manifest.checksumSha256)
    throw new Error("TRANSFER_D1_RELEASE_CHECKSUM_INVALID");

  if (!dryRun) runWrangler(["d1", "migrations", "apply", database, "--remote"]);
  // Build the next release in isolation. The current table stays readable
  // until the validated stage is swapped in, so a failed batch never exposes
  // a partial release and the API can safely fall back to R2.
  executeSql(
    work,
    `
DROP TABLE IF EXISTS transferencias_19862_stage;
CREATE TABLE transferencias_19862_stage (
  id TEXT PRIMARY KEY,
  fecha TEXT,
  periodo TEXT,
  emisor_nombre TEXT,
  emisor_rut TEXT,
  receptor_nombre TEXT,
  receptor_rut TEXT,
  materia TEXT,
  monto_clp INTEGER NOT NULL CHECK (monto_clp >= 0),
  url_registro TEXT NOT NULL,
  clasificacion TEXT,
  comuna TEXT
);
`,
    "prepare-stage",
  );
  for (
    let offset = 0, batch = 0;
    offset < rows.length;
    offset += batchSize, batch += 1
  ) {
    const values = rows
      .slice(offset, offset + batchSize)
      .map(
        (row) =>
          `(${[row.id, row.fecha, row.period, row.emitter_name, row.emitter_rut, row.receiver_name, row.receiver_rut, row.title, row.monto_clp, row.url, row.classification, row.municipality].map(sql).join(",")})`,
      )
      .join(",\n");
    executeSql(
      work,
      `INSERT INTO transferencias_19862_stage (id,fecha,periodo,emisor_nombre,emisor_rut,receptor_nombre,receptor_rut,materia,monto_clp,url_registro,clasificacion,comuna) VALUES\n${values};`,
      `batch-${String(batch).padStart(4, "0")}`,
    );
  }
  executeSql(
    work,
    `
CREATE INDEX idx_transferencias_19862_stage_fecha ON transferencias_19862_stage(fecha DESC);
CREATE INDEX idx_transferencias_19862_stage_periodo ON transferencias_19862_stage(periodo);
CREATE INDEX idx_transferencias_19862_stage_emisor ON transferencias_19862_stage(emisor_nombre);
CREATE INDEX idx_transferencias_19862_stage_receptor ON transferencias_19862_stage(receptor_nombre);
CREATE INDEX idx_transferencias_19862_stage_monto ON transferencias_19862_stage(monto_clp DESC);
CREATE INDEX idx_transferencias_19862_stage_search ON transferencias_19862_stage(emisor_nombre, receptor_nombre, materia, comuna);
`,
    "stage-indexes",
  );
  // D1 executes a SQL file in auto-commit mode. The release marker is written
  // last; until that marker matches the R2 checksum, the Worker deliberately
  // serves the canonical R2 release even if an activation command is
  // interrupted.
  executeSql(
    work,
    `
DROP INDEX IF EXISTS idx_transferencias_19862_fecha;
DROP INDEX IF EXISTS idx_transferencias_19862_periodo;
DROP INDEX IF EXISTS idx_transferencias_19862_emisor;
DROP INDEX IF EXISTS idx_transferencias_19862_receptor;
DROP INDEX IF EXISTS idx_transferencias_19862_monto;
DROP INDEX IF EXISTS idx_transferencias_19862_search;
DROP TABLE IF EXISTS transferencias_19862_old;
ALTER TABLE transferencias_19862 RENAME TO transferencias_19862_old;
ALTER TABLE transferencias_19862_stage RENAME TO transferencias_19862;
DROP TABLE transferencias_19862_old;
INSERT INTO transferencias_19862_release (singleton,checksum_sha256,total_rows,total_monto_clp,generated_at) VALUES (1,${sql(manifest.checksumSha256)},${manifest.totalRows},${manifest.expected.totalMontoClp},${sql(manifest.generatedAt)}) ON CONFLICT(singleton) DO UPDATE SET checksum_sha256=excluded.checksum_sha256,total_rows=excluded.total_rows,total_monto_clp=excluded.total_monto_clp,generated_at=excluded.generated_at;
`,
    "activate-release",
  );
  console.log(
    JSON.stringify(
      {
        status: dryRun ? "validated" : "materialized",
        database,
        totalRows: manifest.totalRows,
        totalMontoClp: manifest.expected.totalMontoClp,
        checksumSha256: manifest.checksumSha256,
        batchSize,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
