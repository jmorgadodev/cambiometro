export interface HomeSearchResult {
  id: string;
  type: string;
  nombre: string;
  url: string;
  cargo?: string;
  organo?: string;
  region?: string;
  periodo?: string;
  monto?: number;
  fuente?: string;
}

export interface HomeSearchPayload {
  autoridades?: HomeSearchResult[];
  funcionarios?: HomeSearchResult[];
  remuneraciones?: HomeSearchResult[];
  municipalidades?: HomeSearchResult[];
  entidades?: HomeSearchResult[];
}

export function flattenHomeSearchResults(payload: HomeSearchPayload): HomeSearchResult[] {
  return [
    ...(payload.remuneraciones ?? []),
    ...(payload.autoridades ?? []),
    ...(payload.funcionarios ?? []),
    ...(payload.municipalidades ?? []),
    ...(payload.entidades ?? []),
  ];
}

export function filterHomeSearchResults(results: HomeSearchResult[], scope: string): HomeSearchResult[] {
  if (scope === "personas") return results.filter((item) => item.type === "persona" || item.type === "funcionario");
  if (scope === "remuneraciones") return results.filter((item) => item.type === "remuneracion");
  if (scope === "municipios") return results.filter((item) => item.type === "municipalidad");
  if (scope === "organismos") return results.filter((item) => item.type === "organismo" || item.type === "proveedor");
  return results;
}

export function homeSearchApiUrl(pageOrigin: string): string {
  const origin = new URL(pageOrigin);
  if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") {
    origin.hostname = "cambiometro.impulsacv.cl";
    origin.protocol = "https:";
    origin.port = "";
  }
  return new URL("/api/v1/search", origin).toString();
}
