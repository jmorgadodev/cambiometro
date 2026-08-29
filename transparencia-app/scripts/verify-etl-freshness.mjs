const prodUrl = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const apiUrl = (process.env.API_URL || prodUrl).replace(/\/$/, "");
const token = process.env.UPTIME_TOKEN?.trim() || "";
const headers = { "User-Agent": "Cambiometro-ETLFreshness/1.0" };
if (token) headers["X-Cambiometro-Uptime-Token"] = token;
const maxAgeDays = Number(process.env.MAX_RELEASE_AGE_DAYS || 45);
const minimumTransferRows = Number(process.env.EXPECTED_TRANSFER_ROWS || 0);

async function get(path, base) {
  const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

const etlCompletedAt = Date.parse(process.env.ETL_COMPLETED_AT || "");
let manifest;
let generatedAt;
for (let attempt = 0; ; attempt += 1) {
  manifest = await get("/data/static-site-manifest.json", prodUrl);
  if (manifest.response.status !== 200) throw new Error(`STATIC_MANIFEST_NOT_PUBLISHED:${manifest.response.status}`);
  generatedAt = Date.parse(manifest.json?.generatedAt || "");
  if (!Number.isFinite(generatedAt)) throw new Error("STATIC_MANIFEST_GENERATED_AT_MISSING");
  const refreshedAfterEtl = !Number.isFinite(etlCompletedAt) || generatedAt + 5 * 60_000 >= etlCompletedAt;
  if (refreshedAfterEtl || attempt >= 27) break;
  await new Promise((resolve) => setTimeout(resolve, 20_000));
}
const ageDays = (Date.now() - generatedAt) / 86_400_000;
if (ageDays < -1 || ageDays > maxAgeDays) throw new Error(`STATIC_RELEASE_STALE:${ageDays.toFixed(2)}d`);
if (Number.isFinite(etlCompletedAt) && generatedAt + 5 * 60_000 < etlCompletedAt) {
  throw new Error(`STATIC_RELEASE_NOT_REFRESHED_AFTER_ETL:${process.env.ETL_WORKFLOW_NAME || "unknown"}`);
}

const health = await get("/api/v1/health", apiUrl);
if (health.response.status !== 200 || health.json?.data?.ok !== true) {
  throw new Error(`API_RELEASE_NOT_HEALTHY:${health.response.status}`);
}
const transferRows = Number(health.json.data.transferRows ?? 0);
const d1TransferRows = Number(health.json.data.d1TransferRows ?? 0);
if (!Number.isInteger(transferRows) || transferRows <= 1000) throw new Error(`API_TRANSFER_UNIVERSE_INCOMPLETE:${transferRows}`);
if (minimumTransferRows > 0 && transferRows < minimumTransferRows) throw new Error(`API_TRANSFER_UNIVERSE_INCOMPLETE:${transferRows}:${minimumTransferRows}`);
if (health.json.data.transferSource !== "d1" || health.json.data.transferD1 !== true || health.json.data.d1Consistent !== true) {
  throw new Error(`API_TRANSFER_D1_NOT_CONSISTENT:${health.json.data.transferSource ?? "unknown"}`);
}
if (d1TransferRows !== transferRows) throw new Error(`API_TRANSFER_D1_ROW_COUNT_MISMATCH:${d1TransferRows}:${transferRows}`);

const etlWorkflow = process.env.ETL_WORKFLOW_NAME || "";
let movement = null;
if (/movimientos/i.test(etlWorkflow)) {
  const movementResponse = await get("/data/movimientos.json", prodUrl);
  if (movementResponse.response.status !== 200) throw new Error(`MOVIMIENTOS_RELEASE_NOT_PUBLISHED:${movementResponse.response.status}`);
  const payload = movementResponse.json;
  const lastSuccess = Date.parse(payload?.last_success_at || payload?.last_run || "");
  if (!Number.isFinite(lastSuccess)) throw new Error("MOVIMIENTOS_LAST_SUCCESS_MISSING");
  if (Number.isFinite(etlCompletedAt) && lastSuccess + 5 * 60_000 < etlCompletedAt) throw new Error("MOVIMIENTOS_RELEASE_NOT_REFRESHED_AFTER_ETL");
  if (!Array.isArray(payload?.movimientos) || payload.movimientos.length < 79) throw new Error("MOVIMIENTOS_UNIVERSE_INCOMPLETE");
  if (!/^[a-f0-9]{64}$/i.test(payload?.checksum_sha256 || "")) throw new Error("MOVIMIENTOS_CHECKSUM_MISSING");
  if (!payload.source_health?.some((source) => source.tier === "official" && source.ok === true)) throw new Error("MOVIMIENTOS_OFFICIAL_SOURCE_UNAVAILABLE");
  movement = { total: payload.movimientos.length, lastSuccess: new Date(lastSuccess).toISOString(), checksum: payload.checksum_sha256 };
}
console.log(JSON.stringify({ ok: true, prodUrl, apiUrl, ageDays: Number(ageDays.toFixed(2)), transferRows, d1TransferRows, minimumTransferRows, transferSource: health.json.data.transferSource ?? null, etlWorkflow, movement }));
