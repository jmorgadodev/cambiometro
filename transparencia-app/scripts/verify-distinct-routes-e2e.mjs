import { chromium } from "playwright";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";

const BASE_URL = process.env.VERIFY_BASE_URL || "https://cambiometro.impulsacv.cl";
const screenshotDir = process.env.SCREENSHOT_DIR || os.tmpdir();

const DISTINCT_POLITICOS = [
  "/politico/fabiola-campillai-rojas",
  "/politico/vanessa-kaiser-barents-von-hohenhagen",
  "/politico/jorge-diaz-ibarra",
  "/politico/luis-malla-valenzuela",
  "/politico/stephanie-jeldrez-ortiz",
  "/politico/alvaro-jofre-caceres",
  "/politico/carlos-carvajal-gallardo",
  "/politico/ximena-naranjo-pinto",
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
  console.log("=== PLAYWRIGHT E2E: TEST DE RUTAS DISTINTAS, HEADER PC Y COSTO MENSUAL ===");
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
  console.log("\n2. Iniciando sesión interactiva y navegando rutas principales...");
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

  // 3. Navegación y comprobación de Header PC y Panel Costo Mensual en fichas
  console.log("\n3. Navegando consecutivamente por 8 fichas políticas distintas con Header PC y Costo Mensual...");
  for (const politicoRoute of DISTINCT_POLITICOS) {
    const res = await page.goto(`${BASE_URL}${politicoRoute}`, { waitUntil: "networkidle" });
    const content = await page.content();
    assert(!content.includes("This page couldn't load"), `Error en ${politicoRoute}: "This page couldn't load"`);
    assert(!content.includes("Application error"), `Error en ${politicoRoute}: Application error`);
    assert(!content.includes("Político no encontrado"), `Error en ${politicoRoute}: Político no encontrado`);

    // Validar presencia de elementos clave de la Tarea 14
    const dipCol = page.locator(".politico-header-dip-col");
    assert(await dipCol.count() > 0, `Header DIP column no encontrada en ${politicoRoute}`);

    const costoPanel = page.locator("#costo-mensual");
    assert(await costoPanel.count() > 0, `Panel Costo Mensual no encontrado en ${politicoRoute}`);

    console.log(`-> Ficha ${politicoRoute.padEnd(48)}: HTTP ${res.status()} [OK - Header PC & Costo Mensual presentes]`);
  }

  // 4. Captura Desktop de Becker, Kaiser y Campillai para reporte
  console.log("\n4. Capturando screenshots Desktop (1440px) de Becker, Kaiser y Campillai...");
  
  // Becker (Fix 14 verificación)
  await page.goto(`${BASE_URL}/politico/miguel-becker-alvear`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const beckerContent = await page.content();
  assert(beckerContent.includes("8.239.091"), "La dieta de Becker ($8.239.091) debe estar presente en el panel de costo");
  const beckerScreenshotPath = path.join(screenshotDir, "desktop-becker.png");
  await page.screenshot({ path: beckerScreenshotPath, fullPage: false });
  console.log(`-> Screenshot Desktop Becker: ${beckerScreenshotPath}`);

  // Campillai
  await page.goto(`${BASE_URL}/politico/fabiola-campillai-rojas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const campillaiScreenshotPath = path.join(screenshotDir, "desktop-campillai.png");
  await page.screenshot({ path: campillaiScreenshotPath, fullPage: false });
  console.log(`-> Screenshot Desktop Campillai: ${campillaiScreenshotPath}`);

  // Kaiser
  await page.goto(`${BASE_URL}/politico/vanessa-kaiser-barents-von-hohenhagen`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const kaiserContent = await page.content();
  assert(kaiserContent.includes("8.239.091"), "La dieta de Kaiser ($8.239.091) debe estar presente en el panel de costo");
  assert(kaiserContent.includes("4.582.550"), "Los gastos de Kaiser ($4.582.550) deben estar intactos");
  assert(kaiserContent.includes("ALTA"), "La alerta ALTA de Kaiser debe estar intacta");
  const kaiserScreenshotPath = path.join(screenshotDir, "desktop-kaiser.png");
  await page.screenshot({ path: kaiserScreenshotPath, fullPage: false });
  console.log(`-> Screenshot Desktop Kaiser: ${kaiserScreenshotPath}`);

  await browser.close();
  console.log("\n=== TODAS LAS PRUEBAS E2E DE RUTAS DISTINTAS Y TAREA 14 PASARON SATISFACTORIAMENTE ===");
}

runE2E().catch((err) => {
  console.error("FATAL ERROR EN E2E:", err);
  process.exit(1);
});
