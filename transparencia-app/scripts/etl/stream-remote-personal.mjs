import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import iconv from "iconv-lite";
import { createCpltRecordId, getCpltColumn, parseCpltColumns, parseCpltHeader, parseCpltIdentity, parseCpltRecord } from "./cplt-personal.mjs";
import { createMunicipalityRegistry } from "./municipality-registry.mjs";
import { validatePublication } from "./validation.mjs";

const URLS = [
  { tipo: "Planta", url: "https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv" },
  { tipo: "Contrata", url: "https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContrata.csv" },
  { tipo: "Honorarios", url: "https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContratohonorarios.csv" },
  { tipo: "CodigoTrabajo", url: "https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalCodigotrabajo.csv" },
];

function normalized(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function loadOrganismosMap() {
  const map = {};
  const files = [
    ["servicios-publicos.ts", /id:\s*'([^']+)',\s*nombre:\s*'([^']+)'/g, (name) => name],
  ];

  for (const [file, pattern, canonicalName] of files) {
    const content = fs.readFileSync(path.join(process.cwd(), "lib", file), "utf8");
    let match;
    while ((match = pattern.exec(content)) !== null) map[normalized(canonicalName(match[2]))] = match[1];
  }
  return map;
}

const ORGANISMOS_MAP = loadOrganismosMap();
const COMMUNES = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "catalog", "communes.json"), "utf8")).communes;
const MUNICIPALITY_REGISTRY = createMunicipalityRegistry(COMMUNES);
const ORGANISMO_RESOLUTION_CACHE = new Map();

function resolveOrganismoId(organismoNombre) {
  const exactName = String(organismoNombre ?? "").trim();
  const cached = ORGANISMO_RESOLUTION_CACHE.get(exactName);
  if (cached) return cached;
  const municipalityId = MUNICIPALITY_REGISTRY.resolve(organismoNombre);
  if (municipalityId) {
    ORGANISMO_RESOLUTION_CACHE.set(exactName, municipalityId);
    return municipalityId;
  }
  const known = ORGANISMOS_MAP[normalized(organismoNombre)];
  if (known) {
    ORGANISMO_RESOLUTION_CACHE.set(exactName, known);
    return known;
  }

  const slug = normalized(organismoNombre).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) throw new Error("CPLT_MISSING_ORGANISMO: registro sin organismo");
  const id = `org-${slug}`;
  globalThis.DISCOVERED_ORGANISMOS ??= {};
  globalThis.DISCOVERED_ORGANISMOS[id] ??= {
    id,
    nombre: titleCase(organismoNombre),
    tipo_organo: "Servicio Publico",
    ministerio_dependiente: "Descubierto automaticamente",
    sitio_web_oficial: "",
  };
  ORGANISMO_RESOLUTION_CACHE.set(exactName, id);
  return id;
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`CPLT_INVALID_EXISTING_FILE: ${filePath}`);
  return parsed;
}

function mergeById(previous, current) {
  const records = new Map(previous.map((record) => [record.id, record]));
  for (const record of current) records.set(record.id, record);
  return [...records.values()];
}

