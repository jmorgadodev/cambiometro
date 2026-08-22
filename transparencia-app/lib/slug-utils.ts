/**
 * slug-utils.ts — Utilidades de slug semántico compartidas entre secciones.
 * Extiende el patrón ya establecido en politico-slugs.ts para municipalidades
 * y servicios públicos, con lookup dual (slug nuevo ↔ ID legado) y detección
 * de IDs legados para emitir 301 permanentes.
 */

import { MUNICIPALIDADES_SEED, type Municipalidad } from "@/lib/municipalidades";
import { getAllServiciosPublicos, type ServicioPublico } from "@/lib/servicios-publicos";

// ── SLUGIFY (reutiliza misma lógica que politico-slugs.ts) ─────────────────

export function slugifyNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-z0-9\s-]/g, "")   // quitar caracteres especiales
    .trim()
    .replace(/\s+/g, "-")           // espacios a guiones
    .replace(/-+/g, "-");            // colapsar guiones múltiples
}

// ── MUNICIPALIDADES ────────────────────────────────────────────────────────

/**
 * Slug canónico de una municipalidad: nombre de la comuna sin tildes,
 * sin prefijo "muni-".
 * Ej: "Alto Hospicio" → "alto-hospicio", "Ñuñoa" → "nunoa"
 */
export function getMuniSlug(m: Municipalidad): string {
  return slugifyNombre(m.nombre_comuna);
}

// Mapas precomputados O(1) para municipalidades
const MUNI_SLUG_TO_OBJ = new Map<string, Municipalidad>();
const MUNI_ID_TO_OBJ = new Map<string, Municipalidad>();
const MUNI_SLUG_TO_ID = new Map<string, string>();
const MUNI_ID_TO_SLUG = new Map<string, string>();

for (const m of MUNICIPALIDADES_SEED) {
  let slug = getMuniSlug(m);
  // Desambiguar por región si hay colisión (poco probable en comunas únicas)
  if (MUNI_SLUG_TO_OBJ.has(slug)) {
    slug = `${slug}-${slugifyNombre(m.region)}`;
  }
  MUNI_SLUG_TO_OBJ.set(slug, m);
  MUNI_ID_TO_OBJ.set(m.id, m);
  MUNI_SLUG_TO_ID.set(slug, m.id);
  MUNI_ID_TO_SLUG.set(m.id, slug);
}

/**
 * Lookup dual: acepta slug nuevo ("iquique") o ID legado ("muni-iquique").
 */
export function getMuniBySlugOrId(idOrSlug: string): Municipalidad | null {
  if (!idOrSlug) return null;
  const clean = idOrSlug.trim().toLowerCase();
  // Slug nuevo
  if (MUNI_SLUG_TO_OBJ.has(clean)) return MUNI_SLUG_TO_OBJ.get(clean)!;
  // ID legado (muni-*)
  if (MUNI_ID_TO_OBJ.has(clean)) return MUNI_ID_TO_OBJ.get(clean)!;
  return null;
}

/**
 * Slug canónico a partir del ID o el slug de una municipalidad.
 */
export function getMuniCanonicalSlug(idOrSlug: string): string | null {
  const clean = idOrSlug.trim().toLowerCase();
  // Si ya es un slug, devolver tal cual (verificamos que existe)
  if (MUNI_SLUG_TO_OBJ.has(clean)) return clean;
  // Si es ID legado, devolver slug
  if (MUNI_ID_TO_SLUG.has(clean)) return MUNI_ID_TO_SLUG.get(clean)!;
  return null;
}

/**
 * Detecta IDs legados de municipalidades (prefijo "muni-").
 * Si el input es un ID legado, la ruta debe emitir 301.
 */
export function isMuniLegacyId(idOrSlug: string): boolean {
  if (!idOrSlug) return false;
  const clean = idOrSlug.trim().toLowerCase();
  // Es ID legado si: empieza con "muni-" Y existe en el catálogo como ID
  return clean.startsWith("muni-") && MUNI_ID_TO_OBJ.has(clean);
}

