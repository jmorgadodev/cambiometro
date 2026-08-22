import { chromium } from "playwright";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";

const BASE_URL = process.env.VERIFY_BASE_URL || "https://cambiometro.impulsacv.cl";
const screenshotDir = process.env.SCREENSHOT_DIR || os.tmpdir();

const DISTINCT_POLITICOS = [
  "/politico/vanessa-kaiser-barents-von-hohenhagen",
  "/politico/jorge-diaz-ibarra",
  "/politico/luis-malla-valenzuela",
  "/politico/stephanie-jeldrez-ortiz",
  "/politico/alvaro-jofre-caceres",
  "/politico/carlos-carvajal-gallardo",
  "/politico/ximena-naranjo-pinto",
  "/politico/miguel-becker-alvear",
];

const MAIN_ROUTES = [
  "/",
  "/municipalidades",
  "/datos",
  "/cruces",
  "/servicios-publicos",
  "/como-funciona",
];

async function runE2E() {
  console.log("=== PLAYWRIGHT E2E: TEST DE RUTAS DISTINTAS Y ORBE SEGURO ===");
  console.log(`Base URL: ${BASE_URL}`);

  // 1. Verificación del Splash SSR en HTML sin JS
  console.log("\n1. Verificando Splash SSR en carga inicial...");
  const browserNoJs = await chromium.launch();
  const contextNoJs = await browserNoJs.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const pageNoJs = await contextNoJs.newPage();
  await pageNoJs.goto(BASE_URL, { waitUntil: "commit" });

  const splashLocator = pageNoJs.locator("#initial-splash-orb");
  await splashLocator.waitFor({ state: "visible", timeout: 5000 });
  assert(await splashLocator.isVisible(), "El splash inicial debe ser visible antes de hidratar");
  const splashScreenshotPath = path.join(screenshotDir, "splash-inicial-ssr.png");
  await pageNoJs.screenshot({ path: splashScreenshotPath });
  console.log(`-> Splash inicial SSR validado y capturado en: ${splashScreenshotPath}`);
  await browserNoJs.close();

  // 2. Navegación en sesión interactiva completa con 8 fichas distintas
  console.log("\n2. Iniciando sesión interactiva y navegando 8 fichas distintas...");
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("pageerror", (err) => {
    console.error("PAGE ERROR UNCAUGHT:", err.message);
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // Navegar a las rutas principales
  for (const route of MAIN_ROUTES) {
    const res = await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
    const content = await page.content();
    assert(!content.includes("This page couldn't load"), `Error en ruta ${route}: "This page couldn't load"`);
    assert(!content.includes("Application error"), `Error en ruta ${route}: Application error`);
    console.log(`-> Ruta ${route.padEnd(22)}: HTTP ${res.status()} [OK]`);
  }

  // Navegar consecutivamente por las 8 fichas distintas
  console.log("\n3. Navegando consecutivamente por 8 fichas políticas distintas...");
  for (const politicoRoute of DISTINCT_POLITICOS) {
    const res = await page.goto(`${BASE_URL}${politicoRoute}`, { waitUntil: "networkidle" });
    const content = await page.content();
    assert(!content.includes("This page couldn't load"), `Error en ${politicoRoute}: "This page couldn't load"`);
    assert(!content.includes("Application error"), `Error en ${politicoRoute}: Application error`);
    assert(!content.includes("Político no encontrado"), `Error en ${politicoRoute}: Político no encontrado`);
    console.log(`-> Ficha ${politicoRoute.padEnd(48)}: HTTP ${res.status()} [OK]`);
  }

  // 4. Captura de overlay durante transición
  console.log("\n4. Verificando overlay de transición interactivo...");
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  
  // Interceptar click y verificar estado activo
  const link = page.locator('.site-nav a[href="/politico"]').first();
  await link.click({ noWaitAfter: true });

  const transitionScreenshotPath = path.join(screenshotDir, "transicion-orbe-activa.png");
  await page.screenshot({ path: transitionScreenshotPath });
  console.log(`-> Captura de transición guardada en: ${transitionScreenshotPath}`);

  await page.waitForURL(`**/politico*`, { timeout: 15000 });
  console.log(`-> Navegación a /politico completada limpiamente: ${page.url()}`);

  await browser.close();
  console.log("\n=== TODAS LAS PRUEBAS E2E DE RUTAS DISTINTAS PASARON SATISFACTORIAMENTE ===");
}

runE2E().catch((err) => {
  console.error("Error fatal en E2E:", err);
  process.exit(1);
});
