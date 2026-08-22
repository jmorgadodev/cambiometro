import { chromium } from "playwright";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";

const BASE_URL = process.env.VERIFY_BASE_URL || "https://cambiometro.impulsacv.cl";
const screenshotDir = process.env.SCREENSHOT_DIR || os.tmpdir();

async function runE2E() {
  console.log("=== PLAYWRIGHT E2E: VERIFICACIÓN DEL ORBE Y SPLASH ===");
  console.log(`Target URL: ${BASE_URL}`);

  // 1. Splash SSR en HTML crudo (sin JavaScript)
  console.log("1. Verificando HTML inicial del servidor...");
  const rawHtmlRes = await fetch(BASE_URL);
  const rawHtml = await rawHtmlRes.text();
  assert(rawHtml.includes('id="initial-splash-orb"'), "HTML SSR debe contener #initial-splash-orb");
  assert(rawHtml.includes("loading-orb"), "HTML SSR debe contener clases del LoadingOrb");
  console.log("-> HTML inicial contiene id=\"initial-splash-orb\" y clases del LoadingOrb [OK]");

  // 2. Render de Splash Inicial en navegador sin JS
  console.log("2. Comprobando render del Splash Inicial...");
  const browserNoJs = await chromium.launch();
  const contextNoJs = await browserNoJs.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const pageNoJs = await contextNoJs.newPage();
  await pageNoJs.goto(BASE_URL, { waitUntil: "commit" });
  
  const splashLocator = pageNoJs.locator("#initial-splash-orb");
  await splashLocator.waitFor({ state: "visible", timeout: 5000 });
  const isSplashVisible = await splashLocator.isVisible();
  assert(isSplashVisible, "El splash inicial debe ser visible antes de la hidratación");
  
  const splashScreenshotPath = path.join(screenshotDir, "splash-inicial-ssr.png");
  await pageNoJs.screenshot({ path: splashScreenshotPath });
  console.log(`-> Captura del splash inicial guardada en: ${splashScreenshotPath}`);
  await browserNoJs.close();

  // 3. Navegación en navegador completo
  console.log("3. Navegando a Home e interactuando...");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const link = page.locator('.site-nav a[href="/politico"], .site-footer a[href="/politico"]').first();
  await link.waitFor({ state: "visible", timeout: 10000 });
  const targetHref = await link.getAttribute("href");
  console.log(`-> Enlace encontrado para navegación: ${targetHref}`);

  // 4. Click en enlace y captura de transición
  console.log("4. Ejecutando navegación interactiva y capturando transición...");
  await link.click({ noWaitAfter: true });

  const transitionScreenshotPath = path.join(screenshotDir, "transicion-orbe-activa.png");
  await page.screenshot({ path: transitionScreenshotPath });
  console.log(`-> Captura de transición con orbe guardada en: ${transitionScreenshotPath}`);

  // 5. Esperar a que la navegación finalice
  await page.waitForURL(`**${targetHref}*`, { timeout: 15000 });
  console.log(`-> Navegación completada exitosamente a ${page.url()}`);

  const content = await page.content();
  assert(!content.includes("This page couldn't load"), "No debe mostrar pantalla de error");

  await browser.close();
  console.log("\n=== TODAS LAS VERIFICACIONES E2E DEL ORBE PASARON SATISFACTORIAMENTE ===");
}

runE2E().catch((err) => {
  console.error("Error en E2E:", err);
  process.exit(1);
});
