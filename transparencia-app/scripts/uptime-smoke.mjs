import { execFileSync } from "node:child_process";

const PROD_BASE = process.env.PROD_URL || "https://cambiometro.impulsacv.cl";
const API_BASE = process.env.API_URL || PROD_BASE;

const ROUTES = [
  "/",
  "/politico",
  "/municipalidades",
  "/servicios-publicos",
  "/entidades",
  "/politico/vanessa-kaiser-barents-von-hohenhagen",
  "/transferencias",
  "/cruces",
  "/movimientos",
  "/api/v1/health",
  "/api/v1/search?q=Kaiser",
  "/api/v1/records?source=infolobby&limit=1",
];

export function buildRequestHeaders(path, uptimeToken = "") {
  const headers = { "User-Agent": "Cambiometro-UptimeSmoke/1.0" };
  // The limited WAF exception also protects the Pages home request, not only /api/*.
  if (uptimeToken) headers["X-Cambiometro-Uptime-Token"] = uptimeToken;
  return headers;
}

export function validateSmokeConfiguration({ githubActions = false, uptimeToken = "" } = {}) {
  if (githubActions && !uptimeToken) {
    throw new Error("UPTIME_TOKEN_MISSING: configura el secreto CAMBIOMETRO_UPTIME_TOKEN antes de ejecutar el smoke en Actions.");
  }
}

export function validateMovimientosAsset(movementJson, { statusOk = true, pageText = "" } = {}) {
  const movementRows = Array.isArray(movementJson?.movimientos) ? movementJson.movimientos : [];
  const declaredMovementCount = Number(movementJson?.stats?.total_movimientos ?? movementJson?.total_movimientos ?? -1);
  const reconciledRelease = ["published_reconciled", "published", "complete"].includes(String(movementJson?.release_status ?? ""));

  return statusOk
    && movementJson?.pipeline === "etl_movimientos_autoridades"
    && reconciledRelease
    && movementRows.length > 0
    && declaredMovementCount === movementRows.length
    && !pageText.includes("MOVIMIENTOS_ALL_OFFICIAL_SOURCES_BLOCKED");
}

export function planUptimeIncidents(results, openIssues, now = new Date()) {
  const actions = [];
  for (const result of results) {
    const title = `UPTIME: ${result.path}`;
    const matches = openIssues.filter((issue) => issue.title === title || issue.title.startsWith(`${title} `));
    if (result.isOk) {
      for (const issue of matches) actions.push({ action: "close", path: result.path, number: issue.number });
    } else if (!matches.length) {
      actions.push({ action: "create", path: result.path });
    } else {
      const latest = matches.reduce((a, b) => Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a);
      if (now.getTime() - Date.parse(latest.updatedAt) >= 7 * 86400000) {
        actions.push({ action: "remind", path: result.path, number: latest.number });
      }
    }
  }
  return actions;
}

/** @param {(file: string, args: string[], options: import("node:child_process").ExecFileSyncOptions) => string | Buffer} runGh */
export function syncUptimeIncidents(results, runGh = execFileSync, now = new Date()) {
  // If listing fails or is truncated, never create blind duplicate incidents.
  const issues = JSON.parse(runGh("gh", ["issue", "list", "--state", "open", "--search", "UPTIME in:title",
    "--limit", "1000", "--json", "number,title,updatedAt"], { encoding: "utf8" }));
  if (!Array.isArray(issues) || issues.length >= 1000) throw new Error("UPTIME_ISSUE_INVENTORY_INCOMPLETE");
  const actions = planUptimeIncidents(results, issues, now);
  for (const action of actions) {
    const result = results.find((entry) => entry.path === action.path);
    const body = action.action === "close"
      ? `Recuperación verificada: ${result.url}, HTTP ${result.status}; controles de ruta y datos aprobados. ${now.toISOString()}`
      : `### Incidente de Uptime\n\n- Ruta: ${result.path}\n- URL: ${result.url}\n- HTTP: ${result.status}\n- Tiempo: ${result.durationMs} ms\n- Ray ID: ${result.rayId}\n- Error: ${result.errorMsg || (result.has1102 ? "Error 1102 CPU limit" : "Control de ruta o datos fallido")}\n- Fecha: ${now.toISOString()}\n\nRunbook: docs/operations/uptime-incidents-20261001.md`;
    const args = action.action === "create"
      ? ["issue", "create", "--title", `UPTIME: ${action.path}`, "--body-file", "-"]
      : action.action === "close"
        ? ["issue", "close", String(action.number), "--comment", body]
        : ["issue", "comment", String(action.number), "--body-file", "-"];
    runGh("gh", args, { input: body, stdio: ["pipe", "inherit", "inherit"] });
  }
  return actions;
}

const UPTIME_TOKEN = process.env.UPTIME_TOKEN?.trim() ?? "";
const isMainScript = process.argv[1]?.endsWith("uptime-smoke.mjs");
if (isMainScript) validateSmokeConfiguration({ githubActions: Boolean(process.env.GITHUB_ACTIONS), uptimeToken: UPTIME_TOKEN });

async function checkRoute(path) {
  const origin = path.startsWith("/api/") ? API_BASE : PROD_BASE;
  const url = `${origin}${path}`;
  const t0 = performance.now();
  let res;
  let errorMsg = "";

  try {
    res = await fetch(url, {
      headers: buildRequestHeaders(path, UPTIME_TOKEN),
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
  let movementAssetStatus = null;
  let movementOk = true;
  if (path === "/movimientos") {
    // The page is static and its records are hydrated by the browser. Validate
    // the canonical JSON asset instead of relying on SSR text in the HTML.
    try {
      const movementAsset = await fetch(`${PROD_BASE}/data/movimientos.json`, {
        headers: buildRequestHeaders("/data/movimientos.json", UPTIME_TOKEN),
        signal: AbortSignal.timeout(5000),
      });
      movementAssetStatus = movementAsset.status;
      const movementJson = await movementAsset.json();
      movementOk = validateMovimientosAsset(movementJson, { statusOk: movementAsset.ok, pageText: text });
    } catch {
      movementOk = false;
    }
  }
  const isOk = status === 200 && durationMs <= 5000 && movementOk && !has1102;

  return {
    path,
    url,
    status,
    durationMs,
    rayId,
    isOk,
    has1102,
    movementAssetStatus,
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

  if (process.env.GITHUB_ACTIONS && process.env.GITHUB_TOKEN) {
    try {
      const actions = syncUptimeIncidents(results);
      console.log(JSON.stringify({ event: "uptime_incidents_synced", actions: actions.length }));
    } catch (err) {
      console.error(`[uptime-smoke] No se pudieron reconciliar incidentes: ${err.message}`);
      process.exitCode = 1;
    }
  }
  if (!allPass) { process.exitCode = 1; return; }

  console.log(`[uptime-smoke] Todas las rutas operativas (200 OK, <5s, 0 Error 1102).`);
}

if (isMainScript) {
  runUptimeSmoke();
}
