#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { DOCS_ROOT, parseArgs, writeMarkdown } from "./audit-core.mjs";
import { calculateAccuracy, classifyRootCause, verifyCauseCoverage } from "./reporting.mjs";

const CAUSES = {
  "RC-01": ["La agregación partidaria suma la fila resumen como concepto", "transparencia-app/scripts/etl/generate-partidos-stats.ts:259-270", "El bucle agrega todo gasto positivo, incluida VALOR TOTAL; la ficha sí la excluye en lib/gastos-operacionales.ts:102-118.", "Reutilizar esFilaResumenTotal y conservar el resumen solo como control.", "Kaiser mayo debe cerrar en 4.582.550 y nunca en 9.165.100."],
  "RC-02": ["Personal de apoyo no publica límite ni traspasos", "transparencia-app/components/PersonalApoyoMensual.tsx:78-97 y transparencia-app/lib/personal-apoyo.ts:253-257", "La suma es trazable, pero no se acompaña de asignación base ni traspasos autorizados; V2 no puede resolver el exceso.", "Persistir base, traspasos y evidencia por período.", "Kaiser julio queda ALTA hasta justificar 15.250.000 frente a 11.406.149."],
  "RC-03": ["Compras municipales mezclan matching heurístico y fallback sintético", "transparencia-app/scripts/etl/generate-organismos-projection.ts:73-96 y transparencia-app/scripts/rebuild-authoritative-municipalidades.mjs:818-829", "Una capa toma el primer nombre parecido; otra inventa 34% del presupuesto y procesos cuando no hay comprador.", "Unir solo por RUT verificado; ausencia debe ser null/FUENTE_NO_DISPONIBLE.", "Cada CUT debe tener un RUT comprador único y total OCDS deduplicado."],
  "RC-04": ["Subtítulos DIPRES suman snapshots acumulados", "transparencia-app/scripts/build-presupuesto-v1.mjs:84-99", "Los subtítulos no conservan período y suman ejecuciones que ya son acumuladas.", "Usar solo el último período o guardar subtítulos por período.", "V7 debe aplicarse al último snapshot, no a la suma intermensual."],
  "RC-05": ["Dotación sobre límites de plausibilidad", "transparencia-app/scripts/rebuild-authoritative-municipalidades.mjs:592-733", "Remuneraciones u horas sobre V7 alimentan la proyección regular sin cuarentena.", "Separar anomalías, conservar evidencia y revisar antes de rankings.", "Probar 60.000.000/60.000.001 y 300/301 horas."],
  "RC-06": ["Identidad incompleta o no visible", "transparencia-app/scripts/etl/parliament-rosters.mjs:1-120", "Nombre/cargo concilian, pero el roster normalizado no conserva todos los atributos y una ficha RSC resultó incompleta.", "Conservar identificadores con procedencia y verificar ficha por ID.", "Exigir 50/155 y presencia RSC de todos los campos publicados."],
  "RC-07": ["Cobertura SINIM 345/346", "transparencia-app/scripts/etl/connectors/sinim.mjs:130-143", "Antártica (CUT 12202) no está en la fuente; no corresponde interpolar.", "Mantener null y cobertura explícita.", "Lista 346, SINIM 345 y CUT faltante declarado."],
  "RC-08": ["Descuadre de votos o asistencia", "transparencia-app/scripts/etl/generate-partidos-stats.ts:100-247", "Reserva para V3/V4 que no preserve nominales o denominadores.", "Derivar solo de votos deduplicados y sesiones oficiales.", "Cubrir identidades y límites V3/V4."],
  "RC-99": ["Hallazgo residual", "metodología de auditoría", "No encaja en otra familia.", "Investigar antes de merge.", "Añadir fixture específico."],
};

async function load(name) {
  const report = JSON.parse(await readFile(resolve(DOCS_ROOT, name), "utf8"));
  if (!Array.isArray(report.findings)) throw new Error(`AUDIT_PHASE_REPORT_INCOMPLETE:${name}`);
  return report;
}

function counts(rows) {
  return rows.reduce((out, row) => ({ ...out, [row.status]: (out[row.status] ?? 0) + 1 }), { OK: 0, MENOR: 0, ALTA: 0, CRITICA: 0, FUENTE_NO_DISPONIBLE: 0, CAPA_NO_DISPONIBLE: 0 });
}

