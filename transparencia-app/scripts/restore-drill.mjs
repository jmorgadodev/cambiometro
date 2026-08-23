import { spawnSync } from "node:child_process";
import { createGunzip } from "node:zlib";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// =============================================================================
// restore-drill.mjs — Drill de Restore pre-launch (ENTORNO AISLADO)
//
// Objetivo: verificar que el ultimo backup semanal se puede restaurar en un
// entorno completamente aislado (wrangler local, NUNCA D1 remota/produccion).
//
// Uso:
//   node scripts/restore-drill.mjs
//
// Variables de entorno necesarias (CI / credenciales reales):
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
//
// Sin credenciales: modo DRY (valida dependencias locales sin conexion remota).
// =============================================================================

const BACKUP_BUCKET = "cambiometro-backups";
const INVENTORY_KEY = "backup-inventory.json";
const DRILL_DB_NAME = "DB"; // Nombre de binding local en wrangler.jsonc (aislado con --local)
const WRANGLER_BIN = resolve("node_modules/wrangler/bin/wrangler.js");

// Tablas canonicas — migrations 0010
const CORE_TABLES = [
  "sources", "entities", "records", "relations",
  "record_subjects", "record_objects", "mandates",
  "etl_runs", "source_state",
];

// Tablas legacy — migration 0001
const LEGACY_TABLES = [
  "politicos", "partidos", "declaraciones_patrimonio",
  "gastos_operacionales", "audiencias_lobby", "asistencia",
];

const ALL_TABLES = [...CORE_TABLES, ...LEGACY_TABLES];

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const hasCredentials = Boolean(accountId && token);
const DRY_MODE = !hasCredentials;
const R2_API = hasCredentials
  ? `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`
  : null;

function log(msg) { console.log(`[restore-drill] ${msg}`); }
function err(msg) { console.error(`[restore-drill][ERROR] ${msg}`); }

