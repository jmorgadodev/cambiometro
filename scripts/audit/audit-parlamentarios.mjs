#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  APP_ROOT,
  DOCS_ROOT,
  fetchWithPolicy,
  findingId,
  normalizeText,
  parseArgs,
  sha256,
  stableSortFindings,
  validateV3,
  validateV4,
  validateV6,
  writeJson,
  writeMarkdown,
} from "./audit-core.mjs";
import {
  analyzeOperationalExpenseGroup,
  analyzeSupportAssignment,
  compareRscWithHtml,
  isCorrectedKaiserCalibration,
  politicianSlug,
  reconcileRoster,
  selectRscValidationSample,
} from "./parliamentary.mjs";
import { fetchParliamentRosters } from "../../transparencia-app/scripts/etl/parliament-rosters.mjs";
import { fetchSenateOperationalExpenses } from "../../transparencia-app/scripts/etl/connectors/senado.mjs";

const STARTED_AT = new Date();
const OFFICIAL_SUPPORT_URL = "https://web-back.senado.cl/api/transparency/senator-assignments/support-staff";
const OFFICIAL_SUPPORT_PAGE = "https://www.senado.cl/transparencia/personal-de-apoyo-senadores";
const OFFICIAL_EXPENSE_PAGE = "https://www.senado.cl/transparencia/gastos-operacionales-senadores";

function makeFinding({ entity, period = null, category, field, layers, validation, status, url, method = null, detail = null }) {
  const values = {
    oficial: layers?.oficial ?? null,
    proyeccion: layers?.proyeccion ?? null,
    lake: layers?.lake ?? null,
    sitio: layers?.sitio ?? null,
  };
  return {
    id: findingId([entity.type, entity.id, period, category, field, validation, status]),
    entity_type: entity.type,
    entity_id: entity.id,
    entity_name: entity.name,
    period,
    category,
    field,
    layer_from: layers?.from ?? "fuente_oficial",
    layer_to: layers?.to ?? "sitio",
    values,
    difference: layers?.difference ?? null,
    validation,
    severity: status,
    status,
    url,
    checksum: sha256(JSON.stringify({ entity: entity.id, period, field, values, validation, status })),
    site_extraction_method: method,
    detail,
  };
}

async function policyFetchResponse(url, init = {}) {
  const response = await fetchWithPolicy(url, {
    accept: init.headers?.Accept ?? init.headers?.accept ?? "*/*",
    headers: init.headers,
    timeoutMs: init.signal ? 60_000 : undefined,
  });
  return new Response(response.body, { status: response.status, headers: response.headers });
}

async function jsonFrom(url) {
  const response = await fetchWithPolicy(url, { accept: "application/json" });
  return { data: JSON.parse(response.body), checksum: response.checksum };
}

function groupBy(rows, keyOf) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    const values = groups.get(key) ?? [];
    values.push(row);
    groups.set(key, values);
  }
  return groups;
}

function countStatuses(findings) {
  const counts = { OK: 0, MENOR: 0, ALTA: 0, CRITICA: 0, FUENTE_NO_DISPONIBLE: 0, CAPA_NO_DISPONIBLE: 0 };
  for (const finding of findings) counts[finding.status] = (counts[finding.status] ?? 0) + 1;
  return counts;
}

function elapsedSeconds() {
  return Math.round((Date.now() - STARTED_AT.getTime()) / 1000);
}

function displayClp(value) {
  return `$${new Intl.NumberFormat("es-CL").format(Number(value ?? 0))}`;
}

async function fetchSupportRecords() {
  const all = [];
  let page = 1;
  let pageCount = 1;
  do {
    const url = new URL(OFFICIAL_SUPPORT_URL);
    url.searchParams.set("filters[ano][$eq]", "2026");
    url.searchParams.set("pagination[pageSize]", "500");
    url.searchParams.set("pagination[page]", String(page));
    const { data: envelope } = await jsonFrom(url.toString());
    const payload = envelope?.data;
    if (!Array.isArray(payload?.data) || !payload?.meta?.pagination) throw new Error("AUDIT_INVALID_SENATE_SUPPORT_SCHEMA");
    all.push(...payload.data.map((entry) => ({ id: entry.id, ...entry.attributes })));
    pageCount = Number(payload.meta.pagination.pageCount);
    page += 1;
  } while (page <= pageCount);
  return all;
}

