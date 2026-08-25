import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import csv from "csv-parser";
import iconv from "iconv-lite";
import { chromium } from "playwright";
import { createCpltRecordId } from "./cplt-personal.mjs";
import { validatePublication } from "./validation.mjs";

const CATEGORY_CODES = new Map([
  ["Planta", "PPLAN"],
  ["Contrata", "PCONT"],
  ["Honorarios", "PHONO"],
  ["CodigoTrabajo", "PCODIGO"],
]);
const MONTHS = new Map([
  ["enero", 1], ["febrero", 2], ["marzo", 3], ["abril", 4], ["mayo", 5], ["junio", 6],
  ["julio", 7], ["agosto", 8], ["septiembre", 9], ["setiembre", 9], ["octubre", 10],
  ["noviembre", 11], ["diciembre", 12],
]);
const SEARCH_URL = "https://www.portaltransparencia.cl/PortalPdT/buscador-directorio-de-organismos-regulados";
const PORTAL_ROOT = "https://www.portaltransparencia.cl/PortalPdT/pdtta/-/ta";
const SEARCH_NAME_ALIASES = new Map([
  ["muni-ohiggins", ["Higgins"]],
  ["muni-ollague", ["Ollague"]],
  ["muni-paihuano", ["Paihuano"]],
  ["muni-lacalera", ["La Calera"]],
  ["muni-llayllay", ["Llay Llay", "Llay-Llay"]],
  ["muni-marchigue", ["Marchigüe"]],
  ["muni-treguaco", ["Trehuaco"]],
  ["muni-isladepascua", ["Isla de Pascua", "Rapa Nui"]],
  ["muni-sanvicente", ["San Vicente de Tagua Tagua"]],
]);

