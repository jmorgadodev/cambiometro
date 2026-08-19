import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const routes = [
  "/", "/autoridades", "/calculadora", "/cambios", "/como-funciona", "/comparar", "/cruces",
  "/datos", "/donar", "/entidades/person-infoprobidad-9204ac804e1f43cc8c3e62f712a15764", "/funcionarios", "/movimientos", "/municipalidades",
  "/municipalidades/muni-maipu", "/partidos", "/partidos/rep", "/politico/dip-061", "/rankings", "/servicios-publicos",
];
const responsiveRoutes = ["/", "/cruces", "/politico/dip-061"];
const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";
const verifyingLocal = /^http:\/\/(?:127\.0\.0\.1|localhost)/.test(baseUrl);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(30_000);
const consoleMessages = [];
const internalLinks = new Set();
page.on("console", (message) => consoleMessages.push([message.type(), message.text()]));
page.on("pageerror", (error) => consoleMessages.push(["pageerror", String(error)]));

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

async function getWithNetworkRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.request.get(url, { timeout: 30_000 });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

async function gotoWithNetworkRetry(url, options = { waitUntil: "domcontentloaded" }, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  throw lastError;
}

async function checkInternalLinks(hrefs, batchSize = 4) {
  const links = representativeInternalLinks(hrefs);
  for (let index = 0; index < links.length; index += batchSize) {
    const batch = links.slice(index, index + batchSize);
    await Promise.all(batch.map(async (href) => {
      const response = await getWithNetworkRetry(`${baseUrl}${href}`);
      assert(response.ok(), `enlace interno ${href} HTTP ${response.status()}`);
    }));
  }
}

