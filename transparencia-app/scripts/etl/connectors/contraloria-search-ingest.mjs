import {
  buildCgrDetailUrl,
  buildCgrSearchBody,
  CGR_AUDIT_SEARCH_URL,
  CGR_WIDGET_URL,
  collectCgrUnitOptions,
  compareCgrSearchAndDetail,
  compareCgrSegmentRuns,
  projectCgrAuditHit,
  summarizeCgrSegments,
} from "./contraloria-search-audit.mjs";

const CGR_SEARCH_PAGE_SIZE = 20;
const CGR_SEARCH_MAX_PAGES = 100;

export async function waitForCgrDocumentReady(page) {
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  await page.locator("#cil1").first().waitFor({ state: "visible", timeout: 30_000 });
}

export async function collectCgrSearchMonth(month, {
  fetchImpl = fetch,
  waitMs = 400,
  maxResponseBytes = 30 * 1024 * 1024,
  maxTotalBytes = 500 * 1024 * 1024,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let totalBytes = 0;
  const readJson = async (url, init) => {
    let response;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        response = await fetchImpl(url, init);
      } catch (error) {
        if (attempt === 3) throw error;
        await sleep(500 * (2 ** attempt));
        continue;
      }
      if (response.ok || (response.status !== 429 && response.status < 500) || attempt === 3) break;
      await sleep(500 * (2 ** attempt));
    }
    if (!response.ok) throw new Error(`CGR_SEARCH_HTTP_${response.status}`);
    const declaredBytes = Number(response.headers?.get?.("content-length") ?? 0);
    if (declaredBytes > maxResponseBytes) throw new Error(`CGR_SEARCH_RESPONSE_LIMIT:${declaredBytes}`);
    const text = await response.text();
    const size = Buffer.byteLength(text);
    if (size > maxResponseBytes) throw new Error(`CGR_SEARCH_RESPONSE_LIMIT:${size}`);
    totalBytes += size;
    if (totalBytes > maxTotalBytes) throw new Error(`CGR_SEARCH_TOTAL_LIMIT:${totalBytes}`);
    try { return JSON.parse(text); } catch { throw new Error("CGR_SEARCH_INVALID_JSON"); }
  };
  const widget = await fetchImpl(CGR_WIDGET_URL, { signal: AbortSignal.timeout(45_000) });
  if (!widget.ok) throw new Error(`CGR_WIDGET_HTTP_${widget.status}`);
  const configuredUnits = collectCgrUnitOptions(await widget.text());

  const fetchAllPages = async (unit) => {
    let declaredTotal;
    const hits = [];
    for (let page = 0; page < CGR_SEARCH_MAX_PAGES; page += 1) {
      await sleep(waitMs);
      const body = buildCgrSearchBody({ month, unit, page });
      const payload = await readJson(CGR_AUDIT_SEARCH_URL, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
      const pageHits = payload?.hits?.hits;
      const total = payload?.hits?.total;
      if (!Array.isArray(pageHits) || !Number.isSafeInteger(total?.value) || total.relation !== "eq") {
        throw new Error("CGR_SEARCH_INVALID_OR_NON_EXACT_TOTAL");
      }
      if (pageHits.length > CGR_SEARCH_PAGE_SIZE) throw new Error(`CGR_SEARCH_UNEXPECTED_PAGE_SIZE:${pageHits.length}`);
      declaredTotal ??= total.value;
      if (total.value !== declaredTotal) throw new Error(`CGR_SEARCH_TOTAL_CHANGED:${month}:${unit ?? "global"}`);
      hits.push(...pageHits.map(projectCgrAuditHit));
      if (hits.length >= declaredTotal || pageHits.length === 0) break;
    }
    if (hits.length !== declaredTotal) throw new Error(`CGR_SEARCH_INCOMPLETE:${month}:${unit ?? "global"}:${hits.length}<${declaredTotal}`);
    if (hits.some((hit) => !hit.id || !hit.documentId)) throw new Error(`CGR_SEARCH_HIT_MISSING_ID:${month}:${unit ?? "global"}`);
    return { unit: unit ?? "(global)", declaredTotal, hits };
  };

  const global = await fetchAllPages();
  const discoveredUnits = [...new Set(global.hits.map((hit) => hit.unit).filter(Boolean))];
  const units = [...new Set([...configuredUnits, ...discoveredUnits])].sort((a, b) => a.localeCompare(b, "es-CL"));
  const firstPass = [];
  for (const unit of units) {
    const run = await fetchAllPages(unit);
    if (run.declaredTotal > 0 || run.hits.length > 0) firstPass.push(run);
  }
  const secondPass = [];
  for (const run of firstPass) secondPass.push(await fetchAllPages(run.unit));
  const assembled = assembleCgrSegmentedCandidates({
    globalDeclaredTotal: global.declaredTotal,
    passOne: firstPass,
    passTwo: secondPass,
  });
  return {
    ...assembled,
    month,
    globalDeclaredTotal: global.declaredTotal,
    configuredUnits: configuredUnits.length,
    discoveredUnits,
    responseBytes: totalBytes,
  };
}