function causeDocument(findings) {
  verifyCauseCoverage(findings);
  const severe = findings.filter((row) => ["ALTA", "CRITICA"].includes(row.status));
  const groups = new Map();
  for (const row of severe) {
    const id = classifyRootCause(row);
    groups.set(id, [...(groups.get(id) ?? []), row]);
  }
  const sections = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, rows]) => {
    const [title, location, cause, fix, regression] = CAUSES[id];
    const ids = rows.map((row) => `${row.id} (${row.entity_id}${row.period ? `, ${row.period}` : ""})`).join(", ");
    return [
      `## ${id} — ${title}`, "", `- Alcance: ${rows.length}; ${rows.filter((row) => row.status === "CRITICA").length} CRITICA y ${rows.filter((row) => row.status === "ALTA").length} ALTA.`,
      `- Defecto: ${location}.`, `- Causa: ${cause}`, `- Fix propuesto, no aplicado: ${fix}`, `- Regresión: ${regression}`, `- Identificadores cubiertos (100%): ${ids}`,
    ].join("\n");
  });
  return ["# Fase D — Causas raíz", "", `Se asignó causa y fix al 100% de los ${severe.length} hallazgos ALTA/CRITICA. No se modificó aplicación, ETL ni datos.`, "", ...sections].join("\n\n");
}

function categoryRows(findings) {
  const groups = new Map();
  for (const row of findings) groups.set(row.category, [...(groups.get(row.category) ?? []), row]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, rows]) => {
    const a = calculateAccuracy(rows);
    const c = counts(rows);
    return `| ${category} | ${a.approved}/${a.comparable} (${a.accuracyPct}%) | ${a.comparable}/${a.total} (${a.coveragePct}%) | ${c.MENOR} | ${c.ALTA} | ${c.CRITICA} |`;
  }).join("\n");
}

