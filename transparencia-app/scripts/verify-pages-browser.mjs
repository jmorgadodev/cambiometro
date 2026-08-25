import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:8788";
const routes = [
  "/",
  "/municipalidades",
  "/municipalidades/maipu",
  "/politico",
  "/politico/vanessa-kaiser-barents-von-hohenhagen",
  "/politico/carlos-bianchi-chelech",
  "/cruces",
  "/transferencias",
  "/funcionarios",
  "/entidades",
];

const hasCloudflare1102 = (body) => /(?:cloudflare|error|status|code)[^\d]{0,24}1102/i.test(body);
const spinnerPattern = /Cargando (?:contenido|municipalidades|transferencias|información|ficha parlamentaria)\.\.\./i;

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const route of routes) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const badResponses = [];
    const consoleErrors = [];
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (response.status() >= 400 && !url.pathname.startsWith("/api/")) badResponses.push({ status: response.status(), url: response.url() });
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const startedAt = Date.now();
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(5_200);
    const body = await page.locator("body").innerText();
    const visibleOverlays = await page.locator(".route-transition-overlay").evaluateAll((nodes) => nodes.filter((node) => {
      const style = getComputedStyle(node);
      return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0;
    }).length);
    assert.equal(response?.status(), 200, `${route}: HTTP ${response?.status()}`);
    assert(!hasCloudflare1102(body), `${route}: se encontró un error Cloudflare 1102`);
    assert(!spinnerPattern.test(body), `${route}: spinner persistente después de 5 segundos`);
    assert.equal(visibleOverlays, 0, `${route}: overlay de transición activo`);
    const actionableConsoleErrors = consoleErrors.filter((message) => !message.includes("Failed to load resource"));
    assert.deepEqual(actionableConsoleErrors, [], `${route}: errores de consola ${JSON.stringify(actionableConsoleErrors)}`);
    assert.deepEqual(badResponses, [], `${route}: recursos con error ${JSON.stringify(badResponses)}`);
    results.push({ route, status: response.status(), ms: Date.now() - startedAt, spinner: 0, badResponses: 0 });
    await context.close();
  }

  // La carga directa cubre el HTML publicado; este flujo cubre el caso que
  // históricamente dejaba el orb pegado al entrar desde otra página.
  const navigationContext = await browser.newContext();
  const navigationPage = await navigationContext.newPage();
  const navigationConsoleErrors = [];
  const navigationBadResponses = [];
  navigationPage.on("console", (message) => {
    if (message.type() === "error") navigationConsoleErrors.push(message.text());
  });
  navigationPage.on("response", (response) => {
    const url = new URL(response.url());
    if (response.status() >= 400 && !url.pathname.startsWith("/api/")) {
      navigationBadResponses.push({ status: response.status(), url: response.url() });
    }
  });
  const assertNavigatedReady = async (label) => {
    await navigationPage.waitForTimeout(5_200);
    const body = await navigationPage.locator("body").innerText();
    assert(!hasCloudflare1102(body), `${label}: se encontró un error Cloudflare 1102`);
    assert(!spinnerPattern.test(body), `${label}: spinner persistente después de navegar`);
    const overlays = await navigationPage.locator(".route-transition-overlay").evaluateAll((nodes) => nodes.filter((node) => {
      const style = getComputedStyle(node);
      return style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0;
    }).length);
    assert.equal(overlays, 0, `${label}: overlay activo después de navegar`);
  };

  await navigationPage.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30_000 });
  await navigationPage.locator('a[href="/politico"], a[href="/politico/"]').first().click();
  await navigationPage.waitForURL(/\/politico\/?$/, { timeout: 15_000 });
  await assertNavigatedReady("navegación / → /politico");
  const politicianLink = navigationPage.locator('a[href^="/politico/"]:not([href="/politico/"])').first();
  assert.equal(await politicianLink.count(), 1, "/politico debe exponer enlaces a fichas");
  await politicianLink.click();
  await navigationPage.waitForURL(/\/politico\/[^/]+\/?$/, { timeout: 15_000 });
  await assertNavigatedReady("navegación /politico → ficha de diputado");

  await navigationPage.locator('a[href="/municipalidades"], a[href="/municipalidades/"]').first().click();
  await navigationPage.waitForURL(/\/municipalidades\/?$/, { timeout: 15_000 });
  await assertNavigatedReady("navegación ficha → /municipalidades");
  const maipuLink = navigationPage.locator('a[href="/municipalidades/maipu"], a[href="/municipalidades/maipu/"]').first();
  assert.equal(await maipuLink.count(), 1, "/municipalidades debe exponer el enlace de Maipú");
  await maipuLink.click();
  await navigationPage.waitForURL(/\/municipalidades\/(?:muni-)?maipu\/?$/, { timeout: 15_000 });
  await assertNavigatedReady("navegación /municipalidades → Maipú");
  assert.deepEqual(navigationConsoleErrors, [], `navegación con errores de consola ${JSON.stringify(navigationConsoleErrors)}`);
  assert.deepEqual(navigationBadResponses, [], `navegación con recursos fallidos ${JSON.stringify(navigationBadResponses)}`);
  await navigationContext.close();

  const municipalityContext = await browser.newContext();
  const municipalityPage = await municipalityContext.newPage();
  const municipalityApiRequests = [];
  const municipalityBadResponses = [];
  const municipalityConsoleErrors = [];
  municipalityPage.on("request", (request) => {
    if (request.url().includes("/api/funcionarios")) municipalityApiRequests.push(request.url());
  });
  municipalityPage.on("response", (response) => {
    if (response.status() >= 400) municipalityBadResponses.push({ status: response.status(), url: response.url() });
  });
  municipalityPage.on("console", (message) => {
    if (message.type() === "error") municipalityConsoleErrors.push(message.text());
  });
  const municipalityManifestResponse = await municipalityPage.request.get(`${baseUrl}/data/funcionarios/muni-maipu/manifest.json`);
  assert.equal(municipalityManifestResponse.status(), 200, "manifest CPLT estático de Maipú debe responder 200");
  const municipalityManifest = await municipalityManifestResponse.json();
  const defaultPeriod = municipalityManifest.periods?.[municipalityManifest.defaultPeriod];
  assert(defaultPeriod?.completeRows > 0, "el período CPLT por defecto de Maipú debe tener filas");
  const expectedNavigable = Number(defaultPeriod.completeRows).toLocaleString("es-CL");
  await municipalityPage.goto(`${baseUrl}/municipalidades/maipu`, { waitUntil: "networkidle", timeout: 30_000 });
  await municipalityPage.getByRole("button", { name: /Nómina Detallada de Funcionarios/i }).click();
  await municipalityPage.getByText(new RegExp(`Mostrando ${expectedNavigable} funcionarios navegables`)).waitFor({ state: "visible", timeout: 10_000 });
  await municipalityPage.waitForTimeout(500);
  const municipalityBody = await municipalityPage.locator("body").innerText();
  assert.deepEqual(municipalityApiRequests, [], "la nómina Pages no debe depender de /api/funcionarios");
  assert.deepEqual(municipalityBadResponses, [], `nómina municipal con recursos fallidos ${JSON.stringify(municipalityBadResponses)}`);
  assert(!/Cargando nómina oficial|Nómina no disponible/i.test(municipalityBody), "la nómina municipal no debe quedar cargando o en error");
  for (const tab of [/Finanzas & Presupuesto/i, /Nómina Detallada de Funcionarios/i, /Compras Públicas/i, /Concejo Municipal/i, /Alertas y Auditorías Contraloría/i]) {
    await municipalityPage.getByRole("button", { name: tab }).click();
    await municipalityPage.waitForTimeout(500);
    const tabBody = await municipalityPage.locator("body").innerText();
    assert(!/Cargando contenido|Cargando nómina oficial|Nómina no disponible/i.test(tabBody), `${tab}: pestaña quedó cargando o en error`);
    assert.equal(await municipalityPage.locator(".route-transition-overlay").count(), 0, `${tab}: overlay activo`);
  }
  assert.deepEqual(municipalityConsoleErrors, [], `pestañas municipales con errores de consola ${JSON.stringify(municipalityConsoleErrors)}`);
  await municipalityContext.close();

  const emptyMunicipalityContext = await browser.newContext();
  const emptyMunicipalityPage = await emptyMunicipalityContext.newPage();
  const emptyMunicipalityBadResponses = [];
  emptyMunicipalityPage.on("response", (response) => {
    if (response.status() >= 400) emptyMunicipalityBadResponses.push({ status: response.status(), url: response.url() });
  });
  await emptyMunicipalityPage.goto(`${baseUrl}/municipalidades/alto-hospicio`, { waitUntil: "networkidle", timeout: 30_000 });
  await emptyMunicipalityPage.getByRole("button", { name: /Nómina Detallada de Funcionarios/i }).click();
  await emptyMunicipalityPage.waitForTimeout(5_200);
  const emptyMunicipalityBody = await emptyMunicipalityPage.locator("body").innerText();
  assert(/Sin nómina publicada/.test(emptyMunicipalityBody), "una municipalidad sin cobertura CPLT debe mostrar estado vacío explícito");
  assert(!/Cargando nómina oficial|Nómina no disponible/.test(emptyMunicipalityBody), "una municipalidad sin cobertura CPLT no debe quedar cargando ni en error técnico");
  assert.deepEqual(emptyMunicipalityBadResponses, [], `municipalidad sin cobertura con recursos fallidos ${JSON.stringify(emptyMunicipalityBadResponses)}`);
  assert.equal(await emptyMunicipalityPage.locator(".route-transition-overlay").count(), 0, "municipalidad sin cobertura con overlay activo");
  await emptyMunicipalityContext.close();

  const nonApplicableContext = await browser.newContext();
  const nonApplicablePage = await nonApplicableContext.newPage();
  const nonApplicableBadResponses = [];
  nonApplicablePage.on("response", (response) => {
    if (response.status() >= 400) nonApplicableBadResponses.push({ status: response.status(), url: response.url() });
  });
  await nonApplicablePage.goto(`${baseUrl}/municipalidades/antartica`, { waitUntil: "networkidle", timeout: 30_000 });
  await nonApplicablePage.getByRole("button", { name: /Nómina Detallada de Funcionarios/i }).click();
  await nonApplicablePage.waitForTimeout(5_200);
  const nonApplicableBody = await nonApplicablePage.locator("body").innerText();
  assert(/no tiene municipalidad propia/i.test(nonApplicableBody), "Antártica debe explicar que no tiene municipalidad propia");
  assert(!/Cargando nómina oficial|Nómina no disponible/i.test(nonApplicableBody), "Antártica no debe quedar cargando ni en error técnico");
  assert.deepEqual(nonApplicableBadResponses, [], `Antártica con recursos fallidos ${JSON.stringify(nonApplicableBadResponses)}`);
  assert.equal(await nonApplicablePage.locator(".route-transition-overlay").count(), 0, "Antártica con overlay activo");
  await nonApplicableContext.close();

  const transferContext = await browser.newContext();
  const transferPage = await transferContext.newPage();
  const manifestResponse = await transferPage.request.get(`${baseUrl}/data/transferencias/manifest.json`);
  assert.equal(manifestResponse.status(), 200, "manifest de transferencias debe responder 200");
  const manifest = await manifestResponse.json();
  assert(Number.isInteger(manifest.totalRows) && manifest.totalRows > 0, "el manifest debe declarar filas oficiales");
  assert.equal(manifest.totalPages, Math.ceil(manifest.totalRows / manifest.pageSize), "el manifest debe usar chunks de pageSize");
  for (const chunk of ["p-0001.json", "p-1191.json", "search-index.json"]) {
    assert.equal((await transferPage.request.get(`${baseUrl}/data/transferencias/${chunk}`)).status(), 200, `${chunk} debe responder 200`);
  }
  await transferPage.goto(`${baseUrl}/transferencias`, { waitUntil: "networkidle" });
  const transferBody = await transferPage.locator("body").textContent();
  assert(transferBody?.includes(Number(manifest.totalRows).toLocaleString("es-CL")), "transferencias debe mostrar el total vigente");
  assert(transferBody?.includes("5,0 billones") || transferBody?.includes("5,01 billones"), "transferencias debe mostrar el monto vigente");
  await transferContext.close();

  const invariants = [
    ["/politico/vanessa-kaiser-barents-von-hohenhagen", ["8.291.039", "33,7%"]],
    ["/politico/carlos-bianchi-chelech", ["25.009", "24,89%", "580", "189"]],
    ["/municipalidades/maipu", ["Municipalidad de Maipú", "13119"]],
  ];
  for (const [route, needles] of invariants) {
    const response = await fetch(`${baseUrl}${route}`);
    const body = await response.text();
    assert.equal(response.status, 200, `${route}: HTTP ${response.status}`);
    for (const needle of needles) assert(body.includes(needle), `${route}: falta invariante ${needle}`);
  }
  console.log(JSON.stringify({ ok: true, baseUrl, routes: results, navigation: "home → politico → ficha → municipalidades → maipu", transferencias: { totalRows: manifest.totalRows, totalPages: manifest.totalPages } }, null, 2));
} finally {
  await browser.close();
}