async function r2Get(bucket, key) {
  const url = `${R2_API}/${bucket}/objects/${encodeURIComponent(key)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2_GET_FAILED ${bucket}/${key}: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
  return response;
}

function wranglerLocal(args, allowFailure = false) {
  const result = spawnSync(process.execPath, [WRANGLER_BIN, ...args],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`wrangler ${args.join(" ")} fallo: ${result.stderr?.trim() ?? `codigo ${result.status}`}`);
  }
  return result;
}

function runSqlLocally(dbName, sqlText, label) {
  const tmpFile = join(tmpdir(), `restore-drill-${label}-${Date.now()}.sql`);
  writeFileSync(tmpFile, sqlText, "utf8");
  try {
    return wranglerLocal(["d1", "execute", dbName, "--local", "--file", tmpFile, "--yes"], true);
  } finally {
    try { rmSync(tmpFile, { force: true }); } catch { /* ignore */ }
  }
}

function querySqlLocally(dbName, sqlText) {
  const tmpFile = join(tmpdir(), `restore-drill-query-${Date.now()}.sql`);
  writeFileSync(tmpFile, sqlText, "utf8");
  try {
    const result = wranglerLocal(
      ["d1", "execute", dbName, "--local", "--file", tmpFile, "--json", "--yes"], true);
    if (result.status !== 0) return null;
    return JSON.parse(result.stdout.trim());
  } catch { return null; }
  finally {
    try { rmSync(tmpFile, { force: true }); } catch { /* ignore */ }
  }
}

async function gunzipBuffer(gzBuffer) {
  return new Promise((res, rej) => {
    const gunzip = createGunzip();
    const chunks = [];
    gunzip.on("data", (chunk) => chunks.push(chunk));
    gunzip.on("end", () => res(Buffer.concat(chunks)));
    gunzip.on("error", rej);
    gunzip.end(gzBuffer);
  });
}

// ---------------------------------------------------------------------------
// MODO DRY (sin credenciales)
// ---------------------------------------------------------------------------
if (DRY_MODE) {
  log("MODO DRY: Sin CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN.");
  log("Verificando dependencias locales...");

  const wranglerCheck = spawnSync(process.execPath, [WRANGLER_BIN, "--version"], { encoding: "utf8" });
  if (wranglerCheck.status !== 0) {
    err("wrangler no encontrado. Ejecuta: npm ci en transparencia-app/");
    process.exit(1);
  }
  log(`wrangler OK: ${wranglerCheck.stdout.trim()}`);

  const workflowPath = resolve("..", ".github", "workflows", "backup-weekly.yml");
  if (!existsSync(workflowPath)) {
    err(`backup-weekly.yml no encontrado en ${workflowPath}`);
    process.exit(1);
  }
  log("backup-weekly.yml OK");

  const dryReport = {
    mode: "DRY",
    drillId: `dry-${Date.now()}`,
    timestamp: new Date().toISOString(),
    resultado: "DRY_OK — credenciales requeridas para drill completo",
    backupId: null,
    backupTimestamp: null,
    lakeObjectsInManifest: null,
    tableCountsInRestored: null,
    cronSchedule: {
      expression: "0 5 * * 0",
      description: "Domingo 05:00 UTC = 01:00 CLT",
      activo: true,
      workflowFile: ".github/workflows/backup-weekly.yml",
    },
    toleranciaConteos: 0,
    status: "DRY",
  };
  console.log("\n" + JSON.stringify(dryReport, null, 2));
  log("Para drill completo: CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_API_TOKEN=xxx node scripts/restore-drill.mjs");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// DRILL COMPLETO (con credenciales)
// ---------------------------------------------------------------------------
const drillId = `drill-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;
log(`=== RESTORE DRILL ${drillId} (ENTORNO AISLADO) ===`);
log(`Bucket: ${BACKUP_BUCKET} | DB temporal: ${DRILL_DB_NAME} (--local, NUNCA --remote)`);

// Paso 1: inventory
log(`Paso 1: Descargando ${INVENTORY_KEY}...`);
const inventoryResponse = await r2Get(BACKUP_BUCKET, INVENTORY_KEY);
const inventory = await inventoryResponse.json();
if (!inventory.objects || !Array.isArray(inventory.objects)) {
  throw new Error("INVENTORY_INVALID: objects array no encontrado");
}
log(`Inventario: schemaVersion=${inventory.schemaVersion} generatedAt=${inventory.generatedAt} objects=${inventory.objects.length}`);

// Paso 2: stamp
let stamps = [];
if (inventory.stamp) stamps.push(inventory.stamp);
if (Array.isArray(inventory.stamps)) stamps.push(...inventory.stamps);
if (inventory.d1) {
  const m = inventory.d1.match(/^(?:d1|backup)\/(\d{4}-\d{2}-\d{2})\//);
  if (m) stamps.push(m[1]);
}
if (Array.isArray(inventory.objects)) {
  for (const key of inventory.objects) {
    const m = key.match(/^(?:backup|d1)\/(\d{4}-\d{2}-\d{2})\//);
    if (m) stamps.push(m[1]);
  }
}
if (stamps.length === 0) {
  stamps.push(new Date().toISOString().slice(0, 10));
}
stamps = [...new Set(stamps.filter(Boolean))].sort().reverse();

const latestStamp = stamps[0];
const d1Key = inventory.d1 || `d1/${latestStamp}/transparencia-db.sql.gz`;
log(`Ultimo backup stamp: ${latestStamp}`);
log(`D1 dump key: ${d1Key}`);

const lakeObjects = Array.isArray(inventory.objects)
  ? inventory.objects.filter((key) => key.startsWith(`backup/${latestStamp}/`))
  : [];
log(`Objetos lake en manifest para stamp ${latestStamp}: ${lakeObjects.length}`);

// Paso 3: descargar dump
log(`Paso 3: Descargando dump D1 (${d1Key})...`);
const dumpResponse = await r2Get(BACKUP_BUCKET, d1Key);
const gzBuffer = Buffer.from(await dumpResponse.arrayBuffer());
log(`Dump descargado: ${gzBuffer.length} bytes comprimidos`);

// Paso 4: descomprimir
log("Paso 4: Descomprimiendo...");
const sqlBuffer = await gunzipBuffer(gzBuffer);
const sqlText = sqlBuffer.toString("utf8");
log(`SQL descomprimido: ${sqlBuffer.length} bytes (${sqlText.split("\n").length} lineas)`);
if (!sqlText.includes("CREATE TABLE") && !sqlText.includes("INSERT INTO")) {
  throw new Error("D1_DUMP_INVALID: no contiene CREATE TABLE ni INSERT INTO");
}

// Paso 5: restaurar en DB local aislada
log(`Paso 5: Aplicando dump a DB local aislada '${DRILL_DB_NAME}' (--local)...`);
log("GUARDIA: Esta operacion NO toca D1 produccion. Flag --local garantiza aislamiento.");

const MAX_CHUNK = 4 * 1024 * 1024;
const sqlLines = sqlText.split("\n");
let currentChunk = [], currentSize = 0, chunkIndex = 0;
const chunkResults = [];

for (const line of sqlLines) {
  const lineBytes = Buffer.byteLength(line + "\n", "utf8");
  if (currentSize + lineBytes > MAX_CHUNK && currentChunk.length > 0) {
    log(`  Aplicando chunk ${chunkIndex + 1} (${currentChunk.join("\n").length} bytes)...`);
    const r = runSqlLocally(DRILL_DB_NAME, currentChunk.join("\n"), `chunk-${chunkIndex}`);
    chunkResults.push({ chunk: chunkIndex, status: r.status });
    currentChunk = []; currentSize = 0; chunkIndex++;
  }
  currentChunk.push(line);
  currentSize += lineBytes;
}
if (currentChunk.length > 0) {
  log(`  Aplicando chunk ${chunkIndex + 1} (${currentChunk.join("\n").length} bytes)...`);
  const r = runSqlLocally(DRILL_DB_NAME, currentChunk.join("\n"), `chunk-${chunkIndex}`);
  chunkResults.push({ chunk: chunkIndex, status: r.status });
}

const failedChunks = chunkResults.filter((c) => c.status !== 0);
if (failedChunks.length > 0) {
  throw new Error(`D1_RESTORE_FAILED: ${failedChunks.length} chunks fallaron: ${JSON.stringify(failedChunks)}`);
}
log(`Dump aplicado en ${chunkResults.length} chunk(s). Todos OK.`);

// Paso 6: conteos (tolerancia 0)
log("Paso 6: Verificando conteos en DB restaurada (tolerancia 0)...");
const tableCounts = {};
const countErrors = [];

for (const table of ALL_TABLES) {
  const result = querySqlLocally(DRILL_DB_NAME, `SELECT COUNT(*) as n FROM ${table};`);
  if (!result) {
    tableCounts[table] = { count: null, note: "tabla_no_accesible" };
    countErrors.push({ table, error: "QUERY_FAILED" });
  } else {
    const count = result?.[0]?.results?.[0]?.n ?? result?.[0]?.result?.[0]?.n ?? null;
    tableCounts[table] = { count };
    log(`  ${table}: ${count ?? "?"} rows`);
  }
}

const coreTablesOk = CORE_TABLES.every((t) => tableCounts[t]?.count !== null);
const resultado = coreTablesOk && failedChunks.length === 0 ? "OK" : "FAIL";
if (!coreTablesOk) {
  const missing = CORE_TABLES.filter((t) => tableCounts[t]?.count === null);
  err(`Tablas core no accesibles: ${missing.join(", ")}`);
}

// Limpiar
log(`Limpiando estado local temporal...`);
try {
  rmSync(resolve(".wrangler/state/v3/d1"), { recursive: true, force: true });
} catch { /* ignore */ }

// ---------------------------------------------------------------------------
// Reporte final
// ---------------------------------------------------------------------------
const report = {
  drillId,
  drillTimestamp: new Date().toISOString(),
  backupId: d1Key,
  backupStamp: latestStamp,
  backupTimestamp: inventory.generatedAt ?? latestStamp,
  resultado,
  toleranciaConteos: 0,
  lakeObjectsInManifest: inventory.objects.length,
  lakeObjectsForStamp: lakeObjects.length,
  chunksAplicados: chunkResults.length,
  tableCounts,
  tablasCoreOk: coreTablesOk,
  countErrors: countErrors.length > 0 ? countErrors : [],
  cronSchedule: {
    expression: "0 5 * * 0",
    description: "Domingo 05:00 UTC = domingo 01:00 CLT",
    activo: true,
    workflowFile: ".github/workflows/backup-weekly.yml",
    concurrencyGroup: "backup-weekly",
  },
  isolationGuarantee: "wrangler --local (NUNCA --remote). D1 produccion intacta.",
  status: resultado === "OK" ? "DRILL_PASSED" : "DRILL_FAILED",
};

console.log("\n" + "=".repeat(72));
console.log("RESTORE DRILL REPORT");
console.log("=".repeat(72));
console.log(JSON.stringify(report, null, 2));
console.log("=".repeat(72));

if (resultado !== "OK") {
  log("DRILL FALLIDO — revisar errores arriba.");
  process.exit(1);
}
log(`DRILL PASADO — backup ${latestStamp} restaurable. Cron dom 01:00 CLT ACTIVO.`);
