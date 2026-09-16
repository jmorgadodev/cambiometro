export interface RemoteOfficialRow {
  id?: unknown;
  [key: string]: unknown;
}

export interface RemoteSearchResult {
  rows: RemoteOfficialRow[];
  total: number | null;
  partial: boolean;
}

interface SearchOptions {
  query: string;
  organism?: string;
  role?: string;
  /** Optional absolute public API origin used by local previews. */
  apiOrigin?: string;
  fetchImpl?: typeof fetch;
}

interface SearchPayload {
  data?: RemoteOfficialRow[];
  total?: number;
  meta?: { total?: number };
}

function requestUrl(scope: "all" | "municipal" | "central", options: SearchOptions) {
  const params = new URLSearchParams({
    scope,
    query: options.query,
    include_zero: "true",
    limit: "20",
    sortBy: "nombre_asc",
  });
  if (options.organism?.trim()) params.set("organismo", options.organism.trim());
  if (options.role?.trim()) params.set("cargo", options.role.trim());
  const path = `/api/funcionarios?${params.toString()}`;
  return options.apiOrigin ? new URL(path, options.apiOrigin).toString() : path;
}

async function readResponse(response: Response): Promise<{ rows: RemoteOfficialRow[]; total: number | null } | null> {
  if (!response.ok) return null;
  const payload = await response.json() as SearchPayload;
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const candidate = payload.total ?? payload.meta?.total;
  return { rows, total: Number.isFinite(candidate) ? Number(candidate) : rows.length };
}

/**
 * Consulta la ruta combinada normalmente y sólo la divide en dos consultas
 * cuando esa ruta no responde. Esto preserva cobertura durante una falla
 * parcial sin duplicar el consumo en el camino saludable.
 */
export async function searchTransparencyActiva(options: SearchOptions): Promise<RemoteSearchResult> {
  const fetcher = options.fetchImpl ?? fetch;
  try {
    const combined = await readResponse(await fetcher(requestUrl("all", options)));
    if (combined) return { ...combined, partial: false };
  } catch {
    // Se intenta la ruta por fuente abajo.
  }

  const results: Array<{ scope: "municipal" | "central"; rows: RemoteOfficialRow[]; total: number | null } | null> = [];
  for (const scope of ["municipal", "central"] as const) {
    try {
      const result = await readResponse(await fetcher(requestUrl(scope, options)));
      results.push(result ? { ...result, scope } : null);
    } catch {
      results.push(null);
    }
  }
  const rows = new Map<string, RemoteOfficialRow>();
  for (const result of results) {
    for (const row of result?.rows ?? []) {
      const id = String(row.id ?? "");
      const key = id || JSON.stringify(row);
      if (!rows.has(key)) rows.set(key, { ...row, sourceScope: result?.scope });
    }
  }
  const totals = results.filter((result): result is { scope: "municipal" | "central"; rows: RemoteOfficialRow[]; total: number | null } => Boolean(result));
  const total = totals.length > 0
    ? totals.reduce((sum, result) => sum + (result.total ?? result.rows.length), 0)
    : null;
  return {
    rows: [...rows.values()],
    total,
    partial: totals.length !== 2,
  };
}
