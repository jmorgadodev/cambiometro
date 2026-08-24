import { execSync } from "node:child_process";

const PROD_BASE = process.env.PROD_URL || "https://cambiometro.impulsacv.cl";

const ROUTES = [
  "/",
  "/politico",
  "/partidos",
  "/servicios-publicos",
  "/municipalidades",
  "/transferencias",
  "/cruces",
];

async function checkRoute(path) {
  const url = `${PROD_BASE}${path}`;
  const t0 = performance.now();
  let res;
  let errorMsg = "";

  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Cambiometro-UptimeSmoke/1.0" },
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    errorMsg = err.message || String(err);
  }

  const durationMs = Math.round(performance.now() - t0);
  const rayId = res?.headers?.get("cf-ray") || "N/A";
  const status = res ? res.status : 0;
  let text = "";
  if (res) {
    try {
      text = await res.text();
    } catch {}
  }

  const has1102 = text.includes("Error 1102") || text.includes("error code: 1102") || text.includes("Worker threw exception");
  const isOk = status === 200 && durationMs <= 5000 && !has1102;

  return {
    path,
    url,
    status,
    durationMs,
    rayId,
    isOk,
    has1102,
    errorMsg,
  };
}

export async function runUptimeSmoke() {
  console.log(`[uptime-smoke] Iniciando verificación de uptime para ${PROD_BASE} (${ROUTES.length} rutas)...`);
  const results = [];
  let allPass = true;

  for (const route of ROUTES) {
    const result = await checkRoute(route);
    results.push(result);
    if (!result.isOk) {
      allPass = false;
      console.error(`❌ FAIL: ${result.path} -> Status ${result.status}, Tiempo ${result.durationMs}ms, Ray-ID: ${result.rayId}, Error: ${result.errorMsg || (result.has1102 ? "Error 1102 (CPU)" : "Status != 200")}`);
    } else {
      console.log(`✅ PASS: ${result.path} -> Status 200, ${result.durationMs}ms, Ray-ID: ${result.rayId}`);
    }
  }

  if (!allPass) {
    const failures = results.filter((r) => !r.isOk);
    for (const f of failures) {
      const issueTitle = `UPTIME: ${f.path} ${f.status || "TIMEOUT"}`;
      const issueBody = `### Incidente de Uptime Detectado\n\n- **Ruta**: \`${f.path}\`\n- **URL**: ${f.url}\n- **HTTP Status**: ${f.status}\n- **Tiempo**: ${f.durationMs} ms\n- **Cloudflare Ray ID**: \`${f.rayId}\`\n- **Error**: ${f.errorMsg || (f.has1102 ? "Error 1102 CPU limit" : "Respuesta no 200")}\n- **Timestamp**: ${new Date().toISOString()}\n`;

      if (process.env.GITHUB_ACTIONS && process.env.GITHUB_TOKEN) {
        try {
          console.log(`[uptime-smoke] Creando issue en GitHub: "${issueTitle}"...`);
          execSync(`gh issue create --title "${issueTitle}" --body "${issueBody.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
        } catch (e) {
          console.error(`[uptime-smoke] Error al crear issue:`, e.message);
        }
      }
    }
    process.exit(1);
  }

  console.log(`[uptime-smoke] Todas las rutas operativas (200 OK, <5s, 0 Error 1102).`);
}

if (process.argv[1]?.endsWith("uptime-smoke.mjs")) {
  runUptimeSmoke();
}
