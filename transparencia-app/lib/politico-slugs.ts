import { POLITICOS_SEED, type Politico } from "@/lib/seed-politicos";

/**
 * Convierte un nombre en un slug URL limpio y legible.
 * Ej: "Miguel Becker Alvear" -> "miguel-becker-alvear"
 */
export function slugifyNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/[^a-z0-9\s-]/g, "") // quitar caracteres especiales
    .trim()
    .replace(/\s+/g, "-") // espacios a guiones
    .replace(/-+/g, "-"); // colapsar guiones múltiples
}

// Mapas precomputados en memoria para O(1) lookups
export const POLITICO_SLUG_MAP = new Map<string, string>();
export const SLUG_TO_ID = new Map<string, string>();
export const ID_TO_POLITICO = new Map<string, Politico>();
export const SLUG_TO_POLITICO = new Map<string, Politico>();

// Inicializar mapeos
for (const p of POLITICOS_SEED) {
  let slug = slugifyNombre(p.nombre_completo);

  // Si hubiera colisión por homónimos, agregar partido o región
  if (SLUG_TO_ID.has(slug) && SLUG_TO_ID.get(slug) !== p.id) {
    const partidoSlug = slugifyNombre(p.partido_id || "ind");
    const regionSlug = slugifyNombre(p.distrito_region || "chile");
    slug = `${slug}-${partidoSlug}-${regionSlug}`;
  }

  POLITICO_SLUG_MAP.set(p.id, slug);
  SLUG_TO_ID.set(slug, p.id);
  ID_TO_POLITICO.set(p.id, p);
  SLUG_TO_POLITICO.set(slug, p);
}

/**
 * Obtiene el slug canónico de un político dado su ID o su objeto Politico.
 */
export function getPoliticoSlug(politicoOrId: Politico | string): string {
  const id = typeof politicoOrId === "string" ? politicoOrId : politicoOrId.id;
  const slug = POLITICO_SLUG_MAP.get(id);
  if (slug) return slug;
  if (typeof politicoOrId === "object" && politicoOrId.nombre_completo) {
    return slugifyNombre(politicoOrId.nombre_completo);
  }
  return id;
}

/**
 * Resuelve un político buscando por ID legado (sen-035, dip-001) o por slug (miguel-becker-alvear).
 */
export function getPoliticoByIdOrSlug(idOrSlug: string): Politico | null {
  if (!idOrSlug) return null;
  const clean = idOrSlug.trim().toLowerCase();

  // 1. Búsqueda directa por slug
  if (SLUG_TO_POLITICO.has(clean)) {
    return SLUG_TO_POLITICO.get(clean)!;
  }

  // 2. Búsqueda por ID legado
  if (ID_TO_POLITICO.has(clean)) {
    return ID_TO_POLITICO.get(clean)!;
  }

  // 3. Fallback de búsqueda insensible a mayúsculas en POLITICOS_SEED
  const matchId = POLITICOS_SEED.find((p) => p.id.toLowerCase() === clean);
  if (matchId) return matchId;

  const matchSlug = POLITICOS_SEED.find(
    (p) => slugifyNombre(p.nombre_completo) === clean
  );
  if (matchSlug) return matchSlug;

  return null;
}

/**
 * Verifica si un identificador corresponde a un ID legado que requiere redirección 301.
 */
export function isLegacyPoliticoId(idOrSlug: string): boolean {
  if (!idOrSlug) return false;
  const clean = idOrSlug.trim().toLowerCase();
  return clean.startsWith("sen-") || clean.startsWith("dip-");
}

/**
 * Obtiene todos los slugs de los políticos para sitemap y exportaciones.
 */
export function getAllPoliticoSlugs(): Array<{ id: string; slug: string; politico: Politico }> {
  return POLITICOS_SEED.map((politico) => ({
    id: politico.id,
    slug: getPoliticoSlug(politico),
    politico,
  }));
}
