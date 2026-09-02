import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const inputRoot = resolve("data/raw/transparencia_activa");
const projectionRoot = join(inputRoot, "projections", "funcionarios-v1");
const validationRoot = join(inputRoot, "validation");
const coverageRoot = join(inputRoot, "coverage");
const outputRoot = resolve("data/lake-cplt");
const required = ["planta", "contrata", "honorarios", "codigotrabajo"];

async function checksum(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

if (!existsSync(projectionRoot)) throw new Error("CPLT_MISSING_PROJECTIONS");
const validations = required.map((source) => {
  const filePath = join(validationRoot, `${source}.json`);
  if (!existsSync(filePath)) throw new Error(`CPLT_MISSING_VALIDATION: ${source}`);
  const report = JSON.parse(readFileSync(filePath, "utf8"));
  if (report.status !== "valid" || !Number.isSafeInteger(report.recordCount) || report.recordCount < 1) {
    throw new Error(`CPLT_INVALID_SOURCE: ${source}`);
  }
  return report;
});

const latest = validations.map((report) => report.generatedAt).sort().at(-1) ?? new Date().toISOString();
const month = latest.slice(0, 7);
const version = latest.replace(/[:.]/g, "-");
// Un release por versión evita superar el límite de 1.000 assets de GitHub Releases:
// cada lote nacional publica más de 300 archivos versionados.
const releaseTag = `data-cplt-personal-${version}`;
const files = readdirSync(projectionRoot).filter((name) => name.endsWith(".json") && name !== "search_index.json").sort();
if (files.length < 1) throw new Error("CPLT_MISSING_PROJECTIONS");

// La UI no puede buscar 1,2 millones de filas cargando el universo completo en
// el navegador. Generamos una capa de consulta paginada para el Worker: páginas
// para navegación sin filtro y shards por primera letra para búsquedas de
// nombre, cargo u organismo. Los JSON originales permanecen intactos.
const searchIndexRoot = join(projectionRoot, "search_index");
mkdirSync(searchIndexRoot, { recursive: true });
const compactRows = [];
const byShard = new Map();
const normalizeSearch = (value) => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
for (const fileName of files) {
  const source = join(projectionRoot, fileName);
  let rows;
  try { rows = JSON.parse(readFileSync(source, "utf8")); } catch { continue; }
  if (!Array.isArray(rows)) continue;
  const organismId = fileName.replace(/\.json$/, "");
  rows.forEach((row, index) => {
    const compact = {
      id: String(row.id ?? `${organismId}-${index + 1}`),
      n: row.nombre_completo ?? "",
      c: row.cargo ?? "",
      o: row.organo_nombre ?? organismId,
      ot: row.organo_tipo ?? "",
      t: row.tipo_contrato ?? "",
      e: row.estamento ?? "",
      b: Number(row.remuneracion_bruta_mensual ?? 0),
      l: row.remuneracion_liquida_mensual == null ? undefined : Number(row.remuneracion_liquida_mensual),
      h: Number(row.horas_extras_mes_anterior ?? 0),
      x: Number(row.monto_horas_extras_clp ?? 0),
      g: row.grado_eus ?? undefined,
      fi: row.fecha_ingreso ?? undefined,
      p: row.fuente_periodo ?? row.periodo ?? undefined,
      u: row.url ?? row.url_fuente ?? undefined,
      oid: organismId,
    };
    compactRows.push(compact);
  });
}
compactRows.sort((left, right) => normalizeSearch(left.n).localeCompare(normalizeSearch(right.n), "es-CL") || left.id.localeCompare(right.id));
// Índice invertido palabra -> posiciones. La versión anterior repetía cada
// ficha completa por cada prefijo de nombre, cargo y organismo, multiplicando
// varios GiB. Cada token se almacena una sola vez por shard y el Worker
// intersecta sus posiciones antes de cargar sólo las fichas solicitadas.
compactRows.forEach((row, position) => {
  const tokens = new Set([row.n, row.c, row.o].flatMap((value) => normalizeSearch(value)
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/gi, ""))
    .filter((token) => token.length >= 2)));
  for (const token of tokens) {
    const shard = token.slice(0, 2);
    if (!byShard.has(shard)) byShard.set(shard, new Map());
    const tokenMap = byShard.get(shard);
    if (!tokenMap.has(token)) tokenMap.set(token, []);
    tokenMap.get(token).push(position);
  }
});
const searchPageSize = 10_000;
const searchAssets = [];
const writeGeneratedAsset = async (filePath, key) => {
  const data = readFileSync(filePath);
  const checksumSha256 = createHash("sha256").update(data).digest("hex");
  const metadata = { key, checksumSha256, size: data.byteLength, sourcePath: filePath };
  searchAssets.push(metadata);
  return metadata;
};
const pages = [];
for (let offset = 0; offset < compactRows.length; offset += searchPageSize) {
  const page = Math.floor(offset / searchPageSize) + 1;
  const filePath = join(searchIndexRoot, `p-${String(page).padStart(4, "0")}.json`);
  writeFileSync(filePath, `${JSON.stringify(compactRows.slice(offset, offset + searchPageSize))}\n`);
  pages.push({ page, count: Math.min(searchPageSize, compactRows.length - offset), key: `projections/funcionarios-v1/versions/${version}/search_index/p-${String(page).padStart(4, "0")}.json` });
  await writeGeneratedAsset(filePath, pages.at(-1).key);
}
const shards = {};
const searchShardReferenceLimit = 250_000;
for (const [shard, tokenMap] of byShard) {
  const shardKeys = [];
  let part = 1;
  let entries = [];
  let references = 0;
  const writeShardPart = async () => {
    if (entries.length === 0) return;
    const fileName = `${shard}-${String(part).padStart(3, "0")}.json`;
    const filePath = join(searchIndexRoot, fileName);
    const key = `projections/funcionarios-v1/versions/${version}/search_index/${fileName}`;
    writeFileSync(filePath, `${JSON.stringify(entries)}\n`);
    shardKeys.push(key);
    await writeGeneratedAsset(filePath, key);
    part += 1;
    entries = [];
    references = 0;
  };
  for (const entry of [...tokenMap.entries()].sort(([left], [right]) => left.localeCompare(right, "es-CL"))) {
    const nextReferences = entry[1].length;
    if (entries.length > 0 && references + nextReferences > searchShardReferenceLimit) await writeShardPart();
    entries.push(entry);
    references += nextReferences;
  }
  await writeShardPart();
  shards[shard] = shardKeys.length === 1 ? shardKeys[0] : shardKeys;
}