function searchHitIdentity(hit) {
  return [hit.reportNumber, hit.publishedAt, hit.reportType, hit.service, hit.title, hit.documentId]
    .map((value) => String(value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-CL"))
    .join("\u0000");
}

export function assembleCgrSegmentedCandidates({ globalDeclaredTotal, passOne, passTwo }) {
  if (!Number.isSafeInteger(globalDeclaredTotal) || globalDeclaredTotal < 0
    || !Array.isArray(passOne) || !Array.isArray(passTwo)) throw new Error("CGR_INVALID_SEGMENT_SEARCH");
  const stability = compareCgrSegmentRuns([
    ...passOne.map((run) => ({ ...run, pass: 1 })),
    ...passTwo.map((run) => ({ ...run, pass: 2 })),
  ]);
  if (!stability.stable) throw new Error("CGR_SEGMENT_SEARCH_UNSTABLE");
  const firstSummary = summarizeCgrSegments(passOne);
  if (!firstSummary.complete) throw new Error("CGR_SEGMENT_SEARCH_INCOMPLETE");
  if (firstSummary.uniqueIds !== globalDeclaredTotal) {
    throw new Error(`CGR_SEGMENT_SEARCH_TOTAL_MISMATCH:${firstSummary.uniqueIds}!=${globalDeclaredTotal}`);
  }
  const byId = new Map();
  for (const run of [...passOne].sort((a, b) => a.unit.localeCompare(b.unit, "es-CL"))) {
    if (new Set(run.hits.map((hit) => hit.id)).size !== run.hits.length) throw new Error(`CGR_DUPLICATE_ID_WITHIN_UNIT:${run.unit}`);
    for (const hit of run.hits) {
      const previous = byId.get(hit.id);
      if (previous && searchHitIdentity(previous) !== searchHitIdentity(hit)) throw new Error(`CGR_SEGMENT_DOCUMENT_CONFLICT:${hit.id}`);
      if (!previous) byId.set(hit.id, hit);
    }
  }
  return {
    candidates: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    activeUnits: passOne.length,
    summedSegmentHits: firstSummary.summedSegmentHits,
    overlapIds: firstSummary.overlapIds,
    matchesGlobalDeclaredTotal: true,
  };
}

function isoDate(value) {
  const raw = String(value ?? "").trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const spanish = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return spanish ? `${spanish[3]}-${spanish[2]}-${spanish[1]}` : "";
}

function spanishDate(value) {
  const date = isoDate(value);
  if (!date) throw new Error(`CGR_INVALID_DETAIL_DATE:${value ?? ""}`);
  const [, year, month, day] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return `${day}/${month}/${year}`;
}

function normalizedReportNumber(value) {
  return String(value ?? "").trim().replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").toLocaleUpperCase("es-CL");
}

function documentIdentity(report) {
  const id = String(report?.documentId ?? "").trim();
  if (!id) throw new Error("CGR_MISSING_OFFICIAL_DOCUMENT_ID");
  return {
    id,
    reportNumber: normalizedReportNumber(report.reportNumber),
    date: isoDate(report.publishedDate),
  };
}

export function buildCgrReportFromSearchDetail(candidate, fields) {
  if (!candidate || typeof candidate !== "object" || !fields || typeof fields !== "object") {
    throw new Error("CGR_INVALID_SEARCH_DETAIL");
  }
  const comparison = compareCgrSearchAndDetail(candidate, fields);
  const identityMismatches = comparison.mismatches.filter((label) => label !== "Tipo de Informe");
  if (identityMismatches.length) throw new Error(`CGR_SEARCH_DETAIL_IDENTITY_MISMATCH:${identityMismatches[0]}`);

  const reportNumber = String(fields["Número"] ?? "").trim();
  const publishedDate = spanishDate(fields["Fecha"]);
  const unit = String(fields["Unidad CGR"] ?? "").trim();
  const region = String(fields["Región"] ?? "").trim() || null;
  const level = String(fields.Nivel ?? (region || /\bregional\b/i.test(unit) ? "Regional" : "Central")).trim();
  const area = String(fields["Área"] ?? (level.toLocaleLowerCase("es-CL").includes("regional") ? "Regional" : fields.Sector ?? unit)).trim();
  const sourceUrl = buildCgrDetailUrl(candidate.documentId);
  const reportType = String(fields["Tipo de Informe"] ?? "").trim();
  const title = String(fields["Nombre de Informe"] ?? "").trim();
  const service = String(fields.Servicio ?? "").trim();
  if (!reportNumber || !unit || !area || !reportType || !title || !service) throw new Error("CGR_SEARCH_DETAIL_INCOMPLETE");

  return {
    reportNumber,
    publishedDate,
    reportType,
    title,
    level,
    unit,
    area,
    region,
    service,
    objectives: String(fields.Objetivos ?? "").trim() || null,
    universe: String(fields.Universo ?? "").trim() || null,
    sample: String(fields.Muestra ?? "").trim() || null,
    conclusions: String(fields["Conclusiones o Dictamen"] ?? "").trim() || null,
    documentId: String(candidate.documentId).trim(),
    sourceUrl,
    documentError: null,
  };
}

export function mergeCgrReportsByDocumentId(listedReports, recoveredReports) {
  if (!Array.isArray(listedReports) || !Array.isArray(recoveredReports)) throw new Error("CGR_INVALID_REPORT_COLLECTION");
  const merged = new Map();
  for (const report of listedReports) {
    const identity = documentIdentity(report);
    if (merged.has(identity.id)) throw new Error(`CGR_DUPLICATE_LISTING_DOCUMENT:${identity.id}`);
    merged.set(identity.id, report);
  }
  for (const report of recoveredReports) {
    const identity = documentIdentity(report);
    const existing = merged.get(identity.id);
    if (!existing) {
      merged.set(identity.id, report);
      continue;
    }
    const current = documentIdentity(existing);
    if ((current.reportNumber && identity.reportNumber && current.reportNumber !== identity.reportNumber)
      || (current.date && identity.date && current.date !== identity.date)) {
      throw new Error(`CGR_DOCUMENT_IDENTITY_CONFLICT:${identity.id}`);
    }
  }
  return [...merged.values()];
}
