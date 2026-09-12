import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
const movementsPayload = JSON.parse(await readFile(join(process.cwd(), "data", "movimientos.json"), "utf8"));
const currentGovernmentMovements = movementsPayload.movimientos.filter((movement) => movement.fecha >= "2026-03-11").length;
const port = Number(process.env.STATIC_VERIFY_PORT || 0);
const remoteBaseUrl = process.env.STATIC_VERIFY_BASE_URL?.replace(/\/+$/, "");
const staticApiBaseUrl = process.env.STATIC_VERIFY_API_URL?.replace(/\/+$/, "");
const waitMs = 5_200;
const spinnerPattern = /Cargando contenido|Cargando municipalidades|Cargando transferencias|Cargando funcionarios|Cargando historial/i;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".woff2": "font/woff2",
};

async function resolveFile(pathname) {
  const relative = pathname.replace(/^\//, "");
  for (const candidate of [join(root, relative), join(root, relative, "index.html")]) {
    try {
      const metadata = await stat(candidate);
      if (metadata.isFile()) return candidate;
    } catch {
      // Try the next static-export candidate.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/municipalidades/muni-maipu" || pathname === "/municipalidades/muni-maipu/") {
    response.writeHead(301, { location: "/municipalidades/maipu", connection: "close" });
    response.end();
    return;
  }

  const file = await resolveFile(pathname);
  if (!file) {
    response.writeHead(404, { connection: "close" });
    response.end("not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mime[extname(file)] || "application/octet-stream",
    connection: "close",
  });
  response.end(await readFile(file));
});

function check(condition, message, details = {}) {
  return condition ? null : { message, ...details };
}

async function createContext(browser) {
  const context = await browser.newContext();
  if (!staticApiBaseUrl) return context;

  await context.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const upstreamUrl = `${staticApiBaseUrl}${requestUrl.pathname}${requestUrl.search}`;
    const upstream = await fetch(upstreamUrl, {
      method: route.request().method(),
      // Playwright returns request headers as a plain object (not Map entries).
      headers: route.request().headers(),
      body: ["GET", "HEAD"].includes(route.request().method()) ? undefined : route.request().postDataBuffer(),
    });
    await route.fulfill({
      status: upstream.status,
      headers: Object.fromEntries(upstream.headers.entries()),
      body: Buffer.from(await upstream.arrayBuffer()),
    });
  });
  return context;
}