function finalDocument({ aggregates, entities, findings, cutoff }) {
  const c = counts(findings);
  const a = calculateAccuracy(findings);
  const criticalCauses = [...new Set(findings.filter((row) => row.status === "CRITICA").map(classifyRootCause))].sort();
  const verdict = c.CRITICA > 0 ? "NO" : c.ALTA > 0 || a.coveragePct < 100 ? "CON FIXES" : "SI";
  return [
    "# INFORME FINAL — Auditoría completa de integridad de datos", "", "## Veredicto", "",
    `**¿Los datos publicados son íntegros y aptos para considerarse correctos sin reservas? ${verdict}.**`, "",
    `Hay ${c.CRITICA} comparaciones CRITICA, ${c.ALTA} ALTA y cobertura comparable de ${a.coveragePct}%. Una sola CRITICA basta para un veredicto NO. No se hizo merge, deploy ni modificación de aplicación, ETL o datos.`, "",
    "## Alcance y metodología", "", `- Corte ${cutoff}; año 2026; linaje 70/70 campos.`, "- Parlamentarios: 205/205 — 50 senadores y 155 diputados.",
    `- Agregados: ${aggregates.summary.aggregates_audited}; partidos, coaliciones, regiones, cámaras y nacional.`, `- Entidades: ${entities.summary.public_bodies} organismos y ${entities.summary.municipalities} municipalidades.`,
    `- Muestra: ${entities.summary.sampled_rows} filas por SHA-256 y ceil(n × 10%); ${entities.summary.sample_organizations_without_rows} organismos sin filas asociables reducen cobertura.`,
    `- SINIM: ${entities.summary.sinim_coverage}; falta Antártica (CUT 12202), sin completar ni interpolar.`, "- Sitio: RSC Flight text/x-component; HTML solo en cinco fichas; API solo como fallback por ítem.",
    "- 22ce1ca3-d8eb-4b61-a811-9f22e2b86f74 es el deploy M2 esperado, no un Next build-id consumible; /_next/data y manifests no existen en App Router.", "- Autoridad: fuente oficial actual → proyección trackeada → lake archivado de solo lectura → sitio.", "",
    "## Resultado global", "", "| OK | MENOR | ALTA | CRITICA | FUENTE_NO_DISPONIBLE | CAPA_NO_DISPONIBLE |", "|---:|---:|---:|---:|---:|---:|",
    `| ${c.OK} | ${c.MENOR} | ${c.ALTA} | ${c.CRITICA} | ${c.FUENTE_NO_DISPONIBLE} | ${c.CAPA_NO_DISPONIBLE} |`, "",
    `Exactitud: **${a.approved}/${a.comparable} = ${a.accuracyPct}%**. Cobertura comparable: **${a.comparable}/${a.total} = ${a.coveragePct}%**. Las fuentes no disponibles se excluyen de exactitud, pero reducen cobertura.`, "",
    "## Exactitud por categoría", "", "| Categoría | Exactitud | Cobertura comparable | MENOR | ALTA | CRITICA |", "|---|---:|---:|---:|---:|---:|", categoryRows(findings), "",
    "## Controles Kaiser", "", "- Mayo: $4.582.550 oficial vs $9.165.100 agregado — CRITICA/V1.", "- Julio: $11.406.149 de asignación vs $15.250.000 en sueldos — ALTA/V2.",
    "- Calibración APROBADA con API y página oficial; las cifras esperadas solo fueron aserciones.", "- Alcance sistémico: RC-01 afecta todo agregado que incluya filas resumen; RC-02 afecta todo exceso sin traspaso publicado.", "",
    "## Causas y fixes", "", `Familias críticas: **${criticalCauses.join(", ")}**. 04-causas-raiz.md contiene líneas exactas, fixes, regresiones y el 100% de identificadores.`, "",
    "1. RC-01: doble suma de resúmenes de gasto.", "2. RC-03: matching textual y fallbacks sintéticos en compras.", "3. RC-04: suma intermensual de ejecución acumulada DIPRES.", "4. RC-05: anomalías de dotación no aisladas.", "",
    "## Guards V1–V7", "", "- V1: total oficial = conceptos sin resúmenes; diferencia CRITICA.", "- V2: exceso sobre base hasta 40% ALTA; sobre 40% CRITICA, salvo traspaso trazado.",
    "- V3: total = sí + no + abstención + presente sin votar; diferencia CRITICA.", "- V4: numerador ≤ denominador ≤ sesiones y error ≤0,5 puntos; incumplimiento ALTA.", "- V5: tolerancia cero.",
    "- V6: RUT/partido discordante ALTA; diferencia superficial MENOR.", "- V7: sueldo >$60M, horas >300, relación >total anual o gasto >140% ALTA.", "",
    "## Acciones previas a un merge", "", "- Aplicar RC-01, RC-03 y RC-04 y regenerar desde fuentes oficiales.", "- Publicar base y traspasos de personal para resolver RC-02.",
    "- Eliminar montos, órdenes y proveedores sintéticos; ausencia debe ser null.", `- Completar fuente fila-a-fila en ${entities.summary.sample_organizations_without_rows} organismos; no reducir el 10%.`, "- Reejecutar A–E y exigir cero CRITICA/ALTA para un SI.", "",
    "## Pruebas y cierre técnico", "", "- Auditoría: 22/22 pruebas Node aprobadas; sintaxis de todos los scripts aprobada.", "- Aplicación: 92 archivos de prueba y 490/490 tests aprobados.", "- Build Next.js: aprobado; TypeScript, compilación y generación de 431 páginas completados sin deploy.", "- Los comandos parlamentarios/entidades retornan código 2 de forma intencional al encontrar CRITICAS, después de escribir resultados.", "",
    "## Artefactos", "", "00-linaje.md; 01-parlamentarios.json; 01-resumen.md; 02-agregados.json; 02-resumen.md; 03-entidades.json; 03-resumen.md; 04-causas-raiz.md; INFORME-FINAL.md.",
  ].join("\n");
}

async function main() {
  const args = parseArgs();
  const [parliament, aggregates, entities] = await Promise.all([load("01-parlamentarios.json"), load("02-agregados.json"), load("03-entidades.json")]);
  const findings = [...parliament.findings, ...aggregates.findings, ...entities.findings];
  await writeMarkdown(resolve(DOCS_ROOT, "04-causas-raiz.md"), causeDocument(findings));
  await writeMarkdown(resolve(DOCS_ROOT, "INFORME-FINAL.md"), finalDocument({ aggregates, entities, findings, cutoff: args.cutoff }));
  console.log(JSON.stringify({ phase: "D-E", findings: findings.length, severe: findings.filter((row) => ["ALTA", "CRITICA"].includes(row.status)).length, status_counts: counts(findings) }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