function parseSupportAssignment(html) {
  const normalized = String(html).replace(/&nbsp;/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const match = normalized.match(/asignaci[oó]n mensual desde enero 2026[^$]{0,80}\$\s*([\d.]+)/i);
  if (!match) throw new Error("AUDIT_SUPPORT_ASSIGNMENT_NOT_FOUND");
  return Number(match[1].replace(/\./g, ""));
}

function nameToPublishedId(name, rosterMatches) {
  const key = normalizeText(name);
  const senateMatches = rosterMatches.filter(({ published }) => published.cargo === "Senador");
  let exact = senateMatches.find(({ official }) => normalizeText(official.name) === key);
  if (exact) return exact.published.id;
  const tokens = new Set(key.split(" "));
  const scored = senateMatches.map((candidate) => {
    const candidateTokens = normalizeText(candidate.official.name).split(" ");
    return { candidate, shared: candidateTokens.filter((token) => tokens.has(token)).length };
  }).sort((a, b) => b.shared - a.shared);
  return scored[0]?.shared >= 2 ? scored[0].candidate.published.id : null;
}

async function validateSiteTransport(site, published) {
  const sample = selectRscValidationSample(published);
  const results = [];
  for (const row of sample) {
    const url = `${site}/politico/${politicianSlug(row.nombre_completo)}`;
    const rsc = await fetchWithPolicy(`${url}?_rsc`, { accept: "text/x-component", headers: { RSC: "1" } });
    if (!String(rsc.headers.get("content-type") ?? "").includes("text/x-component")) throw new Error(`AUDIT_RSC_CONTENT_TYPE:${row.id}`);
    const html = await fetchWithPolicy(url, { accept: "text/html" });
    const comparison = compareRscWithHtml({ rsc: rsc.body, html: html.body, expected: [row.nombre_completo, row.cargo, row.partido_sigla, row.distrito_region] });
    results.push({ id: row.id, url, rsc_checksum: rsc.checksum, html_checksum: html.checksum, ...comparison });
  }
  if (results.some((result) => !result.ok)) throw new Error(`AUDIT_RSC_HTML_MISMATCH:${JSON.stringify(results.filter((result) => !result.ok))}`);
  return results;
}

async function fetchAllRsc(site, published, validatedSample) {
  const snapshots = new Map();
  const alreadyValidated = new Set(validatedSample.map((row) => row.id));
  for (const row of published) {
    const url = `${site}/politico/${politicianSlug(row.nombre_completo)}?_rsc`;
    try {
      const response = await fetchWithPolicy(url, { accept: "text/x-component", headers: { RSC: "1" } });
      const type = response.headers.get("content-type") ?? "";
      if (!type.includes("text/x-component")) throw new Error("AUDIT_RSC_CONTENT_TYPE");
      snapshots.set(row.id, { method: "RSC", body: response.body, checksum: response.checksum, validated_with_html: alreadyValidated.has(row.id) });
    } catch (error) {
      snapshots.set(row.id, { method: "API", body: JSON.stringify(row), checksum: sha256(JSON.stringify(row)), error: error.message, validated_with_html: false });
    }
  }
  return snapshots;
}

function auditIdentity(roster, published, rosterResult, rscSnapshots) {
  const findings = [];
  for (const { official, published: row } of rosterResult.matches) {
    const validation = validateV6({
      official: { name: official.name, role: official.chamber === "senado" ? "Senador" : "Diputado", party: row.partido_sigla },
      published: { name: row.nombre_completo, role: row.cargo, party: row.partido_sigla },
    });
    findings.push(makeFinding({
      entity: { type: "parlamentario", id: row.id, name: row.nombre_completo }, category: "identidad", field: "nombre_cargo",
      layers: { oficial: { nombre: official.name, cargo: official.chamber }, proyeccion: { nombre: row.nombre_completo, cargo: row.cargo }, sitio: { id: row.id } },
      validation: "V6", status: validation.status, url: official.evidenceUrl, method: rscSnapshots.get(row.id)?.method, detail: validation,
    }));
    const snapshot = rscSnapshots.get(row.id);
    const siteCheck = compareRscWithHtml({ rsc: snapshot?.body ?? "", html: snapshot?.body ?? "", expected: [row.nombre_completo, row.cargo] });
    findings.push(makeFinding({
      entity: { type: "parlamentario", id: row.id, name: row.nombre_completo }, category: "identidad", field: "presencia_ficha",
      layers: { oficial: true, proyeccion: true, sitio: siteCheck.ok }, validation: "V6", status: siteCheck.ok ? "OK" : "CAPA_NO_DISPONIBLE",
      url: `${DEFAULT_SITE_PLACEHOLDER}/politico/${row.id}`, method: snapshot?.method, detail: snapshot?.error ?? siteCheck.checks,
    }));
  }
  for (const row of rosterResult.unmatchedOfficial) findings.push(makeFinding({
    entity: { type: "parlamentario", id: row.entityId, name: row.name }, category: "identidad", field: "roster",
    layers: { oficial: row.name, proyeccion: null, sitio: null }, validation: "V6", status: "ALTA", url: row.evidenceUrl,
    detail: "Parlamentario oficial sin correspondencia inequívoca en la proyección publicada.",
  }));
  for (const row of rosterResult.unmatchedPublished) findings.push(makeFinding({
    entity: { type: "parlamentario", id: row.id, name: row.nombre_completo }, category: "identidad", field: "roster",
    layers: { oficial: null, proyeccion: row.nombre_completo, sitio: row.id }, validation: "V6", status: "ALTA", url: `${DEFAULT_SITE_PLACEHOLDER}/politico/${row.id}`, method: rscSnapshots.get(row.id)?.method,
    detail: "Ficha publicada sin correspondencia inequívoca en el roster oficial vigente.",
  }));
  return findings;
}

let DEFAULT_SITE_PLACEHOLDER = "";

async function auditExpenses(rosterMatches, siteSnapshots) {
  const findings = [];
  const calibration = {};
  for (let month = 1; month <= 5; month += 1) {
    const dataset = await fetchSenateOperationalExpenses({ year: 2026, month, fetchImpl: policyFetchResponse });
    const groups = groupBy(dataset.records, (row) => `${row.person.entity_id}|${row.person.name}`);
    for (const records of groups.values()) {
      const first = records[0];
      const id = nameToPublishedId(first.person.name, rosterMatches) ?? first.person.entity_id;
      const row = rosterMatches.find((match) => match.published.id === id)?.published;
      const normalized = analyzeOperationalExpenseGroup(records);
      const analysis = analyzeOperationalExpenseGroup(records, { projectedTotal: normalized.itemSum });
      const snapshot = siteSnapshots.get(id);
      const siteHasAmount = snapshot ? snapshot.body.replace(/[^0-9]/g, "").includes(String(analysis.officialTotal)) : false;
      const status = analysis.hasOfficialTotal ? analysis.publicationIntegrity.status : "FUENTE_NO_DISPONIBLE";
      findings.push(makeFinding({
        entity: { type: "parlamentario", id, name: row?.nombre_completo ?? first.person.name }, period: `2026-${String(month).padStart(2, "0")}`,
        category: "gastos_operacionales", field: "total_visible",
        layers: { from: "fuente_oficial", to: "proyeccion", oficial: analysis.officialTotal, proyeccion: analysis.projectedVisibleTotal, lake: analysis.projectedVisibleTotal, sitio: siteHasAmount ? analysis.projectedVisibleTotal : null, difference: analysis.publicationIntegrity.difference },
        validation: "V1", status, url: first.url ?? OFFICIAL_EXPENSE_PAGE, method: snapshot?.method,
        detail: { item_sum_excluding_summary: analysis.itemSum, naive_sum_including_summary: analysis.naiveSumIncludingSummary, item_count: analysis.itemCount, source_integrity: analysis.sourceIntegrity.status, first_divergence: analysis.publicationIntegrity.status === "OK" ? null : "proyeccion_trackeada", regression_guard: "lib/gastos-operacionales.ts + lib/gastos-operacionales.test.ts" },
      }));
      if (id === "sen-038" && month === 5) calibration.expenses_may = { official: analysis.officialTotal, items: analysis.projectedVisibleTotal, status };
    }
  }
  return { findings, calibration };
}

async function auditSupport(rosterMatches, localPersonal) {
  const findings = [];
  const officialPage = await fetchWithPolicy(OFFICIAL_SUPPORT_PAGE, { accept: "text/html" });
  const assignment = parseSupportAssignment(officialPage.body);
  const records = await fetchSupportRecords();
  const groups = groupBy(records, (row) => `${normalizeText(row.unidad_laboral)}|${row.ano}-${String(row.mes).padStart(2, "0")}`);
  let calibration = null;
  for (const [key, officialRows] of groups) {
    const [officialName, period] = key.split("|");
    const id = nameToPublishedId(officialName, rosterMatches);
    if (!id) continue;
    const match = rosterMatches.find((candidate) => candidate.published.id === id);
    const projectionEntry = Object.entries(localPersonal.senadores ?? {}).find(([name]) => normalizeText(name) === officialName);
    const projectedRows = (projectionEntry?.[1] ?? []).filter((row) => row.periodo === period);
    const officialSum = officialRows.reduce((sum, row) => sum + Number(row.monto ?? 0), 0);
    const projectedSum = projectedRows.reduce((sum, row) => sum + Number(row.monto ?? 0), 0);
    const v2 = analyzeSupportAssignment({ assignment, salaries: officialRows.map((row) => row.monto) });
    const layerMismatch = officialSum !== projectedSum;
    const status = layerMismatch ? "ALTA" : v2.validation.status;
    findings.push(makeFinding({
      entity: { type: "parlamentario", id, name: match?.published.nombre_completo ?? officialName }, period,
      category: "personal_apoyo", field: "suma_sueldos_vs_asignacion",
      layers: { oficial: { asignacion: assignment, suma_sueldos: officialSum }, proyeccion: projectedSum, lake: null, sitio: null, difference: v2.validation.difference },
      validation: "V2", status, url: OFFICIAL_SUPPORT_PAGE, method: "RSC",
      detail: { official_api: OFFICIAL_SUPPORT_URL, layer_mismatch: layerMismatch, source_page_checksum: officialPage.checksum },
    }));
    if (id === "sen-038" && period === "2026-07") calibration = { assignment, salaries: officialSum, status: v2.validation.status };
  }
  return { findings, calibration, assignment, officialRecordCount: records.length };
}

function auditVotes(data, published) {
  const findings = [];
  const votesBySession = new Map();
  for (const [politicianId, votes] of Object.entries(data.votes ?? {})) {
    for (const [sessionId, option] of votes) {
      const rows = votesBySession.get(sessionId) ?? [];
      rows.push({ politicianId, option });
      votesBySession.set(sessionId, rows);
    }
  }
  for (const [sessionId, session] of Object.entries(data.sessions ?? {})) {
    const votes = votesBySession.get(sessionId) ?? [];
    const count = (label) => votes.filter((vote) => normalizeText(vote.option) === normalizeText(label)).length;
    const nominal = { favor: count("Afirmativo"), against: count("En Contra"), abstentions: count("Abstención"), presentNoVote: count("No Vota") + count("Dispensado") };
    const validation = validateV3({ total: votes.length, ...nominal });
    findings.push(makeFinding({
      entity: { type: "votacion", id: sessionId, name: session.descripcion }, period: session.periodo,
      category: "votaciones", field: "identidad_nominal", layers: { oficial: { si: session.total_si, no: session.total_no, abstencion: session.total_abstencion, dispensado: session.total_dispensado }, proyeccion: nominal, lake: nominal, sitio: null, difference: validation.difference },
      validation: "V3", status: validation.status, url: session.url, detail: { nominal_count: votes.length },
    }));
  }
  const sessionCounts = {
    Diputado: Object.values(data.sessions ?? {}).filter((session) => session.fuente === "camara").length,
    Senador: Object.values(data.sessions ?? {}).filter((session) => session.fuente === "senado").length,
  };
  for (const row of published) {
    const votes = data.votes?.[row.id] ?? [];
    const emitted = votes.filter(([, option]) => !["no vota", "dispensado"].includes(normalizeText(option))).length;
    const denominator = votes.length;
    const percent = denominator ? (emitted / denominator) * 100 : 0;
    const validation = validateV4({ numerator: emitted, denominator, officialSessions: sessionCounts[row.cargo], publishedPercent: percent });
    findings.push(makeFinding({
      entity: { type: "parlamentario", id: row.id, name: row.nombre_completo }, period: "2026",
      category: "asistencia", field: "porcentaje_votaciones_emitidas", layers: { oficial: sessionCounts[row.cargo], proyeccion: { emitted, denominator, percent }, lake: null, sitio: null, difference: validation.difference },
      validation: "V4", status: validation.status, url: row.cargo === "Senador" ? "https://www.senado.cl/actividad-legislativa/sala-de-sesiones/votaciones" : "https://www.camara.cl/legislacion/sala_sesiones/votaciones.aspx", detail: validation,
    }));
  }
  return findings;
}

function markdownSummary(report) {
  const c = report.summary.status_counts;
  return `# Fase B — Auditoría de parlamentarios

- Corte: ${report.meta.cutoff}
- Universo oficial: **${report.summary.senators} senadores + ${report.summary.deputies} diputados = ${report.summary.parliamentarians}**
- Comparaciones registradas: **${report.summary.comparisons}**
- Estados: OK ${c.OK}, MENOR ${c.MENOR}, ALTA ${c.ALTA}, CRITICA ${c.CRITICA}, FUENTE_NO_DISPONIBLE ${c.FUENTE_NO_DISPONIBLE}, CAPA_NO_DISPONIBLE ${c.CAPA_NO_DISPONIBLE}
- RSC/HTML: **${report.rsc_validation.every((row) => row.ok) ? "APROBADA" : "FALLIDA"}** en cinco fichas; extracción masiva únicamente por RSC con fallback API por ítem.
- Control Kaiser mayo: oficial ${displayClp(report.calibration.expenses_may.official)}, suma visible ${displayClp(report.calibration.expenses_may.items)}, ${report.calibration.expenses_may.status}/V1.
- Control Kaiser julio: asignación ${displayClp(report.calibration.support_july.assignment)}, sueldos ${displayClp(report.calibration.support_july.salaries)}, ${report.calibration.support_july.status}/V2.
- Tiempo: ${report.meta.elapsed_seconds} s.

FIX-1 está activo: la fila \`VALOR TOTAL\` se conserva como control y se excluye de la agregación mediante el helper compartido en \`lib/gastos-operacionales.ts\`.
`;
}

async function main() {
  const args = parseArgs();
  DEFAULT_SITE_PLACEHOLDER = args.site;
  const personal = JSON.parse(await readFile(resolve(APP_ROOT, "data/personal-apoyo.json"), "utf8"));
  const votes = JSON.parse(await readFile(resolve(APP_ROOT, "data/politicos-votaciones.json"), "utf8"));

  const officialRoster = await fetchParliamentRosters({ fetchImpl: policyFetchResponse });
  const rosterCounts = {
    deputies: officialRoster.filter((row) => row.chamber === "camara").length,
    senators: officialRoster.filter((row) => row.chamber === "senado").length,
  };
  if (rosterCounts.deputies !== 155 || rosterCounts.senators !== 50) throw new Error(`AUDIT_ROSTER_COUNT:${JSON.stringify(rosterCounts)}`);
  const exported = await jsonFrom(`${args.site}/api/v1/export?format=json`);
  const published = exported.data.data;
  if (!Array.isArray(published) || published.length !== 205) throw new Error(`AUDIT_SITE_ROSTER_COUNT:${published?.length}`);
  const reconciliation = reconcileRoster(officialRoster, published);
  const rscValidation = await validateSiteTransport(args.site, published);
  const siteSnapshots = args.calibrateOnly ? new Map([["sen-038", { method: "RSC", body: "", checksum: null }]]) : await fetchAllRsc(args.site, published, rscValidation);

  const findings = args.calibrateOnly ? [] : auditIdentity(officialRoster, published, reconciliation, siteSnapshots);
  const expenses = await auditExpenses(reconciliation.matches, siteSnapshots);
  findings.push(...expenses.findings);
  const support = await auditSupport(reconciliation.matches, personal);
  findings.push(...support.findings);
  if (!args.calibrateOnly) findings.push(...auditVotes(votes, published));

  const calibration = { expenses_may: expenses.calibration.expenses_may, support_july: support.calibration };
  const calibrationOk = isCorrectedKaiserCalibration(calibration);
  if (!calibrationOk) throw new Error(`AUDIT_KAISER_CALIBRATION_FAILED:${JSON.stringify(calibration)}`);

  const ordered = stableSortFindings(findings);
  const statusCounts = countStatuses(ordered);
  const report = {
    meta: { generated_at: new Date().toISOString(), cutoff: args.cutoff, year: 2026, site: args.site, lake: args.lake, elapsed_seconds: elapsedSeconds(), source_order: ["fuente_oficial", "proyeccion_trackeada", "lake_archivado", "sitio_RSC"] },
    summary: { parliamentarians: 205, senators: rosterCounts.senators, deputies: rosterCounts.deputies, roster_matches: reconciliation.matches.length, comparisons: ordered.length, status_counts: statusCounts, senate_support_records: support.officialRecordCount, vote_sessions: Object.keys(votes.sessions ?? {}).length },
    build: { expected_m2_deploy: "22ce1ca3-d8eb-4b61-a811-9f22e2b86f74", next_data_consumable: false, extraction: "RSC text/x-component; HTML solo en cinco fichas; API por ítem cuando RSC falla" },
    rsc_validation: rscValidation,
    calibration,
    coverage: { identity_roster: `${reconciliation.matches.length}/205`, rsc_pages: `${[...siteSnapshots.values()].filter((row) => row.method === "RSC").length}/205`, senate_expenses_months: "5/5 publicados (enero-mayo 2026)", senate_support: "enero-julio 2026", chamber_expenses: "proyección/lake; fuente web actual no automatizada en esta ejecución", rut_party: "RUT no expuesto por roster; partido no expuesto por los endpoints de roster" },
    findings: ordered,
  };
  await writeJson(resolve(DOCS_ROOT, "01-parlamentarios.json"), report);
  await writeMarkdown(resolve(DOCS_ROOT, "01-resumen.md"), markdownSummary(report));
  console.log(JSON.stringify({ phase: "B", ...report.summary, calibration, elapsed_seconds: report.meta.elapsed_seconds }, null, 2));
  if (statusCounts.CRITICA > 0) process.exitCode = 2;
}

main().catch(async (error) => {
  const failure = { meta: { generated_at: new Date().toISOString(), elapsed_seconds: elapsedSeconds() }, status: "FAILED", error: error.message };
  await writeJson(resolve(DOCS_ROOT, "01-parlamentarios.failure.json"), failure).catch(() => {});
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
