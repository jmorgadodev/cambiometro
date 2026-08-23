import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3000";

const REQUIRED_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "content-security-policy",
];

const HEADER_ROUTES = [
  "/",
  "/entidades/person-infoprobidad-9204ac804e1f43cc8c3e62f712a15764",
  "/datos",
  "/cruces",
  "/municipalidades/muni-maipu",
  "/funcionarios",
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(30_000);

async function gotoWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }
  throw lastError;
}

try {
  // S1: las 6 cabeceras en las 6 rutas representativas.
  for (const route of HEADER_ROUTES) {
    const response = await gotoWithRetry(`${baseUrl}${route}`);
    assert(response?.ok(), `${route} HTTP ${response?.status() ?? "sin respuesta"}`);
    const headers = response.headers();
    for (const header of REQUIRED_HEADERS) {
      assert(headers[header], `${route} no tiene cabecera ${header}`);
      assert(headers[header].length > 0, `${route} tiene ${header} vacía`);
    }
    assert(/max-age=\d+/.test(headers["strict-transport-security"]), `${route} HSTS sin max-age`);
    assert(headers["strict-transport-security"].includes("includeSubDomains"), `${route} HSTS sin includeSubDomains`);
    assert.equal(headers["x-frame-options"], "DENY", `${route} X-Frame-Options no es DENY`);
    assert.equal(headers["x-content-type-options"], "nosniff", `${route} nosniff ausente`);
    assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin", `${route} Referrer-Policy incorrecta`);
    assert(/camera=\(\)/.test(headers["permissions-policy"]), `${route} Permissions-Policy no bloquea camera`);
    assert(/microphone=\(\)/.test(headers["permissions-policy"]), `${route} Permissions-Policy no bloquea microphone`);
    assert(/geolocation=\(\)/.test(headers["permissions-policy"]), `${route} Permissions-Policy no bloquea geolocation`);
    assert(headers["content-security-policy"].includes("script-src"), `${route} CSP sin script-src`);
  }

  // S4: sin reflexión XSS en la búsqueda (API y DOM).
  const xssPayload = `<img src=x onerror="window.__xss_pwned=1">`;
  const searchResponse = await page.request.get(`${baseUrl}/api/v1/search`, {
    params: { q: xssPayload },
  });
  assert.equal(searchResponse.status(), 200, "búsqueda con payload XSS debe responder 200");
  const contentType = searchResponse.headers()["content-type"] ?? "";
  assert(contentType.includes("application/json"), "búsqueda debe responder JSON, no HTML");
  const searchBody = await searchResponse.text();
  assert(!/<img[^>]*onerror/i.test(searchBody), "el payload XSS no debe reflejarse como HTML en el JSON");

  await gotoWithRetry(`${baseUrl}/`);
  await page.evaluate(() => {
    window.__xss_pwned = undefined;
  });
  const input = page.locator('input[type="search"], input[placeholder*="uscar"], #omnibox, input[aria-label*="uscar"]').first();
  if ((await input.count()) > 0) {
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.fill(xssPayload, { force: true });
    await page.waitForTimeout(600);
    const pwned = await page.evaluate(() => window.__xss_pwned);
    assert.equal(pwned, undefined, "el payload XSS se ejecutó en el DOM");
    const bodyText = await page.locator("body").innerText();
    assert(!bodyText.includes("onerror="), "el payload aparece sin escapar en el DOM visible");
  }

  console.log(`[OK] verify-security: ${HEADER_ROUTES.length} rutas con 6 cabeceras; búsqueda sin reflexión XSS.`);
} finally {
  await browser.close();
}
