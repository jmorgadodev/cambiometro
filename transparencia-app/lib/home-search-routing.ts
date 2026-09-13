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
  const encodedQuery = encodeQuery(query);
  if (results.length === 0) {
    return {
      href: `/remuneraciones-publicas/?q=${encodedQuery}`,
      label: "Buscar en remuneraciones →",
    };
  }
  if (results.some((result) => result.type === "funcionario" || result.type === "remuneracion")) {
    return {
      href: `/remuneraciones-publicas/?q=${encodedQuery}`,
      label: "Ver todas las remuneraciones →",
    };
  }
  if (results.some((result) => result.type === "municipalidad")) {
    return {
      href: `/municipalidades/?search=${encodedQuery}`,
      label: "Ver todas las municipalidades →",
    };
  }
  return {
    href: `/personas/?search=${encodedQuery}`,
    label: "Ver todas las personas y autoridades →",
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
