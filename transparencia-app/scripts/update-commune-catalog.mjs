import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import XLSX from "@e965/xlsx";

const SOURCE_URL = "https://www.subdere.gov.cl/sites/default/files/documentos/CUT_2018_v04.xls";
const SOURCE_PAGE = "https://www.subdere.gov.cl/documentacion/c%C3%B3digos-%C3%BAnicos-territoriales-actualizados-al-06-de-septiembre-2018";
const catalogPath = resolve("data/catalog/communes.json");
const modulePath = resolve("lib/municipalidades.ts");
const LEGACY_IDS = new Map([
  ["paiguano", "muni-paihuano"],
  ["calera", "muni-lacalera"],
  ["llaillay", "muni-llayllay"],
  ["marchihue", "muni-marchigue"],
]);

function slug(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function renderModule(communes) {
  return `/**\n * Catálogo territorial generado desde los Códigos Únicos Territoriales de SUBDERE.\n * No contiene alcaldes, población ni indicadores estimados: esos campos permanecen nulos\n * hasta que un ETL específico publique una fuente oficial verificable.\n * Fuente: ${SOURCE_PAGE}\n */\nexport interface Municipalidad {\n  id: string;\n  cut: string;\n  nombre_comuna: string;\n  region: string;\n  administracion_municipal_id: string;\n  tiene_municipalidad_propia: boolean;\n  fuente_catalogo: string;\n  alcalde_actual: string | null;\n  partido_alcalde: string | null;\n  poblacion: number | null;\n  poblacion_censo_2024: number | null;\n  viviendas_censo_2024: number | null;\n  variacion_intercensal_pct: number | null;\n  idh_comunal: number | null;\n  pobreza_casen_pct: number | null;\n  sitio_web_oficial: string | null;\n}\n\nexport const MUNICIPALIDADES_SEED: Municipalidad[] = ${JSON.stringify(communes, null, 2)};\n\nexport function getMunicipalidadById(id: string): Municipalidad | undefined {\n  return MUNICIPALIDADES_SEED.find((municipalidad) => municipalidad.id === id);\n}\n`;
}

async function download() {
  const response = await fetch(SOURCE_URL, { headers: { "user-agent": "CambiometroETL/1.0 (+https://cambiometro.impulsacv.cl)" } });
  if (!response.ok) throw new Error(`SUBDERE_CUT_DOWNLOAD_FAILED: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function parse(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  const communes = rows.map((row) => {
    const cut = String(row["Código Comuna 2018"] ?? "").padStart(5, "0");
    const name = String(row["Nombre Comuna"] ?? "").trim();
    const id = LEGACY_IDS.get(slug(name)) ?? `muni-${slug(name)}`;
    const hasOwnMunicipality = cut !== "12202";
    return {
      id,
      cut,
      nombre_comuna: name,
      region: String(row["Nombre Región"] ?? "").trim(),
      administracion_municipal_id: hasOwnMunicipality ? id : "muni-cabodehornos",
      tiene_municipalidad_propia: hasOwnMunicipality,
      fuente_catalogo: SOURCE_PAGE,
      alcalde_actual: null,
      partido_alcalde: null,
      poblacion: null,
      poblacion_censo_2024: null,
      viviendas_censo_2024: null,
      variacion_intercensal_pct: null,
      idh_comunal: null,
      pobreza_casen_pct: null,
      sitio_web_oficial: null,
    };
  });

  if (communes.length !== 346) throw new Error(`SUBDERE_CUT_COUNT_INVALID: ${communes.length}`);
  if (new Set(communes.map(({ cut }) => cut)).size !== 346) throw new Error("SUBDERE_CUT_DUPLICATED");
  if (new Set(communes.map(({ id }) => id)).size !== 346) throw new Error("SUBDERE_COMMUNE_ID_DUPLICATED");
  if (communes.filter(({ tiene_municipalidad_propia }) => tiene_municipalidad_propia).length !== 345) {
    throw new Error("SUBDERE_MUNICIPALITY_COUNT_INVALID");
  }
  return communes;
}

if (process.argv.includes("--check")) {
  // En CI el servidor de SUBDERE puede bloquear la descarga (403/timeout).
  // El --check solo verifica que el catálogo versionado en el repo sea consistente
  // internamente; la descarga ocurre exclusivamente en --update.
  if (!existsSync(catalogPath)) throw new Error("SUBDERE_CATALOG_MISSING: ejecute npm run data:communes:update primero");
  const existing = JSON.parse(readFileSync(catalogPath, "utf8"));
  const { communes } = existing;
  if (!Array.isArray(communes) || communes.length !== 346) {
    throw new Error(`SUBDERE_CATALOG_COUNT_INVALID: ${communes?.length}`);
  }
  if (new Set(communes.map(({ cut }) => cut)).size !== 346) throw new Error("SUBDERE_CUT_DUPLICATED");
  if (new Set(communes.map(({ id }) => id)).size !== 346) throw new Error("SUBDERE_COMMUNE_ID_DUPLICATED");
  if (communes.filter(({ tiene_municipalidad_propia }) => tiene_municipalidad_propia).length !== 345) {
    throw new Error("SUBDERE_MUNICIPALITY_COUNT_INVALID");
  }
  console.log(JSON.stringify({ status: "current", communes: 346, municipalities: 345, source: SOURCE_URL }));
} else {
  const communes = parse(await download());
  const catalog = `${JSON.stringify({ schemaVersion: "1.0.0", source: SOURCE_PAGE, sourceAsset: SOURCE_URL, communes }, null, 2)}\n`;
  const moduleContent = renderModule(communes);
  mkdirSync(dirname(catalogPath), { recursive: true });
  writeFileSync(catalogPath, catalog);
  writeFileSync(modulePath, moduleContent);
  console.log(JSON.stringify({ status: "updated", communes: 346, municipalities: 345, source: SOURCE_URL }));
}