// Índices de posiciones: permiten combinar filtros nacionales sin duplicar
// las 1,2 millones de filas ni leer todas las páginas en cada consulta. Cada
// número apunta a la posición de la fila en `compactRows`, ordenado por nombre.
const compactSearch = (value) => normalizeSearch(value).replace(/[^a-z0-9]/g, "");
const compactContract = (value) => compactSearch(value).replace("codigodeltrabajo", "codigotrabajo");
const compactOrgType = (value) => compactSearch(value).replace("gobiernoregional", "gore");
const filterDefinitions = [
  ...[
    ["planta", "planta"],
    ["contrata", "contrata"],
    ["honorarios", "honorarios"],
    ["codigotrabajo", "codigotrabajo"],
  ].map(([key, needle]) => ({ key: `contrato:${key}`, matches: (row) => compactContract(row.t).includes(needle) })),
  ...[
    ["directivo", "directiv"],
    ["profesional", "profesional"],
    ["tecnico", "tecnic"],
    ["administrativo", "administrativ"],
    ["auxiliar", "auxiliar"],
    ["salud", "salud"],
    ["educacion", "educa"],
  ].map(([key, needle]) => ({ key: `estamento:${key}`, matches: (row) => compactSearch(row.e).includes(needle) })),
  ...[
    ["municipalidad", "municip"],
    ["ministerio", "minister"],
    ["subsecretaria", "subsecret"],
    ["servicio", "servicio"],
    ["gore", "gore"],
    ["empresa publica", "empresapublic"],
    ["superintendencia", "superintend"],
  ].map(([key, needle]) => ({ key: `tipo:${key}`, matches: (row) => compactOrgType(row.ot).includes(compactOrgType(needle)) })),
  { key: "cargo:alcalde", matches: (row) => /^(alcalde|alcaldesa)(\s|$)/.test(normalizeSearch(row.c).trim()) },
  { key: "horas_extras:true", matches: (row) => Number(row.h ?? 0) > 0 },
];
const filters = {};
for (const definition of filterDefinitions) {
  const positions = [];
  compactRows.forEach((row, position) => {
    if (definition.matches(row)) positions.push(position);
  });
  const hash = createHash("sha256").update(definition.key).digest("hex").slice(0, 16);
  const fileName = `filter-${hash}.json`;
  const filePath = join(searchIndexRoot, fileName);
  const key = `projections/funcionarios-v1/versions/${version}/search_index/${fileName}`;
  writeFileSync(filePath, `${JSON.stringify(positions)}\n`);
  await writeGeneratedAsset(filePath, key);
  filters[definition.key] = { key, count: positions.length };
}
const searchIndexPath = join(projectionRoot, "search_index.json");
const searchIndex = {
  schemaVersion: 1,
  dataset: "transparencia-activa-funcionarios",
  totalRows: compactRows.length,
  pageSize: searchPageSize,
  pages,
  shards,
  filters,
};
writeFileSync(searchIndexPath, `${JSON.stringify(searchIndex, null, 2)}\n`);
const searchIndexKey = `projections/funcionarios-v1/versions/${version}/search_index.json`;
const searchIndexMetadata = await writeGeneratedAsset(searchIndexPath, searchIndexKey);
for (const asset of searchAssets) {
  if (asset.key === searchIndexKey) continue;
  // writeGeneratedAsset ya calculó el checksum de cada página/shard.
}

