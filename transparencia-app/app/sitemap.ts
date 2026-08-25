import { MetadataRoute } from "next";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { PARTIDOS_SEED } from "@/lib/partidos";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import { getSnapshotSummary } from "@/lib/data-source";
import { getAllMuniSlugs, getAllServicioSlugs } from "@/lib/slug-utils";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://cambiometro.impulsacv.cl";
  const snapshot = getSnapshotSummary();
  const lastModified = snapshot.generatedAt ? new Date(snapshot.generatedAt) : new Date("2026-08-09T18:26:00Z");

  // Static core routes
  const routes = [
    "",
    "/politico",
    "/personas",
    "/partidos",
    "/comparar",
    "/entidades",
    "/autoridades",
    "/cruces",
    "/transferencias",
    "/datos",
    "/funcionarios",
    "/municipalidades",
    "/servicios-publicos",
    "/movimientos",
    "/rankings",
    "/cambios",
    "/como-funciona",
    "/donar",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Politicos dynamic routes with canonical slugs (already semantic, unchanged)
  const politicos = POLITICOS_SEED.map((politico) => ({
    url: `${baseUrl}/politico/${getPoliticoSlug(politico)}`,
    lastModified,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  // Partidos dynamic routes (sigla-based, already semantic, unchanged)
  const partidos = PARTIDOS_SEED.map((partido) => ({
    url: `${baseUrl}/partidos/${partido.sigla.toLowerCase()}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // 346 municipalidades — slugs semánticos sin prefijo "muni-"
  const municipalidades = getAllMuniSlugs().map(({ slug }) => ({
    url: `${baseUrl}/municipalidades/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Servicios públicos — slugs semánticos desde nombre completo
  const servicios = getAllServicioSlugs().map(({ slug }) => ({
    url: `${baseUrl}/servicios-publicos/${slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...routes, ...politicos, ...partidos, ...municipalidades, ...servicios];
}
