const prodUrl = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const apiUrl = (process.env.API_URL || prodUrl).replace(/\/$/, "");
const token = process.env.UPTIME_TOKEN?.trim() || "";
const headers = { "User-Agent": "Cambiometro-ETLFreshness/1.0" };
if (token) headers["X-Cambiometro-Uptime-Token"] = token;
const maxAgeDays = Number(process.env.MAX_RELEASE_AGE_DAYS || 45);

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

const health = await get("/api/v1/health", apiUrl);
if (health.response.status !== 200 || health.json?.data?.ok !== true) {
  throw new Error(`API_RELEASE_NOT_HEALTHY:${health.response.status}`);
}
console.log(JSON.stringify({ ok: true, prodUrl, apiUrl, ageDays: Number(ageDays.toFixed(2)), transferRows: health.json.data.transferRows ?? null, transferSource: health.json.data.transferSource ?? null }));
