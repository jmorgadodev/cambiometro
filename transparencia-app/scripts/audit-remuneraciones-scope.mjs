import { buildRemunerationAudit } from "../lib/remuneraciones-audit.mjs";

const base = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const headers = { Accept: "application/json", "User-Agent": "Cambiometro-RemuneracionesAudit/1.0" };

async function getJson(pathname) {
  const response = await fetch(`${base}${pathname}`, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`HTTP_${response.status}:${pathname}`);
  return response.json();
}

async function probe(label, scope, query) {
  const payload = await getJson(`/api/v1/funcionarios?scope=${scope}&query=${encodeURIComponent(query)}&include_zero=true&limit=20&sortBy=nombre_asc`);
  return { label, scope, total: Number(payload?.meta?.total ?? 0), returned: Array.isArray(payload?.data) ? payload.data.length : 0 };
}

async function main() {
  const [unifiedManifest, productionPayload, municipal, central] = await Promise.all([
    getJson("/data/remuneraciones-unified/manifest.json"),
    getJson("/api/v1/sources"),
    getJson("/api/v1/funcionarios?scope=municipal&limit=1&include_zero=true"),
    getJson("/api/v1/funcionarios?scope=central&limit=1&include_zero=true"),
  ]);
  const probes = await Promise.all([
    probe("Lucy Depablos", "all", "Lucy Depablos"),
    probe("Sofía Pumpin", "all", "Sofía Pumpin"),
    probe("María Victoria Raimann Pumpin", "all", "María Victoria Raimann Pumpin"),
    probe("Río Sebastián Torrealba del Río", "all", "Río Sebastián Torrealba del Río"),
    probe("Independencia", "municipal", "Independencia"),
  ]);
  const report = buildRemunerationAudit({
    unifiedManifest,
    productionSources: productionPayload?.data ?? productionPayload,
    scopeResponses: { municipal, central },
    probes,
  });
  console.log(JSON.stringify({ base, ...report }, null, 2));
}

main().catch((error) => {
  console.error(`[audit-remuneraciones-scope] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
