#!/usr/bin/env node

/**
 * Materializa las nóminas CPLT como assets Pages por municipalidad y período.
 *
 * La fuente preferida es el artefacto CPLT hidratado desde R2. El lake local se
 * conserva como fallback para desarrollo. Nunca se genera un asset desde una
 * muestra: el guard exige el universo canónico de 346 particiones.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = process.cwd();
const outputRoot = resolve(projectRoot, "public/data/funcionarios");
const municipalidadesPath = resolve(projectRoot, "data/municipalidades-data.json");
const communesPath = resolve(projectRoot, "data/catalog/communes.json");
const localRoot = resolve(projectRoot, "data/lake/projections/funcionarios-v1");
const cpltRoot = resolve(projectRoot, "data/lake-cplt/projections/funcionarios-v1");
const portalRoot = resolve(projectRoot, "data/raw/transparencia_activa-portal-full/projections/funcionarios-v1");
const cpltManifestPath = join(cpltRoot, "manifest.json");
const configuredSourceRoot = process.env.CPLT_STATIC_SOURCE_ROOT
  ? resolve(projectRoot, process.env.CPLT_STATIC_SOURCE_ROOT)
  : null;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function findSourceRoot() {
  if (configuredSourceRoot && existsSync(configuredSourceRoot)) {
    return { root: configuredSourceRoot, manifest: null };
  }
  if (existsSync(portalRoot)) {
    return { root: portalRoot, manifest: null };
  }
  if (existsSync(cpltManifestPath)) {
    const manifest = readJson(cpltManifestPath);
    const versionedRoot = join(cpltRoot, "versions", manifest.version);
    if (existsSync(versionedRoot)) return { root: versionedRoot, manifest };
  }
  if (existsSync(localRoot)) return { root: localRoot, manifest: null };
  throw new Error("FUNCIONARIOS_STATIC_SOURCE_MISSING: falta la proyección CPLT local o hidratada desde R2");
}

function periodOf(record) {
  return String(record.fuente_periodo ?? record.periodo ?? "").trim();
}

function periodMeta(municipality, period) {
  const entry = municipality?.periodos_disponibles?.find((item) => item.periodo === period);
  return {
    label: entry?.etiqueta ?? period,
    // La clasificación de cobertura se calcula más abajo desde las filas
    // efectivamente publicadas. El snapshot municipal puede quedar atrasado
    // respecto de R2 y no debe decidir qué período se muestra.
    partial: Boolean(entry?.es_parcial),
    representatividadPct: entry?.representatividad_pct ?? null,
  };
}

function buildPayload(records, municipality, period, generatedAt) {
  const sinPago = records.filter((record) => Number(record.remuneracion_bruta_mensual ?? 0) <= 0);
  const microMonto = records.filter((record) => {
    const amount = Number(record.remuneracion_bruta_mensual ?? 0);
    return amount > 0 && amount < 50_000;
  });
  const sueldoCompleto = records.filter((record) => Number(record.remuneracion_bruta_mensual ?? 0) >= 50_000);
  const data = records
    .filter((record) => Number(record.remuneracion_bruta_mensual ?? 0) > 0)
    .sort((left, right) => Number(right.remuneracion_bruta_mensual ?? 0) - Number(left.remuneracion_bruta_mensual ?? 0));

  return {
    schemaVersion: 1,
    data,
    meta: {
      total: data.length,
      totalHeadcount: records.length,
      sinPagoCount: sinPago.length,
      microMontoCount: microMonto.length,
      sueldoCompletoCount: sueldoCompleto.length,
      observadosCount: sinPago.length + microMonto.length,
      page: 1,
      totalPages: Math.max(1, Math.ceil(data.length / 24)),
      limit: 24,
      periodo: period,
      periodoEtiqueta: periodMeta(municipality, period).label,
      generatedAt,
      sourceStatus: "available",
      stale: false,
      stats: {
        totalMuni: records.length,
        totalValidos: sueldoCompleto.length,
        observadosCount: sinPago.length + microMonto.length,
        sinPagoCount: sinPago.length,
        microMontoCount: microMonto.length,
      },
    },
  };
}

function main() {
  const { root: sourceRoot, manifest } = findSourceRoot();
  const sourceFiles = readdirSync(sourceRoot).filter((name) => /^muni-[a-z0-9-]+\.json$/i.test(name)).sort();
  if (sourceFiles.length !== 346) {
    throw new Error(`FUNCIONARIOS_STATIC_SOURCE_INCOMPLETE: esperaba 346 particiones y encontré ${sourceFiles.length}`);
  }
  const municipalities = existsSync(municipalidadesPath) ? readJson(municipalidadesPath) : {};
  const communes = existsSync(communesPath) ? readJson(communesPath).communes ?? [] : [];
  const notApplicableMunicipalities = new Set(communes
    .filter((commune) => commune.tiene_municipalidad_propia === false)
    .map((commune) => commune.id));
  const generatedAt = manifest?.generatedAt ?? new Date().toISOString();
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  let totalRows = 0;
  let totalAssets = 0;
  const availableMunicipalities = [];
  const unavailableMunicipalities = [];
  for (const fileName of sourceFiles) {
    const municipalityId = fileName.slice(0, -5);
    const records = readJson(join(sourceRoot, fileName));
    if (!Array.isArray(records)) throw new Error(`FUNCIONARIOS_STATIC_INVALID: ${fileName}`);
    const grouped = new Map();
    for (const record of records) {
      const period = periodOf(record);
      if (!period) continue;
      const bucket = grouped.get(period) ?? [];
      bucket.push(record);
      grouped.set(period, bucket);
    }

    const municipality = municipalities[municipalityId] ?? null;
    const outputDir = join(outputRoot, municipalityId);
    mkdirSync(outputDir, { recursive: true });
    const periods = {};
    const periodCounts = [...grouped.entries()]
      .map(([period, rows]) => [period, rows.length])
      .sort(([left], [right]) => right.localeCompare(left));
    if (periodCounts.length > 0) availableMunicipalities.push(municipalityId);
    else if (!notApplicableMunicipalities.has(municipalityId)) unavailableMunicipalities.push(municipalityId);
    const benchmarkCount = Math.max(...periodCounts.map(([, count]) => count), 1);
    for (const [period, recordCount] of periodCounts) {
      const payload = buildPayload(grouped.get(period), municipality, period, generatedAt);
      const representatividadPct = Number(((recordCount / benchmarkCount) * 100).toFixed(1));
      const partial = benchmarkCount >= 100 && recordCount < benchmarkCount * 0.5;
      const outputPath = join(outputDir, `${period}.json`);
      payload.meta.partial = partial;
      payload.meta.representatividadPct = representatividadPct;
      payload.meta.sourceStatus = "available";
      writeFileSync(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
      periods[period] = {
        path: `/data/funcionarios/${municipalityId}/${period}.json`,
        totalRows: payload.meta.totalHeadcount,
        completeRows: payload.meta.total,
        ...periodMeta(municipality, period),
        partial,
        representatividadPct,
      };
      totalRows += payload.meta.totalHeadcount;
      totalAssets += 1;
    }

    const configuredDefault = municipality?.periodo_cplt_reciente;
    const latestRepresentative = periodCounts.find(([period]) => !periods[period].partial)?.[0] ?? null;
    const defaultPeriod = latestRepresentative
      ?? (configuredDefault && periods[configuredDefault] ? configuredDefault : periodCounts[0]?.[0] ?? null);
    writeFileSync(join(outputDir, "manifest.json"), `${JSON.stringify({
      schemaVersion: 1,
      municipalityId,
      generatedAt,
      sourceStatus: periodCounts.length > 0
        ? "available"
        : notApplicableMunicipalities.has(municipalityId)
          ? "not_applicable"
          : "unavailable",
      defaultPeriod,
      periods,
    })}\n`, "utf8");
    totalAssets += 1;
  }

  if (process.env.REQUIRE_COMPLETE_CPLT === "1" && process.env.CPLT_ALLOW_UNAVAILABLE !== "1" && unavailableMunicipalities.length > 0) {
    throw new Error(`FUNCIONARIOS_STATIC_COVERAGE_INCOMPLETE: ${unavailableMunicipalities.length} municipalidades sin registros (${unavailableMunicipalities.slice(0, 12).join(", ")})`);
  }

  writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify({
    schemaVersion: 1,
    dataset: "funcionarios-cplt",
    generatedAt,
    municipalities: sourceFiles.length,
    availableMunicipalities,
    unavailableMunicipalities,
    notApplicableMunicipalities: [...notApplicableMunicipalities].sort(),
    coverage: {
      available: availableMunicipalities.length,
      unavailable: unavailableMunicipalities.length,
      notApplicable: notApplicableMunicipalities.size,
      censusComplete: availableMunicipalities.length + unavailableMunicipalities.length + notApplicableMunicipalities.size === sourceFiles.length,
      dataComplete: unavailableMunicipalities.length === 0,
      complete: unavailableMunicipalities.length === 0,
    },
    totalRows,
    totalAssets,
  })}\n`, "utf8");
  console.log(JSON.stringify({
    outputRoot,
    municipalities: sourceFiles.length,
    availableMunicipalities: availableMunicipalities.length,
    unavailableMunicipalities: unavailableMunicipalities.length,
    notApplicableMunicipalities: notApplicableMunicipalities.size,
    totalRows,
    totalAssets,
    generatedAt,
  }, null, 2));
}

main();
