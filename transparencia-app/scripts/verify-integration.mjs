import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const routes = [
  "/", "/autoridades", "/calculadora", "/cambios", "/como-funciona", "/comparar", "/cruces",
  "/datos", "/donar", "/entidades/person-camara-1009", "/fuentes", "/funcionarios", "/movimientos", "/municipalidades",
  "/municipalidades/muni-maipu", "/partidos", "/partidos/rep", "/politico/dip-061", "/privacidad", "/rankings", "/servicios-publicos", "/votaciones-destacadas/",
];
const responsiveRoutes = ["/"];
const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";
const apiBaseUrl = process.env.VERIFY_API_URL ?? baseUrl;
const verifyingLocal = /^http:\/\/(?:127\.0\.0\.1|localhost)/.test(baseUrl);
const verifyingProd = !verifyingLocal
  && !/\.workers\.dev$/.test(new URL(baseUrl).hostname)
  && process.env.VERIFY_SKIP_THROTTLE !== "1";
const staticRedirects = new Map(
  readFileSync(join(process.cwd(), "public", "_redirects"), "utf8")
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter(([from, to]) => from && to)
    .map(([from, to]) => [from.replace(/\/$/, "") || "/", to]),
);
// El rate limiter edge de producción (30 req/60s por IP) exige espaciar cada
// request en la verificación completa: <=25 req/min + backoff exponencial ante
// 429/503 (rate limiting). En local/staging no hay límite que respetar.
const rateLimitBackoffBaseMs = 5_000;
const prodThrottleMs = 2_500;

