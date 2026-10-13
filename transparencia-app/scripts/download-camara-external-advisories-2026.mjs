import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { parseCamaraExternalAdvisories, planCamaraAdvisoryMonths, validateCamaraAdvisoryRows } from "./etl/camara-external-advisories.mjs";

const sourceUrl = "https://www.camara.cl/transparencia/asesoriasexternasgral.aspx";
const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const args = process.argv.slice(2);
const value = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const incremental = Boolean(value("--dataset"));
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" }).format(new Date());
const periods = incremental
  ? planCamaraAdvisoryMonths(JSON.parse(fs.readFileSync(path.resolve(value("--dataset")), "utf8")), today)
  : monthNames.slice(0, 10).map((_, index) => `2026-${String(index + 1).padStart(2, "0")}`);
const outputDir = path.resolve(os.homedir(), "Downloads", "Camara de diputados", "Asesorias externas 2026");
const manifestPath = path.resolve(value("--manifest") ?? path.join(outputDir, "imports-2026.json"));
const retryStatePath = path.join(outputDir, "retry-state-2026.json");
const monthSelector = "#ContentPlaceHolder1_ContentPlaceHolder1_ddlMes";
const yearSelector = "#ContentPlaceHolder1_ContentPlaceHolder1_ddlAno";
const exportButton = "#btnExportar2";
const table = "#tabla";

fs.mkdirSync(outputDir, { recursive: true });
if (!periods.length) {
  fs.writeFileSync(manifestPath, "[]\n", "utf8");
  process.stdout.write("No hay meses nuevos de asesorías dentro del alcance 2026.\n");
  process.exit(0);
}
const retryState = fs.existsSync(retryStatePath)
  ? JSON.parse(fs.readFileSync(retryStatePath, "utf8"))
  : { consecutiveBlocks: 0 };
if (retryState.retryAfter) {
  const retryAt = Date.parse(retryState.retryAfter);
  if (Number.isFinite(retryAt) && retryAt > Date.now()) {
    if (incremental) throw new Error(`CAMARA_RETRY_DEFERRED:${retryState.retryAfter}`);
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
const imports = periods.flatMap((period) => {
  const file = `AsesoriaExterna-${period}.xls`;
  const destination = path.join(outputDir, file);
  if (!fs.existsSync(destination) || !fs.statSync(destination).size) return [];
  if (!incremental) return [{ file, period }];
  const receipt = JSON.parse(fs.readFileSync(`${destination}.receipt.json`, "utf8"));
  const checksum = createHash("sha256").update(fs.readFileSync(destination)).digest("hex");
  if (receipt.period !== period || receipt.sourceUrl !== sourceUrl || receipt.checksumSha256 !== checksum) {
    throw new Error(`CAMARA_CACHED_EXPORT_EVIDENCE_INVALID:${period}`);
  }
  return [{ file: destination, period, rows: receipt.rows }];
});
const browser = await chromium.launch({ channel: "chrome", headless: incremental });
const page = await browser.newPage({ acceptDownloads: true });
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
  for (const [index, period] of periods.entries()) {
    const month = monthNames[Number(period.slice(5)) - 1];
    const file = `AsesoriaExterna-${period}.xls`;
    const destination = path.join(outputDir, file);
    if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
      results.push({ period, rows: null, status: "already_downloaded" });
      continue;
    }
    const response = await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if ([403, 429].includes(response?.status())) {
      const error = new Error(`CAMARA_PAGE_HTTP_${response.status()}:${period}`);
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
    for (const [selector, label] of [[yearSelector, "2026"], [monthSelector, month]]) {
      if ((await page.locator(`${selector} option:checked`).innerText()).trim() !== label) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60_000 }),
          page.locator(selector).selectOption({ label }, { timeout: 30_000 }),
        ]);
      }
    }
    if ((await page.locator(`${yearSelector} option:checked`).innerText()).trim() !== "2026"
      || (await page.locator(`${monthSelector} option:checked`).innerText()).trim() !== month) {
      throw new Error(`CAMARA_SELECTED_PERIOD_MISMATCH:${period}`);
    }
    await page.locator(table).waitFor({ state: "visible", timeout: 30_000 });
    const tableRows = page.locator(`${table} tr`);
    const headers = await tableRows.first().innerText({ timeout: 10_000 });
    if (!["Folio", "Asesor", "Monto", "Diputado"].every((field) => headers.includes(field))) {
      throw new Error(`CAMARA_TABLE_HEADERS_INVALID:${period}`);
    }
    const rowCount = Math.max(0, await tableRows.count() - 1);
    process.stdout.write(`${period}: ${rowCount} filas visibles\n`);
    if (rowCount === 0) {
      results.push({ period, rows: 0, status: "unpublished_not_zero" });
      break;
    }
    const displayedRows = parseCamaraExternalAdvisories(await page.locator(table).evaluate((element) => element.outerHTML));
    validateCamaraAdvisoryRows(displayedRows, rowCount);
    const downloadPromise = page.waitForEvent("download", { timeout: 120_000 })
      .then((download) => ({ download }), (error) => ({ error }));
    await page.locator(exportButton).click({ timeout: 30_000 });
    const result = await downloadPromise;
    if (result.error) throw result.error;
    const { download } = result;
    const partial = `${destination}.partial`;
    await download.saveAs(partial);
    const exportedRows = parseCamaraExternalAdvisories(fs.readFileSync(partial, "utf8"));
    validateCamaraAdvisoryRows(exportedRows, rowCount);
    const content = (rows) => rows.map((row) => JSON.stringify(row.values)).sort().join("\n");
    if (content(displayedRows) !== content(exportedRows)) throw new Error(`CAMARA_EXPORT_TABLE_MISMATCH:${period}`);
    fs.renameSync(partial, destination);
    fs.writeFileSync(`${destination}.receipt.json`, `${JSON.stringify({ sourceUrl, period, rows: rowCount,
      retrievedAt: new Date().toISOString(), checksumSha256: createHash("sha256").update(fs.readFileSync(destination)).digest("hex") })}\n`);
    imports.push({ file: incremental ? destination : file, period, rows: rowCount });
    results.push({ period, rows: rowCount, status: "downloaded", file: destination });
    retryState.consecutiveBlocks = 0;
    delete retryState.retryAfter;
    delete retryState.blockedPeriod;
    saveRetryState(retryState);
    // Pausa solicitada entre descargas, no espera de carga del DOM.
    if (index < periods.length - 1) await page.waitForTimeout(5 * 60_000);
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