async function checkRoute(browser, baseUrl, route, markers) {
  const monitoredOrigin = new URL(baseUrl).origin;
  const context = await createContext(browser);
  const page = await context.newPage();
  const errors = [];
  const badResponses = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("response", (response) => {
    if (response.url().startsWith(monitoredOrigin) && response.status() >= 400) {
      badResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });

  const started = Date.now();
  let response;
  let body = "";
  try {
    response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(waitMs);
    body = await page.locator("body").innerText();
  } catch (error) {
    errors.push(`navigation: ${error.message}`);
  }

  const result = {
    route,
    status: response?.status() ?? null,
    ms: Date.now() - started,
    markers: Object.fromEntries(markers.map((marker) => [marker, body.includes(marker)])),
    spinner: spinnerPattern.test(body),
    overlays: await page.locator('[role="progressbar"]').count(),
    errors,
    badResponses,
  };
  await context.close();
  return result;
}

async function main() {
  let baseUrl = remoteBaseUrl;
  if (!baseUrl) {
    await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === "object" ? address.port : port}`;
  }
  const monitoredOrigin = new URL(baseUrl).origin;
  const browser = await chromium.launch({ headless: true });

  const cases = [
    { route: "/", markers: ["1.753.013"] },
    { route: "/politico", markers: ["Diputados y Senadores"] },
    { route: "/municipalidades", markers: ["Directorio de las 346 Municipalidades"] },
    { route: "/cruces", markers: ["Cruces"] },
    { route: "/movimientos", markers: ["Movimientos y Relevos de Autoridades", String(currentGovernmentMovements)] },
    { route: "/transferencias", markers: ["Transferencias"] },
    { route: "/personas", markers: ["Directorio de Personas"] },
    { route: "/entidades", markers: ["Entidades"] },
    { route: "/politico/vanessa-kaiser-barents-von-hohenhagen", markers: ["Vanessa Kaiser", "8.291.039", "Votaciones", "Personal de Apoyo"] },
    { route: "/politico/carlos-bianchi-chelech", markers: ["Carlos Bianchi", "25.009", "24,89%"] },
    { route: "/municipalidades/maipu", markers: ["Municipalidad de Maipú", "Tomas Vodanovic", "Nómina Detallada", "219.402.160.000"] },
  ];

  const routes = [];
  for (const item of cases) routes.push(await checkRoute(browser, baseUrl, item.route, item.markers));

  const mobileResponsive = [];
  for (const viewport of [
    { name: "phone", width: 390, height: 844 },
    { name: "phone-wide", width: 430, height: 932 },
  ]) {
    const mobileContext = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const mobilePage = await mobileContext.newPage();
    const mobileErrors = [];
    mobilePage.on("pageerror", (error) => mobileErrors.push(error.message));
    mobilePage.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
        mobileErrors.push(message.text());
      }
    });
    await mobilePage.goto(`${baseUrl}/remuneraciones-publicas`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await mobilePage.waitForTimeout(waitMs);
    const bodyLayout = await mobilePage.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    const desktopNavigationHidden = await mobilePage.locator(".site-header__nav-row").evaluate((element) => getComputedStyle(element).display === "none");
    const menuButtonVisible = await mobilePage.getByRole("button", { name: "Abrir menú de secciones" }).isVisible();
    const menuButton = mobilePage.getByRole("button", { name: "Abrir menú de secciones" });
    await menuButton.click();
    await mobilePage.waitForTimeout(150);
    const drawerOpen = await mobilePage.locator("#mobile-drawer").getAttribute("aria-hidden") === "false";
    const remunerationTitleVisible = await mobilePage.getByRole("heading", { name: "Encuentra un pago publicado" }).isVisible();
    const releaseTableMobile = await mobilePage.evaluate(() => {
      const table = document.querySelector(".remuneraciones-release-table");
      const shell = table?.closest(".table-shell");
      const action = table?.querySelector("tbody tr td:last-child button");
      const viewport = document.documentElement.clientWidth;
      const tableRect = table?.getBoundingClientRect();
      const actionRect = action?.getBoundingClientRect();
      return {
        tableCards: Boolean(table && table.querySelector("tbody tr")),
        shellOverflowX: shell ? getComputedStyle(shell).overflowX : null,
        tableFits: Boolean(tableRect && tableRect.width <= viewport + 1),
        actionFits: Boolean(actionRect && actionRect.right <= viewport + 1),
      };
    });
    mobileResponsive.push({
      ...viewport,
      bodyLayout,
      desktopNavigationHidden,
      menuButtonVisible,
      drawerOpen,
      remunerationTitleVisible,
      releaseTableMobile,
      errors: mobileErrors,
    });
    await mobileContext.close();
  }

  const navigationContext = await createContext(browser);
  const navigationPage = await navigationContext.newPage();
  const navigationErrors = [];
  const navigationBadResponses = [];
  navigationPage.on("pageerror", (error) => navigationErrors.push(error.message));
  navigationPage.on("response", (response) => {
    if (response.url().startsWith(monitoredOrigin) && response.status() >= 400) {
      navigationBadResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  await navigationPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await navigationPage.getByRole("link", { name: "Explorar parlamentarios" }).click();
  await navigationPage.waitForTimeout(waitMs);
  const politicianNavigation = {
    path: new URL(navigationPage.url()).pathname,
    ok: (await navigationPage.locator("body").innerText()).includes("Diputados y Senadores"),
  };
  await navigationPage.getByRole("link", { name: "Municipalidades", exact: true }).first().click();
  await navigationPage.waitForTimeout(waitMs);
  const municipalityNavigation = {
    path: new URL(navigationPage.url()).pathname,
    ok: (await navigationPage.locator("body").innerText()).includes("Directorio de las 346 Municipalidades"),
  };
  await navigationContext.close();

  const detailContext = await createContext(browser);
  const detailPage = await detailContext.newPage();
  const detailErrors = [];
  const detailBadResponses = [];
  detailPage.on("pageerror", (error) => detailErrors.push(error.message));
  detailPage.on("console", (message) => {
    if (message.type() === "error") detailErrors.push(message.text());
  });
  detailPage.on("response", (response) => {
    if (response.url().startsWith(monitoredOrigin) && response.status() >= 400) {
      detailBadResponses.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  await detailPage.goto(`${baseUrl}/municipalidades/maipu`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const payrollTab = detailPage.getByRole("button", { name: /Nómina\s*&\s*Remuneraciones|Nómina Detallada/i }).first();
  await payrollTab.click();
  await detailPage.waitForTimeout(waitMs);
  const detailBody = await detailPage.locator("body").innerText();
  const municipalityPayroll = {
    payrollTab: await payrollTab.count() > 0,
    title: detailBody.includes("Buscador y Nómina Completa de Funcionarios"),
    summary: detailBody.match(/Mostrando\s+[\d.]+\s+funcionarios navegables/)?.[0] ?? null,
    spinner: spinnerPattern.test(detailBody),
    error: /Nómina no disponible|no está disponible temporalmente/i.test(detailBody),
    errors: detailErrors,
    badResponses: detailBadResponses,
  };
  await detailContext.close();

  const legacyResponse = await fetch(`${baseUrl}/municipalidades/muni-maipu`, { redirect: "manual" });
  const legacyRedirect = { status: legacyResponse.status, location: legacyResponse.headers.get("location") };

  const municipalidadesContext = await createContext(browser);
  const municipalidadesPage = await municipalidadesContext.newPage();
  await municipalidadesPage.goto(`${baseUrl}/municipalidades`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await municipalidadesPage.waitForTimeout(waitMs);
  const municipalidadesBody = await municipalidadesPage.locator("body").innerText();
  const municipalidadesMap = {
    selectorCount: await municipalidadesPage.getByRole("combobox", { name: "Indicador del mapa municipal" }).count(),
    hasTableFallback: municipalidadesBody.includes("Explorar registros") || municipalidadesBody.includes("Ver tabla completa"),
  };
  await municipalidadesContext.close();

  const crucesContext = await createContext(browser);
  const crucesPage = await crucesContext.newPage();
  const crucesRequests = [];
  crucesPage.on("request", (request) => {
    if (request.url().includes("/data/cruces/")) crucesRequests.push(new URL(request.url()).pathname);
  });
  await crucesPage.goto(`${baseUrl}/cruces`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await crucesPage.waitForTimeout(waitMs);
  const crucesNext = crucesPage.getByRole("button", { name: /Siguiente/ }).first();
  const crucesNextEnabled = await crucesNext.isEnabled();
  await crucesNext.click();
  await crucesPage.waitForTimeout(800);
  const crucesAfterPage = await crucesPage.locator("body").innerText();
  const crucesSearch = crucesPage.getByRole("searchbox").first();
  await crucesSearch.fill("contraloria");
  await crucesPage.waitForTimeout(1_500);
  const crucesAfterSearch = await crucesPage.locator("body").innerText();
  const crucesPagination = {
    nextEnabled: crucesNextEnabled,
    movedToPageTwo: /Pág\. 2 de/.test(crucesAfterPage),
    requestedStaticPage: crucesRequests.some((requestPath) => /\/p-\d{4}\.json$/.test(requestPath)),
    requestedPageChunkCount: crucesRequests.filter((requestPath) => /\/p-\d{4}\.json$/.test(requestPath)).length,
    requestedSearchIndex: crucesRequests.some((requestPath) => /\/search-[^/]+\.json$/.test(requestPath)),
    searchUsesFullIndex: crucesAfterSearch.includes("Índice completo"),
  };
  await crucesContext.close();

  await browser.close();
  if (server.listening) await new Promise((resolve) => server.close(resolve));

  const failures = [];
  for (const result of routes) {
    failures.push(check(result.status === 200, `${result.route}: HTTP ${result.status}`));
    failures.push(check(!result.spinner, `${result.route}: spinner permanente`, { spinner: result.spinner }));
    failures.push(check(result.overlays === 0, `${result.route}: overlay activo`, { overlays: result.overlays }));
    failures.push(check(result.errors.length === 0, `${result.route}: errores de navegador`, { errors: result.errors }));
    failures.push(check(result.badResponses.length === 0, `${result.route}: recursos 4xx/5xx`, { badResponses: result.badResponses }));
    for (const [marker, present] of Object.entries(result.markers)) failures.push(check(present, `${result.route}: falta marcador ${marker}`));
  }
  failures.push(check(politicianNavigation.path === "/politico/" && politicianNavigation.ok, "Navegación / → /politico"));
  failures.push(check(municipalityNavigation.path === "/municipalidades/" && municipalityNavigation.ok, "Navegación /politico → /municipalidades"));
  failures.push(check(navigationErrors.length === 0, "Errores durante navegación", { navigationErrors }));
  failures.push(check(navigationBadResponses.length === 0, "Recursos 4xx/5xx durante navegación", { navigationBadResponses }));
  failures.push(check(municipalityPayroll.payrollTab && municipalityPayroll.title, "Ficha Maipú: pestaña de nómina visible", { municipalityPayroll }));
  failures.push(check(Boolean(municipalityPayroll.summary), "Ficha Maipú: nómina con registros navegables", { municipalityPayroll }));
  failures.push(check(!municipalityPayroll.spinner && !municipalityPayroll.error, "Ficha Maipú: sin spinner ni error de nómina", { municipalityPayroll }));
  failures.push(check(municipalityPayroll.errors.length === 0, "Ficha Maipú: errores de navegador", { municipalityPayroll }));
  failures.push(check(municipalityPayroll.badResponses.length === 0, "Ficha Maipú: recursos 4xx/5xx", { municipalityPayroll }));
  failures.push(check(legacyRedirect.status === 301 && legacyRedirect.location === "/municipalidades/maipu", "Redirect legacy Maipú", { legacyRedirect }));
  failures.push(check(municipalidadesMap.selectorCount === 0, "Municipalidades: el mapa territorial no debe aparecer en producción", municipalidadesMap));
  failures.push(check(municipalidadesMap.hasTableFallback, "Municipalidades: falta la alternativa de registros", municipalidadesMap));
  failures.push(check(crucesPagination.nextEnabled && crucesPagination.movedToPageTwo, "Cruces: paginación no avanza a la página 2", { crucesPagination }));
  failures.push(check(crucesPagination.requestedStaticPage && crucesPagination.requestedPageChunkCount <= 10, "Cruces: la paginación solicitó demasiados chunks estáticos", { crucesPagination }));
  failures.push(check(crucesPagination.requestedSearchIndex && crucesPagination.searchUsesFullIndex, "Cruces: búsqueda no usa el índice completo", { crucesPagination }));
  for (const mobile of mobileResponsive) {
    failures.push(check(mobile.desktopNavigationHidden, `${mobile.name}: navegación de escritorio visible en móvil`, { mobile }));
    failures.push(check(mobile.menuButtonVisible && mobile.drawerOpen, `${mobile.name}: drawer móvil no disponible`, { mobile }));
    failures.push(check(mobile.remunerationTitleVisible, `${mobile.name}: remuneraciones no carga`, { mobile }));
    failures.push(check(mobile.releaseTableMobile.tableCards && mobile.releaseTableMobile.tableFits && mobile.releaseTableMobile.actionFits, `${mobile.name}: ficha de remuneraciones queda fuera de pantalla`, { mobile }));
    failures.push(check(mobile.bodyLayout.bodyWidth <= mobile.bodyLayout.viewport + 1 && mobile.bodyLayout.documentWidth <= mobile.bodyLayout.viewport + 1, `${mobile.name}: overflow horizontal`, { mobile }));
    failures.push(check(mobile.errors.length === 0, `${mobile.name}: errores de navegador`, { mobile }));
  }

  const failed = failures.filter(Boolean);
  console.log(JSON.stringify({ baseUrl, waitMs, routes, navigation: { politicianNavigation, municipalityNavigation, navigationErrors, navigationBadResponses }, municipalityPayroll, legacyRedirect, municipalidadesMap, crucesPagination, mobileResponsive, passed: failures.length - failed.length, failed }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