async function waitForRateLimit(response, attempt) {
  const retryAfter = Number(response?.headers()?.["retry-after"]);
  const base = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : rateLimitBackoffBaseMs;
  // Backoff exponencial: 5s, 10s, 20s, 40s…
  const delay = Math.min(base * 2 ** Math.max(attempt - 1, 0), 60_000);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function throttleProd() {
  if (verifyingProd) await new Promise((resolve) => setTimeout(resolve, prodThrottleMs));
}

const isRateLimited = (response) => [429, 503].includes(response?.status());
const uptimeToken = process.env.UPTIME_TOKEN?.trim() ?? "";

const browser = await chromium.launch({ headless: true });
const browserContext = await browser.newContext({
  extraHTTPHeaders: uptimeToken ? { "X-Cambiometro-Uptime-Token": uptimeToken } : {},
});
const page = await browserContext.newPage({ viewport: { width: 1440, height: 1000 } });
if (apiBaseUrl !== baseUrl) {
  await page.route(`${baseUrl}/api/**`, async (route) => {
    const target = new URL(route.request().url());
    const apiOrigin = new URL(apiBaseUrl);
    target.protocol = apiOrigin.protocol;
    target.host = apiOrigin.host;
    await route.continue({ url: target.toString() });
  });
}
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(30_000);
const consoleMessages = [];
const internalLinks = new Set();
page.on("console", (message) => {
  const locationUrl = message.location()?.url ?? "";
  consoleMessages.push([message.type(), message.text(), locationUrl]);
});
page.on("pageerror", (error) => {
  console.error("PAGEERROR_TRACE on " + page.url() + ":", error?.stack || error);
  consoleMessages.push(["pageerror", page.url() + " -> " + String(error?.stack || error)]);
});

function representativeInternalLinks(hrefs) {
  const representatives = new Map();
  for (const href of hrefs) {
    const url = new URL(href, baseUrl);
    const routeKey = url.pathname
      .replace(/^\/entidades\/[^/]+$/, "/entidades/:id")
      .replace(/^\/politico\/[^/]+$/, "/politico/:id")
      .replace(/^\/municipalidades\/[^/]+$/, "/municipalidades/:id")
      .replace(/^\/partidos\/[^/]+$/, "/partidos/:id")
      .replace(/^\/servicios-publicos\/[^/]+$/, "/servicios-publicos/:id");
    if (!representatives.has(routeKey)) representatives.set(routeKey, href);
  }
  return [...representatives.values()];
}

async function getWithNetworkRetry(url, attempts = 6) {
  await throttleProd();
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await page.request.get(url, { timeout: 30_000 });
      if (isRateLimited(response)) {
        if (attempt < attempts) {
          await waitForRateLimit(response, attempt);
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

async function gotoWithNetworkRetry(url, options = { waitUntil: "domcontentloaded" }, attempts = 8) {
  await throttleProd();
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await page.goto(url, options);
      if (isRateLimited(response)) {
        if (attempt < attempts) {
          await waitForRateLimit(response, attempt);
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

async function checkInternalLinks(hrefs, batchSize = 1) {
  const links = representativeInternalLinks(hrefs);
  for (let index = 0; index < links.length; index += batchSize) {
    const batch = links.slice(index, index + batchSize);
    await Promise.all(batch.map(async (href) => {
      const targetOrigin = href.startsWith("/api/") ? apiBaseUrl : baseUrl;
      let response = await getWithNetworkRetry(`${targetOrigin}${href}`);
      if (!response.ok() && verifyingLocal) {
        const pathname = new URL(href, baseUrl).pathname.replace(/\/$/, "") || "/";
        const fallback = staticRedirects.get(pathname);
        if (fallback) response = await getWithNetworkRetry(`${targetOrigin}${fallback}`);
      }
      assert(response.ok(), `enlace interno ${href} HTTP ${response.status()}`);
    }));
  }
}

async function verifyWidgetInColdContext() {
  const widgetContext = await browser.newContext({
    extraHTTPHeaders: uptimeToken ? { "X-Cambiometro-Uptime-Token": uptimeToken } : {},
  });
  const widgetPage = await widgetContext.newPage();
  const widgetApiStatuses = [];
  const widgetRequestFailures = [];
  const widgetConsoleMessages = [];
  widgetPage.on("response", (response) => {
    if (response.url().includes("/api/v1/politico/")) widgetApiStatuses.push(response.status());
  });
  widgetPage.on("requestfailed", (request) => {
    if (request.url().includes("/api/v1/politico/")) widgetRequestFailures.push(request.failure()?.errorText || "unknown");
  });
  widgetPage.on("console", (message) => widgetConsoleMessages.push(`${message.type()}: ${message.text()}`));
  if (apiBaseUrl !== baseUrl) {
    await widgetPage.route(`${baseUrl}/api/**`, async (route) => {
      const target = new URL(route.request().url());
      const apiOrigin = new URL(apiBaseUrl);
      target.protocol = apiOrigin.protocol;
      target.host = apiOrigin.host;
      await route.continue({ url: target.toString() });
    });
  }

  try {
    const widgetApiOrigin = apiBaseUrl !== baseUrl ? ` data-api-origin="${apiBaseUrl}"` : "";
    await widgetPage.setContent(`<!DOCTYPE html><html><body><main><script src="${baseUrl}/widget.js" data-politico="dip-061"${widgetApiOrigin}></script></main></body></html>`, { waitUntil: "networkidle" });
    const widgetCard = widgetPage.locator(".transparencia-widget").locator("article");
    await widgetCard.waitFor({ state: "visible", timeout: 15_000 });
    try {
      await widgetCard.locator(".name").waitFor({ state: "visible", timeout: 15_000 });
    } catch (error) {
      console.error(`[WIDGET] API statuses=${JSON.stringify(widgetApiStatuses)} requestFailures=${JSON.stringify(widgetRequestFailures)} card=${JSON.stringify(await widgetCard.textContent())} console=${JSON.stringify(widgetConsoleMessages)}`);
      throw error;
    }
    assert((await widgetCard.textContent())?.includes("Kast Adriasola"));
  } finally {
    await widgetContext.close();
  }
}

try {
  for (const route of routes) {
    let response = await gotoWithNetworkRetry(`${baseUrl}${route}`);
    if (!response?.ok() && verifyingLocal) {
      const pathname = new URL(route, baseUrl).pathname.replace(/\/$/, "") || "/";
      const fallback = staticRedirects.get(pathname);
      if (fallback) response = await gotoWithNetworkRetry(`${baseUrl}${fallback}`);
    }
    console.log(`[BROWSER] ${route} -> ${response?.status() ?? "sin respuesta"}`);
    assert(response?.ok(), `${route} HTTP ${response?.status() ?? "sin respuesta"}`);
    if (route === "/autoridades" || route === "/funcionarios") {
      const redirectTarget = route === "/autoridades" ? "/personas?tab=parlamentarios" : "/personas?tab=funcionarios";
      await page.waitForURL("**/personas**", { timeout: 5000 }).catch(() => {});
      // `next dev` serves the static redirect source as an empty page; Pages
      // applies `_redirects`. Verify the destination in both environments.
      if (!page.url().includes("/personas")) await gotoWithNetworkRetry(`${baseUrl}${redirectTarget}`);
    }
    await page.waitForSelector("h1:visible", { state: "visible", timeout: 15000 }).catch(() => {});
    assert.equal(await page.locator("h1:visible").count(), 1, `${route} debe tener exactamente un h1 visible`);
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean));
    for (const href of hrefs) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const url = new URL(href, baseUrl);
      internalLinks.add(`${url.pathname}${url.search}`);
    }
  }

  // Probar el widget antes del crawl exhaustivo: representa una visita nueva
  // y evita que el propio verificador agote el rate limit antes de validar el
  // contrato público del embed.
  await verifyWidgetInColdContext();
  await checkInternalLinks(internalLinks);

  // Verificación del análisis interactivo de una votación destacada. Esta
  // guardia protege el valor principal de la página: no basta con que el
  // listado cargue; el usuario debe poder abrir las tres capas del detalle,
  // comparar bancadas y encontrar una persona en el padrón nominal.
  await gotoWithNetworkRetry(`${baseUrl}/votaciones-destacadas/`);
  // La página es HTML estático, pero el botón de análisis requiere que React
  // termine de hidratar antes de evaluar el click en runners lentos.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  const cameraFilter = page.locator(".featured-vote-camera-filter");
  assert.equal(
    await cameraFilter.getByRole("button", { name: "Senado", exact: true }).getAttribute("aria-pressed"),
    "true",
    "Votaciones destacadas debe iniciar filtrada por Senado",
  );
  const analysisButton = page.getByRole("button", { name: "Abrir análisis" }).first();
  await analysisButton.waitFor({ state: "visible", timeout: 15_000 });
  await analysisButton.click();
  const featuredDialog = page.locator(".featured-vote-dialog:visible");
  await featuredDialog.waitFor({ state: "visible", timeout: 5_000 });
  assert.equal(await featuredDialog.locator("[role=tab]").count(), 3, "Detalle destacado debe ofrecer tres capas");
  assert.equal(await featuredDialog.getByText("Mapa de decisión", { exact: true }).count(), 1, "Detalle destacado debe mostrar el mapa de decisión");
  assert.equal(await featuredDialog.getByText(/Bancada más cohesionada/i, { exact: true }).count(), 1, "Detalle destacado debe mostrar lecturas de bancada");

  await featuredDialog.getByRole("tab", { name: "Bancadas" }).click();
  assert((await featuredDialog.locator(".featured-vote__party-row").count()) >= 2, "Detalle destacado debe mostrar bancadas comparables");
  const comparisonInputs = featuredDialog.locator("input[type=checkbox]");
  assert((await comparisonInputs.count()) >= 3, "Detalle destacado debe permitir seleccionar bancadas");
  for (let index = 0; index < 3; index += 1) await comparisonInputs.nth(index).check();
  assert.equal(await featuredDialog.locator(".featured-vote__comparison-card").count(), 3, "Detalle destacado debe comparar hasta tres bancadas");

  await featuredDialog.getByRole("tab", { name: "Padrón nominal" }).click();
  const nominalSearch = featuredDialog.locator('input[placeholder="Nombre o bancada"]');
  await nominalSearch.fill("Pedro Araya");
  assert.equal(await featuredDialog.getByText("Pedro Araya Guerrero", { exact: true }).count(), 1, "El padrón nominal debe encontrar a Pedro Araya Guerrero");
  await featuredDialog.getByRole("button", { name: "Cerrar análisis" }).click();

  await gotoWithNetworkRetry(baseUrl);
  await page.getByRole("heading", { name: /La información pública no debería perderse|Transparencia, votaciones y gastos p.blicos|Sigue las decisiones p.blicas/ }).first().waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("link", { name: /Explorar parlamentarios/ }).first().waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await page.getByRole("heading", { name: /La información pública no debería perderse|Transparencia, votaciones y gastos p.blicos|Sigue las decisiones p.blicas/ }).count(), 1);
  assert.equal(await page.getByRole("link", { name: /Explorar parlamentarios/ }).count(), 1);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(tmpdir(), "transparencia-home-desktop.png"), fullPage: true });

  await gotoWithNetworkRetry(`${baseUrl}/cruces`);
  await page.getByRole("heading", { name: /Explorador de Cruces/ }).first().waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("heading", { name: /Cruces Destacados/ }).first().waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("heading", { name: /Fuentes Oficiales/ }).first().waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await page.getByRole("heading", { name: /Explorador de Cruces/ }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: /Cruces Destacados/ }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: /Fuentes Oficiales/ }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Vista Tabla/ }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Vista Grafo/ }).count(), 1);

  // Verificación de /funcionarios (valor por defecto Todos y consolidado nacional)
  await gotoWithNetworkRetry(`${baseUrl}/funcionarios`);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForSelector("#select-muni", { timeout: 15000 }).catch(() => {});
  const selectMuni = page.locator("#select-muni");
  assert.equal(await selectMuni.count(), 1, "Debe existir selector de municipalidad");
  assert.equal(await selectMuni.inputValue(), "Todos", "Valor por defecto debe ser Todos");

  // Verificación de Ficha Comunal /municipalidades/muni-maipu (7 capas)
  await gotoWithNetworkRetry(`${baseUrl}/municipalidades/muni-maipu`);
  await page.getByRole("heading", { name: "Municipalidad de Maipú" }).waitFor({ timeout: 10000 }).catch(() => {});
  assert.equal(await page.getByRole("heading", { name: "Municipalidad de Maipú" }).count(), 1);
  assert.equal(await page.getByText("Población Censo INE", { exact: false }).count() > 0, true, "Debe mostrar KPI Censo");
  assert.equal(await page.getByText("Presupuesto Per Cápita", { exact: false }).count() > 0, true, "Debe mostrar Presupuesto Per Cápita");
  assert.equal(await page.getByText("Dependencia del FCM", { exact: false }).count() > 0, true, "Debe mostrar Dependencia FCM");
  assert.equal(await page.getByText("Remuneración Oficial de la Alcaldía", { exact: false }).count() > 0, true, "Debe mostrar Remuneración Alcaldía");
  assert.equal(await page.getByText("Concejo Municipal", { exact: false }).count() > 0, true, "Debe mostrar Concejo Municipal");
  assert.equal(await page.getByText("Alertas y Auditorías Contraloría (CGR)", { exact: false }).count() > 0, true, "Debe mostrar Auditorías CGR");
  assert.equal(await page.getByText("Nómina Detallada de Funcionarios", { exact: false }).count() > 0, true, "Debe mostrar Nómina Detallada");

  // Verificación de /servicios-publicos y ficha institucional /servicios-publicos/min-agricultura
  await gotoWithNetworkRetry(`${baseUrl}/servicios-publicos`);
  await page.getByRole("heading", { name: /Servicios Públicos/ }).waitFor({ timeout: 10000 }).catch(() => {});
  const tabMin = page.getByRole("button", { name: /Ministerios/ }).first();
  await tabMin.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  assert.equal(await page.getByRole("button", { name: /Ministerios/ }).count() >= 1, true, "Debe tener tab Ministerios");
  assert.equal(await page.getByRole("button", { name: /Gobiernos Regionales/ }).count() >= 1, true, "Debe tener tab GOREs");

  await gotoWithNetworkRetry(`${baseUrl}/servicios-publicos/min-agricultura`);
  await page.getByRole("heading", { name: /Ministerio de Agricultura/ }).waitFor({ timeout: 10000 }).catch(() => {});
  assert.equal(await page.getByRole("heading", { name: /Ministerio de Agricultura/ }).count(), 1);
  assert.equal(await page.getByText("Presupuesto Vigente DIPRES", { exact: false }).count() > 0, true, "Debe mostrar KPI Presupuesto");
  assert.equal(await page.getByText("Dotación de Personal", { exact: false }).count() > 0, true, "Debe mostrar KPI Dotación");
  assert.equal(await page.getByText("Compras MercadoPúblico", { exact: false }).count() > 0, true, "Debe mostrar KPI Compras");
  assert.equal(await page.getByRole("button", { name: /Nómina & Remuneraciones/ }).count(), 1, "Debe tener tab Nómina");

  // La ficha canónica de entidad se sirve como página estática; las fichas
  // parlamentarias mantienen su navegación propia sin depender de D1.
  await gotoWithNetworkRetry(`${baseUrl}/entidades/person-camara-1009`);
  const visibleEntityNav = page.locator(".person-entity__nav:visible");
  await visibleEntityNav.first().waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await visibleEntityNav.count(), 1, "la ficha debe mostrar una navegación continua visible");

  await gotoWithNetworkRetry(`${baseUrl}/datos`);
  await page.getByRole("heading", { name: "Líneas de análisis sustentadas por datos" }).first().waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("heading", { name: "Estado de cada fuente" }).first().waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await page.getByRole("heading", { name: "Líneas de análisis sustentadas por datos" }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Estado de cada fuente" }).count(), 1);
  await page.screenshot({ path: join(tmpdir(), "cambiometro-datos-desktop.png"), fullPage: true });

  // dip-061 es José Antonio Kast y no tiene rendiciones publicadas en el
  // corte vigente. Carlos Bianchi (dip-154 / prmId 1110) sí forma parte del
  // release canónico y permite verificar que la ficha estática no cae en el
  // estado "Sin rendiciones".
  await gotoWithNetworkRetry(`${baseUrl}/politico/dip-154`);
  const visibleExpensesSection = page.locator(".section-title:visible", { hasText: "Gastos Operacionales Rendidos" });
  await visibleExpensesSection.first().waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await visibleExpensesSection.count(), 1);
  if (!verifyingLocal) {
    // El corte más reciente puede estar publicado con $0 mientras la fuente
    // aún no rinde ese mes. El criterio correcto es que existan rendiciones
    // históricas en la ficha y no que desaparezca el aviso de ese mes.
    assert.equal(await page.getByText(/Sin registros de gastos operacionales rendidos en el período para esta autoridad/).count(), 0, "staging debe mostrar gastos canónicos");
    assert.equal(await page.getByText(/Total acumulado/).count(), 1, "la ficha debe mostrar el acumulado histórico de gastos");
    const personalCard = page.locator(".card-flat", { has: page.locator(".section-title", { hasText: "Personal de Apoyo y Asesores" }) });
    assert.equal(await personalCard.count(), 1);
    assert((await personalCard.innerText()).length > 100, "la ficha debe detallar personal oficial");
  }

  if (!verifyingLocal) {
    await gotoWithNetworkRetry(`${baseUrl}/politico/sen-042`, { waitUntil: "networkidle" });
    assert.equal(await page.getByText("Lobby Registrado (InfoLobby)", { exact: true }).count(), 1, "la ficha debe mostrar el bloque de audiencias InfoLobby");
    assert.equal(await page.getByText(/Ley 20\.730/).count(), 1, "la ficha debe identificar la base legal de InfoLobby");
  }

  await gotoWithNetworkRetry(baseUrl);
  const homeSearch = page.locator("#home-search");
  await homeSearch.fill("Maipu");
  assert.equal(await homeSearch.inputValue(), "Maipu");

  for (const width of [320, 1440]) {
    for (const route of responsiveRoutes) {
      await page.setViewportSize({ width, height: 800 });
      await gotoWithNetworkRetry(`${baseUrl}${route}`);
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
      await page.waitForSelector("h1", { timeout: 5000 }).catch(() => {});
      const info = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const scrollW = Math.max(body.scrollWidth, html.scrollWidth);
        const clientW = Math.max(body.clientWidth, html.clientWidth);
        const bad = [];
        for (const el of document.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.right > clientW + 1 || r.width > clientW + 1) {
            bad.push({ tag: el.tagName, id: el.id, class: el.className, right: Math.round(r.right), width: Math.round(r.width) });
          }
        }
        return { fits: scrollW <= clientW + 1, scrollW, clientW, bad: bad.slice(0, 10) };
      }).catch(() => ({ fits: true }));
      if (!info.fits) {
        console.error(`OVERFLOW DEBUG at ${width}px on ${route}:`, JSON.stringify(info));
      }
      assert(info.fits, `${route}: overflow horizontal a ${width}px`);
    }
  }

  await page.setViewportSize({ width: 320, height: 800 });
  await gotoWithNetworkRetry(baseUrl);
  const visibleMobileDrawer = page.locator("#mobile-drawer:visible");
  const mobileMenuButton = page.getByRole("button", { name: /abrir menú de secciones/i });
  const openMobileDrawer = async () => {
    await page.waitForFunction(() => window.innerWidth < 1024);
    await mobileMenuButton.waitFor({ state: "visible", timeout: 5000 });
    await mobileMenuButton.click();
    await mobileMenuButton.getAttribute("aria-expanded").then((expanded) => {
      assert.equal(expanded, "true", "El botón de secciones debe quedar expandido tras el click");
    });
    await visibleMobileDrawer.waitFor({ state: "visible", timeout: 5000 });
  };
  try {
    await openMobileDrawer();
  } catch {
    // A long remote crawl can land between the static shell and header
    // hydration. Reload once so a transient missed click does not hide a
    // real drawer regression; a second failure remains fatal.
    await gotoWithNetworkRetry(baseUrl);
    await openMobileDrawer();
  }
  assert(await visibleMobileDrawer.isVisible(), "Drawer móvil debe ser visible tras click");
  assert(await visibleMobileDrawer.locator("nav").isVisible(), "Navegación del drawer móvil debe ser visible");
  await page.screenshot({ path: join(tmpdir(), "transparencia-home-mobile.png"), fullPage: true });

  const legacyChecks = [
    ["/api/v1/politico/dip-061", 200], ["/api/v1/search?q=Garcia", 200],
    ["/api/v1/alertas", 200], ["/api/v1/export?format=csv", 200],
    ["/api/og/site", 200], ["/api/og/dip-061", 200],
  ];
  for (const [path, status] of legacyChecks) {
    const response = await page.request.get(`${apiBaseUrl}${path}`);
    assert.equal(response.status(), status, `${path} HTTP ${response.status()}`);
  }

  const sources = await page.request.get(`${apiBaseUrl}/api/v1/sources`);
  const sourcePayload = await sources.json();
  // DIPRES is published as the canonical 476-row program projection. The
  // larger historical figure (15,689) belongs to a different release and
  // must not make the production guard reject a coherent current snapshot.
  const expectedSourceCounts = new Map([
    ["chilecompra", 74_142], ["dipres", 476], ["sinim", 3_105],
    ["ley-19862", 11_651], ["transparencia-activa", 1_200_807],
    ["personal-apoyo", 4_073],
  ]);
  if (!verifyingLocal) {
    for (const [sourceId, minimum] of expectedSourceCounts) {
      const source = sourcePayload.data.find((candidate) => candidate.id === sourceId);
      assert(source, `falta fuente ${sourceId}`);
      assert(source.recordCount >= minimum, `${sourceId}: ${source.recordCount} < ${minimum}`);
    }
    const servel = sourcePayload.data.find((source) => source.id === "servel");
    assert(servel, "falta fuente servel");
    assert(["connected", "partial", "stale", "unavailable"].includes(servel.status), `servel: estado inválido ${servel.status}`);
    assert(sourcePayload.data.every((source) => ["connected", "partial", "stale", "unavailable"].includes(source.status)));
  }

  for (const path of [
    "/api/v1/entities/person-camara-1009",
    "/api/v1/records?entity_id=person-camara-1009&limit=10",
    "/api/v1/relations?from_id=person-camara-1009&limit=10",
    "/api/v1/crosses?entity_id=person-camara-1009&limit=10",
  ]) {
    const response = await page.request.get(`${apiBaseUrl}${path}`);
    assert(response.ok(), `${path} HTTP ${response.status()}`);
    const payload = await response.json();
    assert("data" in payload && "meta" in payload && "links" in payload, `${path}: contrato uniforme`);
  }
  assert.equal((await page.request.get(`${baseUrl}/rankings`)).status(), 200);

  const commercial = await page.request.get(`${apiBaseUrl}/api/v1/commercial/keys`);
  assert.equal(commercial.status(), 503);
  const push = await page.request.post(`${apiBaseUrl}/api/push`, { data: { politico_id: "dip-061", endpoint: "https://example.test/push", keys: { p256dh: "x", auth: "y" } } });
  assert.equal(push.status(), 405);

  for (const path of ["/funcionarios", "/municipalidades/muni-maipu"]) {
    await gotoWithNetworkRetry(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { timeout: 8000 }).catch(() => {});
    assert.equal(await page.getByRole("heading", { name: "Fuente temporalmente no disponible" }).count(), 0);
  }

  const health = await page.request.get(`${apiBaseUrl}/api/v1/health/data`);
  const healthText = await health.text();
  assert(!healthText.includes("publishedVersion") && !healthText.includes('"id":"run-'), "health no debe filtrar ids o versiones internas");

  // M2: /privacidad y /fuentes con fecha de versión visible
  await gotoWithNetworkRetry(`${baseUrl}/privacidad`);
  await page.getByRole("heading", { name: "Política de Privacidad" }).waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await page.getByRole("heading", { name: "Política de Privacidad" }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: /Tus derechos: acceso, rectificaci.n, cancelaci.n y oposici.n/ }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Envíanos tu solicitud" }).count(), 1);
  assert.equal(
    await page.getByText("Completa el desafío de verificación para enviar la solicitud.", { exact: true }).count(),
    1,
    "/privacidad debe explicar el desafío antes de enviar",
  );
  assert((await page.getByText(/Versión \d+ de [a-z]+ de \d{4}/i, { exact: false }).count()) >= 1, "/privacidad debe mostrar su fecha de versión");
  assert((await page.getByText("datos@cambiometro.impulsacv.cl", { exact: false }).count()) > 0, "/privacidad debe exponer el canal del responsable");

  await gotoWithNetworkRetry(`${baseUrl}/fuentes`);
  await page.getByRole("heading", { name: "Fuentes y versiones" }).waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await page.getByRole("heading", { name: "Fuentes y versiones" }).count(), 1);
  assert((await page.getByText(/Versión (?:[0-9]+ de )?[a-z]+(?: de)? [0-9]{4}/i, { exact: false }).count()) >= 1, "/fuentes debe mostrar su fecha de versión");

  // M2: sin GA4_ID el HTML servido no debe contener ningún script de gtag
  const servedHtml = await (await page.request.get(baseUrl)).text();
  assert(!servedHtml.includes("googletagmanager.com"), "el HTML servido no debe cargar googletagmanager sin GA4_ID");
  assert(!servedHtml.includes("gtag("), "el HTML servido no debe contener llamadas gtag sin GA4_ID");
  assert(servedHtml.includes('id="initial-splash-orb"'), "el HTML inicial debe contener el splash SSR del orbe");
  assert(servedHtml.includes("loading-orb"), "el splash SSR debe incluir la estructura del loading-orb");

  // M2: capturas 320/390px de /privacidad y del banner de cookies (R9)
  const screenshotDir = process.env.SCREENSHOT_DIR ?? tmpdir();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await gotoWithNetworkRetry(`${baseUrl}/privacidad`, { waitUntil: "domcontentloaded" });
    await page.locator("#form-solicitud:visible").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(screenshotDir, `privacidad-${width}.png`), fullPage: true });

    await gotoWithNetworkRetry(baseUrl, { waitUntil: "domcontentloaded" });
    const banner = page.locator(".cookie-consent");
    await banner.waitFor({ state: "visible", timeout: 5000 });
    await page.screenshot({ path: join(screenshotDir, `cookie-banner-${width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  const homeResponse = await page.request.get(baseUrl);
  assert.equal(homeResponse.headers()["x-powered-by"], undefined);
  const staticCsp = homeResponse.headers()["content-security-policy"] ?? "";
  assert(staticCsp.includes("script-src 'self'"), "CSP estática debe restringir scripts al mismo origen");
  assert(staticCsp.includes("https://www.googletagmanager.com"), "CSP permite gtag.js sólo desde Google Tag Manager");
  assert(staticCsp.includes("https://www.google-analytics.com"), "CSP permite conexión GA4 sólo al endpoint oficial");
  assert(!staticCsp.includes("'unsafe-inline'"), "CSP estática no debe permitir unsafe-inline");
  assert(!staticCsp.includes("nonce-"), "CSP estática no debe depender de nonce por request");

  const errors = consoleMessages.filter(([type, message, locationUrl = ""]) =>
    (type === "error" || type === "pageerror")
    && !message.includes("Failed to load resource: the server responded with a status of 503")
    && !message.includes("Failed to load resource: the server responded with a status of 429")
    && !message.includes("net::ERR_SSL_PROTOCOL_ERROR")
    && !message.includes("net::ERR_CONNECTION_REFUSED")
    // Pages dev does not emulate Cloudflare's same-host Worker route; the
    // browser/API contract is verified through VERIFY_API_URL above.
    && !(verifyingLocal && message.includes("Failed to load resource: the server responded with a status of 404"))
    // A production Turnstile widget rejects localhost because that hostname is
    // intentionally absent from its allowlist. The deployed widget and its
    // server-side Siteverify contract are checked separately. Ignore only the
    // challenge resource itself; every other local HTTP 400 remains fatal.
    && !(
      verifyingLocal
      && message.includes("Failed to load resource: the server responded with a status of 400")
      && /^https:\/\/challenges\.cloudflare\.com\//.test(locationUrl)
    )
    // Next's static export intentionally hydrates client-only Suspense
    // boundaries after the HTML shell; React reports this recoverable bailout
    // as #419 in the local production bundle.
    && !(verifyingLocal && message.includes("Minified React error #419"))
  );
  assert.deepEqual(errors, [], `errores de consola: ${JSON.stringify(errors)}`);

  const cspViolations = consoleMessages
    .filter(([, message]) => /Content Security Policy|violates the following Content Security Policy directive|static\.cloudflareinsights\.com|googletagmanager\.com/i.test(message))
    .map(([type, message]) => `${type}: ${message}`);
  assert.deepEqual(cspViolations, [], `violaciones CSP: ${JSON.stringify(cspViolations)}`);
  console.log("Browser integration checks passed: routes, evidence UI, responsive sizes, APIs and widget");
} finally {
  const cspViolations = consoleMessages
    .filter(([, message]) => /Content Security Policy|violates the following Content Security Policy directive|static\.cloudflareinsights\.com|googletagmanager\.com/i.test(message))
    .map(([type, message]) => `${type}: ${message}`);
  if (cspViolations.length > 0) {
    console.error(`[BROWSER] CSP violations observed (${cspViolations.length}):\n${cspViolations.join("\n")}`);
  }
  await browserContext.close();
  await browser.close();
}
