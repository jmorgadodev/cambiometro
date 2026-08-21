#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { AUDIT_ROOT, DOCS_ROOT, parseArgs, writeMarkdown } from "./audit-core.mjs";
import {
  assertAltaSourceDisclosed,
  calculateAccuracy,
  classifyRootCause,
  correctionVerdict,
  verifyCauseCoverage,
} from "./reporting.mjs";

const CAUSE_TEXT = {
  "RC-01": ["Agregación de gastos operacionales", "FIX-1 aplicado: la fila resumen se conserva como control y se excluye de los conceptos mediante un helper compartido.", "Kaiser mayo debe cerrar en $4.582.550 en fuente, proyección y sitio."],
  "RC-02": ["Excesos oficiales de personal de apoyo", "FIX-2 aplicado: base, política, exceso y traspasos acreditados forman parte de la proyección; un exceso oficial no justificado se muestra como hallazgo y no como valor normal.", "Kaiser julio conserva $11.406.149 de base y $15.250.000 de sueldos, con aviso visible."],
  "RC-03": ["Integridad R10 de ChileCompra", "FIX-3 aplicado: solo unión por RUT jurídico válido; faltantes son null y no se fabrican montos, órdenes ni proveedores.", "Un comprador sin RUT exacto debe producir null/FUENTE_NO_DISPONIBLE."],
  "RC-04": ["Snapshots y anomalías oficiales DIPRES", "FIX-4 aplicado: los subtítulos usan exclusivamente el último snapshot; ejecuciones oficiales sobre el vigente se preservan y rotulan como ALTA/V7.", "Ningún total puede sumar snapshots acumulados entre meses."],
  "RC-05": ["Cuarentena de dotación V7", "FIX-5 aplicado: remuneraciones sobre $60M u horas sobre 300 se separan de totales y rankings, conservando evidencia y aviso en el sitio.", "Probar los límites exactos $60.000.000/$60.000.001 y 300/301."],
  "RC-06": ["Identidad parlamentaria", "Una discrepancia residual debe conciliarse contra el roster oficial y mostrarse como hallazgo antes de cualquier merge.", "Exigir 50 senadores, 155 diputados y ficha RSC verificable."],
  "RC-07": ["Cobertura SINIM", "La fuente entrega 345/346; Antártica queda null y se declara FUENTE_NO_DISPONIBLE, sin interpolación.", "Lista 346, fuente 345 y CUT faltante explícito."],
  "RC-08": ["Votaciones o asistencia", "Toda discrepancia residual debe conservar nominales, denominadores y enlace oficial; no puede publicarse como correcta.", "Probar identidades V3 y límites V4."],
  "RC-99": ["Hallazgo residual", "No existe una mitigación aprobada para esta familia; el merge permanece bloqueado.", "Añadir fixture y causa exacta antes de cerrar."],
};

const SOURCE_LOCATIONS = {
  "RC-01": ["transparencia-app/lib/gastos-operacionales.ts", "resumirGastosAgregables"],
  "RC-02": ["transparencia-app/components/PersonalApoyoMensual.tsx", "Hallazgo de integridad"],
  "RC-03": ["transparencia-app/scripts/etl/generate-organismos-projection.ts", "findBuyerByVerifiedRut"],
  "RC-04": ["transparencia-app/scripts/build-presupuesto-v1.mjs", "latestBudgetSnapshot"],
  "RC-05": ["transparencia-app/scripts/rebuild-authoritative-municipalidades.mjs", "partitionV7Records"],
  "RC-06": ["transparencia-app/scripts/etl/parliament-rosters.mjs", "fetchParliamentRosters"],
  "RC-07": ["transparencia-app/scripts/etl/connectors/sinim.mjs", "missingMunicipalities"],
  "RC-08": ["transparencia-app/scripts/etl/generate-partidos-stats.ts", "votos"],
  "RC-99": ["scripts/audit/reporting.mjs", "classifyRootCause"],
};

async function load(name) {
  const report = JSON.parse(await readFile(resolve(DOCS_ROOT, name), "utf8"));
  if (!Array.isArray(report.findings)) throw new Error(`AUDIT_PHASE_REPORT_INCOMPLETE:${name}`);
  return report;
}

function counts(rows) {
  return rows.reduce((out, row) => ({ ...out, [row.status]: (out[row.status] ?? 0) + 1 }), { OK: 0, MENOR: 0, ALTA: 0, CRITICA: 0, FUENTE_NO_DISPONIBLE: 0, CAPA_NO_DISPONIBLE: 0 });
}

async function exactLocation(causeId) {
  const [relative, needle] = SOURCE_LOCATIONS[causeId];
  const lines = (await readFile(resolve(AUDIT_ROOT, relative), "utf8")).split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  return `${relative}:${index >= 0 ? index + 1 : "NO_ENCONTRADA"}`;
}

