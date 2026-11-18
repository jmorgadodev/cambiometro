export type CongressChamber = "Diputado" | "Senador";

export interface CongressFilters {
  cargo: CongressChamber | null;
  query: string;
}

interface CongressFilterEntry {
  politico: {
    nombre_completo: string;
    cargo: string;
    distrito_region?: string | null;
    numero_distrito?: number | null;
  };
  partido?: {
    nombre?: string | null;
    sigla?: string | null;
  };
}

function firstValue(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function normalizeCongressQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function readCongressFilters(params: Pick<URLSearchParams, "get">): CongressFilters {
  const cargoParam = params.get("cargo");
  const cargo = cargoParam === "Diputado" || cargoParam === "Senador" ? cargoParam : null;
  return { cargo, query: params.get("q")?.trim() ?? "" };
}

export function readCongressFilterRecord(params: Record<string, string | string[] | undefined>): CongressFilters {
  const cargoParam = firstValue(params.cargo);
  const cargo = cargoParam === "Diputado" || cargoParam === "Senador" ? cargoParam : null;
  return { cargo, query: firstValue(params.q).trim() };
}

export function filterCongressEntries<T extends CongressFilterEntry>(entries: readonly T[], filters: CongressFilters): T[] {
  const query = normalizeCongressQuery(filters.query);
  return entries.filter((entry) => {
    if (filters.cargo && entry.politico.cargo !== filters.cargo) return false;
    if (!query) return true;
    const haystack = normalizeCongressQuery([
      entry.politico.nombre_completo,
      entry.politico.cargo,
      entry.politico.distrito_region,
      entry.politico.numero_distrito ? `distrito ${entry.politico.numero_distrito}` : "",
      entry.partido?.nombre,
      entry.partido?.sigla,
    ].filter(Boolean).join(" "));
    return haystack.includes(query);
  });
}
