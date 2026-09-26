export type HomeSearchResultType =
  | "politico"
  | "persona"
  | "municipalidad"
  | "funcionario"
  | "entidad"
  | "proveedor"
  | "organismo"
  | "remuneracion";

export interface HomeSearchRoutingResult {
  type: HomeSearchResultType;
  nombre?: string;
  url?: string;
}

export interface HomeSearchTarget {
  href: string;
  label: string;
}

function encodeQuery(value: string) {
  return encodeURIComponent(value.trim());
}

export function resolveHomeSearchTarget(results: Array<Pick<HomeSearchRoutingResult, "type">>, query: string): HomeSearchTarget {
  void results;
  const encodedQuery = encodeQuery(query);
  return {
    href: `/buscar?q=${encodedQuery}`,
    label: "Ver todos los resultados →",
  };
}

export function resolveSearchResultUrl(result: HomeSearchRoutingResult) {
  if (result.type === "funcionario" || result.type === "remuneracion") {
    return `/remuneraciones-publicas/?q=${encodeQuery(result.nombre ?? "")}`;
  }
  return result.url || (result.type === "municipalidad"
    ? `/municipalidades/?search=${encodeQuery(result.nombre ?? "")}`
    : `/personas/?search=${encodeQuery(result.nombre ?? "")}`);
}

export function interleaveDistinctSearchResults<T extends HomeSearchRoutingResult, U extends HomeSearchRoutingResult>(first: T[], second: U[], limit = 8): Array<T | U> {
  const unique = new Map<string, T | U>();
  for (let index = 0; index < Math.max(first.length, second.length) && unique.size < limit; index++) {
    for (const result of [first[index], second[index]]) {
      if (!result || unique.size >= limit) continue;
      const key = resolveSearchResultUrl(result);
      if (!unique.has(key)) unique.set(key, result);
    }
  }
  return [...unique.values()];
}
