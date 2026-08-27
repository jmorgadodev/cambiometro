const prodUrl = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const apiUrl = (process.env.API_URL || prodUrl).replace(/\/$/, "");
const token = process.env.UPTIME_TOKEN?.trim() || "";
const headers = { "User-Agent": "Cambiometro-ETLFreshness/1.0" };
if (token) headers["X-Cambiometro-Uptime-Token"] = token;
const maxAgeDays = Number(process.env.MAX_RELEASE_AGE_DAYS || 45);
const expectedTransferRows = Number(process.env.EXPECTED_TRANSFER_ROWS || 59361);

async function get(path, base) {
  const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

const manifest = await get("/data/static-site-manifest.json", prodUrl);
if (manifest.response.status !== 200) throw new Error(`STATIC_MANIFEST_NOT_PUBLISHED:${manifest.response.status}`);
const generatedAt = Date.parse(manifest.json?.generatedAt || "");
if (!Number.isFinite(generatedAt)) throw new Error("STATIC_MANIFEST_GENERATED_AT_MISSING");
const ageDays = (Date.now() - generatedAt) / 86_400_000;
if (ageDays < -1 || ageDays > maxAgeDays) throw new Error(`STATIC_RELEASE_STALE:${ageDays.toFixed(2)}d`);
const etlCompletedAt = Date.parse(process.env.ETL_COMPLETED_AT || "");
if (Number.isFinite(etlCompletedAt) && generatedAt + 5 * 60_000 < etlCompletedAt) {
  throw new Error(`STATIC_RELEASE_NOT_REFRESHED_AFTER_ETL:${process.env.ETL_WORKFLOW_NAME || "unknown"}`);
}

const health = await get("/api/v1/health", apiUrl);
if (health.response.status !== 200 || health.json?.data?.ok !== true) {
  throw new Error(`API_RELEASE_NOT_HEALTHY:${health.response.status}`);
}
const transferRows = Number(health.json.data.transferRows ?? 0);
if (transferRows !== expectedTransferRows) throw new Error(`API_TRANSFER_UNIVERSE_MISMATCH:${transferRows}:${expectedTransferRows}`);
console.log(JSON.stringify({ ok: true, prodUrl, apiUrl, ageDays: Number(ageDays.toFixed(2)), transferRows, transferSource: health.json.data.transferSource ?? null, etlWorkflow: process.env.ETL_WORKFLOW_NAME || null }));
