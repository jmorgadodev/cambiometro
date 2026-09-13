import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const root = join(process.cwd(), "out");
const requestedRoutes = process.argv.slice(2);
const routes = requestedRoutes.length > 0 ? requestedRoutes : [
  "/politico/vanessa-kaiser-barents-von-hohenhagen",
  "/politico/carlos-bianchi-chelech",
  "/municipalidades/maipu",
];
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

async function resolveFile(pathname) {
  const relative = pathname.replace(/^\//, "");
  for (const candidate of [join(root, relative), join(root, relative, "index.html")]) {
    try {
      const metadata = await stat(candidate);
      if (metadata.isFile()) return candidate;
    } catch {
      // Continue to the next static-export candidate.
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const file = await resolveFile(pathname);
  if (!file) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
  response.end(await readFile(file));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${typeof address === "object" ? address.port : 0}`;
const browser = await chromium.launch({ headless: true });
const results = [];

for (const route of routes) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on("response", (response) => {
    if (response.url().startsWith(baseUrl)) requests.push({ path: new URL(response.url()).pathname, status: response.status() });
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
  });
  const started = Date.now();
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const snapshots = [];
  for (const waitMs of [0, 1_000, 5_200, 10_000]) {
    if (waitMs > 0) await page.waitForTimeout(waitMs - (snapshots.at(-1)?.waitMs ?? 0));
    const body = await page.locator("body").innerText();
    snapshots.push({
      waitMs,
      hasSpinner: /Cargando contenido|Cargando nómina oficial|Cargando historial/i.test(body),
      hasError: /Nómina no disponible|no está disponible temporalmente/i.test(body),
      markers: {
        politician: body.includes("Vanessa Kaiser") || body.includes("Carlos Bianchi"),
        municipality: body.includes("Municipalidad de Maipú"),
        payroll: body.includes("Nómina Detallada") || body.includes("Nómina no disponible"),
      },
    });
  }
  let interaction = null;
  if (route.startsWith("/municipalidades/")) {
    const payrollTab = page.getByRole("button", { name: /Nómina\s*&\s*Remuneraciones|Nómina Detallada/i }).first();
    if (await payrollTab.count()) {
      await payrollTab.click();
      await page.waitForTimeout(5_200);
      const body = await page.locator("body").innerText();
      interaction = {
        payrollTabClicked: true,
        hasSpinner: /Cargando nómina oficial|Cargando contenido/i.test(body),
        hasError: /Nómina no disponible|no está disponible temporalmente/i.test(body),
        payrollSummary: body.match(/Mostrando\s+[\d.]+\s+funcionarios navegables/)?.[0] ?? null,
        bodyMarkers: {
          payrollTitle: body.includes("Buscador y Nómina Completa de Funcionarios"),
          Maipu: body.includes("Municipalidad de Maipú"),
        },
      };
    } else {
      interaction = { payrollTabClicked: false };
    }
  }
  results.push({ route, status: response?.status() ?? null, elapsedMs: Date.now() - started, requests, errors, snapshots, interaction });
  await context.close();
}

await browser.close();
await new Promise((resolve) => server.close(resolve));
console.log(JSON.stringify({ baseUrl, results }, null, 2));