function normalized(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function keyFor(row, ...names) {
  const entries = Object.entries(row);
  for (const name of names) {
    const wanted = normalized(name);
    const entry = entries.find(([key]) => normalized(key) === wanted);
    if (entry) return String(entry[1] ?? "").trim();
  }
  return "";
}

function money(value) {
  const text = String(value ?? "").replace(/[^0-9,-]/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(text);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function dateCl(value) {
  const match = String(value ?? "").trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function hoursAndMoney(value) {
  const text = String(value ?? "");
  return { hours: Number((text.match(/:\s*([0-9]+(?:,[0-9]+)?)/)?.[1] ?? "0").replace(",", ".")) || 0, amount: money(text) };
}

function monthNumber(value) {
  const numeric = Number(value);
  return MONTHS.get(normalized(value)) ?? (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12 ? numeric : 0);
}

function yearNumber(value) {
  const year = Number(String(value ?? "").match(/\b(20\d{2}|21\d{2})\b/)?.[1] ?? 0);
  return year >= 2000 && year <= 2100 ? year : 0;
}

function parsePortalRow(row, { commune, organismoId, category, sourceUrl, year, month }) {
  const name = keyFor(row, "Nombre completo");
  const cargo = keyFor(row, "Cargo o función");
  if (!name || !cargo) return null;
  const stableKey = [organismoId, normalized(category), normalized(name), normalized(cargo)].join("|");
  const day = hoursAndMoney(keyFor(row, "Montos y horas extraordinarias diurnas del mes(inc. en rem. bruta)"));
  const night = hoursAndMoney(keyFor(row, "Montos y horas extraordinarias nocturnas del mes(inc. en rem. bruta)"));
  const holiday = hoursAndMoney(keyFor(row, "Montos y horas extraordinarias festivas del mes (inc. en rem. bruta)"));
  return {
    id: createCpltRecordId(stableKey),
    nombre_completo: name,
    organo_nombre: `Municipalidad de ${commune.nombre_comuna}`,
    organo_tipo: "municipalidad",
    cargo,
    estamento: keyFor(row, "Estamento") || category,
    tipo_contrato: category,
    remuneracion_bruta_mensual: money(keyFor(row, "Remuneración bruta del mes (incluye bonos e incentivos, asig. especiales, horas extras)")),
    remuneracion_liquida_mensual: money(keyFor(row, "Remuneración líquida del mes")),
    fecha_ingreso: dateCl(keyFor(row, "Fecha de inicio dd/mm/aa")),
    fecha_termino: dateCl(keyFor(row, "Fecha de término dd/mm/aa")),
    horas_extras_diurnas_hrs: day.hours,
    horas_extras_nocturnas_hrs: night.hours,
    horas_extras_festivas_hrs: holiday.hours,
    horas_extras_mes_anterior: day.hours + night.hours + holiday.hours,
    monto_horas_extras_clp: day.amount + night.amount + holiday.amount,
    grado_eus: keyFor(row, "Grado EUS o jornada"),
    formacion: keyFor(row, "Calificación profesional o formación"),
    region: keyFor(row, "Región"),
    asignaciones_especiales_clp: 0,
    rem_adicionales_clp: money(keyFor(row, "Rem. adicionales del mes (no inc. en rem. bruta)")),
    bonos_incentivos_clp: money(keyFor(row, "Remuneración Bonos incentivos del mes (inc. en rem. bruta)")),
    derecho_horas_extras: /^s[ií]$/i.test(keyFor(row, "Derecho a horas extraordinarias")),
    viaticos_clp: money(keyFor(row, "Viáticos del mes (no inc. en rem. bruta)")),
    observaciones: keyFor(row, "Observaciones"),
    fuente: sourceUrl,
    url: sourceUrl,
    fuente_periodo: `${year}-${String(month).padStart(2, "0")}`,
  };
}

async function parseCsv(buffer) {
  const text = iconv.decode(buffer, "iso-8859-15");
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from([text]).pipe(csv({ separator: ";" }))
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

async function readCsvFromPage(page) {
  const result = await page.locator('form[name$=":formInfo"]').evaluate(async (form) => {
    const data = new FormData(form);
    const button = form.querySelector('button[title*="CSV"]');
    if (button?.name) data.set(button.name, "");
    const body = new URLSearchParams();
    for (const [key, value] of data.entries()) body.append(key, String(value));
    const response = await fetch(form.action, { method: "POST", body, credentials: "include" });
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return { status: response.status, contentType: response.headers.get("content-type") ?? "", base64: btoa(binary) };
  });
  if (result.status !== 200 || !result.contentType.includes("text/csv")) {
    throw new Error(`CPLT_PORTAL_CSV_FAILED: ${result.status} ${result.contentType}`);
  }
  return Buffer.from(result.base64, "base64");
}

async function clickTab(page, text) {
  const links = page.locator("a.tab-link");
  const wanted = String(text).trim().replace(/\s+/g, " ");
  let selected = null;
  for (let index = 0; index < await links.count(); index += 1) {
    const actual = (await links.nth(index).innerText()).trim().replace(/\s+/g, " ");
    if (actual === wanted) selected = links.nth(index);
  }
  if (!selected) throw new Error(`CPLT_PORTAL_TAB_MISSING: ${text}`);
  await selected.click();
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(Number(process.env.CPLT_PORTAL_DELAY_MS ?? 900));
}

async function tabTexts(page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return (await page.locator("a.tab-link").allTextContents()).map((text) => text.trim());
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(500 + attempt * 500);
    }
  }
  return [];
}

async function gotoPortal(page, url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      return response;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }
  return null;
}

async function latestCsv(page, categoryUrl, subcategory) {
  async function openYear() {
    await gotoPortal(page, categoryUrl);
    await page.waitForTimeout(Number(process.env.CPLT_PORTAL_DELAY_MS ?? 900));
    if (subcategory) await clickTab(page, subcategory);
  const years = await tabTexts(page);
  const minimumYear = Number(process.env.CPLT_PORTAL_MIN_YEAR ?? 2024);
  const yearTab = years.map((text) => ({ text, year: yearNumber(text) }))
    .filter(({ year }) => year >= minimumYear).sort((a, b) => b.year - a.year)[0];
    if (!yearTab) return null;
    await clickTab(page, yearTab.text);
    return yearTab;
  }

  const initialYear = await openYear();
  if (!initialYear) return null;
  const nestedTabs = (await tabTexts(page))
    .filter((text) => text && yearNumber(text) === 0 && monthNumber(text) === 0 && !/^Registro Histórico/i.test(text));
  const targets = subcategory ? [null] : [...new Set(nestedTabs)];
  const results = [];
  for (const nested of (targets.length > 0 ? targets : [null])) {
    const yearTab = await openYear();
    if (!yearTab) return results;
    if (nested) await clickTab(page, nested);
    const months = await tabTexts(page);
    const monthTabs = months.map((text) => ({ text, number: monthNumber(text) }))
      .filter(({ number }) => number > 0).sort((a, b) => b.number - a.number);
    for (const month of monthTabs) {
      // Un mes sin publicación puede dejar la vista sin sus pestañas. Abrir
      // nuevamente la ruta completa antes de cada intento hace el crawler
      // resistente a ese comportamiento del portal JSF.
      const retryYear = await openYear();
      if (!retryYear) break;
      if (nested) await clickTab(page, nested);
      await clickTab(page, month.text);
      try {
        await page.getByRole("button", { name: "Descargar CSV" }).waitFor({ state: "visible", timeout: 12000 });
      } catch {
        // El Portal lista meses futuros o sin publicación; buscar el siguiente
        // mes descendente evita convertir un mes vacío en una comuna vacía.
        console.warn(`[CPLT portal] sin CSV para ${nested ?? "sin subcategoría"}, ${yearTab.year}-${String(month.number).padStart(2, "0")}`);
        continue;
      }
      const buffer = await readCsvFromPage(page);
      console.log(`[CPLT portal] CSV ${nested ?? "sin subcategoría"}, ${yearTab.year}-${String(month.number).padStart(2, "0")}: ${buffer.length} bytes`);
      results.push({ buffer, year: yearTab.year, month: month.number });
      break;
    }
  }
  return results;
}

async function discoverLiferayIds(page, communes, cachePath) {
  let cache = {};
  try { cache = JSON.parse(readFileSync(cachePath, "utf8")); } catch {}
  await gotoPortal(page, SEARCH_URL);
  const input = page.locator('input[placeholder*="Ingresa texto"]');
  await input.waitFor({ state: "visible", timeout: 60000 });
  const result = {};
  for (const commune of communes) {
    if (/^MU\d+$/i.test(String(cache[commune.id] ?? ""))) { result[commune.id] = cache[commune.id]; continue; }
    // Los alias específicos van primero: "Calera" es ambiguo y devuelve
    // Calera de Tango antes que La Calera en el buscador del Portal.
    const searchNames = [...new Set([...(SEARCH_NAME_ALIASES.get(commune.id) ?? []), commune.nombre_comuna])];
    let match = null;
    for (let attempt = 0; attempt < 3 && !match; attempt += 1) {
      // El buscador JSF del Portal escucha keyup, no sólo input/change.
      if (attempt > 0) {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
        await input.waitFor({ state: "visible", timeout: 60000 });
      }
      for (const searchName of searchNames) {
        await input.fill("");
        await input.pressSequentially(searchName, { delay: 5 });
        await input.press("Enter").catch(() => {});
        await page.waitForTimeout(Number(process.env.CPLT_PORTAL_SEARCH_DELAY_MS ?? 1800) + attempt * 700);
        const candidates = await page.locator('a[href*="org="]').evaluateAll((anchors) => anchors.map((anchor) => ({ text: anchor.innerText.trim(), href: anchor.href })));
        const municipalCandidates = candidates.filter(({ text, href }) => {
          const org = new URL(href).searchParams.get("org") ?? "";
          return /^MU\d+$/i.test(org) && !/(corporacion|fundacion|deportes|cultural|turismo|asociacion)/.test(normalized(text));
        });
        const wanted = normalized(`Municipalidad de ${searchName}`);
        const wantedName = normalized(searchName);
        const exactMatches = municipalCandidates.filter(({ text }) => normalized(text) === wanted);
        const prefixMatches = municipalCandidates.filter(({ text }) => normalized(text).startsWith(wanted));
        match = exactMatches[0]
          ?? (prefixMatches.length === 1 ? prefixMatches[0] : null)
          ?? municipalCandidates.find(({ text }) => {
            const candidate = normalized(text);
            return candidate.includes(wantedName);
          });
        if (match) break;
      }
    }
    const organismoId = match ? new URL(match.href).searchParams.get("org") : null;
    if (!organismoId || !/^MU\d+$/i.test(organismoId)) {
      const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 500);
      throw new Error(`CPLT_PORTAL_MUNICIPAL_ORGANISMO_INVALID: ${commune.id}; org=${organismoId ?? "missing"}; body=${body}`);
    }
    result[commune.id] = organismoId;
    writeFileSync(cachePath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`[CPLT portal] ${commune.id} -> ${organismoId}`);
  }
  return result;
}

export async function runPortalPersonal({ targetTipo, outputDir }) {
  const category = [...CATEGORY_CODES.keys()].find((name) => name.toLowerCase() === String(targetTipo).toLowerCase());
  if (!category) throw new Error(`CPLT_UNKNOWN_TYPE: ${targetTipo}`);
  const catalog = JSON.parse(readFileSync(join(process.cwd(), "data/catalog/communes.json"), "utf8"));
  const communes = catalog.communes.filter((commune) => commune.tiene_municipalidad_propia);
  const requestedIds = new Set(String(process.env.CPLT_PORTAL_ONLY ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  const limit = Number(process.env.CPLT_PORTAL_LIMIT ?? 0);
  const selected = requestedIds.size > 0
    ? communes.filter((commune) => requestedIds.has(commune.id))
    : (limit > 0 ? communes.slice(0, limit) : communes);
  if (selected.length === 0) throw new Error("CPLT_PORTAL_SELECTION_EMPTY");
  const projectionDir = join(outputDir, "projections", "funcionarios-v1");
  const progressDir = join(outputDir, "progress");
  const coverageDir = join(outputDir, "coverage");
  const validationDir = join(outputDir, "validation");
  mkdirSync(projectionDir, { recursive: true });
  mkdirSync(progressDir, { recursive: true });
  mkdirSync(coverageDir, { recursive: true });
  mkdirSync(validationDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "es-CL",
  });
  const cachePath = join(outputDir, "liferay-ids.json");
  const ids = await discoverLiferayIds(page, selected, cachePath);
  const duplicateOrganismos = [...new Map(Object.entries(ids).map(([communeId, organismoId]) => [organismoId, communeId]))]
    .filter(([organismoId]) => Object.values(ids).filter((value) => value === organismoId).length > 1)
    .map(([organismoId, firstCommuneId]) => ({ organismoId, firstCommuneId, communeIds: Object.entries(ids).filter(([, value]) => value === organismoId).map(([communeId]) => communeId) }));
  if (duplicateOrganismos.length > 0) {
    throw new Error(`CPLT_PORTAL_ORGANISMO_ID_DUPLICATE: ${JSON.stringify(duplicateOrganismos)}`);
  }
  const records = [];
  const recordsByMunicipality = new Map();
  const coverage = catalog.communes.map((commune) => ({
    communeId: commune.id, cut: commune.cut, administrationId: commune.administracion_municipal_id,
    status: commune.tiene_municipalidad_propia ? "unavailable" : "not_applicable", recordCount: 0,
  }));
  const coverageById = new Map(coverage.map((item) => [item.communeId, item]));
  try {
    for (const commune of selected) {
      const progressPath = join(progressDir, `${commune.id}.json`);
      if (existsSync(progressPath)) {
        const resumed = JSON.parse(readFileSync(progressPath, "utf8"));
        if (!Array.isArray(resumed)) throw new Error(`CPLT_PORTAL_PROGRESS_INVALID: ${commune.id}`);
        records.push(...resumed);
        recordsByMunicipality.set(commune.id, resumed);
        coverageById.get(commune.id).recordCount = resumed.length;
        coverageById.get(commune.id).status = resumed.length > 0 ? "available" : "unavailable";
        console.log(`[CPLT portal] reanudado ${commune.id}: ${resumed.length} registros`);
        continue;
      }
      const organismoId = ids[commune.id];
      const categoryUrl = `${PORTAL_ROOT}/${organismoId}/PR/${CATEGORY_CODES.get(category)}`;
      const byId = new Map();
      await gotoPortal(page, categoryUrl);
      const subcategories = (await tabTexts(page))
        .filter((text) => text && yearNumber(text) === 0 && text !== "Registro histórico");
      const tabs = [...new Set(subcategories.filter((text) => !/^Registro Histórico/i.test(text)))];
      for (const subcategory of (tabs.length > 0 ? tabs : [null])) {
        const csvData = await latestCsv(page, categoryUrl, subcategory);
        for (const data of (csvData ?? [])) {
          for (const row of await parseCsv(data.buffer)) {
            const record = parsePortalRow(row, { commune, organismoId, category, sourceUrl: categoryUrl, year: data.year, month: data.month });
            if (record) byId.set(record.id, record);
          }
        }
      }
      const current = [...byId.values()];
      records.push(...current);
      recordsByMunicipality.set(commune.id, current);
      writeFileSync(progressPath, JSON.stringify(current));
      coverageById.get(commune.id).recordCount = current.length;
      coverageById.get(commune.id).status = current.length > 0 ? "available" : "unavailable";
      console.log(`[CPLT portal] ${commune.id}: ${current.length} registros`);
    }
  } finally {
    await browser.close();
  }
  for (const commune of catalog.communes.filter((item) => item.tiene_municipalidad_propia === false)) {
    writeFileSync(join(projectionDir, `${commune.id}.json`), "[]\n");
  }
  const report = validatePublication({ sourceId: `cplt-personal-${normalized(category)}`, records, minimumCount: 1 });
  const fullCoverage = [...coverageById.values()].sort((a, b) => a.cut.localeCompare(b.cut));
  if (process.env.REQUIRE_COMPLETE_CPLT === "1" && process.env.CPLT_ALLOW_UNAVAILABLE !== "1") {
    const unavailable = fullCoverage.filter((item) => item.status === "unavailable");
    if (unavailable.length > 0) throw new Error(`CPLT_INCOMPLETE_COVERAGE: ${unavailable.length} municipalidades sin registros`);
  }
  for (const [municipalityId, rows] of recordsByMunicipality) {
    writeFileSync(join(projectionDir, `${municipalityId}.json`), JSON.stringify(rows));
  }
  writeFileSync(join(coverageDir, `${normalized(category)}.json`), JSON.stringify({ sourceId: report.sourceId, sourceUrl: PORTAL_ROOT, generatedAt: new Date().toISOString(), coverage: fullCoverage }, null, 2));
  writeFileSync(join(validationDir, `${normalized(category)}.json`), JSON.stringify({ ...report, sourceUrl: PORTAL_ROOT, mode: "portal-ui-latest-month", municipalities: selected.length, generatedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ category, mode: "portal-ui-latest-month", records: records.length, municipalities: selected.length, coverage: fullCoverage.filter((item) => item.status === "available").length }));
}
