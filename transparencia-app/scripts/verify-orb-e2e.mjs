import assert from "node:assert/strict";
import { chromium } from "playwright";
import path from "node:path";
import { tmpdir } from "node:os";

const screenshotDir = process.env.SCREENSHOT_DIR || tmpdir();

async function runE2E() {
  console.log("=== PLAYWRIGHT E2E: VERIFICACIÓN DEL ORBE Y SPLASH ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const baseUrl = "http://127.0.0.1:3000";

  // 1. Verificación del HTML SSR del Splash Inicial
  console.log("1. Verificando HTML inicial del servidor...");
  const initialRes = await page.request.get(baseUrl);
  const initialHtml = await initialRes.text();
  assert(
    initialHtml.includes('id="initial-splash-orb"'),
    "El HTML inicial debe incluir el splash SSR del orbe"
  );
  assert(
    initialHtml.includes("loading-orb"),
    "El splash SSR debe contener las clases del orbe"
  );
  console.log("-> HTML inicial contiene id=\"initial-splash-orb\" y clases del LoadingOrb [OK]");

  // 2. Captura del Splash Inicial antes de la hidratación
  console.log("2. Comprobando render del Splash Inicial...");
  // Deshabilitar JS temporalmente para capturar el estado visual del HTML puro (SSR)
  const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(`${baseUrl}/politico/vanessa-kaiser-barents-von-hohenhagen`, { waitUntil: "commit" });
  const splashEl = await noJsPage.$("#initial-splash-orb");
  assert(splashEl, "El elemento de splash inicial existe en el DOM SSR");
  
  const splashScreenshotPath = path.join(screenshotDir, "splash-inicial-ssr.png");
  await noJsPage.screenshot({ path: splashScreenshotPath });
  console.log(`-> Captura del splash inicial guardada en: ${splashScreenshotPath}`);
  await noJsContext.close();

  // 3. Navegación Client-Side con Transición de Orbe
  console.log("3. Navegando a Home e interactuando...");
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // Comprobar que tras la hidratación el splash se retiró
  await page.waitForTimeout(400);
  const splashAfter = await page.$("#initial-splash-orb");
  assert(!splashAfter, "El splash inicial debe eliminarse del DOM tras hidratar");
  console.log("-> Splash inicial eliminado limpiamente tras hidratación [OK]");

  // Buscar un enlace interno de navegación en el header
  const link = page.locator('.site-nav a[href="/politico"], .site-footer a[href="/politico"]').first();
  await link.waitFor({ state: "visible", timeout: 10000 });
  const targetHref = await link.getAttribute("href");
  console.log(`-> Enlace encontrado para navegación: ${targetHref}`);

  // Preparar intercepción y captura en mitad de la transición
  console.log("4. Ejecutando click y capturando orbe durante transición...");
  
  // Realizar click
  await link.click();

  // El overlay se activa en <= 150ms
  const overlayLocator = page.locator(".route-transition-overlay");
  await overlayLocator.waitFor({ state: "visible", timeout: 2000 });
  const isOverlayVisible = await overlayLocator.isVisible();
  assert(isOverlayVisible, "El overlay de transición con LoadingOrb debe ser visible durante la navegación");
  console.log("-> Overlay .route-transition-overlay está VISIBLE durante la transición [OK]");

  // Tomar captura a mitad de la transición
  const transitionScreenshotPath = path.join(screenshotDir, "transicion-orbe-activa.png");
  await page.screenshot({ path: transitionScreenshotPath });
  console.log(`-> Captura de transición con orbe guardada en: ${transitionScreenshotPath}`);

  // Esperar a que la navegación finalice
  await page.waitForURL(`**${targetHref}*`, { timeout: 15000 });
  console.log(`-> Navegación completada a ${page.url()}`);

  // Esperar a que el overlay se oculte (tras minDuration de 350ms y fade de 200ms)
  await page.waitForTimeout(700);
  const isOverlayHiddenAfter = !(await overlayLocator.isVisible());
  assert(isOverlayHiddenAfter, "El overlay debe ocultarse tras completar la navegación");
  console.log("-> Overlay se oculta suavemente tras montar el nuevo contenido [OK]");

  await browser.close();
  console.log("\n=== TODAS LAS VERIFICACIONES E2E DEL ORBE PASARON SATISFACTORIAMENTE ===");
}

runE2E().catch((err) => {
  console.error("Error en E2E:", err);
  process.exit(1);
});