/**
 * Todos los slugs de municipalidades para sitemap y generateStaticParams.
 */
export function getAllMuniSlugs(): Array<{ id: string; slug: string; muni: Municipalidad }> {
  return MUNICIPALIDADES_SEED.map((m) => ({
    id: m.id,
    slug: MUNI_ID_TO_SLUG.get(m.id) ?? getMuniSlug(m),
    muni: m,
  }));
}

// ── SERVICIOS PÚBLICOS ─────────────────────────────────────────────────────

/**
 * Slug canónico de un servicio público: nombre completo sin tildes.
 * Ej: "Ministerio del Interior y Seguridad Pública" →
 *     "ministerio-del-interior-y-seguridad-publica"
 */
export function getServicioSlug(s: ServicioPublico): string {
  return slugifyNombre(s.nombre);
}

// Mapas para servicios (inicialización lazy, ya que requiere getAllServiciosPublicos)
let _servicioSlugMap: Map<string, ServicioPublico> | null = null;
let _servicioIdMap: Map<string, ServicioPublico> | null = null;
let _servicioIdToSlug: Map<string, string> | null = null;
let _servicioSlugToId: Map<string, string> | null = null;

function initServicioMaps() {
  if (_servicioSlugMap) return;
  _servicioSlugMap = new Map();
  _servicioIdMap = new Map();
  _servicioIdToSlug = new Map();
  _servicioSlugToId = new Map();

  const servicios = getAllServiciosPublicos();
  for (const s of servicios) {
    let slug = getServicioSlug(s);
    // Desambiguar por tipo_organo si hay colisión
    if (_servicioSlugMap.has(slug)) {
      slug = `${slug}-${slugifyNombre(s.tipo_organo)}`;
    }
    _servicioSlugMap.set(slug, s);
    _servicioIdMap.set(s.id, s);
    _servicioIdToSlug.set(s.id, slug);
    _servicioSlugToId.set(slug, s.id);
  }
}

/**
 * Lookup dual: acepta slug nuevo o ID legado (min-*, sub-*, sna-*, etc).
 */
export function getServicioBySlugOrId(idOrSlug: string): ServicioPublico | null {
  initServicioMaps();
  if (!idOrSlug) return null;
  const clean = idOrSlug.trim().toLowerCase();
  if (_servicioSlugMap!.has(clean)) return _servicioSlugMap!.get(clean)!;
  if (_servicioIdMap!.has(clean)) return _servicioIdMap!.get(clean)!;
  return null;
}

/**
 * Slug canónico a partir del ID o slug de un servicio.
 */
export function getServicioCanonicalSlug(idOrSlug: string): string | null {
  initServicioMaps();
  const clean = idOrSlug.trim().toLowerCase();
  if (_servicioSlugMap!.has(clean)) return clean;
  if (_servicioIdToSlug!.has(clean)) return _servicioIdToSlug!.get(clean)!;
  return null;
}

/**
 * Detecta IDs legados de servicios públicos (prefijos min-, sub-, sna-, etc.)
 * Si el input es un ID legado, la ruta debe emitir 301.
 */
export function isServicioLegacyId(idOrSlug: string): boolean {
  initServicioMaps();
  if (!idOrSlug) return false;
  const clean = idOrSlug.trim().toLowerCase();
  // Es ID legado si existe en el mapa por ID Y el slug canónico difiere
  if (!_servicioIdMap!.has(clean)) return false;
  const slug = _servicioIdToSlug!.get(clean)!;
  return slug !== clean; // el slug canónico siempre difiere del ID prefijado
}

/**
 * Todos los slugs de servicios para sitemap y generateStaticParams.
 */
export function getAllServicioSlugs(): Array<{ id: string; slug: string; servicio: ServicioPublico }> {
  initServicioMaps();
  return getAllServiciosPublicos().map((s) => ({
    id: s.id,
    slug: _servicioIdToSlug!.get(s.id) ?? getServicioSlug(s),
    servicio: s,
  }));
}
