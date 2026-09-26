"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { interleaveDistinctSearchResults, resolveHomeSearchTarget, resolveSearchResultUrl } from "@/lib/home-search-routing";
import { publicApiUrl } from "@/lib/public-api-origin";

type SearchResultType = "politico" | "persona" | "municipalidad" | "funcionario" | "entidad" | "proveedor" | "organismo" | "remuneracion";

interface SearchResult {
  type: SearchResultType;
  id: string;
  nombre: string;
  url: string;
  cargo?: string;
  region?: string;
  partido?: string;
  alcalde?: string;
  organo?: string;
  periodo?: string | null;
}

interface SearchPayload {
  data?: {
    autoridades?: SearchResult[];
    municipalidades?: SearchResult[];
    funcionarios?: SearchResult[];
    remuneraciones?: SearchResult[];
    entidades?: SearchResult[];
  };
}

const TYPE_LABELS: Record<SearchResultType, string> = {
  politico: "Autoridad",
  persona: "Autoridad",
  municipalidad: "Municipalidad",
  funcionario: "Funcionario/a",
  entidad: "Entidad",
  proveedor: "Proveedor",
  organismo: "Organismo",
  remuneracion: "Remuneración",
};

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function searchTokens(value: string) {
  return normalizeSearchText(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 2);
}

function remunerationIdentityKey(value: string) {
  return searchTokens(value).sort().join(" ");
}

type UnifiedManifest = { searchIndexKey: string; pages: Array<{ page: number; key: string }> };

let unifiedManifestPromise: Promise<UnifiedManifest> | null = null;
let unifiedIndexPromise: Promise<Record<string, number[]>> | null = null;

async function loadUnifiedManifest() {
  unifiedManifestPromise ??= fetch("/data/remuneraciones-unified/manifest.json", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("REMUNERATION_MANIFEST_UNAVAILABLE");
      return response.json() as Promise<UnifiedManifest>;
    })
    .catch((error) => {
      unifiedManifestPromise = null;
      throw error;
    });
  return unifiedManifestPromise;
}

async function loadUnifiedIndex(manifest: UnifiedManifest) {
  unifiedIndexPromise ??= fetch(`/data/remuneraciones-unified/${manifest.searchIndexKey}`, { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("REMUNERATION_INDEX_UNAVAILABLE");
      return response.json() as Promise<Record<string, number[]>>;
    })
    .catch((error) => {
      unifiedIndexPromise = null;
      throw error;
    });
  return unifiedIndexPromise;
}

async function searchStaticRemunerations(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  try {
    const manifest = await loadUnifiedManifest();
    const index = await loadUnifiedIndex(manifest);
    const requestedTokens = searchTokens(query);
    const candidatePages = requestedTokens.reduce<number[] | null>((current, token) => {
      const pages = index[token] ?? [];
      return current === null ? pages : current.filter((page) => pages.includes(page));
    }, null) ?? [];
    const rows = (await Promise.all(candidatePages.slice(0, 24).map(async (page) => {
      const entry = manifest.pages.find((item) => item.page === page);
      if (!entry) return [];
      const response = await fetch(`/data/remuneraciones-unified/${entry.key}`, { cache: "force-cache", signal });
      return response.ok ? await response.json() as Array<Record<string, unknown>> : [];
    }))).flat().filter((row) => {
      const sourceId = String(row.sourceId ?? "");
      if (!["remuneraciones-38bis", "camara", "senado"].includes(sourceId)) return false;
      const haystack = normalizeSearchText(`${row.nombreOriginal ?? ""} ${row.organismoOriginal ?? ""} ${row.cargoOriginal ?? ""}`);
      return requestedTokens.every((token) => haystack.includes(token));
    });
    // La nómina histórica contiene varias filas por persona. La home debe
    // mostrar personas distintas para no llenar el cupo con meses repetidos.
    // La ficha completa seguirá mostrando todas las filas originales.
    const uniquePeople = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const key = remunerationIdentityKey(String(row.nombreOriginal ?? ""));
      if (key && !uniquePeople.has(key)) uniquePeople.set(key, row);
    }
    return [...uniquePeople.values()].slice(0, 4).map((row) => ({
      type: "remuneracion" as const,
      id: String(row.recordId ?? row.personKey ?? ""),
      nombre: String(row.nombreOriginal ?? ""),
      url: `/remuneraciones-publicas?q=${encodeURIComponent(String(row.nombreOriginal ?? query))}`,
      cargo: String(row.cargoOriginal ?? ""),
      organo: String(row.organismoOriginal ?? ""),
      periodo: row.periodo ? String(row.periodo) : null,
    })).filter((row) => row.id && row.nombre);
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return [];
  }
}

