#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { APP_ROOT, DOCS_ROOT, findingId, normalizeText, parseArgs, sha256, stableSortFindings, validateV5, validateV7, writeJson, writeMarkdown } from "./audit-core.mjs";
import { auditQuarantinedV7, classifyR10PurchaseLayer, requireFields, sampleByEntity } from "./entities.mjs";

const NUMERIC_FIELDS = ["dotacion_total", "gasto_mensual_estimado_clp", "compras_ocds_monto_clp", "compras_ocds_procesos"];

function finding({ entity, period, category, field, official, projection, lake, site, validation, status, difference = null, url, detail = null }) {
  return {
    id: findingId([entity.type, entity.id, period, category, field, validation]), entity_type: entity.type, entity_id: entity.id, entity_name: entity.name,
    period, category, field, layer_from: "fuente_oficial", layer_to: "sitio", values: { oficial: official ?? null, proyeccion: projection ?? null, lake: lake ?? null, sitio: site ?? null },
    difference, validation, severity: status, status, url, checksum: sha256(JSON.stringify({ entity: entity.id, period, field, official, projection, lake, site })), site_extraction_method: "RSC", detail,
  };
}

function statusCounts(findings) {
  return findings.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), { OK: 0, MENOR: 0, ALTA: 0, CRITICA: 0, FUENTE_NO_DISPONIBLE: 0, CAPA_NO_DISPONIBLE: 0 });
}

function programRowsForOrganization(organization, programs) {
  const code = String(organization.partida_capitulo_dipres ?? "").replace(/[^0-9-]/g, "");
  if (!code) return [];
  const [partida, capitulo] = code.split("-");
  return programs.filter((program) => Number(program.partida) === Number(partida) && (!capitulo || Number(program.capitulo) === Number(capitulo)))
    .flatMap((program) => (program.subtitulos ?? []).map((row) => ({ ...row, organization_id: organization.id, program_id: program.programId, row_id: `${program.programId}:${row.subtitulo}` })));
}