async function processStream(tipo, url, outputDir) {
  console.log(`\n[+] Iniciando descarga de ${tipo}: ${url}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`CPLT_DOWNLOAD_FAILED: ${tipo} respondio ${response.status} ${response.statusText}`);
  }

  const decodedStream = Readable.fromWeb(response.body).pipe(iconv.decodeStream("win1252"));
  const lines = readline.createInterface({ input: decodedStream, crlfDelay: Infinity });
  const latestByOfficial = new Map();
  const unknownMunicipalities = new Set();
  let header = null;
  let linesProcessed = 0;

  for await (const line of lines) {
    linesProcessed += 1;
    if (linesProcessed === 1) {
      header = parseCpltHeader(line);
      continue;
    }
    if (!line.trim()) continue;
    if (linesProcessed % 500_000 === 0) {
      console.log(`    [INFO] ${tipo}: ${linesProcessed} lineas; ${latestByOfficial.size} registros municipales vigentes unicos`);
    }

    const columns = parseCpltColumns(line);
    const year = Number(getCpltColumn(columns, header, "anyo", "año"));
    if (!Number.isInteger(year) || year < 2024) continue;
    const organismoNombre = getCpltColumn(columns, header, "organismo_nombre", "organismo nombre");
    if (!/^(?:(?:i|ilustre) )?municipalidad\b|^municipio\b/.test(normalized(organismoNombre))) continue;
    let organismoId;
    try {
      organismoId = resolveOrganismoId(organismoNombre);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("CPLT_UNKNOWN_MUNICIPALITY:")) {
        unknownMunicipalities.add(organismoNombre);
        continue;
      }
      throw error;
    }
    const identity = parseCpltIdentity({ columns, header, tipo, organismoId });
    if (!identity) continue;

    const current = latestByOfficial.get(identity.stableKey);
    if (!current || identity.period > current.period) {
      latestByOfficial.set(identity.stableKey, { line, organismoId, period: identity.period });
    }

  }

  if (unknownMunicipalities.size > 0) {
    throw new Error(`CPLT_UNKNOWN_MUNICIPALITIES: ${JSON.stringify([...unknownMunicipalities].sort())}`);
  }

  const organismoByRecordId = new Map();
  const records = [...latestByOfficial.values()].map((latest) => {
    const { organismoId } = latest;
    const funcionario = parseCpltRecord({ line: latest.line, header, tipo, organismoId, sourceUrl: url, deferId: true });
    if (!funcionario) throw new Error(`CPLT_LATEST_RECORD_INVALID: ${organismoId}`);
    funcionario.id = createCpltRecordId(funcionario._stableKey);
    delete funcionario._stableKey;
    organismoByRecordId.set(funcionario.id, organismoId);
    return funcionario;
  });
  const report = validatePublication({
    sourceId: `cplt-personal-${normalized(tipo)}`,
    records,
    minimumCount: 1,
  });

  const projectionsDir = path.join(outputDir, "projections", "funcionarios-v1");
  fs.mkdirSync(projectionsDir, { recursive: true });
  const grouped = new Map();
  for (const fileName of fs.readdirSync(projectionsDir)) {
    if (!fileName.endsWith(".json")) continue;
    const filePath = path.join(projectionsDir, fileName);
    const retained = readJsonArray(filePath).filter((record) => record.tipo_contrato !== tipo);
    fs.writeFileSync(filePath, JSON.stringify(retained));
  }

  for (const funcionario of records) {
    const organismoId = organismoByRecordId.get(funcionario.id);
    if (!grouped.has(organismoId)) grouped.set(organismoId, []);
    grouped.get(organismoId).push(funcionario);
  }

  for (const [organismoId, current] of grouped) {
    const filePath = path.join(projectionsDir, `${organismoId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(mergeById(readJsonArray(filePath), current)));
  }

  const coverageDir = path.join(outputDir, "coverage");
  fs.mkdirSync(coverageDir, { recursive: true });
  const coverage = COMMUNES.map((commune) => {
    const administrationId = commune.administracion_municipal_id;
    const count = grouped.get(administrationId)?.length ?? 0;
    return {
      communeId: commune.id,
      cut: commune.cut,
      administrationId,
      status: commune.tiene_municipalidad_propia ? (count > 0 ? "available" : "unavailable") : "not_applicable",
      recordCount: commune.tiene_municipalidad_propia ? count : 0,
    };
  });
  fs.writeFileSync(path.join(coverageDir, `${normalized(tipo)}.json`), JSON.stringify({
    sourceId: `cplt-personal-${normalized(tipo)}`,
    sourceUrl: url,
    generatedAt: new Date().toISOString(),
    coverage,
  }, null, 2));

  const validationDir = path.join(outputDir, "validation");
  fs.mkdirSync(validationDir, { recursive: true });
  fs.writeFileSync(path.join(validationDir, `${normalized(tipo)}.json`), JSON.stringify({
    ...report,
    sourceUrl: url,
    linesProcessed,
    generatedAt: new Date().toISOString(),
  }, null, 2));

  console.log(`[OK] ${tipo}: ${report.recordCount} registros validos; sha256 ${report.checksumSha256}`);
}

async function run() {
  const targetTipo = process.argv[2];
  const outputDir = path.join(process.cwd(), "data", "raw", "transparencia_activa");
  fs.mkdirSync(outputDir, { recursive: true });

  const selected = targetTipo
    ? URLS.filter(({ tipo }) => tipo.toLowerCase() === targetTipo.toLowerCase())
    : URLS;
  if (selected.length === 0) throw new Error(`CPLT_UNKNOWN_TYPE: ${targetTipo}`);

  for (const { tipo, url } of selected) await processStream(tipo, url, outputDir);

  if (globalThis.DISCOVERED_ORGANISMOS) {
    const filePath = path.join(outputDir, "organismos_adicionales.json");
    const previous = readJsonArray(filePath);
    const discovered = Object.values(globalThis.DISCOVERED_ORGANISMOS);
    fs.writeFileSync(filePath, JSON.stringify(mergeById(previous, discovered), null, 2));
  }
  console.log("\n[OK] ETL masivo CPLT finalizado exitosamente.");
}

run().catch((error) => {
  console.error("\n[ERROR FATAL] Fallo el ETL remoto:", error);
  process.exitCode = 1;
});