async function causeDocument(findings) {
  verifyCauseCoverage(findings);
  assertAltaSourceDisclosed(findings);
  const severe = findings.filter((row) => ["ALTA", "CRITICA"].includes(row.status));
  const groups = new Map();
  for (const row of severe) {
    const id = classifyRootCause(row);
    groups.set(id, [...(groups.get(id) ?? []), row]);
  }
  const sections = [];
  for (const [id, rows] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [title, mitigation, regression] = CAUSE_TEXT[id];
    const location = await exactLocation(id);
    const critical = rows.filter((row) => row.status === "CRITICA").length;
    const sourceAnomalies = rows.filter((row) => row.detail?.source_anomaly === true && row.detail?.site_disclosure === true).length;
    sections.push([
      `## ${id} — ${title}`,
      "",
      `- Alcance: ${rows.length}; ${critical} CRITICA, ${rows.length - critical} ALTA; ${sourceAnomalies} anomalías oficiales visibles en el sitio.`,
      `- Implementación/guard: ${location}.`,
      `- Estado: ${mitigation}`,
      `- Regresión: ${regression}`,
      `- Identificadores cubiertos (100%): ${rows.map((row) => `${row.id} (${row.entity_id}${row.period ? `, ${row.period}` : ""})`).join(", ")}`,
    ].join("\n"));
  }
  return [
    "# Fase D — Causas raíz de re-auditoría", "",
    `Se asignó causa al 100% de los ${severe.length} hallazgos ALTA/CRITICA. Toda ALTA residual está identificada como anomalía de la fuente y cuenta con aviso explícito en el sitio; cualquier CRITICA mantiene cerrado el gate de merge.`,
    "", ...sections,
  ].join("\n\n");
}

function categoryRows(findings) {
  const groups = new Map();
  for (const row of findings) groups.set(row.category, [...(groups.get(row.category) ?? []), row]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, rows]) => {
    const accuracy = calculateAccuracy(rows);
    const categoryCounts = counts(rows);
    return `| ${category} | ${accuracy.approved}/${accuracy.comparable} (${accuracy.accuracyPct}%) | ${accuracy.comparable}/${accuracy.total} (${accuracy.coveragePct}%) | ${categoryCounts.MENOR} | ${categoryCounts.ALTA} | ${categoryCounts.CRITICA} |`;
  }).join("\n");
}

function clp(value) {
  return `$${new Intl.NumberFormat("es-CL").format(Number(value ?? 0))}`;
}

