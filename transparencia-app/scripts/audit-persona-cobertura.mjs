/**
 * Auditoría de cobertura persona <-> fuente (Wave 2, prioridad vínculos).
 * Replica en Node puro la lógica exacta de lib/data-source.ts para medir
 * cuánta evidencia llega hoy a cada senador/diputado de la nómina 2026-2030.
 * Uso: node scripts/audit-persona-cobertura.mjs
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const latest = JSON.parse(readFileSync(join(root, "data", "etl", "latest.json"), "utf8"));
const fuentesRaw = latest.fuentes ?? {};

let proyeccionInfoProbidad = null;
try {
  proyeccionInfoProbidad = JSON.parse(
    readFileSync(join(root, "data", "lake", "projections", "v1", "infoprobidad.json"), "utf8"),
  ).records;
} catch {
  /* proyección aún no generada */
}
const fuentes = {
  ...fuentesRaw,
  ...(proyeccionInfoProbidad ? { infoprobidad: proyeccionInfoProbidad } : {}),
};

const normCache = new Map();
function normalizeSearchText(value) {
  const hit = normCache.get(value);
  if (hit !== undefined) return hit;
  const result = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  normCache.set(value, result);
  return result;
}
const normalizeTokens = (value) => (normalizeSearchText(value) || "").split(" ").filter(Boolean);

function nameSequenceMatches(seedName, recordName) {
  const seedTokens = normalizeTokens(seedName);
  const recordTokens = normalizeTokens(recordName);
  if (seedTokens.length < 2 || recordTokens.length < seedTokens.length) return false;
  if (seedTokens[seedTokens.length - 1] !== recordTokens[recordTokens.length - 1]) return false;
  let cursor = 0;
  for (const recordToken of recordTokens) if (recordToken === seedTokens[cursor]) cursor += 1;
  return cursor === seedTokens.length;
}

function recordContainsPolitico(record, normalizedName) {
  if (record.nombre && nameSequenceMatches(normalizedName, record.nombre)) return true;
  return [record.sujetos_activos, record.asistentes]
    .filter(Boolean)
    .some((field) => normalizeSearchText(field).includes(normalizedName));
}

function nombreCoincide(nombreVoto, nombreSeed) {
  const voto = normalizeSearchText(nombreVoto);
  const seed = normalizeSearchText(nombreSeed);
  if (voto === seed) return true;
  const apellidos = seed.split(" ").slice(-2);
  if (apellidos.length < 2) return false;
  return apellidos.every((apellido) => voto.includes(apellido));
}

function parseNomina(path) {
  const source = readFileSync(path, "utf8");
  const entries = [];
  let current = null;
  let depth = 0;
  for (const line of source.split("\n")) {
    const open = (line.match(/{/g) ?? []).length;
    const close = (line.match(/}/g) ?? []).length;
    if (!current && open > 0) current = {};
    depth += open - close;
    if (!current) continue;
    const id = line.match(/^\s*id:\s*"([^"]+)",?\s*$/);
    if (id) current.id = id[1];
    const nombre = line.match(/^\s*nombre_completo:\s*"([^"]+)",?\s*$/);
    if (nombre) current.nombre_completo = nombre[1];
    const cargo = line.match(/^\s*cargo:\s*"([^"]+)",?\s*$/);
    if (cargo) current.cargo = cargo[1];
    if (depth <= 0 && current) {
      entries.push(current);
      current = null;
      depth = 0;
    }
  }
  return entries.filter((entry) => entry.id && entry.nombre_completo);
}

const nomina = parseNomina(join(root, "lib", "politicos-source.ts"));
const senadores = nomina.filter((p) => p.cargo === "Senador");
const diputados = nomina.filter((p) => p.cargo === "Diputado");
console.log(`nómina: ${nomina.length} (${diputados.length} diputados, ${senadores.length} senadores)`);

const porNombre = new Map();
for (const r of fuentes.congreso_opendata ?? []) porNombre.set(normalizeSearchText(r.nombre ?? ""), r);

function evidenceFor(persona) {
  const normalizedName = normalizeSearchText(persona.nombre_completo);
  if (normalizedName.length < 8) return {};
  const diputado = porNombre.get(normalizedName);
  const diputadoId = diputado ? String(diputado.id ?? "") : null;
  const counts = {};
  for (const [key, records] of Object.entries(fuentes)) {
    if (!Array.isArray(records)) continue;
    let n = 0;
    for (const record of records) {
      if (key === "gastos_senado") {
        if (persona.cargo === "Senador" && record.nombre && nameSequenceMatches(persona.nombre_completo, record.nombre)) n += 1;
      } else if (key === "gastos_camara") {
        if (persona.cargo === "Diputado" && diputadoId && String(record.diputado_id) === diputadoId) n += 1;
      } else if (key === "votaciones_camara" || key === "votaciones_senado") {
        if ((record.votos ?? []).some((v) => (diputadoId ? v.id === diputadoId || nombreCoincide(v.nombre, persona.nombre_completo) : nombreCoincide(v.nombre, persona.nombre_completo)))) n += 1;
      } else {
        if (recordContainsPolitico(record, normalizedName)) n += 1;
      }
    }
    if (n > 0) counts[key] = n;
  }
  return counts;
}

const report = nomina.map((persona) => ({ ...persona, fuentes: evidenceFor(persona) }));
const fuenteTotal = new Map();
for (const persona of report) for (const key of Object.keys(persona.fuentes)) fuenteTotal.set(key, (fuenteTotal.get(key) ?? 0) + 1);

console.log("\nCobertura por fuente (personas con al menos 1 registro):");
for (const [key, n] of [...fuenteTotal.entries()].sort((a, b) => b[1] - a[1])) {
  const total = (fuentes[key] ?? []).length;
  console.log(`  ${key.padEnd(20)} ${String(n).padStart(4)}/${nomina.length} personas · ${total} registros en snapshot`);
}

const sinNada = report.filter((p) => Object.keys(p.fuentes).length === 0);
console.log(`\nSin ninguna evidencia: ${sinNada.length}`);
for (const p of sinNada.slice(0, 10)) console.log(`  ${p.id} ${p.nombre_completo} (${p.cargo})`);

const porNivel = (list) => {
  const d = {};
  for (const p of list) {
    const n = Object.keys(p.fuentes).length;
    d[n] = (d[n] ?? 0) + 1;
  }
  return d;
};
console.log("\nDistribución (cantidad de fuentes con evidencia):");
console.log("  diputados:", porNivel(diputados.map((p) => report.find((r) => r.id === p.id))));
console.log("  senadores:", porNivel(senadores.map((p) => report.find((r) => r.id === p.id))));