import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const baseUrl = (process.env.VERIFY_BASE_URL || "http://127.0.0.1:3003").replace(/\/$/, "");
const outputDir = process.env.THEME_SCREENSHOTS_DIR || join(process.cwd(), "artifacts", "themes");
const routes = [
  ["home", "/"],
  ["politico", "/politico/vanessa-kaiser-barents-von-hohenhagen"],
  ["partidos", "/partidos"],
  ["cruces", "/cruces"],
];
const expected = {
  paper: { "--bg": "#F6F5F2", "--surface": "#FFFFFF", "--border": "#E4E2DC", "--text": "#101828", "--muted": "#475467", "--accent": "#0E7C66", "--highlight": "#B45309", "--link": "#0E7C66", "--success": "#067647", "--warning": "#B54708", "--danger": "#B42318", "--focus": "#0E7C66" },
  dark: { "--bg": "#151719", "--surface": "#1D2023", "--border": "#2A2E33", "--text": "#E8E6E1", "--muted": "#A3A8AD", "--accent": "#34B39A", "--highlight": "#E8A33D", "--link": "#3FBFA8", "--success": "#4CC38A", "--warning": "#F5A524", "--danger": "#F97066", "--focus": "#34B39A" },
  night: { "--bg": "#0A0B0B", "--surface": "#121313", "--border": "#1F2222", "--text": "#D6D3CC", "--muted": "#8B8E89", "--accent": "#2FA08C", "--highlight": "#C98A3D", "--link": "#3AA793", "--success": "#3DA97C", "--warning": "#D19236", "--danger": "#E0655C", "--focus": "#2FA08C" },
};

const normalizeHex = (value) => {
  const hex = value.toUpperCase();
  return /^#[0-9A-F]{3}$/.test(hex) ? `#${[...hex.slice(1)].map((digit) => digit + digit).join("")}` : hex;
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const [routeName, route] of routes) {
  for (const theme of Object.keys(expected)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.evaluate((value) => { localStorage.setItem("cambiometro-theme", value); document.documentElement.setAttribute("data-theme", value); }, theme);
    await page.reload({ waitUntil: "networkidle", timeout: 30_000 });
    const result = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return { theme: document.documentElement.getAttribute("data-theme"), tokens: Object.fromEntries(["--bg", "--surface", "--border", "--text", "--muted", "--accent", "--highlight", "--link", "--success", "--warning", "--danger", "--focus"].map((name) => [name, style.getPropertyValue(name).trim().toUpperCase()])), spinner: /Cargando contenido|Cargando municipalidades|Cargando transferencias|Cargando funcionarios/i.test(document.body.innerText) };
    });
    for (const [name, value] of Object.entries(expected[theme])) if (normalizeHex(result.tokens[name]) !== normalizeHex(value)) failures.push(`${route} ${theme} ${name}: ${result.tokens[name]} != ${value}`);
    if (result.theme !== theme) failures.push(`${route} ${theme}: persistencia data-theme falló`);
    if (result.spinner) failures.push(`${route} ${theme}: spinner activo`);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const violation of axe.violations) failures.push(`${route} ${theme} axe ${violation.id}: ${violation.nodes.length} nodos`);
    await page.screenshot({ path: join(outputDir, `${routeName}-${theme}.png`), fullPage: true });
    await context.close();
    if (consoleErrors.length) failures.push(`${route} ${theme}: errores consola ${consoleErrors.join(" | ")}`);
  }
}
await browser.close();
console.log(JSON.stringify({ baseUrl, screenshots: routes.length * Object.keys(expected).length, checkedRoutes: routes.map(([, route]) => route), failures }, null, 2));
if (failures.length) process.exit(1);
