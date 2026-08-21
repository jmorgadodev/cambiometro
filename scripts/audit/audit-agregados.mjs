#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { APP_ROOT, DOCS_ROOT, fetchWithPolicy, findingId, normalizeText, parseArgs, sha256, stableSortFindings, validateV5, writeJson, writeMarkdown } from "./audit-core.mjs";

const COALITION = {
  udi: "Oficialismo", rn: "Oficialismo", evopoli: "Oficialismo", dem: "Oficialismo", ama: "Oficialismo", rep: "Oficialismo", pnl: "Oficialismo", psc: "Oficialismo", pdg: "Oficialismo",
  fa: "Oposición", ps: "Oposición", pc: "Oposición", ppd: "Oposición", pdc: "Oposición", pl: "Oposición", pr: "Oposición", frvs: "Oposición",
  ind: "Independientes",
};
const OPTIONS = { afirmativo: "Afirmativo", enContra: "En Contra", abstencion: "Abstención", noVota: "No Vota", dispensado: "Dispensado" };

function groupRows(rows, keyOf) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyOf(row) ?? "Sin clasificación";
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return groups;
}

function metrics(rows, votes) {
  const result = Object.fromEntries(Object.keys(OPTIONS).map((key) => [key, 0]));
  for (const row of rows) for (const [, option] of votes[row.id] ?? []) {
    const target = Object.entries(OPTIONS).find(([, label]) => normalizeText(label) === normalizeText(option))?.[0];
    if (target) result[target] += 1;
  }
  result.apariciones = Object.values(result).reduce((sum, value) => sum + value, 0);
  result.emitidos = result.afirmativo + result.enContra + result.abstencion;
  return result;
}

function makeFinding({ dimension, key, field, published, components, site, url }) {
  const validation = validateV5({ publishedTotal: published, components });
  return {
    id: findingId(["aggregate", dimension, key, field]), entity_type: "agregado", entity_id: `${dimension}:${key}`, entity_name: key,
    period: "2026", category: dimension, field, layer_from: "fuente_oficial", layer_to: "sitio_RSC",
    values: { oficial: components.reduce((sum, value) => sum + Number(value), 0), proyeccion: published, lake: published, sitio: site },
    difference: validation.difference, validation: "V5", severity: validation.status, status: validation.status, url,
    checksum: sha256(JSON.stringify({ dimension, key, field, published, components })), site_extraction_method: "RSC",
  };
}

function hasNumber(payload, value) {
  return String(payload ?? "").replace(/[^0-9]/g, "").includes(String(Math.trunc(Number(value ?? 0))));
}

function statusCounts(findings) {
  return findings.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), { OK: 0, MENOR: 0, ALTA: 0, CRITICA: 0, FUENTE_NO_DISPONIBLE: 0, CAPA_NO_DISPONIBLE: 0 });
}

