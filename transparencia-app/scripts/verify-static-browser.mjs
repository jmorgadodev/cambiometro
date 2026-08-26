import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
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
      headers: Object.fromEntries(route.request().headers()),
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
    { route: "/transferencias", markers: ["Transferencias"] },
    { route: "/funcionarios", markers: ["Directorio de Personas"] },
    { route: "/entidades", markers: ["Entidades"] },
    { route: "/politico/vanessa-kaiser-barents-von-hohenhagen", markers: ["Vanessa Kaiser", "8.291.039", "Votaciones", "Personal de Apoyo"] },
    { route: "/politico/carlos-bianchi-chelech", markers: ["Carlos Bianchi", "25.009", "24,89%", "580", "189"] },
    { route: "/municipalidades/maipu", markers: ["Municipalidad de Maipú", "Tomas Vodanovic", "Nómina Detallada", "219.402.160.000"] },
  ];

  const routes = [];
  for (const item of cases) routes.push(await checkRoute(browser, baseUrl, item.route, item.markers));

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

  const failed = failures.filter(Boolean);
  console.log(JSON.stringify({ baseUrl, waitMs, routes, navigation: { politicianNavigation, municipalityNavigation, navigationErrors, navigationBadResponses }, municipalityPayroll, legacyRedirect, passed: failures.length - failed.length, failed }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