function flattenResults(payload: SearchPayload) {
  const groups = [
    payload.data?.autoridades ?? [],
    payload.data?.municipalidades ?? [],
    payload.data?.funcionarios ?? [],
    payload.data?.remuneraciones ?? [],
    payload.data?.entidades ?? [],
  ];
  const unique = new Map<string, SearchResult>();
  for (const result of groups.flat()) {
    const key = resolveSearchResultUrl(result);
    if (!unique.has(key)) unique.set(key, result);
  }
  return [...unique.values()].slice(0, 8);
}

export default function HomeInlineSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setResults([]);
      let workerResults: SearchResult[] = [];
      let remunerationResults: SearchResult[] = [];
      let successfulSources = 0;
      const publish = () => {
        if (!controller.signal.aborted) setResults(interleaveDistinctSearchResults(workerResults, remunerationResults));
      };
      try {
        const workerRequest =
          fetch(publicApiUrl(`/api/v1/search?q=${encodeURIComponent(normalizedQuery)}`), { signal: controller.signal })
            .then(async (response) => {
              if (!response.ok) throw new Error(`SEARCH_HTTP_${response.status}`);
              const payload = await response.json() as SearchPayload;
              workerResults = flattenResults(payload);
              successfulSources += 1;
              publish();
            });
        const remunerationRequest = searchStaticRemunerations(normalizedQuery, controller.signal).then((rows) => {
          remunerationResults = rows;
          successfulSources += 1;
          publish();
        });
        await Promise.allSettled([workerRequest, remunerationRequest]);
        if (!controller.signal.aborted && successfulSources === 0) {
          setError("No fue posible consultar el índice público. Puedes abrir la búsqueda completa.");
        }
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") {
          setResults([]);
          setError("No fue posible consultar el índice público. Puedes abrir la búsqueda completa.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedQuery = query.trim();
  const showResults = isOpen && normalizedQuery.length >= 2;
  const fullSearchTarget = resolveHomeSearchTarget(results, normalizedQuery);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizedQuery.length >= 2) router.push(fullSearchTarget.href);
  };

  return (
    <div ref={wrapperRef} className="home-query-wrap">
      <form className="home-query" action="/buscar" method="get" role="search" onSubmit={handleSubmit}>
        <label htmlFor="home-search">Buscar en los registros</label>
        <div className="home-query__control">
          <input
            id="home-search"
            name="q"
            type="search"
            minLength={2}
            maxLength={80}
            placeholder="Nombre, partido, distrito o región"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              if (nextQuery.trim().length < 2) {
                setResults([]);
                setError(null);
                setIsLoading(false);
              }
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showResults}
            aria-busy={isLoading}
          />
          <button type="submit">Buscar</button>
        </div>
        <small>Busca diputados, senadores, autoridades, remuneraciones, comunas y entidades.</small>
      </form>

      {showResults && (
        <div id={listboxId} className="home-query__results" role="listbox" aria-label="Resultados de búsqueda">
          {isLoading && results.length === 0 ? (
            <p className="home-query__message" role="status">Consultando registros publicados…</p>
          ) : error ? (
            <div className="home-query__message" role="alert">
              <p>{error}</p>
              <Link prefetch={false} href={fullSearchTarget.href} onClick={() => setIsOpen(false)}>Abrir búsqueda completa →</Link>
            </div>
          ) : results.length === 0 ? (
            <div className="home-query__message" role="status">
              <p>Sin coincidencias verificadas con ese texto.</p>
              <Link prefetch={false} href={fullSearchTarget.href} onClick={() => setIsOpen(false)}>{fullSearchTarget.label}</Link>
            </div>
          ) : (
            <>
              <div className="home-query__results-heading"><span>Coincidencias</span><Link prefetch={false} href={fullSearchTarget.href} onClick={() => setIsOpen(false)}>{fullSearchTarget.label}</Link></div>
              {results.map((result) => (
                <Link
                  prefetch={false}
                  key={`${result.type}-${result.id}`}
                  href={resolveSearchResultUrl(result)}
                  role="option"
                  aria-selected="false"
                  className="home-query__result"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="home-query__result-type">{TYPE_LABELS[result.type] ?? "Registro"}</span>
                  <span className="home-query__result-copy">
                    <strong>{result.nombre}</strong>
                    <small>{[result.cargo ?? result.alcalde, result.partido, result.region ?? result.organo].filter(Boolean).join(" · ") || "Ver ficha y evidencia"}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