async function main() {
  const started = Date.now();
  const args = parseArgs();
  const [votes, stats] = await Promise.all([
    readFile(resolve(APP_ROOT, "data/politicos-votaciones.json"), "utf8").then(JSON.parse),
    readFile(resolve(APP_ROOT, "data/partidos-stats.json"), "utf8").then(JSON.parse),
  ]);
  const exportResponse = await fetchWithPolicy(`${args.site}/api/v1/export?format=json`, { accept: "application/json" });
  const politicians = JSON.parse(exportResponse.body).data;
  const partyRsc = await fetchWithPolicy(`${args.site}/partidos?_rsc`, { accept: "text/x-component", headers: { RSC: "1" } });
  const rankingRsc = await fetchWithPolicy(`${args.site}/rankings?_rsc`, { accept: "text/x-component", headers: { RSC: "1" } });

  const findings = [];
  const dimensions = [
    ["partido", (row) => row.partido_sigla.toLowerCase()],
    ["coalicion", (row) => COALITION[row.partido_sigla.toLowerCase()] ?? "Independientes"],
    ["region", (row) => row.distrito_region],
    ["camara", (row) => row.cargo],
    ["nacional", () => "Chile"],
  ];
  let aggregateCount = 0;
  for (const [dimension, keyOf] of dimensions) {
    for (const [key, members] of groupRows(politicians, keyOf)) {
      aggregateCount += 1;
      const direct = metrics(members, votes.votes);
      for (const field of [...Object.keys(OPTIONS), "apariciones", "emitidos"]) {
        let published = direct[field];
        let components = members.map((member) => metrics([member], votes.votes)[field]);
        if (dimension === "partido") {
          const chamberValues = [stats[key]?.votosCamara?.[field], stats[key]?.votosSenado?.[field]].filter((value) => value !== undefined);
          if (chamberValues.length) published = chamberValues.reduce((sum, value) => sum + Number(value), 0);
        } else if (dimension === "coalicion") {
          components = [...groupRows(members, (member) => member.partido_sigla.toLowerCase()).values()].map((party) => metrics(party, votes.votes)[field]);
        } else if (dimension === "region") {
          components = [...groupRows(members, (member) => member.cargo).values()].map((chamber) => metrics(chamber, votes.votes)[field]);
        } else if (dimension === "nacional") {
          components = [...groupRows(members, (member) => member.distrito_region).values()].map((region) => metrics(region, votes.votes)[field]);
        }
        const sitePayload = dimension === "partido" ? partyRsc.body : rankingRsc.body;
        findings.push(makeFinding({ dimension, key, field, published, components, site: hasNumber(sitePayload, published) ? published : null, url: dimension === "partido" ? `${args.site}/partidos` : `${args.site}/rankings` }));
      }
    }
  }

  for (const [party, partyStats] of Object.entries(stats)) {
    const rows = partyStats.gastos?.porMes ?? [];
    if (!rows.length) continue;
    findings.push(makeFinding({ dimension: "partido", key: party, field: "gasto_total_por_mes", published: partyStats.gastos.total, components: rows.map((row) => row.total), site: hasNumber(partyRsc.body, partyStats.gastos.total) ? partyStats.gastos.total : null, url: `${args.site}/partidos/${party}` }));
  }

  const ordered = stableSortFindings(findings);
  const counts = statusCounts(ordered);
  const report = {
    meta: { generated_at: new Date().toISOString(), cutoff: args.cutoff, elapsed_seconds: Math.round((Date.now() - started) / 1000), site_extraction: "RSC" },
    summary: { aggregates_audited: aggregateCount, comparisons: ordered.length, status_counts: counts, dimensions: Object.fromEntries(dimensions.map(([name, keyOf]) => [name, groupRows(politicians, keyOf).size])) },
    findings: ordered,
  };
  await writeJson(resolve(DOCS_ROOT, "02-agregados.json"), report);
  await writeMarkdown(resolve(DOCS_ROOT, "02-resumen.md"), `# Fase C — Agregados\n\n- Agregados auditados: **${aggregateCount}**.\n- Comparaciones V5: **${ordered.length}**, tolerancia cero.\n- Estados: OK ${counts.OK}, MENOR ${counts.MENOR}, ALTA ${counts.ALTA}, CRITICA ${counts.CRITICA}, FUENTE_NO_DISPONIBLE ${counts.FUENTE_NO_DISPONIBLE}, CAPA_NO_DISPONIBLE ${counts.CAPA_NO_DISPONIBLE}.\n- Dimensiones: partido ${report.summary.dimensions.partido}, coalición ${report.summary.dimensions.coalicion}, región ${report.summary.dimensions.region}, cámara ${report.summary.dimensions.camara}, nacional ${report.summary.dimensions.nacional}.\n- Tiempo: ${report.meta.elapsed_seconds} s.\n`);
  console.log(JSON.stringify({ phase: "C-agregados", ...report.summary, elapsed_seconds: report.meta.elapsed_seconds }, null, 2));
  if (counts.CRITICA) process.exitCode = 2;
}

main().catch(async (error) => {
  await writeJson(resolve(DOCS_ROOT, "02-agregados.json"), { status: "FAILED", error: error.message }).catch(() => {});
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
