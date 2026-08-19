import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  CGR_CENTRAL_AREAS, CGR_CONSOLIDATED_API_URL, CGR_INDEX_URL, CGR_REGIONS,
  normalizeCgrConsolidatedProducts, normalizeCgrReports,
} from "./etl/connectors/contraloria.mjs";
import { stableStringify } from "./etl/core.mjs";
import { buildLakePlan } from "./etl/lake.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(argument("--year") ?? new Date().getUTCFullYear());
const areaLimit = Number(argument("--areas") ?? CGR_CENTRAL_AREAS.length);
const regionLimit = Number(argument("--regions") ?? CGR_REGIONS.length);
const python = argument("--python") ?? process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
if (!Number.isInteger(year) || year < 2000 || year > new Date().getUTCFullYear()) throw new Error("INVALID_YEAR");
if (!Number.isInteger(areaLimit) || areaLimit < 0 || areaLimit > CGR_CENTRAL_AREAS.length) throw new Error("INVALID_AREA_LIMIT");
if (!Number.isInteger(regionLimit) || regionLimit < 0 || regionLimit > CGR_REGIONS.length) throw new Error("INVALID_REGION_LIMIT");
if (areaLimit === 0 && regionLimit === 0) throw new Error("EMPTY_CGR_SCOPE");
const outputRoot = resolve(argument("--output") ?? join(root, "data", "lake"));
if (outputRoot === root || dirname(outputRoot) === outputRoot) throw new Error("INVALID_OUTPUT_PATH");
const workRoot = join(outputRoot, ".work", `contraloria-${year}`);
const reuseDetails = process.argv.includes("--reuse-details");
const reportCachePath = join(workRoot, "report-input.json");
mkdirSync(workRoot, { recursive: true });

function clean(value) {
  return String(value ?? "").replace(/\r/g, "").trim();
}

async function fetchConsolidatedProducts() {
  const products = [];
  let expectedTotal = null;
  for (let page = 0; page < 100; page += 1) {
    const response = await fetch(CGR_CONSOLIDATED_API_URL, {
      method: "POST", headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ search: "", exact_search: false, options: [], order: null, date_name: "fecha_documento", source: "consolidados", page }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`CGR_CONSOLIDATED_HTTP_${response.status}`);
    const payload = await response.json();
    const hits = payload?.hits?.hits;
    if (!Array.isArray(hits) || !Number.isSafeInteger(payload?.hits?.total?.value)) throw new Error("CGR_CONSOLIDATED_INVALID_RESPONSE");
    expectedTotal ??= payload.hits.total.value;
    for (const hit of hits) {
      const sourceUrl = hit?._source?.documento_cic_pdf_web ?? hit?._source?.documento_cra_pdf_web ?? hit?._source?.documento_radar_pdf_web;
      products.push({
        officialId: String(hit?._id ?? ""), number: hit?._source?.numero, publishedAt: hit?._source?.fecha_documento,
        productType: hit?._source?.tipo, title: hit?._source?.nombre, summary: hit?._source?.resena,
        unit: hit?._source?.unidad_cgr, sector: hit?._source?.sector, sourceUrl,
        printableDocumentUrl: hit?._source?.documento_cic_pdf_imprimible ?? hit?._source?.documento_cra_pdf_imprimible ?? hit?._source?.documento_radar_pdf_imprimible ?? hit?._source?.enlace_extra ?? null,
        documentId: `consolidated-${hit?._id}`,
      });
    }
    process.stderr.write(`${JSON.stringify({ phase: "consolidated_api", page, records: products.length, expectedTotal })}\n`);
    if (products.length >= expectedTotal || hits.length === 0) break;
  }
  if (products.length !== expectedTotal || new Set(products.map((item) => item.officialId)).size !== products.length) throw new Error("CGR_CONSOLIDATED_INCOMPLETE_RESPONSE");
  return products;
}

