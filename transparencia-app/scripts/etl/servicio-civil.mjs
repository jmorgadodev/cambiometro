import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const outputPath = path.join(root, "data", "remuneraciones-servicio-civil.json");
const pageUrl = "https://reporte.serviciocivil.cl/datos/";
const sources = [
  {
    id: "servicio-civil-nombramientos",
    label: "Servicio Civil · nombramientos ADP",
    url: "https://reporte.serviciocivil.cl/wp-content/uploads/datasets/adp_nombramientos.csv",
    delimiter: ",",
    kind: "appointment",
  },
  {
    id: "servicio-civil-convocatorias",
    label: "Servicio Civil · convocatorias de empleo público",
    url: "https://reporte.serviciocivil.cl/wp-content/uploads/datasets/eepp_convocatorias.csv",
    delimiter: ",",
    kind: "call",
  },
  {
    id: "servicio-civil-cargos-sadp",
    label: "Servicio Civil · cargos SADP",
    url: "https://reporte.serviciocivil.cl/wp-content/uploads/datasets/adp_cargos.csv",
    delimiter: ";",
    kind: "catalog",
  },
  {
    id: "servicio-civil-nominas-sadp",
    label: "Servicio Civil · nóminas SADP",
    url: "https://reporte.serviciocivil.cl/wp-content/uploads/datasets/adp_nominas.csv",
    delimiter: ",",
    kind: "catalog",
  },
];

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(field);
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  if (rows.length === 0) return [];
  const rawHeaders = rows.shift().map((value, index) => {
    const clean = value.replace(/^\uFEFF/, "").trim();
    return clean || `campo_${index + 1}`;
  });
  const seen = new Map();
  const headers = rawHeaders.map((header) => {
    const count = (seen.get(header) ?? 0) + 1;
    seen.set(header, count);
    return count === 1 ? header : `${header}_${count}`;
  });
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()])))
    .filter((row) => Object.values(row).some(Boolean));
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function number(value) {
  const cleanValue = clean(value).replace(/\./g, "").replace(/,/g, ".");
  const parsed = Number(cleanValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function period(value) {
  const match = clean(value).match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : null;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function rowFor(source, row, index) {
  if (source.kind === "appointment") {
    const name = clean(row["Nombrado/a"]);
    if (!name) return null;
    const organism = clean(row.Servicio || row.Ministerio);
    const role = clean(row["Nombre Cargo"]);
    return {
      sourceId: source.id,
      sourceLabel: source.label,
      sourceType: "appointment",
      recordId: `servicio-civil-nombramiento-${hash(`${index}|${name}|${organism}|${row["Fecha Nombramiento"]}`)}`,
      nombreOriginal: name,
      organismoOriginal: organism,
      cargoOriginal: role,
      periodo: period(row["Fecha Nombramiento"]),
      montoBruto: null,
      tipoContrato: "Nombramiento ADP",
      estadoRegistro: "nombramiento_publicado",
      fechaPublicacion: clean(row.Fecha_Actualizacion) || null,
      officialUrl: pageUrl,
      qualityObservations: ["El dataset no publica la remuneración individual del nombramiento."],
    };
  }
  if (source.kind === "call") {
    const role = clean(row.Cargo);
    if (!role) return null;
    const organism = clean(row.Servicio || row.Entidad || row.Ministerio);
    return {
      sourceId: source.id,
      sourceLabel: source.label,
      sourceType: "official_call",
      recordId: `servicio-civil-convocatoria-${hash(`${index}|${row["ID Convocatoria"]}|${role}`)}`,
      nombreOriginal: `Convocatoria · ${role}`,
      organismoOriginal: organism,
      cargoOriginal: role,
      periodo: period(row["Fecha Inicio Convocatoria"]),
      montoBruto: number(row["Renta Bruta"]),
      tipoContrato: clean(row["Tipo de Vacante"]) || null,
      estadoRegistro: "renta_referencial",
      fechaPublicacion: clean(row.Fecha_Actualizacion) || null,
      officialUrl: clean(row["URL Base"]) || pageUrl,
      qualityObservations: ["La renta es referencial para la convocatoria; no demuestra un pago individual."],
    };
  }
  return null;
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: { Accept: "text/csv", "User-Agent": "Cambiometro-ETL/1.0" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = new TextDecoder("utf-8").decode(buffer);
  const rows = parseCsv(text, source.delimiter);
  return {
    ...source,
    checksumSha256: createHash("sha256").update(buffer).digest("hex"),
    downloadedBytes: buffer.byteLength,
    rows,
    updatedAt: rows.map((row) => row.Fecha_Actualizacion).filter(Boolean).sort().at(-1) ?? null,
  };
}

const downloaded = [];
for (const source of sources) downloaded.push(await fetchSource(source));

const records = downloaded.flatMap((source) => source.rows.map((row, index) => rowFor(source, row, index)).filter(Boolean));
const datasets = downloaded.map((source) => ({
  id: source.id,
  label: source.label,
  url: source.url,
  kind: source.kind,
  rowCount: source.rows.length,
  recordCount: source.rows.map((row, index) => rowFor(source, row, index)).filter(Boolean).length,
  updatedAt: source.updatedAt,
  checksumSha256: source.checksumSha256,
  downloadedBytes: source.downloadedBytes,
}));

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourcePageUrl: pageUrl,
  datasets,
  records,
  notes: [
    "Servicio Civil publica nombramientos, cargos y convocatorias oficiales; no es una nómina mensual completa de remuneraciones individuales.",
    "La Renta Bruta de una convocatoria es referencial para el cargo y no equivale al pago efectivo de una persona.",
  ],
};

await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "ok", outputPath, generatedAt: payload.generatedAt, datasets, records: records.length }, null, 2));
