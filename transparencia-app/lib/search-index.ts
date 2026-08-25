import MiniSearch from "minisearch";
import { POLITICOS_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import { getAllServiciosPublicos } from "@/lib/servicios-publicos";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import { getMuniCanonicalSlug } from "@/lib/slug-utils";

export interface SearchDoc {
  id: string;
  title: string;
  subtitle: string;
  category: "Autoridad" | "Partido" | "Servicio Público" | "Municipalidad";
  categoryCode: "politico" | "partido" | "servicio" | "muni";
  url: string;
  keywords: string;
}

let miniSearchInstance: MiniSearch<SearchDoc> | null = null;
let searchDocsCache: SearchDoc[] | null = null;

export function getSearchDocs(): SearchDoc[] {
  if (searchDocsCache) return searchDocsCache;

  const docs: SearchDoc[] = [];

  // 1. Autoridades (Diputados y Senadores)
  for (const pol of POLITICOS_SEED) {
    const partido = PARTIDOS_SEED.find((p) => p.id === pol.partido_id);
    docs.push({
      id: `pol-${pol.id}`,
      title: pol.nombre_completo,
      subtitle: `${pol.cargo} · ${partido?.sigla ?? "IND"} · ${pol.distrito_region}`,
      category: "Autoridad",
      categoryCode: "politico",
      url: `/politico/${getPoliticoSlug(pol)}`,
      keywords: `${pol.nombre_completo} ${pol.cargo} ${partido?.sigla ?? ""} ${partido?.nombre ?? ""} ${pol.distrito_region}`,
    });
  }

  // 2. Partidos Políticos
  for (const part of PARTIDOS_SEED) {
    const isInd = part.id === "ind";
    const slug = isInd ? "independientes" : part.sigla.toLowerCase();
    docs.push({
      id: `part-${part.id}`,
      title: isInd ? "Independientes / Sin Partido" : `${part.nombre} (${part.sigla})`,
      subtitle: `Bancada parlamentaria · ${part.sigla}`,
      category: "Partido",
      categoryCode: "partido",
      url: `/partidos/${slug}`,
      keywords: `${part.nombre} ${part.sigla} bancada partido político`,
    });
  }

  // 3. Servicios Públicos y Ministerios
  const servicios = getAllServiciosPublicos();
  for (const serv of servicios) {
    docs.push({
      id: `serv-${serv.id}`,
      title: serv.nombre,
      subtitle: `${serv.tipo_organo} · ${serv.ministerio_dependiente || "Gobierno de Chile"}`,
      category: "Servicio Público",
      categoryCode: "servicio",
      url: `/servicios-publicos/${serv.id}`,
      keywords: `${serv.nombre} ${serv.sigla || ""} ${serv.tipo_organo} ${serv.ministerio_dependiente || ""} ${serv.director_jefe_actual || ""}`,
    });
  }

  // 4. Municipalidades
  for (const mun of MUNICIPALIDADES_SEED) {
    docs.push({
      id: `mun-${mun.id}`,
      title: `Municipalidad de ${mun.nombre_comuna}`,
      subtitle: `Municipalidad · ${mun.region}`,
      category: "Municipalidad",
      categoryCode: "muni",
      url: `/municipalidades/${getMuniCanonicalSlug(mun.id) ?? mun.id}`,
      keywords: `${mun.nombre_comuna} ${mun.region} ${mun.cut} ${mun.alcalde_actual || ""}`,
    });
  }

  searchDocsCache = docs;
  return docs;
}

export function getSearchEngine(): MiniSearch<SearchDoc> {
  if (miniSearchInstance) return miniSearchInstance;

  const docs = getSearchDocs();
  const miniSearch = new MiniSearch<SearchDoc>({
    fields: ["title", "subtitle", "keywords"],
    storeFields: ["id", "title", "subtitle", "category", "categoryCode", "url"],
    searchOptions: {
      boost: { title: 3, subtitle: 1.5, keywords: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });

  miniSearch.addAll(docs);
  miniSearchInstance = miniSearch;
  return miniSearch;
}
