/** Local-only boundary QA; run the main browser verifier first to prepare qa-model.cjs. */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "playwright";
const model = createRequire(import.meta.url)(
  path.resolve("artifacts/dashboard-explorer/qa-model.cjs"),
);
const data = model.unpackExplorer(
  JSON.parse(
    fs.readFileSync(
      "public/data/parliamentary-explorer/bootstrap.json",
      "utf8",
    ),
  ),
);
const base = "http://127.0.0.1:3201/dashboard/",
  checks = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
const check = (name, passed, detail) => {
  checks.push({ name, passed, detail });
  if (!passed) throw new Error(name);
};
async function ready() {
  await page
    .getByRole("navigation", { name: "Vistas del dashboard" })
    .waitFor();
  await page.locator('.site-header[data-hydrated="true"]').waitFor();
}
try {
  let aborted = false;
  await page.route("**/data/parliamentary-explorer/*.json", async (route) => {
    if (!aborted) {
      aborted = true;
      await route.abort("failed");
    } else await route.continue();
  });
  const q = {
    ...model.explorerDefaults(data),
    view: "registros",
    from: "2026-04",
    to: "2026-04",
    chamber: "camara",
    component: "personal",
    componentIds: ["personal"],
  };
  await page.goto(base + "?" + model.explorerParams(q));
  await ready();
  const retry = page.getByRole("button", { name: "Reintentar", exact: true });
  await retry.waitFor();
  check(
    "failed partition is visible and retryable",
    aborted && (await retry.isVisible()),
  );
  await page.screenshot({
    path: "artifacts/dashboard-explorer/screenshots/error-retry.png",
    fullPage: false,
  });
  await retry.click();
  await page
    .getByRole("region", { name: "Tabla de registros", exact: true })
    .locator("tbody tr")
    .first()
    .waitFor();
  check(
    "retry restores records",
    (await page
      .getByRole("region", { name: "Tabla de registros", exact: true })
      .locator("tbody tr")
      .count()) > 0,
  );
  const zero = data.facts.find(
    (f) =>
      f.amount === 0 &&
      f.component === "gastos" &&
      model.explorerMetrics(data, {
        ...model.explorerDefaults(data),
        from: f.period,
        to: f.period,
        member: f.memberId,
        memberIds: [f.memberId],
        component: f.component,
        componentIds: [f.component],
        category: f.category,
        item: f.item,
      }).components.gastos.amount === 0,
  );
  check("published zero fixture available", !!zero);
  const z = {
    ...model.explorerDefaults(data),
    from: zero.period,
    to: zero.period,
    member: zero.memberId,
    memberIds: [zero.memberId],
    component: zero.component,
    componentIds: [zero.component],
    category: zero.category,
    item: zero.item,
  };
  await page.goto(base + "?" + model.explorerParams(z));
  await ready();
  const card = page
    .getByRole("group", { name: "Indicadores de la selección" })
    .getByRole("button")
    .filter({ hasText: "Gastos operacionales" });
  await card
    .locator("strong")
    .filter({ hasText: /\$\s*0/ })
    .waitFor();
  const label = await card.locator("strong").innerText();
  check("published zero is shown as zero", /\$\s*0/.test(label), {
    zero,
    label,
    url: page.url(),
  });
  await page.screenshot({
    path: "artifacts/dashboard-explorer/screenshots/published-zero.png",
    fullPage: false,
  });
  await page.goto(
    base + "?" + model.explorerParams({ ...q, from: "2026-12", to: "2026-12" }),
  );
  await ready();
  await page
    .getByText("No hay registros publicados con esta selección.", {
      exact: false,
    })
    .waitFor();
  check(
    "absent month is not invented as zero",
    await page
      .getByText("La ausencia no acredita un monto cero.", { exact: false })
      .isVisible(),
  );
  await page.screenshot({
    path: "artifacts/dashboard-explorer/screenshots/empty-period.png",
    fullPage: false,
  });
} finally {
  fs.writeFileSync(
    "artifacts/dashboard-explorer/boundary-receipt.json",
    JSON.stringify({ checks }, null, 2),
  );
  await browser.close();
}
console.log(JSON.stringify({ checks }));
