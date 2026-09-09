import fs from "node:fs";
import path from "node:path";
import { normalizeRemunerationText, personKeyForRemuneration, remunerationAmountState } from "./remuneraciones-unified-contract.mjs";

const root = process.cwd();
const outputDir = path.join(root, "public", "data", "remuneraciones-unified");
const source38Path = path.join(root, "data", "remuneraciones-38bis-publico.json");
const supportPath = path.join(root, "data", "personal-apoyo.json");
const qualitySourcesPath = path.join(root, "data", "data-quality-sources.json");
const pageSize = 50;

const source38 = JSON.parse(fs.readFileSync(source38Path, "utf8"));
const support = JSON.parse(fs.readFileSync(supportPath, "utf8"));
const qualitySources = JSON.parse(fs.readFileSync(qualitySourcesPath, "utf8"));

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const normalize = normalizeRemunerationText;

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function sourceMeta(id, overrides = {}) {
  const source = qualitySources.find((item) => item.id === id) ?? {};
  return {
    id,
    label: source.label ?? id,
    organization: source.organization ?? null,
    officialUrl: source.officialUrl ?? null,
    period: source.period ?? null,
    frequency: source.frequency ?? null,
    status: "unavailable",
    sourceType: "unknown",
    publishedCount: null,
    queryableCount: null,
    relatedCount: null,
    checksum: null,
    note: null,
    ...overrides,
  };
}

function makeRow({ sourceId, sourceLabel, sourceType, recordId, name, organism, role, period, amount, contract }) {
  const normalizedName = normalize(name);
  return {
    sourceId,
    sourceLabel,
    sourceType,
    recordId,
    personKey: personKeyForRemuneration(name, recordId),
    nombreOriginal: String(name ?? ""),
    nombreNormalizado: normalizedName,
    organismoOriginal: String(organism ?? ""),
    organismoNormalizado: normalize(organism),
    cargoOriginal: String(role ?? ""),
    cargoNormalizado: normalize(role),
    periodo: period ?? null,
    montoBruto: Number.isFinite(amount) ? amount : null,
    tipoContrato: contract ?? null,
    estadoRegistro: remunerationAmountState(amount),
    qualityObservations: [],
  };
}

const rows = [];
for (const [index, row] of (source38.registros ?? source38.congreso ?? []).entries()) {
  rows.push(makeRow({
    sourceId: "remuneraciones-38bis",
    sourceLabel: "Registro 38 bis",
    sourceType: "individual",
    recordId: `38bis-${hash(`${index}|${row.nombre}|${row.organismo}|${row.cargo}`)}`,
    name: row.nombre,
    organism: row.organismo,
    role: row.cargo,
    period: source38.mes,
    amount: row.bruto_mensual,
  }));
}

for (const [deputyId, deputy] of Object.entries(support.diputados ?? {})) {
  for (const [index, row] of (deputy.personal_apoyo ?? []).entries()) {
    rows.push(makeRow({
      sourceId: "camara",
      sourceLabel: "Cámara · personal de apoyo",
      sourceType: "support_staff",
      recordId: `camara-${hash(`${deputyId}|${index}|${row.nombre}|${row.periodo ?? deputy.mes_personal ?? ""}`)}`,
      name: row.nombre,
      organism: "Cámara de Diputadas y Diputados",
      role: row.cargo,
      period: row.periodo ?? deputy.mes_personal ?? null,
      amount: row.sueldo,
      contract: row.tipo,
    }));
  }
}

for (const [senatorName, senatorRows] of Object.entries(support.senadores ?? {})) {
  for (const [index, row] of senatorRows.entries()) {
    rows.push(makeRow({
      sourceId: "senado",
      sourceLabel: "Senado · personal de apoyo",
      sourceType: "support_staff",
      recordId: `senado-${hash(`${senatorName}|${index}|${row.nombre}|${row.periodo ?? ""}`)}`,
      name: row.nombre,
      organism: "Senado",
      role: row.cargo,
      period: row.periodo ?? null,
      amount: row.monto,
      contract: row.calidad_juridica,
    }));
  }
}

function nameSort(left, right) {
  return left.nombreNormalizado.localeCompare(right.nombreNormalizado, "es-CL")
    || left.sourceId.localeCompare(right.sourceId)
    || String(right.periodo ?? "").localeCompare(String(left.periodo ?? ""));
}

rows.sort(nameSort);

const pages = [];
for (let offset = 0; offset < rows.length; offset += pageSize) {
  const page = Math.floor(offset / pageSize) + 1;
  const key = `pages/page-${String(page).padStart(4, "0")}.json`;
  const pageRows = rows.slice(offset, offset + pageSize);
  fs.mkdirSync(path.dirname(path.join(outputDir, key)), { recursive: true });
  fs.writeFileSync(path.join(outputDir, key), `${JSON.stringify(pageRows)}\n`, "utf8");
  pages.push({ page, key, count: pageRows.length });
}

const tokenPages = new Map();
const entitySources = new Map();
for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  const page = Math.floor(index / pageSize) + 1;
  const text = `${row.nombreOriginal} ${row.organismoOriginal} ${row.cargoOriginal} ${row.periodo ?? ""}`;
  for (const token of new Set(normalize(text).split(" ").filter((value) => value.length >= 2))) {
    const set = tokenPages.get(token) ?? new Set();
    set.add(page);
    tokenPages.set(token, set);
  }
  const sources = entitySources.get(row.personKey) ?? new Set();
  sources.add(row.sourceId);
  entitySources.set(row.personKey, sources);
}

