/**
 * Genera data/politicos-fotos.json con la foto de cada parlamentario 2026-2030.
 *
 * Fuente: Wikipedia en español y Wikimedia Commons (los retratos del Congreso
 * Nacional fueron subidos mayormente bajo dominio público / licencias libres).
 * Validación estricta: el título del artículo debe incluir el apellido paterno y
 * (primer nombre o apellido materno) del seed, y la descripción (si existe) debe
 * corresponder a un político/a chileno/a. Sin foto confiable → el id no entra al
 * mapa y la app usa el avatar del partido (nada inventado).
 *
 * Uso: node scripts/fetch-fotos-politicos.mjs [--force]
 * Sin --force conserva las fotos ya resueltas y solo intenta las que faltan;
 * con --force revalida el universo completo.
 * Salida: data/politicos-fotos.json ({ id: "https://upload.wikimedia.org/..." })
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { POLITICOS_SEED } from "../lib/politicos-source.ts";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = join(scriptDirectory, "..", "data", "politicos-fotos.json");

const USER_AGENT = "TransparenciaChile-Fotos/1.0 (+https://transparencia.impulsacv.cl)";
const API = "https://es.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

function tokens(value) {
  return String(value ?? "")
    .toLocaleLowerCase("es-CL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[\s-]+/)
    .filter((token) => token.length >= 3 && !/^(de|del|la|las|los|el|y|van|von|barents)$/.test(token));
}

/** Título válido: contiene el apellido paterno y (primer nombre o apellido materno). */
function titleMatches(nombre, title) {
  const nombreTokens = tokens(nombre);
  const titleTokens = tokens(title);
  if (titleTokens.length < 2) return false;
  const paterno = nombreTokens[nombreTokens.length - 2];
  const materno = nombreTokens[nombreTokens.length - 1];
  const primerNombre = nombreTokens[0];
  const paternoOk = titleTokens.some(
    (token) => token === paterno || token.startsWith(paterno) || paterno.startsWith(token)
  );
  if (!paternoOk) return false;
  return titleTokens.some(
    (token) =>
      token === materno ||
      token.startsWith(materno) ||
      materno.startsWith(token) ||
      token === primerNombre ||
      token.startsWith(primerNombre) ||
      primerNombre.startsWith(token)
  );
}

/** La descripción de Wikipedia (si existe) debe ser un político chileno. */
function descriptionChilean(description) {
  if (!description) return true;
  const value = description.toLocaleLowerCase("es-CL");
  return value.includes("chilen") && (value.includes("pol") || value.includes("senador") || value.includes("diputado"));
}

async function buscar(query) {
  const url = `${API}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&gsrnamespace=0&prop=description|pageimages&pithumbsize=320&format=json&origin=*`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
  const payload = await response.json();
  return Object.values(payload.query?.pages ?? {})
    .filter((page) => Boolean(page.title))
    .map((page) => ({
      title: page.title,
      description: page.description ?? "",
      thumbnail: page.thumbnail?.source ?? "",
    }));
}

/** Búsqueda de archivos (namespace 6) en Wikimedia Commons, con thumbnail. */
async function buscarCommons(query) {
  const url = `${COMMONS_API}?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=320&format=json&origin=*`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
  const payload = await response.json();
  return Object.values(payload.query?.pages ?? [])
    .filter((page) => Boolean(page.title) && Array.isArray(page.imageinfo) && page.imageinfo.length > 0)
    .map((page) => ({
      title: page.title.replace(/^File:/i, ""),
      description: "",
      thumbnail: page.imageinfo[0].thumburl ?? "",
    }));
}

async function fotosEnCandidatos(politico, candidates) {
  for (const candidate of candidates) {
    if (!candidate.thumbnail) continue;
    if (!titleMatches(politico.nombre_completo, candidate.title)) continue;
    if (!descriptionChilean(candidate.description)) continue;
    return candidate.thumbnail;
  }
  return null;
}

async function fotoParaPolitico(politico) {
  const nameTokens = tokens(politico.nombre_completo);
  const paterno = nameTokens[nameTokens.length - 2];
  const materno = nameTokens[nameTokens.length - 1];

  const queries = [
    `"${politico.nombre_completo}"`,
    `"${paterno} ${materno}"`,
    paterno,
  ];

  for (const query of queries) {
    const candidates = await buscar(query);
    const foto = await fotosEnCandidatos(politico, candidates);
    if (foto) return foto;
  }

  const commonsQueries = [
    `"${paterno} ${materno}"`,
    `"${nameTokens[0]} ${paterno} ${materno}"`,
  ];
  for (const query of commonsQueries) {
    const candidates = await buscarCommons(query);
    const foto = await fotosEnCandidatos(politico, candidates);
    if (foto) return foto;
  }
  return null;
}

async function main() {
  // Sin --force: conserva las fotos ya resueltas e intenta solo las que faltan.
  const soloFaltantes = !process.argv.includes("--force");
  const fotos = {};
  if (soloFaltantes) {
    try {
      Object.assign(fotos, JSON.parse(readFileSync(outputPath, "utf8")));
    } catch {
      // Sin salida previa: se parte de cero.
    }
  }
  const sinFoto = [];
  let index = 0;
  let intentados = 0;
  for (const politico of POLITICOS_SEED) {
    index += 1;
    if (soloFaltantes && fotos[politico.id]) continue;
    intentados += 1;
    try {
      const foto = await fotoParaPolitico(politico);
      if (foto) {
        fotos[politico.id] = foto;
      } else {
        sinFoto.push(politico.id);
      }
      console.log(`[fotos] ${index}/${POLITICOS_SEED.length} ${politico.id} → ${foto ? "foto" : "avatar"}`);
    } catch (error) {
      sinFoto.push(politico.id);
      console.warn(`[fotos] ${politico.id}: ${String(error).slice(0, 90)}`);
    }
  }
  writeFileSync(outputPath, `${JSON.stringify(fotos, null, 2)}\n`, "utf8");
  console.log(`\n[fotos] ${Object.keys(fotos).length} con foto (${intentados} intentados) + ${sinFoto.length} con avatar → ${outputPath}`);
}

main().catch((error) => {
  console.error("[fotos] error fatal:", error);
  process.exit(1);
});