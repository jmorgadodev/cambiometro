/** Local-only acceptance flows for the existing parliamentary explorer refinement. No ETL or deployment. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const base = process.env.EXPLORER_QA_BASE ?? "http://127.0.0.1:3201";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base))
  throw new Error("Local verification only");
const dir = path.resolve("artifacts/dashboard-refinement");
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
const defaults = model.explorerDefaults(data),
  checks = [],
  errors = [],
  requests = [],
  consoleErrors = [],
  responses = [],
  accessibility = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 1000 },
  reducedMotion: "reduce",
});
context.on("request", (r) =>
  requests.push({
    path: new URL(r.url()).pathname,
    type: r.resourceType(),
    time: Date.now(),
  }),
);
context.on("response", (r) =>
  responses.push({ url: r.url(), status: r.status() }),
);
context.on("page", (p) => {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const views = () =>
  page.getByRole("navigation", { name: "Vistas del dashboard" });
const panel = () => page.getByRole("dialog", { name: "Detalle contextual" });
const institutions = () =>
  page.getByRole("group", { name: "Institución principal", exact: true });
const periods = () =>
  page.getByRole("group", { name: "Modo del período", exact: true });
const query = () => new URL(page.url()).searchParams;
const ids = () => query().getAll("participante");
const check = (name, passed, detail) => {
  checks.push({ name, passed: !!passed, detail });
  console.log(JSON.stringify({ check: name, passed: !!passed }));
  if (!passed) throw new Error(name + ": " + JSON.stringify(detail));
};
async function ready() {
  await views().waitFor({ timeout: 60000 });
  await page
    .locator('.site-header[data-hydrated="true"]')
    .waitFor({ timeout: 60000 });
  await page.locator("#dashboard-workspace").waitFor();
}
async function consent() {
  const b = page.getByRole("button", { name: "Rechazar", exact: true });
  if (await b.isVisible()) await b.click();
}
async function visit(view) {
  await views()
    .getByRole("button", { name: new RegExp("^" + view + "(?:\\s|$)") })
    .click();
  await page.waitForFunction(
    (v) =>
      document
        .querySelector(
          'nav[aria-label="Vistas del dashboard"] button[aria-current="page"]',
        )
        ?.textContent?.startsWith(v),
    view,
  );
}
async function param(key, value) {
  await page.waitForFunction(
    ([key, value]) => new URL(location.href).searchParams.get(key) === value,
    [key, value],
  );
}
async function added(key, before) {
  await page.waitForFunction(
    ([key, before]) =>
      new URL(location.href).searchParams.getAll(key).length > before,
    [key, before],
  );
}
async function shot(name) {
  await page.screenshot({
    path: path.join(dir, "screenshots", name + ".png"),
    fullPage: true,
  });
}
async function navigate(patch) {
  await page.goto(
    base + "/dashboard/?" + model.explorerParams({ ...defaults, ...patch }),
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await ready();
  await consent();
}
async function closePanel() {
  await page.keyboard.press("Escape");
  await panel().waitFor({ state: "hidden" });
}
async function openFirstRanking() {
  const region = page.getByRole("region", {
    name: "Ranking configurable",
    exact: true,
  });
  await region.locator("tbody tr").first().getByRole("button").first().click();
  await panel().waitFor();
}
async function addFromPanel() {
  const before = ids().length;
  await panel()
    .getByRole("button", { name: /Agregar.*comparaci[oó]n/ })
    .first()
    .click();
  await added("participante", before);
}
async function assertAxe(name) {
  const result = await new AxeBuilder({ page })
    .include("#dashboard-workspace")
    .analyze();
  const violations = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
  }));
  accessibility.push({ name, violations });
  check(
    "accessibility " + name,
    !violations.some((v) => ["critical", "serious"].includes(v.impact)),
    violations,
  );
}
async function recordsReady() {
  await page
    .getByRole("region", { name: "Tabla de registros", exact: true })
    .locator("tbody tr")
    .first()
    .waitFor({ timeout: 30000 });
}
async function captureDownload(button, name) {
  const pending = page.waitForEvent("download");
  await button.click();
  const downloaded = await pending;
  const target = path.join(dir, name);
  await downloaded.saveAs(target);
  return fs.readFileSync(target, "utf8");
}
const started = Date.now();
let initial;
try {
  await navigate({ view: "panorama" });
  initial = await page.evaluate(() => ({
    navigation: performance.getEntriesByType("navigation").map((n) => ({
      transfer: n.transferSize,
      decoded: n.decodedBodySize,
      domContentLoaded: n.domContentLoadedEventEnd,
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
    "main institution control available without drawer",
    await institutions().isVisible(),
  );
  check(
    "main period mode available without drawer",
    await periods().isVisible(),
  );
  await institutions()
    .getByRole("button", { name: "Senado", exact: true })
    .click();
  await param("camara", "senado");
  check(
    "Senate selection updates model cohort",
    !query().getAll("parlamentario").length &&
      query().get("camara") === "senado",
  );
  await institutions()
    .getByRole("button", { name: "Diputados", exact: true })
    .click();
  await param("camara", "camara");
  check(
    "Deputies selection updates all views",
    query().get("camara") === "camara",
  );
  await periods().getByRole("button", { name: "Un mes", exact: true }).click();
  await page
    .getByLabel("Mes de consulta", { exact: true })
    .selectOption("2026-04");
  await param("desde", "2026-04");
  await param("hasta", "2026-04");
  check(
    "one month sets both period boundaries",
    query().get("desde") === query().get("hasta"),
  );
  await periods().getByRole("button", { name: "Rango", exact: true }).click();
  await page.getByLabel("Desde", { exact: true }).fill("2026-03");
  await param("desde", "2026-03");
  await page.getByLabel("Hasta", { exact: true }).fill("2026-06");
  await param("hasta", "2026-06");
  check(
    "range remains available",
    query().get("desde") === "2026-03" && query().get("hasta") === "2026-06",
  );
  await institutions()
    .getByRole("button", { name: "Ambas cámaras", exact: true })
    .click();
  await param("camara", "ambas");
  const add = page
    .getByRole("button", { name: /^Agregar .+ a comparación$/ })
    .first();
  const firstLabel = await add.getAttribute("aria-label");
  const globalBefore = new URLSearchParams(query());
  await add.click();
  await added("participante", 0);
  const firstId = ids()[0];
  check(
    "Panorama comparison does not navigate or mutate global filters",
    query().get("vista") === "panorama" &&
      ["camara", "desde", "hasta"].every(
        (k) => query().get(k) === globalBefore.get(k),
      ),
    { firstId, firstLabel },
  );
  const counter = views().getByRole("button", { name: /^Comparar/ });
  await counter.getByText("1", { exact: true }).waitFor();
  check(
    "comparison counter updates immediately",
    await counter.getByText("1", { exact: true }).isVisible(),
  );
  const already = page
    .getByRole("button", { name: firstLabel ?? /En comparación/, exact: true })
    .first();
  if (await already.count()) {
    if (!(await already.isDisabled())) await already.click();
  }
  check("same participant is not duplicated", ids().length === 1);
  await visit("Explorar");
  await openFirstRanking();
  if (
    (await panel()
      .getByRole("button", { name: /Agregar.*comparaci[oó]n/ })
      .count()) === 0
  )
    throw new Error("Member detail lacks comparison action");
  await addFromPanel();
  const selectedAfterTwo = [...ids()];
  check(
    "Explorar adds without replacing Panorama selection",
    selectedAfterTwo.length === 2 && selectedAfterTwo.includes(firstId),
    selectedAfterTwo,
  );
  if (await panel().isVisible()) await closePanel();
  await visit("Comparar");
  check(
    "participants survive navigation",
    selectedAfterTwo.every((id) => ids().includes(id)),
  );
  const remove = page
    .getByRole("button", { name: /^Quitar .* de comparación$/ })
    .first();
  await remove.click();
  await page.waitForFunction(
    () =>
      new URL(location.href).searchParams.getAll("participante").length === 1,
  );
  check("individual removal preserves another participant", ids().length === 1);
  await visit("Explorar");
  await openFirstRanking();
  const kept = [...ids()];
  await panel()
    .getByRole("button", { name: "Agregar al filtro global", exact: true })
    .click();
  await added("parlamentario", 0);
  check(
    "global filter preserves prepared comparison",
    kept.every((id) => ids().includes(id)),
  );
  if (await panel().isVisible()) await closePanel();
  // Reset only global filters using the product action; comparison must remain.
  await page
    .getByRole("button", { name: "Restablecer filtros", exact: true })
    .click();
  await page.waitForFunction(
    () => !new URL(location.href).searchParams.getAll("parlamentario").length,
  );
  check(
    "reset global filters keeps participants",
    kept.every((id) => ids().includes(id)),
  );
  const territorial = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Exploración territorial",
      exact: true,
    }),
  });
  const regionButtons = territorial.getByRole("button", {
    name: /^Detalle de /,
  });
  const regionNames = [];
  for (let i = 0; i < 2; i++) {
    regionNames.push(await regionButtons.nth(i).getAttribute("aria-label"));
    await regionButtons.nth(i).click();
    await panel().waitFor();
    await panel()
      .getByRole("button", { name: "Agregar al filtro global", exact: true })
      .click();
    await added("region", i);
    if (await panel().isVisible()) await closePanel();
  }
  check(
    "context adds multiple regions progressively",
    query().getAll("region").length === 2,
    { regionNames },
  );
  check(
    "progressive filters do not clear comparison",
    kept.every((id) => ids().includes(id)),
  );
  const saved = page.url();
  await page.getByRole("button", { name: /^☰ Filtros/ }).click();
  await page.getByRole("dialog", { name: "Filtros de la consulta" }).waitFor();
  await shot("desktop-filtros");
  await page.keyboard.press("Escape");
  check(
    "Escape closes filters without losing URL",
    page.url() === saved &&
      !(await page
        .getByRole("dialog", { name: "Filtros de la consulta" })
        .isVisible()),
  );
  await navigate({ view: "panorama", from: "2026-04", to: "2026-06" });
  const composition = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: /^Composición · Gastos operacionales/,
    }),
  });
  await composition.locator('svg [role="button"]').first().click();
  await panel().waitFor();
  const monetary = panel().getByRole("region", {
    name: "Desglose monetario",
    exact: true,
  });
  if (await monetary.count()) {
    const amounts = await monetary
      .locator("[data-amount]")
      .evaluateAll((items) =>
        items.map((el) => Number(el.getAttribute("data-amount"))),
      );
    check(
      "category detail ordered numerically descending",
      amounts.length > 0 &&
        amounts.every((v, i) => i === 0 || amounts[i - 1] >= v),
      amounts,
    );
  } else {
    const amounts = await panel()
      .locator("details summary strong")
      .allTextContents();
    const numbers = amounts.map((v) => Number(v.replace(/[^\d-]/g, "")));
    check(
      "category detail ordered numerically descending",
      numbers.length > 0 &&
        numbers.every((v, i) => i === 0 || numbers[i - 1] >= v),
      numbers,
    );
  }
  check(
    "category panel omits unrelated component metrics",
    !(await panel().innerText()).includes("Asesorías externas"),
  );
  await shot("desktop-categoria");
  const detailUrl = page.url(),
    y = await page.evaluate(() => scrollY);
  await closePanel();
  check(
    "detail close preserves URL and scroll",
    page.url() === detailUrl &&
      Math.abs((await page.evaluate(() => scrollY)) - y) < 2,
  );
  const timeline = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Evolución mensual",
      exact: true,
    }),
  });
  const series = page.getByLabel("Serie de evolución", { exact: true });
  if ((await series.getAttribute("role")) === "group")
    await series
      .getByRole("button", { name: "Asesorías externas", exact: true })
      .click();
  else await series.selectOption("asesorias");
  await page.waitForFunction(() =>
    Array.from(
      document.querySelectorAll(
        'svg[aria-label^="Evolución mensual"] [role="button"]',
      ),
    ).every((el) =>
      el.getAttribute("aria-label")?.includes("Asesorías externas"),
    ),
  );
  const points = timeline.locator('svg [role="button"]');
  check(
    "timeline selects a single relevant monetary series",
    (await points.count()) > 0,
  );
  await page.goBack();
  await param("metrica", "gastos");
  check(
    "timeline follows browser back without a stale local series",
    (await page
      .getByRole("group", { name: "Serie de evolución" })
      .getByRole("button", { name: "Gastos operacionales", exact: true })
      .getAttribute("aria-pressed")) === "true",
  );
  await page.goForward();
  await param("metrica", "asesorias");
  await visit("Explorar");
  await page
    .getByLabel("Componente analizado", { exact: true })
    .selectOption("personal");
  await param("metrica", "personal");
  await visit("Panorama");
  check(
    "timeline follows the shared analysis component",
    (await page
      .getByRole("group", { name: "Serie de evolución" })
      .getByRole("button", { name: "Personal de apoyo", exact: true })
      .getAttribute("aria-pressed")) === "true",
  );
  await points.first().focus();
  await points.first().press("Enter");
  await panel().waitFor();
  await shot("desktop-mes");
  await panel()
    .getByRole("button", {
      name: /Aplicar.*filtro global|Agregar al filtro global/,
    })
    .first()
    .click();
  if (await panel().isVisible()) await closePanel();
  check(
    "timeline month can be applied explicitly",
    query().get("desde") === query().get("hasta"),
  );
  await navigate({
    view: "personal",
    from: "2026-04",
    to: "2026-04",
    chamber: "camara",
    component: "personal",
    componentIds: ["personal"],
  });
  await recordsReady();
  const mainText = await page.locator("#dashboard-workspace").innerText();
  check(
    "redundant team composition and permanent methodological prose removed",
    !mainText.includes("Composición de los equipos") &&
      !mainText.includes("no acreditables") &&
      !mainText.includes("Se conservan las observaciones de cada mes"),
  );
  const roles = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Montos informados por cargo",
      exact: true,
    }),
  });
  await roles.locator('svg [role="button"]').first().click();
  await panel().waitFor();
  const roleText = await panel().innerText();
  check(
    "support role detail contains only relevant component",
    !roleText.includes("Gastos operacionales") &&
      !roleText.includes("Asesorías externas") &&
      !roleText.includes("Dieta de referencia"),
  );
  check(
    "technical evidence is collapsed",
    (await panel().locator("details[open]").count()) === 0,
  );
  await shot("desktop-cargo");
  await closePanel();
  const teams = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Personal de apoyo por parlamentario",
      exact: true,
    }),
  });
  await teams.locator('svg [role="button"]').first().click();
  await panel().waitFor();
  await shot("desktop-equipo-mes");
  check(
    "single month team detail is available",
    (await panel().innerText()).includes("2026-04"),
  );
  const teamText = await panel().innerText();
  check(
    "contracts are not labelled as people",
    !teamText.includes("personas únicas") &&
      !teamText.includes("total combinado"),
  );
  await page.mouse.click(10, 300);
  await panel().waitFor({ state: "hidden" });
  check("outside click closes detail", !(await panel().isVisible()));
  await visit("Registros");
  await recordsReady();
  const csvText = await captureDownload(
    page.getByRole("button", { name: /^Exportar CSV/ }),
    "registros.csv",
  );
  check(
    "CSV retains official period money and release",
    csvText.includes("2026-04") &&
      csvText.includes("Monto CLP") &&
      csvText.includes(data.releaseId),
  );
  const recordSearch = page.getByRole("region", {
    name: "Tabla de registros",
    exact: true,
  });
  const searchInput = page.getByLabel("Buscar en los registros", {
    exact: true,
  });
  await searchInput.fill("zzzz-no-existing-record");
  await page.waitForFunction(
    () => !document.querySelector('[aria-label="Tabla de registros"] tbody tr'),
  );
  check(
    "record search updates results",
    (await recordSearch.locator("tbody tr").count()) === 0,
  );
  await searchInput.fill("");
  await recordsReady();
  const baseline = model.explorerMetrics(data, defaults);
  const supported = new Set(
    model
      .filterExplorerFacts(data, defaults)
      .filter((f) => f.component === "personal" && f.recordCount > 0)
      .map((f) => f.memberId),
  );
  const supportCoverage = {
    members: baseline.members,
    withSupport: supported.size,
    withoutSupport: model
      .explorerMembers(data, defaults)
      .filter((m) => !supported.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, chamber: m.chamber })),
  };
  fs.writeFileSync(
    path.join(dir, "support-coverage.json"),
    JSON.stringify(supportCoverage, null, 2),
  );
  check(
    "support coverage discrepancy is documented without invented teams",
    supportCoverage.members ===
      supportCoverage.withSupport + supportCoverage.withoutSupport.length,
    supportCoverage,
  );
  await navigate({
    view: "panorama",
    from: "2026-04",
    to: "2026-06",
    compareBy: "member",
    compareIds: selectedAfterTwo,
  });
  const svgText = await captureDownload(
    page.getByRole("button", { name: "Exportar SVG", exact: true }).first(),
    "panorama.svg",
  );
  check(
    "SVG retains title period and provenance",
    svgText.includes("El Cambiómetro") &&
      svgText.includes("2026") &&
      svgText.includes("Fuentes:"),
  );
  for (const [view, file] of [
    ["Panorama", "panorama"],
    ["Explorar", "explorar"],
    ["Comparar", "comparar"],
    ["Personal de apoyo", "personal"],
    ["Registros", "registros"],
  ]) {
    await visit(view);
    if (["Personal de apoyo", "Registros"].includes(view)) await recordsReady();
    await shot("desktop-" + file);
    await assertAxe("desktop-" + file);
  }
  const shared = page.url();
  const other = await context.newPage();
  await other.goto(shared, { waitUntil: "domcontentloaded" });
  await other
    .getByRole("navigation", { name: "Vistas del dashboard" })
    .waitFor();
  check("shared query round trips", other.url() === shared);
  await other.close();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [view, file] of [
    ["Panorama", "panorama"],
    ["Explorar", "explorar"],
    ["Comparar", "comparar"],
    ["Personal de apoyo", "personal"],
    ["Registros", "registros"],
  ]) {
    await visit(view);
    if (["Personal de apoyo", "Registros"].includes(view)) await recordsReady();
    check(
      "mobile no page overflow " + view,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await shot("mobile-" + file);
  }
  await visit("Panorama");
  await page
    .getByRole("button", { name: /^☰ Filtros/ })
    .scrollIntoViewIfNeeded();
  const mobileY = await page.evaluate(() => scrollY);
  await page.getByRole("button", { name: /^☰ Filtros/ }).click();
  await shot("mobile-filtros");
  await page
    .getByRole("button", { name: "Cerrar filtros", exact: true })
    .click();
  check(
    "mobile filters preserve scroll",
    Math.abs((await page.evaluate(() => scrollY)) - mobileY) < 2,
  );
  await page
    .getByRole("group", { name: "Indicadores de la selección" })
    .getByRole("button")
    .filter({ hasText: "Gastos operacionales" })
    .click();
  await panel().waitFor();
  await shot("mobile-detalle");
  await closePanel();
  for (const width of [360, 768, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    check(
      "responsive " + width,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  check("no browser exceptions", errors.length === 0, errors);
  check(
    "no CSP violations",
    !consoleErrors.some((m) =>
      /Content Security Policy|violates.*directive/i.test(m),
    ),
    consoleErrors,
  );
  check(
    "no API or D1 requests",
    !requests.some((r) => /^\/api\/|\/d1\//i.test(r.path)),
  );
  fs.writeFileSync(
    path.join(dir, "browser-receipt.json"),
    JSON.stringify(
      {
        base,
        releaseId: data.releaseId,
        projectionId: data.projectionId,
        elapsedMs: Date.now() - started,
        checks,
        errors,
        consoleErrors,
        accessibility,
        initial,
        failedResponses: responses.filter((r) => r.status >= 400),
        apiRequests: requests.filter((r) => r.path.startsWith("/api/")),
        supportCoverage,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      checks: checks.length,
      passed: checks.filter((c) => c.passed).length,
    }),
  );
} catch (error) {
  fs.writeFileSync(
    path.join(dir, "browser-failure.json"),
    JSON.stringify(
      { message: error.message, checks, errors, consoleErrors },
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
