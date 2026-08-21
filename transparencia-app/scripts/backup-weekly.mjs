import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Backup semanal del sistema: exporta la base D1 y copia el data lake R2
// completo a cambiometro-backups, con retención de 8 semanas.
// En CI usa CLOUDFLARE_API_TOKEN (CLOUDFLARE_DATA_API_TOKEN); en local
// muestra mensaje y sale (el backup real se ejecuta en GitHub Actions).
// Uso: node scripts/backup-weekly.mjs

const SOURCE_BUCKET = "transparencia-public-data";
const BACKUP_BUCKET = "cambiometro-backups";
const RETENTION_WEEKS = 8;
const SOURCE_DATABASE = "transparencia-db";
const INVENTORY_KEY = "backup-inventory.json";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const usingRestApi = Boolean(accountId && token);
const R2_API = usingRestApi ? `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets` : null;

if (!usingRestApi) {
  console.log("INFO: Sin CLOUDFLARE_API_TOKEN. Backup semanal requiere token REST para subir el dump D1 (>300 MiB) y copiar el lake.");
  console.log("INFO: Ejecútalo en GitHub Actions con secrets.CLOUDFLARE_DATA_API_TOKEN.");
  console.log("INFO: Para probar localmente el flujo de get/put sin subir al bucket real,");
  console.log("INFO: establece CLOUDFLARE_ACCOUNT_ID y usa wrangler OAuth (--remote omitido).");
  process.exit(0);
}

console.log(`modo: REST API (CLOUDFLARE_API_TOKEN)`);

async function r2Request(method, bucket, key, body = null, contentType = null) {
  const path = key ? `${bucket}/objects/${encodeURIComponent(key)}` : `${bucket}/objects`;
  const url = `${R2_API}/${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (contentType) headers["Content-Type"] = contentType;
  const response = await fetch(url, { method, headers, body });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2_${method}_FAILED ${key ?? bucket}: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
  return response;
}

async function listObjectsRest(bucket) {
  const objects = [];
  let cursor = null;
  do {
    const url = `${R2_API}/${bucket}/objects${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`R2_LIST_FAILED ${bucket}: HTTP ${response.status}`);
    const page = await response.json();
    objects.push(...(page.objects ?? []));
    cursor = page.cursor ?? null;
  } while (cursor);
  return objects;
}

function wrangler(argsList, allowFailure = false) {
  const result = spawnSync(
    process.execPath,
    [resolve("node_modules/wrangler/bin/wrangler.js"), ...argsList, "--remote"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (!allowFailure && result.status !== 0) {
    throw new Error(`wrangler ${argsList.join(" ")} fallo: ${result.stderr?.trim() ?? `codigo ${result.status}`}`);
  }
  return result;
}

async function d1Export(stamp) {
  const sqlDump = join(tmpdir(), `cambiometro-d1-${stamp}.sql`);
  const exported = wrangler(["d1", "export", SOURCE_DATABASE, "--output", sqlDump, "--skip-confirmation"]);
  const sqlBuffer = readFileSync(sqlDump);
  rmSync(sqlDump, { force: true });
  if (sqlBuffer.length === 0) throw new Error("D1_EXPORT_EMPTY");
  const gzBuffer = gzipSync(sqlBuffer);
  const exportPath = `d1/${stamp}/transparencia-db.sql.gz`;
  await r2Request("PUT", BACKUP_BUCKET, exportPath, gzBuffer, "application/gzip");
  console.log(`[OK] d1 export -> ${exportPath} (${sqlBuffer.length} -> ${gzBuffer.length} bytes)`);
}

const stamp = new Date().toISOString().slice(0, 10);
const prefix = `backup/${stamp}/`;
const cutoff = Date.now() - RETENTION_WEEKS * 7 * 24 * 60 * 60 * 1000;

console.log(`stamp: ${stamp}`);

await d1Export(stamp);

let sourceObjects;
if (usingRestApi) {
  sourceObjects = await listObjectsRest(SOURCE_BUCKET);
} else {
  // fallback: sin token no debería llegar aquí (handled arriba)
  throw new Error("SHOULD_NOT_REACH");
}

console.log(`[INFO] ${sourceObjects.length} objects listados del bucket fuente`);

let copied = 0;
for (const object of sourceObjects) {
  const targetKey = `${prefix}${object.key}`;
  // Skip si ya existe y tiene mismo tamaño
  try {
    const head = await r2Request("HEAD", BACKUP_BUCKET, targetKey);
    const existingSize = Number(head.headers.get("content-length") ?? 0);
    if (existingSize === object.size) { copied += 1; continue; }
  } catch { /* no existe aún */ }
  const srcData = await r2Request("GET", SOURCE_BUCKET, object.key);
  const srcBuffer = await srcData.arrayBuffer();
  await r2Request("PUT", BACKUP_BUCKET, targetKey, Buffer.from(srcBuffer), object.contentType ?? "application/octet-stream");
  copied += 1;
  if (copied % 20 === 0) console.log(`[OK] ${copied}/${sourceObjects.length} copiados`);
}

let deleted = 0;
for (const object of sourceObjects) {
  const match = object.key.match(/^backup\/(\d{4}-\d{2}-\d{2})\//);
  if (!match) continue;
  const stampMs = Date.parse(`${match[1]}T00:00:00Z`);
  if (!Number.isNaN(stampMs) && stampMs < cutoff) {
    await r2Request("DELETE", BACKUP_BUCKET, object.key);
    deleted += 1;
  }
}

const inventory = { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), objects: sourceObjects.map(({ key }) => key) };
await r2Request("PUT", BACKUP_BUCKET, INVENTORY_KEY, Buffer.from(`${JSON.stringify(inventory, null, 2)}\n`, "utf8"), "application/json");

console.log(JSON.stringify({ action: "backup", stamp, d1: `d1/${stamp}/transparencia-db.sql.gz`, lakeObjects: sourceObjects.length, copied, deletedOld: deleted, retentionWeeks: RETENTION_WEEKS, status: "OK" }, null, 2));