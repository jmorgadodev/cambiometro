/** Bounded local browser verification; never deploys or touches ETL/data services. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { build } from "esbuild";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import csv from "csv-parser";
const base = process.env.EXPLORER_QA_BASE ?? "http://127.0.0.1:3200";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base))
  throw new Error("Local verification only");
const dir = path.resolve("artifacts/dashboard-explorer");
fs.mkdirSync(path.join(dir, "screenshots"), { recursive: true });
await build({
  entryPoints: ["lib/parliamentary-explorer.ts"],
  outfile: path.join(dir, "qa-model.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
});
const model = createRequire(import.meta.url)(path.join(dir, "qa-model.cjs"));
const data = model.unpackExplorer(
  JSON.parse(
    fs.readFileSync(
      "public/data/parliamentary-explorer/bootstrap.json",
      "utf8",
    ),
  ),
);
const checks = [],
  errors = [],
  requests = [],
  accessibility = [],
  responses = [],
  consoleErrors = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 1000 },
  reducedMotion: "reduce",
});
context.on("request", (r) =>
  requests.push({ url: r.url(), type: r.resourceType(), time: Date.now() }),
);
context.on("page", (p) => {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
});
context.on("response", (r) =>
  responses.push({ url: r.url(), status: r.status() }),
);
const page = await context.newPage();
const check = (name, valid, detail) => {
  checks.push({ name, passed: !!valid, detail });
  console.log(JSON.stringify({ check: name, passed: !!valid }));
  if (!valid) throw new Error(name + ": " + JSON.stringify(detail));
};
const views = page.getByRole("navigation", { name: "Vistas del dashboard" });
async function ready() {
  await views.waitFor({ timeout: 60000 });
  await page
    .locator('.site-header[data-hydrated="true"]')
    .waitFor({ timeout: 60000 });
}
async function visit(view) {
  await views.getByRole("button", { name: new RegExp("^" + view) }).click();
  await page.waitForTimeout(150);
}
async function screenshot(name) {
  await page.screenshot({
    path: path.join(dir, "screenshots", name + ".png"),
    fullPage: true,
  });
}
async function axe(name) {
  const result = await new AxeBuilder({ page })
    .include("#dashboard-workspace")
    .analyze();
  const violations = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    help: v.help,
  }));
  accessibility.push({ view: name, violations });
  check(
    "accessibility " + name,
    !violations.some((v) => ["critical", "serious"].includes(v.impact)),
    violations,
  );
}
async function closeConsent() {
  const reject = page.getByRole("button", { name: "Rechazar", exact: true });
  if (await reject.isVisible()) await reject.click();
}
async function waitRecords() {
  await page
    .getByRole("region", { name: "Tabla de registros", exact: true })
    .locator("tbody tr")
    .first()
    .waitFor({ timeout: 30000 });
}
try {
  const start = Date.now();
  await page.goto(base + "/dashboard/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await ready();
  await closeConsent();
  const initial = await page.evaluate(() => ({
    navigation: performance.getEntriesByType("navigation").map((n) => ({
      transfer: n.transferSize,
      decoded: n.decodedBodySize,
      domContentLoaded: Math.round(n.domContentLoadedEventEnd),
    })),
    resources: performance
      .getEntriesByType("resource")
      .filter((r) => new URL(r.name).origin === location.origin)
      .map((r) => ({
        path: new URL(r.name).pathname,
        transfer: r.transferSize,
        decoded: r.decodedBodySize,
        encoded: r.encodedBodySize,
      })),
    heap: performance.memory?.usedJSHeapSize ?? null,
  }));
  check(
    "initial has no administrative detail",
    !requests.some((r) => /\/data\/parliamentary-explorer\/\d/.test(r.url)),
  );
  const initialMetrics = model.explorerMetrics(
    data,
    model.explorerDefaults(data),
  );
  check(
    "baseline representation",
    (
      await page
        .getByRole("group", { name: "Indicadores de la selección" })
        .innerText()
    ).includes(String(initialMetrics.members)),
  );
  const initialRequestCount = requests.length;
  const initialResponseCount = responses.length;
  const svgDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar SVG", exact: true })
    .first()
    .click();
  const svgFile = path.join(dir, "panorama.svg");
  await (await svgDownload).saveAs(svgFile);
  const svgText = fs.readFileSync(svgFile, "utf8");
  check(
    "SVG carries title period and provenance",
    svgText.includes("El Cambiómetro") &&
      svgText.includes("2026") &&
      svgText.includes("Fuentes:"),
  );
  await screenshot("desktop-panorama");
  await axe("desktop-panorama");
  await visit("Explorar");
  await screenshot("desktop-explorar");
  await axe("desktop-explorar");
  const rankingCount = await page
    .getByRole("region", { name: "Ranking configurable" })
    .locator("tbody tr")
    .count();
  check("ranking paginated", rankingCount <= 25);
  await visit("Comparar");
  const participantInputs = page
    .getByRole("group", { name: "Participantes de comparación" })
    .getByRole("checkbox");
  const ids = await participantInputs.evaluateAll((inputs) =>
    inputs.slice(0, 3).map((i) => i.value),
  );
  for (const id of ids) {
    await page
      .getByRole("group", { name: "Participantes de comparación" })
      .locator(`input[type="checkbox"][value="${id}"]`)
      .click();
    await page.waitForFunction(
      (id) =>
        new URL(location.href).searchParams
          .getAll("participante")
          .includes(id) &&
        !!document.querySelector(`input[value="${id}"]:checked`),
      id,
    );
  }
  check(
    "three comparison participants",
    new URL(page.url()).searchParams.getAll("participante").length === 3,
    { url: page.url(), ids },
  );
  await screenshot("desktop-comparar");
  await axe("desktop-comparar");
  for (const [type, label] of [
    ["party", "Partidos"],
    ["region", "Regiones"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForFunction(
      (type) => new URL(location.href).searchParams.get("comparar") === type,
      type,
    );
    const options = page
      .getByRole("group", { name: "Participantes de comparación" })
      .getByRole("checkbox");
    const chosen = await options.evaluateAll((inputs) =>
      inputs.slice(0, 2).map((i) => i.value),
    );
    for (const id of chosen) {
      await page
        .getByRole("group", { name: "Participantes de comparación" })
        .locator(`input[value="${id}"]`)
        .click();
      await page.waitForFunction(
        (id) =>
          new URL(location.href).searchParams
            .getAll("participante")
            .includes(id),
        id,
      );
    }
    check(
      "compare two " + type,
      new URL(page.url()).searchParams.getAll("participante").length === 2,
    );
    await screenshot("desktop-comparar-" + type);
  }
  await page
    .getByRole("button", { name: "Parlamentarios", exact: true })
    .click();
  await page.waitForFunction(
    () => new URL(location.href).searchParams.get("comparar") !== "region",
  );
  for (const id of ids) {
    await page
      .getByRole("group", { name: "Participantes de comparación" })
      .locator(`input[value="${id}"]`)
      .click();
    await page.waitForFunction(
      (id) =>
        new URL(location.href).searchParams.getAll("participante").includes(id),
      id,
    );
  }
  await visit("Explorar");
  check(
    "comparison survives navigation",
    new URL(page.url()).searchParams.getAll("participante").length === 3,
  );
  await page
    .getByRole("group", { name: "Institución principal", exact: true })
    .getByRole("button", { name: "Diputados", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Modo del período", exact: true })
    .getByRole("button", { name: "Rango", exact: true })
    .click();
  await page.getByLabel("Desde", { exact: true }).fill("2026-04");
  await page.getByLabel("Hasta", { exact: true }).fill("2026-04");
  await page.getByRole("button", { name: /^☰ Filtros/ }).click();
  await page.getByRole("dialog", { name: "Filtros de la consulta" }).waitFor();
  await screenshot("desktop-filtros");
  await page
    .getByRole("group", { name: "Regiones de representación" })
    .locator('input[value="biobio"]')
    .click();
  await page.waitForTimeout(120);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Gastos operacionales", exact: true })
    .click();
  await page.waitForTimeout(120);
  await page
    .getByLabel("Categoría de lectura", { exact: true })
    .selectOption("Traslados");
  await page.waitForTimeout(120);
  await page
    .getByRole("button", { name: "Ver resultados", exact: true })
    .click();
  const query = model.explorerQueryFromParams(
      new URL(page.url()).searchParams,
      data,
    ),
    expected = model.explorerMetrics(data, query);
  const moneyButton = page
    .getByRole("group", { name: "Indicadores de la selección" })
    .getByRole("button")
    .filter({ hasText: "Gastos operacionales" });
  check(
    "filtered money equals model",
    Number(
      (await moneyButton.locator("strong").innerText()).replace(/\D/g, ""),
    ) === expected.components.gastos.amount,
    { expected: expected.components.gastos.amount },
  );
  check(
    "region and institution retained",
    query.regionIds.includes("biobio") &&
      query.chamber === "camara" &&
      query.from === "2026-04" &&
      query.to === "2026-04",
  );
  await screenshot("desktop-consulta-biobio");
  const point = page.locator('svg [role="button"]').first();
  await point.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY),
    urlBefore = page.url();
  await point.focus();
  await point.press("Enter");
  await page.getByRole("dialog", { name: "Detalle contextual" }).waitFor();
  await screenshot("desktop-detalle");
  await page.keyboard.press("Escape");
  check("detail preserves filters", page.url() === urlBefore);
  check(
    "detail preserves scroll",
    Math.abs((await page.evaluate(() => scrollY)) - before) < 2,
  );
  check(
    "detail restores focus",
    await point.evaluate((el) => document.activeElement === el),
  );
  await point.press("Enter");
  await page.getByRole("dialog", { name: "Detalle contextual" }).waitFor();
  await page.mouse.click(10, 300);
  check(
    "backdrop closes detail",
    !(await page
      .getByRole("dialog", { name: "Detalle contextual" })
      .isVisible()),
  );
  await visit("Personal de apoyo");
  await page
    .getByRole("button", { name: "Cambiar el filtro a Personal de apoyo" })
    .click();
  await waitRecords();
  await screenshot("desktop-personal");
  await axe("desktop-personal");
  check(
    "staff keeps records without a redundant people block",
    !(await page.locator("#dashboard-workspace").innerText()).includes(
      "Composición de los equipos",
    ),
  );
  await visit("Registros");
  await waitRecords();
  await screenshot("desktop-registros");
  await axe("desktop-registros");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Exportar CSV/ }).click();
  const download = await downloadPromise;
  const csvPath = path.join(dir, "filtered-records.csv");
  await download.saveAs(csvPath);
  const parsed = [];
  await new Promise((resolve, reject) =>
    Readable.from(fs.readFileSync(csvPath))
      .pipe(
        csv({
          separator: ";",
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, ""),
        }),
      )
      .on("data", (r) => parsed.push(r))
      .on("end", resolve)
      .on("error", reject),
  );
  const current = model.explorerQueryFromParams(
      new URL(page.url()).searchParams,
      data,
    ),
    amount = parsed.reduce(
      (s, r) => s + (r["Monto CLP"] ? Number(r["Monto CLP"]) : 0),
      0,
    );
  check(
    "CSV equals filtered staff amounts",
    amount === model.explorerMetrics(data, current).components.personal.amount,
    { rows: parsed.length, amount },
  );
  const detailBefore = requests.filter((r) =>
    /\/data\/parliamentary-explorer\//.test(r.url),
  ).length;
  await visit("Panorama");
  await visit("Registros");
  await waitRecords();
  check(
    "loaded partitions reused",
    requests.filter((r) => /\/data\/parliamentary-explorer\//.test(r.url))
      .length === detailBefore,
  );
  const shared = page.url(),
    other = await context.newPage();
  await other.goto(shared, { waitUntil: "domcontentloaded" });
  await other
    .getByRole("region", { name: "Tabla de registros", exact: true })
    .waitFor({ timeout: 30000 });
  check("shared URL restored", other.url() === shared);
  await other.close();
  await visit("Panorama");
  const mobileQuery = new URL(page.url());
  mobileQuery.searchParams.delete("region");
  mobileQuery.searchParams.delete("partido");
  mobileQuery.searchParams.delete("parlamentario");
  mobileQuery.searchParams.delete("componente");
  mobileQuery.searchParams.set("categoria", "todas");
  mobileQuery.searchParams.set("metrica", "gastos");
  await page.goto(mobileQuery.toString(), { waitUntil: "domcontentloaded" });
  await ready();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [view, file] of [
    ["Panorama", "panorama"],
    ["Explorar", "explorar"],
    ["Comparar", "comparar"],
    ["Personal de apoyo", "personal"],
    ["Registros", "registros"],
  ]) {
    await visit(view);
    if (view === "Personal de apoyo" || view === "Registros")
      await waitRecords();
    check(
      "mobile overflow " + view,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await screenshot("mobile-" + file);
  }
  await visit("Panorama");
  await page
    .getByRole("button", { name: /^☰ Filtros/ })
    .scrollIntoViewIfNeeded();
  const mobileY = await page.evaluate(() => scrollY);
  await page.getByRole("button", { name: /^☰ Filtros/ }).click();
  await screenshot("mobile-filtros");
  await page.getByRole("button", { name: "Cerrar filtros" }).click();
  check(
    "mobile filter scroll stable",
    Math.abs((await page.evaluate(() => scrollY)) - mobileY) < 2,
  );
  await page
    .getByRole("group", { name: "Indicadores de la selección" })
    .getByRole("button")
    .filter({ hasText: "Gastos operacionales" })
    .click();
  await screenshot("mobile-detalle");
  await page.keyboard.press("Escape");
  for (const width of [360, 768, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    check(
      "responsive width " + width,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  check("no browser exceptions", errors.length === 0, errors);
  const cspErrors = consoleErrors.filter((m) =>
    /Content Security Policy|violates.*directive/i.test(m),
  );
  check("no CSP violations", cspErrors.length === 0, cspErrors);
  check(
    "no API requests",
    !requests.some((r) => new URL(r.url).pathname.startsWith("/api/")),
  );
  const report = {
    base,
    releaseId: data.releaseId,
    projectionId: data.projectionId,
    elapsedMs: Date.now() - start,
    checks,
    errors,
    accessibility,
    consoleErrors,
    initial,
    initialRequestCount,
    initialResponses: responses.slice(0, initialResponseCount),
    failedResponses: responses.filter((r) => r.status >= 400),
    staticDetailRequests: requests.filter((r) =>
      r.url.includes("/data/parliamentary-explorer/"),
    ),
    apiRequests: requests.filter((r) =>
      new URL(r.url).pathname.startsWith("/api/"),
    ),
  };
  fs.writeFileSync(
    path.join(dir, "browser-receipt.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      checks: checks.length,
      passed: checks.filter((c) => c.passed).length,
      errors,
      accessibility,
      initialDecoded: initial.navigation[0]?.decoded,
    }),
  );
} catch (error) {
  fs.writeFileSync(
    path.join(dir, "browser-failure.json"),
    JSON.stringify(
      { message: error.message, checks, errors, accessibility },
      null,
      2,
    ),
  );
  await page
    .screenshot({
      path: path.join(dir, "screenshots", "failure.png"),
      fullPage: false,
    })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
