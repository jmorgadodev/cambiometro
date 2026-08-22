import https from "node:https";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const OFFICIAL_INE_ENDPOINT =
  "https://services5.arcgis.com/hUyD8u3TeZLKPe4T/arcgis/rest/services/CENSO2024_V2_gdb/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&f=json";
const TOTAL_NACIONAL_ESPERADO = 18480432;
const TOTAL_COMUNAS_ESPERADO = 346;

function fetchJson(url) {
  return new Promise((resolvePromise, rejectPromise) => {
    https.get(url, (res) => {
      let rawData = "";
      res.on("data", (chunk) => (rawData += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(rawData);
          resolvePromise({ rawData, parsed });
        } catch (err) {
          rejectPromise(err);
        }
      });
    }).on("error", rejectPromise);
  });
}

console.log("1. Descargando dataset oficial del Censo 2024 del INE...");
const { rawData, parsed } = await fetchJson(OFFICIAL_INE_ENDPOINT);

const sha256 = createHash("sha256").update(rawData).digest("hex");
console.log(`- Checksum SHA-256 del payload original: ${sha256}`);

const rawDir = join(appRoot, "data", "raw", "ine");
mkdirSync(rawDir, { recursive: true });
writeFileSync(join(rawDir, "censo-2024-comunas.json"), rawData, "utf8");
console.log("- Guardado en data/raw/ine/censo-2024-comunas.json");

const features = parsed.features || [];
if (features.length !== TOTAL_COMUNAS_ESPERADO) {
  throw new Error(`GUARD_FAIL: Se esperaban ${TOTAL_COMUNAS_ESPERADO} comunas, se recibieron ${features.length}`);
}

// Cargar catálogo de comunas para validación de CUT sin huérfanos
const catalogPath = join(appRoot, "data", "catalog", "communes.json");
const catalogData = JSON.parse(readFileSync(catalogPath, "utf8"));
const catalogCommunes = catalogData.communes || [];

const censoPorCut = new Map();
let sumaNacional = 0;

for (const f of features) {
  const attr = f.attributes;
  const cut = String(attr.CUT).padStart(5, "0");
  const poblacion = Number(attr.Ind_005_TPob);
  const viviendas = Number(attr.Ind_001_TViv);
  const hogares = Number(attr.Ind_002_THog);
  const hombres = Number(attr.Ind_006_THom);
  const mujeres = Number(attr.Ind_007_TMuj);
  const indiceEnvejecimiento = Number(attr.Ind_008_In_Env);
  const promedioEdad = Number(attr.Ind_0016_Pr_Ed);
  const pob0_14 = Number(attr.Ind_0018_Pob_0_14);
  const pob15_64 = Number(attr.Ind_0020_Pob_15_64);
  const pob65Mas = Number(attr.Ind_0022_Pob_65_mas);

  if (!Number.isFinite(poblacion) || poblacion <= 0) {
    throw new Error(`GUARD_FAIL: Población inválida en CUT ${cut}: ${poblacion}`);
  }

  sumaNacional += poblacion;
  censoPorCut.set(cut, {
    cut,
    nombre_comuna_ine: attr.COMUNA,
    region: attr.REGION,
    provincia: attr.PROVINCIA,
    poblacion_censo_2024: poblacion,
    viviendas_censo_2024: viviendas,
    hogares_censo_2024: hogares,
    hombres_censo_2024: hombres,
    mujeres_censo_2024: mujeres,
    indice_envejecimiento: indiceEnvejecimiento,
    promedio_edad: promedioEdad,
    poblacion_0_14: pob0_14,
    poblacion_15_64: pob15_64,
    poblacion_65_mas: pob65Mas,
    fuente: "Censo 2024 INE",
    fuente_url: "https://censo2024.ine.gob.cl/resultados/",
  });
}

console.log(`2. Validando suma nacional: ${sumaNacional} vs esperado ${TOTAL_NACIONAL_ESPERADO}`);
if (sumaNacional !== TOTAL_NACIONAL_ESPERADO) {
  throw new Error(`GUARD_FAIL: Suma nacional discrepante. Obtenido ${sumaNacional}, esperado ${TOTAL_NACIONAL_ESPERADO}`);
}