const assets = [];
const manifestAssets = [searchIndexMetadata, ...searchAssets.filter((asset) => asset.key !== searchIndexKey)];
for (const asset of manifestAssets) {
  const target = join(outputRoot, asset.key);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(asset.sourcePath, target);
  assets.push({
    key: asset.key,
    checksumSha256: asset.checksumSha256,
    size: asset.size,
    releaseTag,
    releaseAssetName: `cplt-${version}-${asset.key.replaceAll("/", "-")}`,
  });
  delete asset.sourcePath;
}
for (const fileName of files) {
  const source = join(projectionRoot, fileName);
  const size = statSync(source).size;
  if (size < 2) throw new Error(`CPLT_EMPTY_PROJECTION: ${fileName}`);
  const checksumSha256 = await checksum(source);
  const key = `projections/funcionarios-v1/versions/${version}/${fileName}`;
  const target = join(outputRoot, key);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  const releaseAssetName = `cplt-${version}-${fileName}`;
  assets.push({ key, checksumSha256, size, releaseTag, releaseAssetName });
  manifestAssets.push({ key, checksumSha256, size });
}

const manifest = {
  schemaVersion: "1.0.0",
  sourceId: "transparencia-activa",
  generatedAt: latest,
  version,
  recordCount: validations.reduce((total, report) => total + report.recordCount, 0),
  sources: validations.map(({ sourceId, sourceUrl, sourceValidator, recordCount, checksumSha256 }) => ({ sourceId, sourceUrl, sourceValidator, recordCount, checksumSha256 })),
  searchIndex: { key: searchIndexKey, totalRows: compactRows.length, pageSize: searchPageSize },
  coverage: (() => {
    const byCommune = new Map();
    for (const source of required) {
      const filePath = join(coverageRoot, `${source}.json`);
      if (!existsSync(filePath)) throw new Error(`CPLT_MISSING_COVERAGE: ${source}`);
      const report = JSON.parse(readFileSync(filePath, "utf8"));
      for (const item of report.coverage ?? []) {
        const current = byCommune.get(item.communeId) ?? {
          communeId: item.communeId,
          cut: item.cut,
          administrationId: item.administrationId,
          status: item.status === "not_applicable" ? "not_applicable" : "unavailable",
          recordCount: 0,
          categories: {},
        };
        current.categories[source] = { status: item.status, recordCount: item.recordCount };
        current.recordCount += item.recordCount;
        if (item.status === "available") current.status = "available";
        byCommune.set(item.communeId, current);
      }
    }
    const coverage = [...byCommune.values()].sort((left, right) => left.cut.localeCompare(right.cut));
    if (coverage.length !== 346) throw new Error(`CPLT_COVERAGE_COUNT_INVALID: ${coverage.length}`);
    return coverage;
  })(),
  assets: manifestAssets,
};
const manifestKey = "projections/funcionarios-v1/manifest.json";
const manifestTarget = join(outputRoot, manifestKey);
mkdirSync(dirname(manifestTarget), { recursive: true });
const manifestData = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(manifestTarget, manifestData);
assets.push({
  key: manifestKey,
  checksumSha256: createHash("sha256").update(manifestData).digest("hex"),
  size: manifestData.byteLength,
  releaseTag,
  releaseAssetName: `cplt-${version}-manifest.json`,
});

mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify({ schemaVersion: "1.0.0", generatedAt: latest, assets }, null, 2)}\n`);
const modes = ["--releases", "--r2"].filter((mode) => process.argv.includes(mode));
const localOnly = process.argv.includes("--local-only");
if (modes.length === 0 && !localOnly) throw new Error("CPLT_PUBLICATION_MODE_REQUIRED");
if (!localOnly) {
  const localAuth = process.argv.includes("--local-auth") ? ["--local-auth"] : [];
  const result = spawnSync(process.execPath, [resolve("scripts/publish-data-lake.mjs"), "--output", outputRoot, ...modes, ...localAuth], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`CPLT_PUBLICATION_FAILED: ${result.status}`);
}
console.log(JSON.stringify({ version, records: manifest.recordCount, assets: manifestAssets.length, manifest: manifestKey, published: !localOnly }, null, 2));
