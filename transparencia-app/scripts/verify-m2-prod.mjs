import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

// Verificación prod reducida para el gate M2 (R7).
// Se ejecuta solo contra producción y espacia cada request para no
// superar el rate limiter edge del worker (30 req/60s por IP).
const baseUrl = process.env.VERIFY_BASE_URL ?? "https://cambiometro.impulsacv.cl";
const screenshotDir = process.env.SCREENSHOT_DIR ?? tmpdir();
const paceMs = 2_800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pace = () => sleep(paceMs);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(45_000);
const consoleErrors = [];
page.on("pageerror", (error) => consoleErrors.push(String(error)));

async function gotoWithPace(url) {
  await pace();
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert(response?.ok(), `${url} HTTP ${response?.status() ?? "sin respuesta"}`);
  return response;
}

try {
  // 1) HTML servido de la home sin gtag (sin GA4_ID no debe haber scripts gtag)
  await pace();
  const homeResponse = await page.request.get(baseUrl);
  assert.equal(homeResponse.status(), 200, "home HTTP 200");
  const homeHtml = await homeResponse.text();
  assert(!homeHtml.includes("googletagmanager.com"), "el HTML servido no debe cargar googletagmanager sin GA4_ID");
  assert(!homeHtml.includes("gtag("), "el HTML servido no debe contener llamadas gtag sin GA4_ID");
  assert(homeResponse.headers()["content-security-policy"]?.includes("nonce-"), "home debe tener CSP con nonce");
  assert(homeResponse.headers()["content-security-policy"]?.includes("challenges.cloudflare.com"), "home CSP debe permitir Turnstile");

  // 2) /privacidad: 200, fecha de versión, canal, formulario y widget Turnstile real
  await gotoWithPace(`${baseUrl}/privacidad`);
  assert.equal(await page.getByRole("heading", { name: "Política de Privacidad" }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: /Tus derechos: acceso, rectificaci.n, cancelaci.n y oposici.n/ }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Envíanos tu solicitud" }).count(), 1);
  assert((await page.getByText(/Versión 19 de agosto de 2026/, { exact: false }).count()) === 1, "/privacidad debe mostrar su fecha de versión");
  assert((await page.getByText("datos@cambiometro.impulsacv.cl", { exact: false }).count()) > 0, "/privacidad debe exponer el canal del responsable");
  await page.locator("#form-solicitud").waitFor({ state: "visible", timeout: 10000 });
  const placeholder = page.locator(".cf-turnstile-placeholder");
  assert.equal(await placeholder.count(), 1, "el formulario debe renderizar el placeholder de Turnstile");
  // Turnstile crea el iframe del widget y lo inserta fuera del placeholder
  // (input oculto dentro, iframe hermano con src about:blank que navega a
  // challenges.cloudflare.com). Verificamos el input oculto y el frame.
  const hiddenInput = placeholder.locator("input[name='cf-turnstile-response']");
  await hiddenInput.waitFor({ state: "attached", timeout: 15000 });
  let widgetFrame = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    widgetFrame = page.frames().find((frame) => frame.url().includes("challenges.cloudflare.com"));
    if (widgetFrame) break;
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  assert(widgetFrame, "el widget Turnstile debe cargar un frame de challenges.cloudflare.com");
  assert(widgetFrame.url().includes("0x4AAAAAAEVKZOTbdd4h_AsT"), `el frame debe usar la site key real (url=${widgetFrame.url().slice(0, 160)})`);

  // 3) POST a /api/v1/requests con token dummy debe ser rechazado (403/422) — el dummy siempre falla
  await pace();
  const post = await page.request.post(`${baseUrl}/api/v1/requests`, {
    data: {
      tipo: "acceso",
      nombre: "Prueba prod",
      email: "prueba@example.com",
      descripcion: "Solicitud de prueba para verificación de producción (gate M2).",
      website: "",
      turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
    },
  });
  assert([403, 422].includes(post.status()), `token dummy debe ser rechazado (HTTP ${post.status()})`);

  // 4) /fuentes: 200, fecha de versión y catálogo
  await gotoWithPace(`${baseUrl}/fuentes`);
  assert.equal(await page.getByRole("heading", { name: "Fuentes y versiones" }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Catálogo de fuentes integradas" }).count(), 1);
  assert((await page.getByText(/Versión 19 de agosto de 2026/, { exact: false }).count()) === 1, "/fuentes debe mostrar su fecha de versión");

  // 5) Capturas R9 contra prod (320/390px)
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await gotoWithPace(`${baseUrl}/privacidad`);
    await page.locator("#form-solicitud").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(screenshotDir, `privacidad-${width}.png`), fullPage: true });

    await gotoWithPace(baseUrl);
    const banner = page.locator(".cookie-consent");
    await banner.waitFor({ state: "visible", timeout: 5000 });
    await page.screenshot({ path: join(screenshotDir, `cookie-banner-${width}.png`), fullPage: false });
  }

  assert.deepEqual(consoleErrors, [], `errores de consola: ${JSON.stringify(consoleErrors)}`);
  console.log("M2 prod checks passed: /privacidad y /fuentes 200 con versión, sin gtag, widget Turnstile real, capturas 320/390");
} finally {
  await browser.close();
}