console.log("3. Validando coincidencia 346/346 con el catálogo oficial SUBDERE...");
for (const c of catalogCommunes) {
  const cut = String(c.cut).padStart(5, "0");
  if (!censoPorCut.has(cut)) {
    throw new Error(`GUARD_FAIL: Comuna huérfana en catálogo CUT ${cut} (${c.nombre_comuna})`);
  }
}

// 4. Exportar proyección normalizada al Data Lake
const lakeDir = join(appRoot, "data", "lake", "projections", "v1");
mkdirSync(lakeDir, { recursive: true });
const projection = {
  schemaVersion: "1.0.0",
  source: "ine-censo-2024",
  sourceLabel: "INE Censo 2024",
  organization: "Instituto Nacional de Estadísticas",
  generatedAt: new Date().toISOString(),
  checksumSha256: sha256,
  recordCount: censoPorCut.size,
  totalNacionalPoblacion: sumaNacional,
  comunas: Array.from(censoPorCut.values()),
};
writeFileSync(join(lakeDir, "ine-censo-2024.json"), JSON.stringify(projection, null, 2), "utf8");
console.log("- Guardada proyección oficial en data/lake/projections/v1/ine-censo-2024.json");

// 5. Actualizar scripts/census-data.mjs
const censusMjsContent = `// Catálogo Censo 2024 oficial INE materializado con trazabilidad y checksum SHA-256.
// Generado automáticamente por scripts/etl/ingest-censo-ine.mjs
export const CENSO_2024_OFICIAL = ${JSON.stringify(
  Object.fromEntries(
    Array.from(censoPorCut.entries()).map(([cut, d]) => [
      cut,
      {
        pop: d.poblacion_censo_2024,
        dwellings: d.viviendas_censo_2024,
        households: d.hogares_censo_2024,
        age_avg: d.promedio_edad,
        source: "Censo 2024 INE",
      },
    ])
  ),
  null,
  2
)};\n`;
writeFileSync(join(appRoot, "scripts", "census-data.mjs"), censusMjsContent, "utf8");
console.log("- Actualizado scripts/census-data.mjs con 346 comunas.");

// 6. Actualizar data/catalog/communes.json
const updatedCommunes = catalogCommunes.map((c) => {
  const cut = String(c.cut).padStart(5, "0");
  const censo = censoPorCut.get(cut);
  return {
    ...c,
    poblacion_censo_2024: censo ? censo.poblacion_censo_2024 : null,
    viviendas_censo_2024: censo ? censo.viviendas_censo_2024 : null,
  };
});
catalogData.communes = updatedCommunes;
writeFileSync(catalogPath, JSON.stringify(catalogData, null, 2), "utf8");
console.log("- Actualizado data/catalog/communes.json.");

// 7. Actualizar lib/municipalidades.ts (MUNICIPALIDADES_SEED)
const seedTsContent = `/**
 * Catálogo territorial generado desde los Códigos Únicos Territoriales de SUBDERE
 * e indicadores oficiales de población del Censo 2024 del Instituto Nacional de Estadísticas (INE).
 * Fuente: https://censo2024.ine.gob.cl/resultados/
 */
export interface Municipalidad {
  id: string;
  cut: string;
  nombre_comuna: string;
  region: string;
  administracion_municipal_id: string;
  tiene_municipalidad_propia: boolean;
  fuente_catalogo: string;
  alcalde_actual: string | null;
  partido_alcalde: string | null;
  poblacion: number | null;
  poblacion_censo_2024: number | null;
  viviendas_censo_2024: number | null;
  variacion_intercensal_pct: number | null;
  idh_comunal: number | null;
  pobreza_casen_pct: number | null;
  sitio_web_oficial: string | null;
}

export const MUNICIPALIDADES_SEED: Municipalidad[] = ${JSON.stringify(updatedCommunes, null, 2)};

export function getMunicipalidadById(id: string): Municipalidad | undefined {
  return MUNICIPALIDADES_SEED.find((municipalidad) => municipalidad.id === id);
}
`;
writeFileSync(join(appRoot, "lib", "municipalidades.ts"), seedTsContent, "utf8");
console.log("- Actualizado lib/municipalidades.ts con MUNICIPALIDADES_SEED poblado.");

console.log("\n=== INGESTA CENSO 2024 INE COMPLETADA EXITOSAMENTE ===");
