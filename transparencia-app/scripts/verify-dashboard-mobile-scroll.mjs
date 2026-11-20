/** Regression: mobile filters never move the dashboard viewport. Works on local/preview/production. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const base = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3017";
const browser = await chromium.launch();
const checks = [], errors = [];
try {
 for (const width of [390, 320]) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/dashboard/", { waitUntil: "networkidle" });
  const consent = page.getByRole("button", { name: "Rechazar", exact: true }); if (await consent.isVisible()) await consent.click();
  const panel = page.getByRole("complementary", { name: "Filtros del dashboard" });
  const close = () => page.getByRole("button", { name: /^← Ocultar filtros/ });
  const open = () => page.getByRole("button", { name: /^☰ Mostrar filtros/ });
  await close().click();
  await page.locator('section[aria-labelledby="dashboard-monthly-bars"]').scrollIntoViewIfNeeded();
  const initial = await page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight }));
  assert.ok(initial.y > 400);
  for (const method of ["toolbar", "panel", "escape"]) {
   await open().click(); await panel.waitFor();
   await page.waitForFunction(() => document.activeElement.id === "dashboard-filters-heading");
   assert.ok(Math.abs(await page.evaluate(() => scrollY) - initial.y) <= 2, `${width}: open moved page`);
   assert.equal(await page.evaluate(() => document.documentElement.scrollHeight), initial.height);
   const bounds = await panel.boundingBox(); assert.ok(bounds.y >= 50 && bounds.y + bounds.height <= 845);
   await panel.evaluate(el => el.scrollTop = el.scrollHeight);
   assert.ok(await panel.evaluate(el => el.scrollTop > 0));
   if (method === "toolbar") await close().click();
   else if (method === "panel") { await panel.evaluate(el => el.scrollTop = 0); await panel.getByRole("button", { name: "Ocultar filtros", exact: true }).click(); }
   else await page.keyboard.press("Escape");
   assert.equal(await panel.isVisible(), false);
   assert.ok(Math.abs(await page.evaluate(() => scrollY) - initial.y) <= 2, `${width}: ${method} close moved page`);
   assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-controls")), "dashboard-filters");
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   checks.push(`${width}px: open / ${method} close preserves scroll, layout and focus`);
  }
  await context.close();
 }
 assert.deepEqual(errors, []);
 fs.mkdirSync("artifacts/dashboard", { recursive: true });
 fs.writeFileSync("artifacts/dashboard/mobile-scroll-receipt.json", JSON.stringify({ base, checks, errors }, null, 2));
 console.log({ checks: checks.length, errors });
} finally { await browser.close(); }