const relations = Object.fromEntries([...entitySources.entries()]
  .filter(([, sources]) => sources.size > 1)
  .map(([personKey, sources]) => [personKey, {
    sourceIds: [...sources].sort(),
    status: "possible",
    label: "Coincidencia nominal; revisión contextual pendiente",
  }]));

const bySource = new Map();
for (const row of rows) {
  const current = bySource.get(row.sourceId) ?? { count: 0, withAmount: 0, periods: new Set(), related: new Set() };
  current.count += 1;
  if (row.montoBruto !== null) current.withAmount += 1;
  if (row.periodo) current.periods.add(row.periodo);
  if (relations[row.personKey]) current.related.add(row.personKey);
  bySource.set(row.sourceId, current);
}

const releaseSources = [
  sourceMeta("transparencia-activa", {
    label: "Transparencia Activa CPLT",
    status: "partial",
    sourceType: "individual",
    publishedCount: 1203287,
    queryableCount: 1203287,
    note: "Se consulta mediante el índice R2 del directorio; el conteo debe reconciliarse con el release productivo antes de declarar cobertura total.",
    modulePath: "/funcionarios",
  }),
  sourceMeta("remuneraciones-38bis", {
    label: "Registro 38 bis",
    officialUrl: "https://comision38bis.gob.cl/registro-publico",
    status: "complete",
    sourceType: "individual",
    publishedCount: rows.filter((row) => row.sourceId === "remuneraciones-38bis").length,
    queryableCount: rows.filter((row) => row.sourceId === "remuneraciones-38bis").length,
    relatedCount: [...entitySources.values()].filter((sources) => sources.has("remuneraciones-38bis") && sources.size > 1).length,
    period: source38.mes,
    checksum: source38.checksum_sha256 ?? null,
    note: "Registro específico de cargos sujetos al artículo 38 bis.",
    modulePath: "/remuneraciones-publicas",
  }),
  sourceMeta("camara", {
    label: "Cámara · personal de apoyo",
    status: "partial",
    sourceType: "support_staff",
    publishedCount: bySource.get("camara")?.count ?? 0,
    queryableCount: bySource.get("camara")?.count ?? 0,
    relatedCount: bySource.get("camara")?.related.size ?? 0,
    period: support.generado_en?.slice(0, 7) ?? null,
    checksum: support.fuentes?.camara?.checksum_sha256 ?? null,
    note: "Consolidado derivado de personal de apoyo; no representa la nómina completa de la Cámara.",
    modulePath: "/remuneraciones-publicas",
  }),
  sourceMeta("senado", {
    label: "Senado · personal de apoyo",
    status: "partial",
    sourceType: "support_staff",
    publishedCount: bySource.get("senado")?.count ?? 0,
    queryableCount: bySource.get("senado")?.count ?? 0,
    relatedCount: bySource.get("senado")?.related.size ?? 0,
    period: support.generado_en?.slice(0, 7) ?? null,
    checksum: support.asignacion_senado_2026?.checksum_sha256 ?? null,
    note: "Consolidado derivado de personal de apoyo del Senado.",
    modulePath: "/remuneraciones-publicas",
  }),
  sourceMeta("servicio-civil", {
    label: "Servicio Civil",
    status: "unavailable",
    sourceType: "individual",
    note: "No existe todavía un release independiente de remuneraciones verificable. Los registros que estén publicados en 38 bis no se duplican aquí.",
    officialUrl: "https://reporte.serviciocivil.cl/datos/",
    modulePath: "/remuneraciones-publicas",
  }),
  sourceMeta("dipres", {
    label: "DIPRES · datos agregados",
    status: "aggregate_only",
    sourceType: "aggregate",
    publishedCount: 15689,
    note: "Sirve para contexto agregado de empleo y presupuesto; no corresponde a un buscador de sueldos individuales.",
    modulePath: "/datos",
  }),
];

const quality = {
  rows: {
    total: rows.length,
    withAmount: rows.filter((row) => row.montoBruto !== null).length,
    withoutAmount: rows.filter((row) => row.montoBruto === null).length,
    blankName: rows.filter((row) => !row.nombreNormalizado).length,
  },
  relationGroups: Object.keys(relations).length,
  notes: [
    "Las relaciones entre fuentes se presentan como coincidencias nominales hasta contar con identificadores o contexto suficiente.",
    "Los valores originales de nombre, organismo, cargo y monto se conservan por registro y no se mezclan entre fuentes.",
  ],
};

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  pageSize,
  totalRows: rows.length,
  pageCount: pages.length,
  pages,
  searchIndexKey: "search-index.json",
  relationIndexKey: "relations.json",
  sources: releaseSources,
  quality,
};

fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "search-index.json"), `${JSON.stringify(Object.fromEntries([...tokenPages.entries()].map((entry) => [entry[0], [...entry[1]].sort((a, b) => a - b)])))}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "relations.json"), `${JSON.stringify(relations)}\n`, "utf8");

console.log(JSON.stringify({ status: "ok", outputDir, totalRows: rows.length, pages: pages.length, relationGroups: quality.relationGroups }, null, 2));
