/** Verifica la ruta y el snapshot estático publicado de Movimientos. */
const base = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const headers = { "User-Agent": "Cambiometro-MovimientosVerifier/2.0", "Cache-Control": "no-cache" };
if (process.env.UPTIME_TOKEN) headers["X-Cambiometro-Uptime-Token"] = process.env.UPTIME_TOKEN;
const cacheBust = `verify=${Date.now()}`;
const productionUrl = (path) => `${base}${path}${path.includes("?") ? "&" : "?"}${cacheBust}`;

function assert(condition, message) {
  if (!condition) throw new Error(`MOVIMIENTOS_VERIFY_FAILED:${message}`);
  console.log(`✅ ${message}`);
}

const page = await fetch(productionUrl("/movimientos/"), { headers, signal: AbortSignal.timeout(15_000) });
assert(page.status === 200, `/movimientos responde ${page.status}`);
const pageHtml = await page.text();
assert(pageHtml.includes("Movimientos y Relevos de Autoridades"), "la página contiene el encabezado de Movimientos");

// Pages serves static HTML and the records are completed by the browser. Do
// not inspect the raw HTML for the post-hydration spinner: that caused a
// false negative against the known-good production page.
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ extraHTTPHeaders: headers });
  const browserPage = await context.newPage();
  const browserErrors = [];
  browserPage.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  browserPage.on("pageerror", (error) => browserErrors.push(error.message));
  await browserPage.goto(productionUrl("/movimientos/"), { waitUntil: "networkidle", timeout: 30_000 });
  const hydratedText = await browserPage.locator("body").innerText();
  assert(hydratedText.includes("Movimientos y Relevos de Autoridades"), "el encabezado aparece tras hidratar");
  assert(!hydratedText.includes("Cargando catálogo") && !hydratedText.includes("Cargando contenido..."), "la página hidratada no deja un spinner");
  assert(browserErrors.length === 0, `la página hidratada no registra errores de navegador${browserErrors.length ? `: ${browserErrors.join(" | ")}` : ""}`);
  await context.close();
} finally {
  await browser.close();
}

const snapshot = await fetch(productionUrl("/data/movimientos.json"), { headers, signal: AbortSignal.timeout(15_000) });
assert(snapshot.status === 200, "/data/movimientos.json responde 200");
const payload = await snapshot.json();
assert(payload.pipeline === "etl_movimientos_autoridades", "el snapshot identifica el pipeline correcto");
assert(Array.isArray(payload.movimientos) && payload.movimientos.length >= 79, `universo preservado (${payload.movimientos?.length ?? 0})`);
assert(/^[a-f0-9]{64}$/i.test(payload.checksum_sha256 || ""), "checksum SHA-256 presente");
assert(Number.isFinite(Date.parse(payload.last_success_at || payload.last_run)), "última ejecución exitosa presente");
assert(Array.isArray(payload.source_health) && payload.source_health.some((source) => source.tier === "official" && source.ok === true), "al menos una fuente oficial publicada como disponible");
assert(payload.movimientos.some((movement) => movement.estado === "en_confirmacion"), "estado en_confirmacion visible");
assert(payload.movimientos.every((movement) => movement.id && movement.fuentes?.length), "todos los movimientos tienen ID y fuente");

const alonso = payload.movimientos.find((movement) => movement.id === "mov-alonso-velasquez-2026-09-03");
assert(alonso?.fecha === "2026-09-02", "Alonso conserva la fecha efectiva del evento (02-09-2026)");
assert(alonso?.fuentes?.some((source) => source.medio === "Radio Paulina" && source.fecha === "2026-09-03"), "Alonso conserva la fecha de publicación de Radio Paulina (03-09-2026)");
assert(alonso?.fuentes?.some((source) => source.nivel === "oficial"), "Alonso conserva referencia oficial MINVU");
assert(alonso?.estado === "en_confirmacion" && alonso?.documento_pendiente === true, "Alonso no se presenta como oficial sin acto administrativo");

const patricio = payload.movimientos.find((movement) => movement.id === "mov-patricio-lohr-2026-09-01");
assert(patricio?.fecha === "2026-09-01", "Patricio conserva la fecha efectiva del evento (01-09-2026)");
assert(patricio?.fuentes?.some((source) => source.medio === "Emol" && source.fecha === "2026-09-02"), "Patricio conserva la fecha de publicación de Emol (02-09-2026)");
assert(patricio?.estado === "en_confirmacion" && patricio?.documento_pendiente === true, "Patricio no se presenta como oficial sin acto administrativo");

console.log(JSON.stringify({
  ok: true,
  total: payload.movimientos.length,
  last_success_at: payload.last_success_at || payload.last_run,
  last_event_date: payload.last_event_date || null,
  checksum_sha256: payload.checksum_sha256,
  officialSources: payload.source_health.filter((source) => source.tier === "official" && source.ok).map((source) => source.id),
  signals: payload.stats?.signals_en_confirmacion ?? payload.signals?.length ?? 0,
}, null, 2));