async function downloadConsolidatedDocuments(products) {
  for (const product of products) {
    try {
      const response = await fetch(product.sourceUrl, { signal: AbortSignal.timeout(90_000) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF");
      const pdfPath = join(workRoot, `${product.documentId}.pdf`);
      writeFileSync(pdfPath, bytes);
      product.pdfPath = pdfPath;
      product.documentChecksumSha256 = createHash("sha256").update(bytes).digest("hex");
      product.documentSize = bytes.byteLength;
    } catch (error) {
      product.documentError = "CGR_PDF_DOWNLOAD_FAILED";
      process.stderr.write(`${JSON.stringify({ phase: "consolidated_pdf_error", report: product.number, error: error instanceof Error ? error.message : String(error) })}\n`);
    }
  }
}

async function detailFields(page) {
  const labels = new Set(["Número", "Fecha", "Tipo de Informe", "Unidad CGR", "Servicio", "Nivel", "Área", "Nombre de Informe", "Destinatarios", "Objetivos", "Universo", "Muestra", "Conclusiones o Dictamen"]);
  const rows = await page.locator("tr").evaluateAll((elements) => elements.map((row) => [...row.querySelectorAll(":scope > td")].map((cell) => cell.innerText.trim())));
  const fields = {};
  for (const cells of rows) for (let index = 0; index < cells.length - 1; index += 1) {
    if (labels.has(cells[index])) fields[cells[index]] = cells[index + 1];
  }
  return fields;
}

let rawReports = [];

async function collectListing(page, context) {
  const reportRows = page.locator("tr:has(td)");
  const rowCount = await reportRows.count();
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = reportRows.nth(rowIndex);
    const cells = (await row.locator(":scope > td").allInnerTexts()).map(clean);
    if (!/^\d+\/\d{4}$/.test(cells[0] ?? "") || !cells[1]?.endsWith(String(year))) continue;
    const popupPromise = page.waitForEvent("popup", { timeout: 30_000 });
    await row.locator("a").first().click();
    const detail = await popupPromise;
    try {
      await detail.waitForLoadState("domcontentloaded");
      const fields = await detailFields(detail);
      const detailUrl = new URL(detail.url());
      const documentId = detailUrl.searchParams.get("docIdcm");
      if (!documentId) throw new Error(`CGR_MISSING_DOCUMENT_ID: ${cells[0]}`);
      for (const key of [...detailUrl.searchParams.keys()]) if (key !== "docIdcm") detailUrl.searchParams.delete(key);
      const report = {
        reportNumber: fields["Número"] || cells[0], publishedDate: fields["Fecha"] || cells[1], reportType: fields["Tipo de Informe"] || cells[2],
        title: fields["Nombre de Informe"] || cells[3], level: fields.Nivel || (context.region ? "Regional" : "Central"),
        unit: fields["Unidad CGR"] || null, area: fields["Área"] || context.area || "Regional", region: context.region || null,
        service: fields.Servicio || null, objectives: fields.Objetivos || null, universe: fields.Universo || null,
        sample: fields.Muestra || null, conclusions: fields["Conclusiones o Dictamen"] || null,
        documentId, sourceUrl: detailUrl.toString(), documentError: null,
      };
      try {
        const downloadPromise = detail.waitForEvent("download", { timeout: 30_000 });
        await detail.locator("#cil1").click();
        const download = await downloadPromise;
        const pdfPath = join(workRoot, `${documentId}.pdf`);
        await download.saveAs(pdfPath);
        const bytes = readFileSync(pdfPath);
        report.pdfPath = pdfPath;
        report.documentChecksumSha256 = createHash("sha256").update(bytes).digest("hex");
        report.documentSize = bytes.byteLength;
      } catch (error) {
        process.stderr.write(`${JSON.stringify({ phase: "pdf_download_error", report: cells[0], error: error instanceof Error ? error.message : String(error) })}\n`);
        report.documentError = "CGR_PDF_DOWNLOAD_FAILED";
      }
      rawReports.push(report);
      process.stderr.write(`${JSON.stringify({ phase: "report_details", scope: context.region ? "regional" : "central", area: context.area ?? null, region: context.region ?? null, report: cells[0], records: rawReports.length })}\n`);
    } finally {
      await detail.close();
    }
  }
}

if (reuseDetails) {
  if (!existsSync(reportCachePath)) throw new Error("CGR_REPORT_CACHE_NOT_FOUND");
  const cache = JSON.parse(readFileSync(reportCachePath, "utf8"));
  if (cache.schemaVersion !== "1.0.0" || cache.year !== year || cache.areas !== areaLimit || cache.regions !== regionLimit || !Array.isArray(cache.reports)) throw new Error("CGR_REPORT_CACHE_SCOPE_MISMATCH");
  rawReports = cache.reports;
  process.stderr.write(`${JSON.stringify({ phase: "reuse_report_details", records: rawReports.length })}\n`);
} else {
  const browser = await chromium.launch({ headless: true });
  try {
  const page = await browser.newPage({ locale: "es-CL" });
  const applicationUrl = "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newRegionesPrincipal";
  for (const [index, area] of CGR_CENTRAL_AREAS.slice(0, areaLimit).entries()) {
    await page.goto(applicationUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByText(area, { exact: true }).waitFor({ timeout: 90_000 });
    await page.getByText(area, { exact: true }).click();
    await page.waitForURL(/newDetalleInformeCentral/, { timeout: 90_000 });
    await page.waitForFunction(() => document.body.innerText.includes("Nº") || document.body.innerText.includes("No se encontraron"), null, { timeout: 90_000 });
    const heading = (await page.locator("body").innerText()).split("\n").find((line) => line.includes("Área:")) ?? "";
    if (!heading.includes(area)) throw new Error(`CGR_AREA_MISMATCH: expected ${area}, received ${heading}`);
    await collectListing(page, { area, region: null });
    process.stderr.write(`${JSON.stringify({ phase: "central_areas", completed: index + 1, total: areaLimit, records: rawReports.length })}\n`);
  }
  for (const [index, region] of CGR_REGIONS.slice(0, regionLimit).entries()) {
    await page.goto(applicationUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.locator("select").first().selectOption(region.id);
    await page.getByText("Todos los informes de la región", { exact: true }).click();
    await page.waitForURL(/newDetalleInformeRegional/, { timeout: 90_000 });
    await page.waitForFunction(() => document.body.innerText.includes("Nº") || document.body.innerText.includes("No se encontraron"), null, { timeout: 90_000 });
    const heading = (await page.locator("body").innerText()).split("\n").find((line) => line.includes("Región:")) ?? "";
    if (!heading.includes(region.name)) throw new Error(`CGR_REGION_MISMATCH: expected ${region.name}, received ${heading}`);
    await collectListing(page, { area: "Regional", region: region.name });
    process.stderr.write(`${JSON.stringify({ phase: "regions", completed: index + 1, total: regionLimit, records: rawReports.length })}\n`);
  }
  } finally {
    await browser.close();
  }
  writeFileSync(reportCachePath, JSON.stringify({ schemaVersion: "1.0.0", year, areas: areaLimit, regions: regionLimit, reports: rawReports }), "utf8");
}

const consolidatedProducts = await fetchConsolidatedProducts();
await downloadConsolidatedDocuments(consolidatedProducts);

const pdfInputPath = join(workRoot, "pdf-input.json");
const pdfOutputPath = join(workRoot, "pdf-output.json");
const reportPdfEntries = rawReports.filter((report) => report.pdfPath).map((report) => ({ documentId: report.documentId, pdfPath: report.pdfPath, conclusions: report.conclusions }));
const consolidatedPdfEntries = consolidatedProducts.filter((product) => product.pdfPath).map((product) => ({ documentId: product.documentId, pdfPath: product.pdfPath, conclusions: product.summary }));
const pdfEntries = [...reportPdfEntries, ...consolidatedPdfEntries];
writeFileSync(pdfInputPath, JSON.stringify(pdfEntries), "utf8");
const extraction = spawnSync(python, [join(root, "scripts", "etl", "extract_cgr_pdf.py"), pdfInputPath, pdfOutputPath], { encoding: "utf8", maxBuffer: 10_000_000 });
if (extraction.status !== 0) throw new Error(`CGR_PDF_EXTRACTION_FAILED: ${extraction.stderr || extraction.stdout}`);
const pdfResults = JSON.parse(readFileSync(pdfOutputPath, "utf8"));
for (const report of rawReports) {
  const pdf = pdfResults[report.documentId];
  report.findings = pdf?.findings ?? [];
  report.documentPageCount = pdf?.pageCount ?? null;
  if (pdf?.error) process.stderr.write(`${JSON.stringify({ phase: "pdf_extraction_error", report: report.reportNumber, error: pdf.error, diagnostic: pdf.diagnostic ?? null })}\n`);
  const extractionError = ["CGR_CONCLUSIONS_NOT_PUBLISHED", "CGR_CONCLUSION_PAGE_NOT_FOUND", "CGR_PDF_OCR_REQUIRED", "CGR_PDF_EXTRACTION_FAILED"].includes(pdf?.error) ? pdf.error : pdf?.error ? "CGR_PDF_EXTRACTION_FAILED" : null;
  report.documentError = report.documentError ?? extractionError;
  delete report.pdfPath;
}
for (const product of consolidatedProducts) {
  const pdf = pdfResults[product.documentId];
  product.findings = pdf?.findings ?? [];
  product.documentPageCount = pdf?.pageCount ?? null;
  const extractionError = ["CGR_CONCLUSIONS_NOT_PUBLISHED", "CGR_CONCLUSION_PAGE_NOT_FOUND", "CGR_PDF_OCR_REQUIRED", "CGR_PDF_EXTRACTION_FAILED"].includes(pdf?.error) ? pdf.error : pdf?.error ? "CGR_PDF_EXTRACTION_FAILED" : null;
  product.documentError = product.documentError ?? extractionError;
  delete product.pdfPath;
}

const auditRecords = normalizeCgrReports(rawReports).filter((record) => record.fecha.startsWith(`${year}-`));
const consolidatedRecords = normalizeCgrConsolidatedProducts(consolidatedProducts);
const records = [...auditRecords, ...consolidatedRecords].sort((a, b) => a.id.localeCompare(b.id));
if (records.length === 0) throw new Error(`CGR_PERIOD_NOT_PUBLISHED: ${year}`);
const originalText = `${[...rawReports, ...consolidatedProducts].map(stableStringify).sort().join("\n")}\n`;
const originalChecksumSha256 = createHash("sha256").update(originalText).digest("hex");
const snapshot = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
snapshot.actualizado_en = new Date().toISOString();
snapshot.fuentes = { contraloria: records };
const inventoryPath = join(root, "data", "etl", "source-inventory.json");
const sourceInventory = existsSync(inventoryPath) ? JSON.parse(readFileSync(inventoryPath, "utf8")) : null;
const existingCatalogPath = join(outputRoot, "catalog", "v1", "manifest.json");
const existingCatalog = existsSync(existingCatalogPath) ? JSON.parse(readFileSync(existingCatalogPath, "utf8")) : null;
const originalAssets = [{
  sourceId: "contraloria", year, month: 1,
  name: `contraloria-${year}-indice-vigente.jsonl`, url: CGR_INDEX_URL,
  checksumSha256: originalChecksumSha256, size: Buffer.byteLength(originalText),
  license: "Documento público oficial; redistribución no presumida", redistributable: false,
}, {
  sourceId: "contraloria", year, month: 1,
  name: "contraloria-consolidados-api.json", url: CGR_CONSOLIDATED_API_URL,
  checksumSha256: createHash("sha256").update(consolidatedProducts.map(stableStringify).sort().join("\n")).digest("hex"),
  size: Buffer.byteLength(consolidatedProducts.map(stableStringify).sort().join("\n")),
  license: "Documento público oficial; redistribución no presumida", redistributable: false,
}, ...rawReports.filter((report) => report.documentChecksumSha256).map((report) => ({
  sourceId: "contraloria", year, month: Number(clean(report.publishedDate).match(/\d{2}[/-](\d{2})[/-]\d{4}/)?.[1] ?? 1),
  name: `contraloria-${clean(report.reportNumber).replace("/", "-")}-${report.documentId}.pdf`, url: report.sourceUrl,
  checksumSha256: report.documentChecksumSha256, size: report.documentSize,
  license: "Documento público oficial; redistribución no presumida", redistributable: false,
})), ...consolidatedProducts.filter((product) => product.documentChecksumSha256).map((product) => ({
  sourceId: "contraloria", year: Number(product.publishedAt.slice(0, 4)), month: Number(product.publishedAt.slice(5, 7)),
  name: `contraloria-${product.number.replace("/", "-")}-${product.officialId}.pdf`, url: product.sourceUrl,
  checksumSha256: product.documentChecksumSha256, size: product.documentSize,
  license: "Documento público oficial; redistribución no presumida", redistributable: false,
}))];
const plan = buildLakePlan(snapshot, {
  sourceInventory,
  existingCatalog,
  originalAssets,
  sourceMetadata: {
    contraloria: {
      license: "Documento público oficial; redistribución no presumida",
      notes: "La relación documental no implica irregularidad ni responsabilidad. El histórico de informes de control anterior al año seleccionado permanece pendiente.",
      coverage: {
        year,
        centralAreasExpected: CGR_CENTRAL_AREAS,
        centralAreasQueried: CGR_CENTRAL_AREAS.slice(0, areaLimit),
        centralAreasWithRecords: [...new Set(auditRecords.filter((record) => record.level === "Central").map((record) => record.area))].sort(),
        regionsExpected: CGR_REGIONS.map((region) => region.name),
        regionsQueried: CGR_REGIONS.slice(0, regionLimit).map((region) => region.name),
        regionsWithRecords: [...new Set(auditRecords.map((record) => record.region).filter(Boolean))].sort(),
        regionsWithoutPublishedRecords: CGR_REGIONS.slice(0, regionLimit).map((region) => region.name).filter((region) => !auditRecords.some((record) => record.region === region)),
        documentsWithPageEvidence: records.filter((record) => record.findings.length > 0).length,
        consolidatedApiTotal: consolidatedRecords.length,
        cicCount: consolidatedRecords.filter((record) => record.cgr_product_type === "cic").length,
        craCount: consolidatedRecords.filter((record) => record.cgr_product_type === "cra").length,
        radarCount: consolidatedRecords.filter((record) => record.cgr_product_type === "radar").length,
      },
    },
  },
});
for (const item of plan.assets) {
  const target = resolve(outputRoot, item.key);
  if (!target.startsWith(`${outputRoot}${sep}`)) throw new Error(`INVALID_ASSET_KEY: ${item.key}`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, item.data);
}
const publishPlan = {
  schemaVersion: "1.0.0", generatedAt: snapshot.actualizado_en,
  assets: plan.assets.map((item) => ({ key: item.key, checksumSha256: item.checksumSha256, size: item.size, releaseTag: item.releaseTag, releaseAssetName: item.releaseAssetName })),
};
writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify(publishPlan, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ source: "contraloria", year, areas: areaLimit, regions: regionLimit, records: records.length, auditReports: auditRecords.length, consolidatedProducts: consolidatedRecords.length, cic: consolidatedRecords.filter((record) => record.cgr_product_type === "cic").length, cra: consolidatedRecords.filter((record) => record.cgr_product_type === "cra").length, radar: consolidatedRecords.filter((record) => record.cgr_product_type === "radar").length, pdfs: pdfEntries.length, findingsWithPage: records.reduce((total, record) => total + record.findings.length, 0), pdfErrors: records.filter((record) => record.document_error).length, originalChecksumSha256, assets: plan.assets.length, output: outputRoot }, null, 2));
