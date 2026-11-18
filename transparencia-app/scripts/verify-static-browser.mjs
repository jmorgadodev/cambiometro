import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";
import { constructionRoutes } from "./seo-publication-scope.mjs";

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
    baseUrl = "http://127.0.0.1:" + server.address().port;
  }
  await mkdir("artifacts/navigation", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const routes = [];
  const interactions = [];
  try {
    const cases = [
      { route: "/", markers: ["Datos públicos de Chile", "Empieza por una pregunta"] },
      { route: "/politico", markers: ["Cámara y Senado"] },
      { route: "/partidos", markers: ["partidos"] },
      { route: "/movimientos", markers: ["Movimientos y Relevos"] },
      { route: "/datos", markers: ["Estado de cada fuente"] },
      { route: "/como-funciona", markers: ["Metodología"] },
      { route: "/politico/vanessa-kaiser-barents-von-hohenhagen", markers: ["Vanessa Kaiser", "Personal de Apoyo", "Gastos Operacionales"] },
      { route: "/politico/carlos-bianchi-chelech", markers: ["Carlos Bianchi", "Personal de Apoyo", "Gastos Operacionales"] },
      ...constructionRoutes.map((route) => ({ route, markers: ["está en construcción", "estas áreas están disponibles"] })),
      { route: "/municipalidades/maipu", markers: ["Municipalidades está en construcción"] },
    ];
    for (const item of cases) routes.push(await checkRoute(browser, baseUrl, item.route, item.markers));
    for (const viewport of [{ width: 320, height: 844 }, { width: 768, height: 1000 }, { width: 1440, height: 1000 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(baseUrl + "/politico/?cargo=Senador&q=Kaiser", { waitUntil: "networkidle" });
        await page.getByRole("heading", { name: "Senadores (1)", exact: true }).waitFor();
        if (await page.locator(".politician-card").count() !== 1) throw new Error("Filtro Senado + Kaiser");
        await page.getByRole("link", { name: /Diputados \(/ }).click();
        await page.getByRole("heading", { name: /Diputados \(/ }).waitFor();
        if (await page.getByRole("heading", { name: /Senadores \(/ }).count()) throw new Error("El filtro mezcla cámaras");
        await page.getByRole("searchbox").fill("sin-coincidencias-verificables");
        await page.getByRole("button", { name: "Buscar", exact: true }).click();
        await page.getByText("Sin coincidencias", { exact: true }).waitFor();
        if (!page.url().includes("cargo=Diputado")) throw new Error("Buscar perdió el filtro de cámara");
        await page.goto(baseUrl, { waitUntil: "networkidle" });
        await page.locator('.site-header[data-hydrated="true"]').waitFor();
        if (viewport.width < 1024) {
          const menu = page.getByRole("button", { name: "Abrir menú de secciones" });
          await menu.click();
          await page.locator("#mobile-drawer:visible").waitFor();
          if (await page.locator("#mobile-drawer .mobile-drawer__cluster").count() !== 2) throw new Error("Áreas móviles sin separar");
          await page.keyboard.press("Escape");
          if (await menu.getAttribute("aria-expanded") !== "false") throw new Error("Escape no cerró el menú");
        } else {
          if (await page.locator(".site-nav > a").count() !== 6) throw new Error("Menú activo distinto al acordado");
          const summary = page.locator(".site-nav__more summary");
          await summary.click();
          if (await page.locator(".site-nav__more-panel a").count() !== 13) throw new Error("Faltan módulos aplazados");
          await page.keyboard.press("Escape");
          if (await page.locator(".site-nav__more").getAttribute("open") !== null) throw new Error("Escape no cerró construcción");
        }
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
        if (!fits) throw new Error("Overflow horizontal");
        if (errors.length) throw new Error(errors.join("; "));
        await page.screenshot({ path: "artifacts/navigation/home-" + viewport.width + ".png", fullPage: true });
        interactions.push({ width: viewport.width, passed: true });
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
  }
  const failures = [];
  for (const result of routes) {
    failures.push(check(result.status === 200, result.route + ": HTTP " + result.status));
    failures.push(check(!result.spinner && result.overlays === 0, result.route + ": carga incompleta"));
    failures.push(check(result.errors.length === 0, result.route + ": errores", { errors: result.errors }));
    failures.push(check(result.badResponses.length === 0, result.route + ": recursos fallidos", { badResponses: result.badResponses }));
    for (const [marker, present] of Object.entries(result.markers)) failures.push(check(present, result.route + ": falta " + marker));
  }
  const failed = failures.filter(Boolean);
  await import("node:fs/promises").then(({ writeFile }) => writeFile("artifacts/navigation/browser.json", JSON.stringify({ baseUrl, routes, interactions, failed }, null, 2)));
  console.log(JSON.stringify({ baseUrl, routeCount: routes.length, interactions, failed }, null, 2));
  if (failed.length) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
