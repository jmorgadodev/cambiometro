import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const sourceUrl = "https://www.camara.cl/transparencia/asesoriasexternasgral.aspx";
const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre"];
const outputDir = path.resolve(os.homedir(), "Downloads", "Camara de diputados", "Asesorias externas 2026");
const manifestPath = path.join(outputDir, "imports-2026.json");
const retryStatePath = path.join(outputDir, "retry-state-2026.json");
const monthSelector = "#ContentPlaceHolder1_ContentPlaceHolder1_ddlMes";
const yearSelector = "#ContentPlaceHolder1_ContentPlaceHolder1_ddlAno";
const exportButton = "#btnExportar2";
const table = "#tabla";

fs.mkdirSync(outputDir, { recursive: true });
const retryState = fs.existsSync(retryStatePath)
  ? JSON.parse(fs.readFileSync(retryStatePath, "utf8"))
  : { consecutiveBlocks: 0 };
if (retryState.retryAfter) {
  const retryAt = Date.parse(retryState.retryAfter);
  if (Number.isFinite(retryAt) && retryAt > Date.now()) {
    process.stdout.write(`Bloqueo temporal de la Cámara; reintento automático para ${retryState.blockedPeriod} después del enfriamiento.\n`);
    while (Date.now() < retryAt) {
      const seconds = Math.ceil((retryAt - Date.now()) / 1000);
      process.stdout.write(`Intento ${retryState.consecutiveBlocks}; quedan ${Math.floor(seconds / 60)} min ${seconds % 60} s.\n`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(60_000, retryAt - Date.now())));
    }
  } else {
    delete retryState.retryAfter;
    delete retryState.blockedPeriod;
  }
}
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ acceptDownloads: true });
const imports = months.flatMap((_, index) => {
  const period = `2026-${String(index + 1).padStart(2, "0")}`;
  const file = `AsesoriaExterna-${period}.xls`;
  return fs.existsSync(path.join(outputDir, file)) && fs.statSync(path.join(outputDir, file)).size > 0
    ? [{ file, period }]
    : [];
});
const results = [];
const dialogs = [];
const saveRetryState = (state) => fs.writeFileSync(retryStatePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
page.on("dialog", async (dialog) => {
  dialogs.push({ type: dialog.type, message: dialog.message() });
  if (dialog.type === "confirm") {
    await dialog.accept();
    return;
  }
  await dialog.dismiss();
});

try {
  for (const [index, month] of months.entries()) {
    const period = `2026-${String(index + 1).padStart(2, "0")}`;
    const file = `AsesoriaExterna-${period}.xls`;
    const destination = path.join(outputDir, file);
    if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
      results.push({ period, rows: null, status: "already_downloaded" });
      continue;
    }
    const response = await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (response?.status() === 403) {
      const error = new Error(`CAMARA_PAGE_HTTP_403:${period}`);
      error.blockedPeriod = period;
      throw error;
    }
    if (!response?.ok()) throw new Error(`CAMARA_PAGE_HTTP_${response?.status() ?? "NO_RESPONSE"}`);
    try {
      await page.locator(table).waitFor({ state: "visible", timeout: 30_000 });
    } catch {
      const body = (await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")).slice(0, 240);
      throw new Error(`CAMARA_TABLE_UNAVAILABLE:${await page.title()}:${body}`);
    }
    if (!(await page.locator(monthSelector).count()) || !(await page.locator(yearSelector).count())) {
      throw new Error("CAMARA_MONTH_YEAR_SELECTORS_MISSING");
    }
    await page.locator(yearSelector).selectOption({ label: "2026" }, { timeout: 30_000 });
    await page.locator(monthSelector).selectOption({ label: month }, { timeout: 30_000 });
    await page.locator(table).waitFor({ state: "visible", timeout: 30_000 });
    const tableRows = page.locator(`${table} tr`);
    const headers = await tableRows.first().innerText({ timeout: 10_000 });
    if (!["Folio", "Asesor", "Monto", "Diputado"].every((field) => headers.includes(field))) {
      throw new Error(`CAMARA_TABLE_HEADERS_INVALID:${period}`);
    }
    const rowCount = Math.max(0, await tableRows.count() - 1);
    process.stdout.write(`${period}: ${rowCount} filas visibles\n`);
    if (rowCount === 0) {
      results.push({ period, rows: 0, status: "empty" });
      continue;
    }
    const downloadPromise = page.waitForEvent("download", { timeout: 120_000 })
      .then((download) => ({ download }), (error) => ({ error }));
    await page.locator(exportButton).click({ timeout: 30_000 });
    const result = await downloadPromise;
    if (result.error) throw result.error;
    const { download } = result;
    await download.saveAs(destination);
    if (!fs.statSync(destination).size) throw new Error(`CAMARA_EXPORT_EMPTY_FILE:${period}`);
    imports.push({ file, period });
    results.push({ period, rows: rowCount, status: "downloaded", file: destination });
    retryState.consecutiveBlocks = 0;
    delete retryState.retryAfter;
    delete retryState.blockedPeriod;
    saveRetryState(retryState);
    await page.waitForTimeout(5 * 60_000);
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(imports, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ sourceUrl, outputDir, manifestPath, results }, null, 2)}\n`);
} catch (error) {
  if (imports.length) fs.writeFileSync(manifestPath, `${JSON.stringify(imports, null, 2)}\n`, "utf8");
  if (error?.blockedPeriod || String(error?.message).includes("HTTP_403")) {
    const attempt = (Number(retryState.consecutiveBlocks) || 0) + 1;
    const cooldownMinutes = Math.min(30 * (2 ** (attempt - 1)), 360);
    retryState.consecutiveBlocks = attempt;
    retryState.blockedPeriod = error.blockedPeriod ?? String(error.message).split(":").at(-1);
    retryState.lastBlockedAt = new Date().toISOString();
    retryState.retryAfter = new Date(Date.now() + cooldownMinutes * 60_000).toISOString();
    retryState.cooldownMinutes = cooldownMinutes;
    saveRetryState(retryState);
  }
  const pageState = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  process.stderr.write(`${JSON.stringify({ error: error?.message ?? String(error), retry: retryState.retryAfter ? { attempt: retryState.consecutiveBlocks, retryAfter: retryState.retryAfter, cooldownMinutes: retryState.cooldownMinutes, stateFile: retryStatePath } : undefined, outputDir, manifestPath, results, dialogs, page: pageState.slice(0, 500) }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