async function main() {
  const started = Date.now();
  const args = parseArgs();
  const projectionRoot = resolve(APP_ROOT, "data/lake/projections/v1");
  const archiveRoot = resolve(args.lake, "projections/v1");
  const [organizations, archivedOrganizations, budget, sinim, archivedSinim, municipalityList, municipalityData, chileCompra] = await Promise.all([
    readFile(resolve(projectionRoot, "organismos.json"), "utf8").then(JSON.parse),
    readFile(resolve(archiveRoot, "organismos.json"), "utf8").then(JSON.parse),
    readFile(resolve(projectionRoot, "presupuesto.json"), "utf8").then(JSON.parse),
    readFile(resolve(projectionRoot, "sinim.json"), "utf8").then(JSON.parse),
    readFile(resolve(archiveRoot, "sinim.json"), "utf8").then(JSON.parse),
    readFile(resolve(APP_ROOT, "data/municipalidades-list.json"), "utf8").then(JSON.parse),
    readFile(resolve(APP_ROOT, "data/municipalidades-data.json"), "utf8").then(JSON.parse),
    readFile(resolve(projectionRoot, "chilecompra.json"), "utf8").then(JSON.parse),
  ]);
  const budgetDisclosureSources = await Promise.all([
    readFile(resolve(APP_ROOT, "components/servicios/ServicioPublicoDashboardClient.tsx"), "utf8"),
    readFile(resolve(APP_ROOT, "app/entidades/[id]/page.tsx"), "utf8"),
  ]);
  const budgetDisclosure = budgetDisclosureSources.every((source) => source.includes("Hallazgo de integridad ALTA (V7) · valor oficial preservado"));
  if (!budgetDisclosure) throw new Error("AUDIT_BUDGET_ANOMALY_NOT_DISCLOSED");
  const purchaseDisclosureSources = await Promise.all([
    readFile(resolve(APP_ROOT, "components/servicios/ServicioPublicoDashboardClient.tsx"), "utf8"),
    readFile(resolve(APP_ROOT, "components/municipalidades/MunicipalidadDetailDashboardClient.tsx"), "utf8"),
  ]);
  const purchaseDisclosure = purchaseDisclosureSources.every((source) => source.includes("Hallazgo de integridad ALTA (V7) · valor oficial preservado"));
  if (!purchaseDisclosure) throw new Error("AUDIT_PURCHASE_ANOMALY_NOT_DISCLOSED");
  requireFields(organizations, ["id", "nombre_canonico", "tipo", ...NUMERIC_FIELDS], "organismos");
  if (organizations.length !== 884) throw new Error(`AUDIT_ORGANIZATION_COUNT:${organizations.length}`);
  const publicBodies = organizations.filter((row) => row.tipo !== "Municipalidad");
  const municipalities = organizations.filter((row) => row.tipo === "Municipalidad");
  if (publicBodies.length !== 538 || municipalities.length !== 346) throw new Error(`AUDIT_ENTITY_SPLIT:${publicBodies.length}:${municipalities.length}`);
  if (municipalityList.length !== 346 || Object.keys(municipalityData).length !== 346) throw new Error("AUDIT_MUNICIPALITY_SITE_COUNT");

  const archivedById = new Map(archivedOrganizations.map((row) => [row.id, row]));
  const sinimByCode = new Map(sinim.municipios.map((row) => [row.code, row]));
  const archivedSinimByCode = new Map(archivedSinim.municipios.map((row) => [row.code, row]));
  const listById = new Map(municipalityList.map((row) => [row.id, row]));
  const findings = [];
  let sampledRows = 0;
  let sampleRequiredOrganizations = 0;
  let sampleUnavailableOrganizations = 0;

  for (const organization of publicBodies) {
    const entity = { type: "organismo", id: organization.id, name: organization.nombre_canonico };
    const archived = archivedById.get(organization.id);
    for (const field of NUMERIC_FIELDS) {
      const hasArchive = archived && Number.isFinite(Number(archived[field]));
      const validation = hasArchive ? validateV5({ publishedTotal: organization[field], components: [archived[field]] }) : null;
      findings.push(finding({ entity, period: field.includes("presupuesto") ? "2026" : args.cutoff, category: field.includes("compras") ? "compras" : field === "dotacion_total" ? "dotacion" : "personal", field,
        official: null, projection: organization[field], lake: archived?.[field], site: organization[field], validation: field.includes("compras") ? "V5" : "V7",
        status: "FUENTE_NO_DISPONIBLE", difference: validation?.difference ?? null,
        url: organization.sitio_web_oficial, detail: { official_current: "La fuente oficial por fila no expone un endpoint reutilizable; se compara proyección trackeada con lake archivado y se reduce cobertura oficial." },
      }));
    }
    const childRows = programRowsForOrganization(organization, budget.programs ?? []);
    if (childRows.length) {
      sampleRequiredOrganizations += 1;
      const sampled = sampleByEntity(childRows, 0.1, (row) => row.organization_id, (row) => row.row_id);
      sampledRows += sampled.length;
      for (const row of sampled) {
        const check = validateV7({ relationAmount: row.ejecutado, annualOrganizationTotal: row.vigente });
        findings.push(finding({ entity, period: "2026", category: "presupuesto", field: `muestra:${row.row_id}`, official: row.vigente, projection: row.ejecutado, lake: row.ejecutado, site: null,
          validation: "V7", status: check.status, difference: check.difference, url: "https://www.dipres.gob.cl/597/w3-propertyvalue-23076.html", detail: { sample_ratio: 0.1, violations: check.violations, source_anomaly: check.status === "ALTA", site_disclosure: check.status === "ALTA" && budgetDisclosure, disclosure_label: check.status === "ALTA" ? "Hallazgo de integridad ALTA (V7) · valor oficial preservado" : null },
        }));
      }
    } else {
      sampleUnavailableOrganizations += 1;
      findings.push(finding({ entity, period: "2026", category: "presupuesto", field: "muestra_individual_10pct", official: null, projection: null, lake: null, site: null,
        validation: "V7", status: "FUENTE_NO_DISPONIBLE", url: "https://www.dipres.gob.cl/597/w3-propertyvalue-23076.html", detail: "No existe identificador partida/capítulo o filas individuales asociables de forma inequívoca; no se inventó muestra.",
      }));
    }
  }

  const missingSinim = [];
  let municipalRowsAudited = 0;
  for (const organization of municipalities) {
    const entity = { type: "municipalidad", id: organization.id, name: organization.nombre_canonico };
    const detail = municipalityData[organization.id];
    const listed = listById.get(organization.id);
    const official = sinimByCode.get(organization.cut_si_municipio);
    const archived = archivedSinimByCode.get(organization.cut_si_municipio);
    if (!official) {
      missingSinim.push({ id: organization.id, code: organization.cut_si_municipio, name: organization.nombre_canonico });
      findings.push(finding({ entity, period: sinim.period, category: "sinim", field: "cobertura", official: null, projection: null, lake: archived ?? null, site: listed ? true : null, validation: "V5", status: "FUENTE_NO_DISPONIBLE", url: sinim.municipios[0]?.indicators?.[0]?.url, detail: "SINIM entrega 345 de 346 municipalidades; no se completó ni interpoló." }));
    } else {
      const indicator = (code) => official.indicators.find((row) => row.code === code)?.monto_clp ?? null;
      const archiveIndicator = (code) => archived?.indicators?.find((row) => row.code === code)?.monto_clp ?? null;
      for (const [field, code, siteValue] of [
        ["presupuesto_inicial_clp", "BPIIM", detail?.presupuesto?.inicial_clp],
        ["presupuesto_vigente_clp", "BPVIM", detail?.presupuesto?.vigente_clp],
        ["ingresos_propios_clp", "IADM01", detail?.presupuesto?.ingresos_propios_clp],
        ["gasto_total_clp", "IADM11", null],
      ]) {
        const officialValue = indicator(code);
        const check = officialValue === null ? null : validateV5({ publishedTotal: siteValue ?? officialValue, components: [officialValue] });
        findings.push(finding({ entity, period: sinim.period, category: "sinim", field, official: officialValue, projection: officialValue, lake: archiveIndicator(code), site: siteValue, validation: "V5", status: check?.status ?? "FUENTE_NO_DISPONIBLE", difference: check?.difference ?? null, url: official.indicators.find((row) => row.code === code)?.url }));
        municipalRowsAudited += 1;
      }
    }
    const personnel = detail?.resumen_personal;
    if (personnel) {
      const check = validateV5({ publishedTotal: personnel.total_funcionarios, components: [personnel.planta, personnel.contrata, personnel.honorarios, personnel.codigo_trabajo_salud_educacion] });
      findings.push(finding({ entity, period: detail.alcalde?.periodo ?? "2026-06", category: "dotacion", field: "total_funcionarios", official: organization.dotacion_total, projection: personnel.total_funcionarios, lake: archivedById.get(organization.id)?.dotacion_total, site: listed?.resumen_personal?.total_funcionarios, validation: "V5", status: check.status, difference: check.difference, url: detail.alcalde?.fuente, detail: { components: { planta: personnel.planta, contrata: personnel.contrata, honorarios: personnel.honorarios, codigo_trabajo: personnel.codigo_trabajo_salud_educacion } } }));
      for (const row of [...(detail.top_remuneraciones ?? []), ...(detail.top_horas_extras ?? [])]) {
        const checkRow = validateV7({ monthlySalary: row.remuneracion_bruta, overtimeHours: row.horas });
        findings.push(finding({ entity, period: row.periodo ?? "2026-06", category: "dotacion", field: `fila:${row.id}`, official: null, projection: { remuneracion_bruta: row.remuneracion_bruta ?? null, horas: row.horas ?? null }, lake: null, site: true, validation: "V7", status: checkRow.status, url: detail.alcalde?.fuente, detail: checkRow }));
        municipalRowsAudited += 1;
      }
      const regularIds = new Set([...(detail.top_remuneraciones ?? []), ...(detail.top_horas_extras ?? [])].map((row) => String(row.id)));
      for (const anomaly of auditQuarantinedV7(detail.anomalias_integridad, regularIds)) {
        findings.push(finding({
          entity,
          period: anomaly.record.periodo ?? anomaly.record.fuente_periodo ?? "2026",
          category: "dotacion",
          field: `cuarentena_v7:${anomaly.id}`,
          official: { remuneracion_bruta: anomaly.record.remuneracion_bruta_mensual ?? null, horas: anomaly.record.horas_extras_mes_anterior ?? null },
          projection: null,
          lake: null,
          site: { visible_como_hallazgo: true, excluded_from_regular: anomaly.excludedFromRegular },
          validation: "V7",
          status: anomaly.status,
          difference: anomaly.violations.length,
          url: anomaly.sourceUrl,
          detail: { violations: anomaly.violations, source_anomaly: true, site_disclosure: true, quarantined: true, excluded_from_totals_and_rankings: true },
        }));
        municipalRowsAudited += 1;
      }
    }
    const purchase = detail?.compras_publicas;
    for (const [field, projectionValue, siteValue] of [
      ["monto_total_clp", organization.compras_ocds_monto_clp, purchase?.monto_total_clp ?? null],
      ["procesos", organization.compras_ocds_procesos, purchase?.procesos_count ?? null],
    ]) {
      const check = classifyR10PurchaseLayer({ projection: projectionValue, site: siteValue });
      findings.push(finding({
        entity,
        period: "2026",
        category: "compras",
        field,
        official: purchase?.metodo_enlace === "RUT_EXACTO" ? siteValue : null,
        projection: projectionValue,
        lake: archivedById.get(organization.id)?.[field === "procesos" ? "compras_ocds_procesos" : "compras_ocds_monto_clp"],
        site: siteValue,
        validation: "V5",
        status: check.status,
        difference: check.difference,
        url: purchase?.top_compras?.[0] ? `https://api.mercadopublico.cl/APISOCDS/OCDS/award/${purchase.top_compras[0].ocid}` : null,
        detail: { r10: true, join_method: purchase?.metodo_enlace ?? null, missing_evidence_is_null: true },
      }));
    }
  }

  for (const anomaly of chileCompra.anomalies ?? []) {
    findings.push(finding({
      entity: { type: "organismo", id: anomaly.buyer_id ?? "sin-comprador", name: anomaly.buyer_name ?? "Comprador no reconciliado" },
      period: anomaly.fecha?.slice(0, 7) ?? "2026",
      category: "compras",
      field: `cuarentena_v7:${anomaly.ocid}`,
      official: anomaly.monto_oficial_clp,
      projection: null,
      lake: anomaly.monto_oficial_clp,
      site: { visible_como_hallazgo: purchaseDisclosure, excluded_from_totals_and_rankings: anomaly.excluded_from_totals_and_rankings === true },
      validation: "V7",
      status: "ALTA",
      difference: anomaly.monto_oficial_clp,
      url: anomaly.source_url,
      detail: {
        violations: anomaly.violations,
        source_anomaly: true,
        site_disclosure: purchaseDisclosure,
        quarantined: true,
        excluded_from_totals_and_rankings: anomaly.excluded_from_totals_and_rankings === true,
      },
    }));
  }

  const ordered = stableSortFindings(findings);
  const counts = statusCounts(ordered);
  const report = {
    meta: { generated_at: new Date().toISOString(), cutoff: args.cutoff, elapsed_seconds: Math.round((Date.now() - started) / 1000), sample_ratio: 0.1, lake_read_only: true },
    summary: { public_bodies: publicBodies.length, municipalities: municipalities.length, sinim_coverage: `${sinim.municipios.length}/346`, sampled_rows: sampledRows, sample_organizations_with_rows: sampleRequiredOrganizations, sample_organizations_without_rows: sampleUnavailableOrganizations, municipal_rows_audited: municipalRowsAudited, comparisons: ordered.length, status_counts: counts },
    missing_sinim: missingSinim,
    findings: ordered,
  };
  await writeJson(resolve(DOCS_ROOT, "03-entidades.json"), report);
  await writeMarkdown(resolve(DOCS_ROOT, "03-resumen.md"), `# Fase C — Organismos y municipalidades\n\n- Organismos no municipales auditados: **${publicBodies.length}**.\n- Municipalidades auditadas: **${municipalities.length}**.\n- Cobertura SINIM: **${sinim.municipios.length}/346**; la ausencia se registra como FUENTE_NO_DISPONIBLE.\n- Filas individuales de presupuesto muestreadas al 10% por organismo con identificador DIPRES: **${sampledRows}**.\n- Organismos con muestra: ${sampleRequiredOrganizations}; sin filas inequívocamente asociables: ${sampleUnavailableOrganizations}.\n- Filas municipales auditadas: **${municipalRowsAudited}**.\n- Comparaciones: **${ordered.length}**. Estados: OK ${counts.OK}, MENOR ${counts.MENOR}, ALTA ${counts.ALTA}, CRITICA ${counts.CRITICA}, FUENTE_NO_DISPONIBLE ${counts.FUENTE_NO_DISPONIBLE}, CAPA_NO_DISPONIBLE ${counts.CAPA_NO_DISPONIBLE}.\n- Tiempo: ${report.meta.elapsed_seconds} s.\n`);
  console.log(JSON.stringify({ phase: "C-entidades", ...report.summary, elapsed_seconds: report.meta.elapsed_seconds }, null, 2));
  if (counts.CRITICA) process.exitCode = 2;
}

main().catch(async (error) => {
  await writeJson(resolve(DOCS_ROOT, "03-entidades.json"), { status: "FAILED", error: error.message }).catch(() => {});
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