try {
  for (const route of routes) {
    const response = await gotoWithNetworkRetry(`${baseUrl}${route}`);
    assert(response?.ok(), `${route} HTTP ${response?.status() ?? "sin respuesta"}`);
    assert.equal(await page.locator("h1").count(), 1, `${route} debe tener exactamente un h1`);
    const hrefs = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean));
    for (const href of hrefs) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const url = new URL(href, baseUrl);
      internalLinks.add(`${url.pathname}${url.search}`);
    }
  }

  await checkInternalLinks(internalLinks);

  await gotoWithNetworkRetry(baseUrl);
  assert.equal(await page.getByRole("heading", { name: /Transparencia, votaciones y gastos p.blicos|Sigue las decisiones p.blicas/ }).count(), 1);
  assert.equal(await page.getByRole("link", { name: /Explorar parlamentarios/ }).count(), 1);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: join(tmpdir(), "transparencia-home-desktop.png"), fullPage: true });

  await gotoWithNetworkRetry(`${baseUrl}/cruces`);
  assert.equal(await page.getByRole("heading", { name: /Explorador de Cruces/ }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: /Cruces Destacados/ }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: /Fuentes Oficiales/ }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Vista Tabla/ }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Vista Grafo/ }).count(), 1);

  // Verificación de /funcionarios (valor por defecto Todos y consolidado nacional)
  await gotoWithNetworkRetry(`${baseUrl}/funcionarios`);
  const selectMuni = page.locator("#select-muni");
  assert.equal(await selectMuni.count(), 1, "Debe existir selector de municipalidad");
  assert.equal(await selectMuni.inputValue(), "Todos", "Valor por defecto debe ser Todos");

  // Verificación de Ficha Comunal /municipalidades/muni-maipu (7 capas)
  await gotoWithNetworkRetry(`${baseUrl}/municipalidades/muni-maipu`);
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
  assert.equal(await page.getByRole("heading", { name: "Servicios Públicos, Ministerios y Gobiernos Regionales" }).count(), 1);
  assert.equal(await page.getByRole("button", { name: /Ministerios \(25\)/ }).count(), 1, "Debe tener tab Ministerios");
  assert.equal(await page.getByRole("button", { name: /Gobiernos Regionales \(16\)/ }).count(), 1, "Debe tener tab GOREs");

  await gotoWithNetworkRetry(`${baseUrl}/servicios-publicos/min-agricultura`);
  assert.equal(await page.getByRole("heading", { name: /Ministerio de Agricultura/ }).count(), 1);
  assert.equal(await page.getByText("Presupuesto Vigente DIPRES", { exact: false }).count() > 0, true, "Debe mostrar KPI Presupuesto");
  assert.equal(await page.getByText("Dotación de Personal", { exact: false }).count() > 0, true, "Debe mostrar KPI Dotación");
  assert.equal(await page.getByText("Compras MercadoPúblico", { exact: false }).count() > 0, true, "Debe mostrar KPI Compras");
  assert.equal(await page.getByRole("button", { name: /Nómina & Remuneraciones/ }).count(), 1, "Debe tener tab Nómina");

  await gotoWithNetworkRetry(`${baseUrl}/entidades/person-camara-1009`);
  assert(page.url().includes("/politico/"), "la entidad parlamentaria debe redirigir a /politico");

  await gotoWithNetworkRetry(`${baseUrl}/entidades/person-infoprobidad-9204ac804e1f43cc8c3e62f712a15764`);
  assert.equal(await page.locator(".person-entity__nav").count(), 1, "la ficha debe mostrar navegación continua");

  await gotoWithNetworkRetry(`${baseUrl}/datos`);
  assert.equal(await page.getByRole("heading", { name: "Líneas de análisis sustentadas por datos" }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Estado de cada fuente" }).count(), 1);
  await page.screenshot({ path: join(tmpdir(), "cambiometro-datos-desktop.png"), fullPage: true });

  await gotoWithNetworkRetry(`${baseUrl}/politico/dip-061`);
  await page.locator(".section-title", { hasText: "Gastos Operacionales Rendidos" }).waitFor({ state: "visible", timeout: 15_000 });
  assert.equal(await page.locator(".section-title", { hasText: "Gastos Operacionales Rendidos" }).count(), 1);
  if (!verifyingLocal) {
    assert.equal(await page.getByText(/Sin rendiciones publicadas/).count(), 0, "staging debe usar gastos canonicos de D1");
    const personalCard = page.locator(".card-flat", { has: page.locator(".section-title", { hasText: "Personal de Apoyo y Asesores" }) });
    assert.equal(await personalCard.count(), 1);
    assert((await personalCard.innerText()).length > 100, "la ficha debe detallar personal oficial");
  }

  if (!verifyingLocal) {
    await gotoWithNetworkRetry(`${baseUrl}/politico/sen-042`, { waitUntil: "networkidle" });
    assert.equal(await page.getByText("InfoLobby · ley 20.730", { exact: true }).count(), 1, "la ficha debe enlazar audiencias de InfoLobby");
  }

  await gotoWithNetworkRetry(baseUrl);
  const homeSearch = page.locator("#home-search");
  await homeSearch.fill("Maipu");
  assert.equal(await homeSearch.inputValue(), "Maipu");

  for (const width of [320, 768, 1024, 1440]) {
    for (const route of responsiveRoutes) {
      await page.setViewportSize({ width, height: 800 });
      await gotoWithNetworkRetry(`${baseUrl}${route}`);
      const fits = await page.locator("body").evaluate((element) => element.scrollWidth <= element.clientWidth);
      assert(fits, `${route}: overflow horizontal a ${width}px`);
    }
  }

  await page.setViewportSize({ width: 320, height: 800 });
  await gotoWithNetworkRetry(baseUrl);
  await page.getByRole("button", { name: "Secciones" }).click();
  await page.locator("#mobile-drawer").waitFor({ state: "visible", timeout: 5000 });
  assert(await page.locator("#mobile-drawer").isVisible(), "Drawer móvil debe ser visible tras click");
  assert(await page.locator("#mobile-drawer nav").isVisible(), "Navegación del drawer móvil debe ser visible");
  await page.screenshot({ path: join(tmpdir(), "transparencia-home-mobile.png"), fullPage: true });

  const legacyChecks = [
    ["/api/v1/politico/dip-061", 200], ["/api/v1/search?q=Garcia", 200],
    ["/api/v1/alertas", 200], ["/api/v1/export?format=csv", 200],
    ["/api/og/site", 200], ["/api/og/dip-061", 200],
  ];
  for (const [path, status] of legacyChecks) {
    const response = await page.request.get(`${baseUrl}${path}`);
    assert.equal(response.status(), status, `${path} HTTP ${response.status()}`);
  }

  const sources = await page.request.get(`${baseUrl}/api/v1/sources`);
  const sourcePayload = await sources.json();
  const expectedSourceCounts = new Map([
    ["chilecompra", 74_142], ["dipres", 15_689], ["sinim", 3_105],
    ["ley-19862", 11_651], ["transparencia-activa", 1_203_287],
    ["servel", 23_894], ["personal-apoyo", 4_092],
  ]);
  for (const [sourceId, minimum] of expectedSourceCounts) {
    const source = sourcePayload.data.find((candidate) => candidate.id === sourceId);
    assert(source, `falta fuente ${sourceId}`);
    if (!verifyingLocal) assert(source.recordCount >= minimum, `${sourceId}: ${source.recordCount} < ${minimum}`);
  }
  assert(sourcePayload.data.every((source) => ["connected", "partial", "stale", "unavailable"].includes(source.status)));

  for (const path of [
    "/api/v1/entities/person-camara-1009",
    "/api/v1/records?entity_id=person-camara-1009&limit=10",
    "/api/v1/relations?from_id=person-camara-1009&limit=10",
    "/api/v1/crosses?entity_id=person-camara-1009&limit=10",
  ]) {
    const response = await page.request.get(`${baseUrl}${path}`);
    assert(response.ok(), `${path} HTTP ${response.status()}`);
    const payload = await response.json();
    assert("data" in payload && "meta" in payload && "links" in payload, `${path}: contrato uniforme`);
  }
  assert.equal((await page.request.get(`${baseUrl}/rankings`)).status(), 200);

  const commercial = await page.request.get(`${baseUrl}/api/v1/commercial/keys`);
  assert.equal(commercial.status(), 503);
  const push = await page.request.post(`${baseUrl}/api/push`, { data: { politico_id: "dip-061", endpoint: "https://example.test/push", keys: { p256dh: "x", auth: "y" } } });
  assert.equal(push.status(), 405);

  const widgetPage = await browser.newPage();
  await widgetPage.setContent(`<!DOCTYPE html><html><body><main><script src="${baseUrl}/widget.js" data-politico="dip-061"></script></main></body></html>`, { waitUntil: "networkidle" });
  const widgetCard = widgetPage.locator(".transparencia-widget").locator("article");
  await widgetCard.waitFor({ state: "visible", timeout: 15000 });
  await widgetCard.locator(".name").waitFor({ state: "visible", timeout: 15000 });
  assert((await widgetCard.textContent())?.includes("Kast Adriasola"));
  await widgetPage.close();

  for (const path of ["/funcionarios", "/municipalidades/muni-maipu"]) {
    await gotoWithNetworkRetry(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    assert.equal(await page.getByRole("heading", { name: "Fuente temporalmente no disponible" }).count(), 0);
  }

  const health = await page.request.get(`${baseUrl}/api/v1/health/data`);
  const healthText = await health.text();
  assert(!healthText.includes("publishedVersion") && !healthText.includes('"id":"run-'), "health no debe filtrar ids o versiones internas");

  const homeResponse = await page.request.get(baseUrl);
  assert.equal(homeResponse.headers()["x-powered-by"], undefined);
  assert(homeResponse.headers()["content-security-policy"]?.includes("nonce-"));

  const errors = consoleMessages.filter(([type, message]) =>
    (type === "error" || type === "pageerror")
    && !message.includes("Failed to load resource: the server responded with a status of 503"));
  assert.deepEqual(errors, [], `errores de consola: ${JSON.stringify(errors)}`);
  console.log("Browser integration checks passed: routes, evidence UI, responsive sizes, APIs and widget");
} finally {
  await browser.close();
}
