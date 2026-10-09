/** Smoke de presentación contra el artefacto hidratado. Sin API ni D1.
 * No sustituye una validación funcional de la API ni certifica los documentos originales.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const baseUrl = (process.env.VERIFY_BASE_URL || "http://127.0.0.1:3003").replace(/\/$/, "");
const output = "artifacts/defensible";
const routes = ["/", "/movimientos/", "/votaciones-destacadas/", "/politico/", "/partidos/", "/partidos/rn/", "/politico/pedro-araya-guerrero/", "/gastos-operacionales/", "/remuneraciones-publicas/", "/municipalidades/", "/servicios-publicos/", "/transferencias/", "/entidades/", "/cruces/", "/personas/", "/funcionarios/", "/autoridades/", "/rankings/", "/comparar/", "/calculadora/", "/datos/", "/fuentes/", "/buscar/?q=kaiser", "/cambios/"];
const report = JSON.parse(await readFile(".ci-data-version/defensible-publication.json", "utf8"));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
const failures = [];
let blockedApiRequests = 0;
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    for (const theme of ["paper", "dark"]) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      // Interceptar antes de cargar: ninguna solicitud API alcanza un servidor o D1.
      await context.route("**/api/**", async (route) => { blockedApiRequests++; await route.abort(); });
      await context.addInitScript((value) => localStorage.setItem("cambiometro-theme", value), theme);
      const page = await context.newPage();
      for (const path of routes) {
        const errors = [];
        const onError = (error) => errors.push(error.message);
        page.on("pageerror", onError);
        try {
        const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
        assert.equal(response?.status(), 200, `${path}: HTTP`);
        assert(response.headers()["content-security-policy"], `${path}: CSP`);
        assert.equal(response.headers()["x-content-type-options"], "nosniff", `${path}: nosniff`);
        await page.locator('.site-header[data-hydrated="true"]').waitFor();
        await page.waitForFunction((value) => document.documentElement.getAttribute("data-theme") === value, theme);
        assert.equal(await page.locator('[aria-label="Alcance de la información"]').count(), 1, `${path}: aviso único`);
        await page.getByRole("link", { name: "Cómo interpretar los datos", exact: true }).waitFor();
        const body = await page.locator("body").innerText();
        if (path.startsWith("/partidos/")) {
          assert(body.includes("En revisión"), `${path}: agregado retirado`);
          assert(!body.includes("Mayor Gasto Operacional Total"), `${path}: ranking retirado`);
          assert(!body.includes("asignación mensual vigente"), `${path}: no sumar históricos como mensualidad`);
        }
        const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, body: document.body.scrollWidth }));
        assert(widths.body <= widths.viewport + 1, `${path}: overflow ${widths.body}/${widths.viewport}`);
        assert.deepEqual(errors, [], `${path}: errores JavaScript`);
        const unsafeLinks = await page.locator('a[target="_blank"]').evaluateAll((links) => links.filter((link) => !link.relList.contains("noopener") || !link.relList.contains("noreferrer")).map((link) => link.getAttribute("href")));
        assert.deepEqual(unsafeLinks, [], `${path}: enlaces externos seguros`);
        if (["/", "/partidos/", "/movimientos/", "/politico/pedro-araya-guerrero/"].includes(path)) {
          const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
          assert.deepEqual(axe.violations.map((v) => v.id), [], `${path}: accesibilidad`);
          const name = path === "/" ? "home" : path.split("/").filter(Boolean).join("-");
          await page.screenshot({ path: `${output}/${name}-${theme}-${viewport.width}.png`, fullPage: true });
        }
        checks.push({ path, theme, width: viewport.width, http: response.status(), scopeNotice: true });
        } catch (error) {
          const overflow = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 12).map((element) => ({ tag: element.tagName, className: element.className, width: element.getBoundingClientRect().width }))).catch(() => []);
          failures.push({ path, theme, width: viewport.width, message: error.message, overflow });
          console.error(`${path} ${theme} ${viewport.width}: ${error.message}`);
          await page.screenshot({ path: `${output}/failure-${failures.length}.png`, fullPage: true }).catch(() => {});
        } finally {
        page.off("pageerror", onError);
        }
      }
      await page.goto(`${baseUrl}/como-funciona/#alcance-publicacion`, { waitUntil: "domcontentloaded" });
      await page.locator("#alcance-publicacion").waitFor();
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/browser.json`, JSON.stringify({ baseUrl, checks, failures, blockedApiRequests, queriesD1: 0, dataWrites: 0, releaseSetChecksum: report.preflight.releaseSetChecksum, limitation: "Presentación con API indisponible; no certifica búsquedas productivas, API ni cobertura total." }, null, 2));
}
assert.deepEqual(failures, [], "Todas las rutas y temas deben superar las puertas; no publicar con fallos.");
console.log(JSON.stringify({ passed: checks.length, blockedApiRequests, queriesD1: 0, output }));
