import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const base = process.env.EXPLORER_QA_BASE ?? "http://127.0.0.1:3200";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw Error("Local only");
const dir = "artifacts/identity-normative/screenshots";
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1366, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const checks = [],
  errors = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => requests.push(r.url()));
const check = (n, v) => {
  checks.push({ name: n, passed: !!v });
  if (!v) throw Error(n);
};
async function ready() {
  await page
    .locator('.site-header[data-hydrated="true"]')
    .waitFor({ timeout: 60000 });
  const no = page.getByRole("button", { name: "Rechazar", exact: true });
  if (await no.isVisible()) await no.click();
}
async function panel() {
  await page
    .getByRole("dialog", { name: "Alcance normativo", exact: true })
    .waitFor();
  return page.getByRole("dialog", { name: "Alcance normativo", exact: true });
}
try {
  await page.goto(
    base + "/dashboard/?desde=2026-04&hasta=2026-04&vista=panorama",
  );
  await ready();
  const info = page
    .getByRole("button", { name: /^Información normativa/ })
    .first();
  await info.click();
  let p = await panel();
  check(
    "central definition appears in dashboard",
    (await p.innerText()).includes("Resolución N.º 12"),
  );
  await p.getByRole("button", { name: "Qué no permite", exact: true }).click();
  check(
    "explicit communication exclusions available",
    (await p.innerText()).includes("Propaganda"),
  );
  await p.getByRole("button", { name: "Restricciones", exact: true }).click();
  check(
    "restrictions and official references available",
    (await p.innerText()).includes("Fuente oficial"),
  );
  const axe = await new AxeBuilder({ page }).include("dialog[open]").analyze();
  check(
    "normative panel accessibility",
    !axe.violations.some((v) => ["critical", "serious"].includes(v.impact)),
  );
  await page.screenshot({
    path: path.join(dir, "dashboard-normativa.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  check(
    "Escape restores focus",
    await info.evaluate((e) => document.activeElement === e),
  );
  await page.goto(base + "/como-funciona/");
  await ready();
  await page.locator("#catalogo-normativo").scrollIntoViewIfNeeded();
  check(
    "complete catalog uses central version",
    await page.locator("#catalogo-normativo").isVisible(),
  );
  await page
    .locator("#catalogo-normativo")
    .getByRole("button", {
      name: "Información normativa: Comunicación",
      exact: true,
    })
    .click();
  p = await panel();
  check(
    "historic versions retained",
    (await p.innerText()).includes("Resolución N.º 11") &&
      (await p.innerText()).includes("Resolución N.º 12"),
  );
  await page.screenshot({
    path: path.join(dir, "metodologia-normativa.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await page.goto(base + "/politico/paulina-vodanovic-rojas/#seccion-asesores");
  await ready();
  await page
    .getByRole("button", {
      name: "Información normativa: Personal de apoyo",
      exact: true,
    })
    .click();
  p = await panel();
  check(
    "profile uses shared staff definition",
    (await p.innerText()).includes("Personal de apoyo"),
  );
  await page.screenshot({
    path: path.join(dir, "ficha-personal-normativa.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", {
      name: "Información normativa: Personal de apoyo",
      exact: true,
    })
    .click();
  p = await panel();
  check(
    "mobile panel fits",
    await p.evaluate((el) => el.getBoundingClientRect().width <= innerWidth),
  );
  await page.screenshot({
    path: path.join(dir, "movil-normativa.png"),
    fullPage: false,
  });
  await p
    .getByRole("button", { name: "Cerrar normativa", exact: true })
    .click();
  check("no browser exceptions", errors.length === 0);
  check(
    "no dynamic API requests",
    !requests.some((u) => new URL(u).pathname.startsWith("/api/")),
  );
} finally {
  fs.writeFileSync(
    "artifacts/identity-normative/browser-receipt.json",
    JSON.stringify({ checks, errors, requests }, null, 2),
  );
  await browser.close();
}
console.log(
  JSON.stringify({
    checks: checks.length,
    passed: checks.filter((c) => c.passed).length,
  }),
);