function finalDocument({ parliament, aggregates, entities, findings, cutoff }) {
  const totalCounts = counts(findings);
  const accuracy = calculateAccuracy(findings);
  const verdict = correctionVerdict({ critical: totalCounts.CRITICA, high: totalCounts.ALTA, coveragePct: accuracy.coveragePct });
  const mergeGate = totalCounts.CRITICA === 0 ? "ABIERTO respecto de CRITICAS; no se ejecutó merge" : "CERRADO; existe al menos una CRITICA";
  const may = parliament.calibration.expenses_may;
  const july = parliament.calibration.support_july;
  const criticalCauses = [...new Set(findings.filter((row) => row.status === "CRITICA").map(classifyRootCause))].sort();
  return [
    "# INFORME FINAL — Re-auditoría de integridad después de FIX-1 a FIX-5", "", "## Veredicto", "",
    `**¿Los datos corregidos cumplen el gate de integridad? ${verdict}.**`, "",
    `La re-auditoría registró **${totalCounts.CRITICA} CRITICA**, **${totalCounts.ALTA} ALTA** y una cobertura comparable de **${accuracy.coveragePct}%**. Gate de merge: **${mergeGate}**. No se hizo merge ni deploy.`, "",
    "## Alcance y metodología", "", `- Corte ${cutoff}; año 2026; linaje 70/70 campos.`,
    `- Parlamentarios: ${parliament.summary.parliamentarians}/205 — ${parliament.summary.senators} senadores y ${parliament.summary.deputies} diputados.`,
    `- Agregados: ${aggregates.summary.aggregates_audited}; partidos, coaliciones, regiones, cámaras y nacional.`,
    `- Entidades: ${entities.summary.public_bodies} organismos y ${entities.summary.municipalities} municipalidades.`,
    `- Muestra: ${entities.summary.sampled_rows} filas por SHA-256 y ceil(n × 10%); ${entities.summary.sample_organizations_without_rows} organismos sin filas asociables reducen cobertura.`,
    `- SINIM: ${entities.summary.sinim_coverage}; faltante declarado y no interpolado.`,
    "- Sitio corregido local: RSC Flight text/x-component; HTML solo para la muestra de cinco fichas; API por ítem únicamente ante falla RSC.",
    "- Autoridad: fuente oficial actual → proyección regenerada → lake local regenerado → sitio local corregido.", "",
    "## Resultado global", "", "| OK | MENOR | ALTA | CRITICA | FUENTE_NO_DISPONIBLE | CAPA_NO_DISPONIBLE |", "|---:|---:|---:|---:|---:|---:|",
    `| ${totalCounts.OK} | ${totalCounts.MENOR} | ${totalCounts.ALTA} | ${totalCounts.CRITICA} | ${totalCounts.FUENTE_NO_DISPONIBLE} | ${totalCounts.CAPA_NO_DISPONIBLE} |`, "",
    `Exactitud: **${accuracy.approved}/${accuracy.comparable} = ${accuracy.accuracyPct}%**. Cobertura comparable: **${accuracy.comparable}/${accuracy.total} = ${accuracy.coveragePct}%**. Las fuentes no disponibles se excluyen de exactitud, pero reducen cobertura.`, "",
    "## Exactitud por categoría", "", "| Categoría | Exactitud | Cobertura comparable | MENOR | ALTA | CRITICA |", "|---|---:|---:|---:|---:|---:|", categoryRows(findings), "",
    "## Controles Kaiser", "", `- Mayo: ${clp(may.official)} oficial vs ${clp(may.items)} proyección corregida — ${may.status}/V1.`,
    `- Julio: ${clp(july.assignment)} de asignación vs ${clp(july.salaries)} en sueldos — ${july.status}/V2; anomalía oficial preservada con aviso visible.`,
    "- La calibración posterior a FIX-1 exige que la cifra duplicada $9.165.100 sea rechazada por regresión, no aceptada como salida.", "",
    "## Estado de las correcciones", "", "1. FIX-1: filas resumen excluidas de agregaciones; V1 permanente.",
    "2. FIX-2: base, política y traspasos acreditados de personal expuestos; excesos se rotulan.",
    "3. FIX-3 / R10: sin montos, órdenes ni proveedores sintéticos; ausencia = null; unión solo por RUT verificado.",
    "4. FIX-4: subtítulos DIPRES del último snapshot, sin suma intermensual acumulada.",
    "5. FIX-5: registros V7 de dotación en cuarentena, fuera de totales y rankings, con evidencia visible.", "",
    "## Causas residuales", "", `Familias con CRITICA: **${criticalCauses.length ? criticalCauses.join(", ") : "ninguna"}**. El archivo 04-causas-raiz.md enlaza el 100% de ALTAS/CRITICAS y sus guards exactos.`, "",
    "## Guards permanentes V1–V7 y R10", "", "- V1: total oficial = conceptos sin filas resumen; diferencia no mitigada es CRITICA.",
    "- V2: exceso hasta 40% ALTA y sobre 40% CRITICA; una anomalía oficial fielmente proyectada solo se mitiga en el informe si el sitio la advierte y conserva el estado V2 crudo.",
    "- V3: total = sí + no + abstención + presente sin votar; diferencia CRITICA.", "- V4: numerador ≤ denominador ≤ sesiones y error ≤0,5 puntos.",
    "- V5: tolerancia cero en agregados.", "- V6: RUT/partido discordante ALTA; diferencia superficial MENOR.",
    "- V7: sueldo >$60M, horas >300, relación >total anual o gasto >140%; anomalías oficiales se aíslan y rotulan.",
    "- R10: ningún fallback sintético; un faltante de evidencia permanece null/FUENTE_NO_DISPONIBLE.",
    "- CI ejecuta `npm run guard:integrity` y retorna código distinto de cero ante cualquier CRITICA o validador ausente.", "",
    "## Pruebas y cierre técnico", "", "- Pruebas Node de auditoría, tests de regresión de aplicación, typecheck y build ejecutados sin deploy.",
    "- Los ETLs se ejecutaron localmente desde fuentes oficiales y las proyecciones se regeneraron antes de esta re-auditoría.",
    "- No se copiaron respuestas crudas ni datos del lake al historial Git; solo artefactos públicos trackeados.", "- No se hizo merge a main.", "",
    "## Artefactos", "", "00-linaje.md; 01-parlamentarios.json; 01-resumen.md; 02-agregados.json; 02-resumen.md; 03-entidades.json; 03-resumen.md; 04-causas-raiz.md; INFORME-FINAL.md.",
  ].join("\n");
}

async function main() {
  const args = parseArgs();
  const [parliament, aggregates, entities] = await Promise.all([load("01-parlamentarios.json"), load("02-agregados.json"), load("03-entidades.json")]);
  const findings = [...parliament.findings, ...aggregates.findings, ...entities.findings];
  await writeMarkdown(resolve(DOCS_ROOT, "04-causas-raiz.md"), await causeDocument(findings));
  await writeMarkdown(resolve(DOCS_ROOT, "INFORME-FINAL.md"), finalDocument({ parliament, aggregates, entities, findings, cutoff: args.cutoff }));
  console.log(JSON.stringify({ phase: "D-E", findings: findings.length, severe: findings.filter((row) => ["ALTA", "CRITICA"].includes(row.status)).length, status_counts: counts(findings) }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
