"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";

type SearchResultType = "politico" | "persona" | "municipalidad" | "funcionario" | "entidad" | "proveedor" | "organismo";

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
}

interface SearchPayload {
  data?: {
    autoridades?: SearchResult[];
    municipalidades?: SearchResult[];
    funcionarios?: SearchResult[];
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
};

function flattenResults(payload: SearchPayload) {
  const groups = [
    payload.data?.autoridades ?? [],
    payload.data?.municipalidades ?? [],
    payload.data?.funcionarios ?? [],
    payload.data?.entidades ?? [],
  ];
  const unique = new Map<string, SearchResult>();
  for (const result of groups.flat()) {
    const key = result.url || `${result.type}-${result.id}`;
    if (!unique.has(key)) unique.set(key, result);
  }
  return [...unique.values()].slice(0, 8);
}

export default function HomeInlineSearch() {
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
      try {
        const response = await fetch(`/api/v1/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Búsqueda HTTP ${response.status}`);
        const payload = (await response.json()) as SearchPayload;
        setResults(flattenResults(payload));
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
  const fullSearchHref = `/politico?q=${encodeURIComponent(normalizedQuery)}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (normalizedQuery.length < 2) event.preventDefault();
  };

  return (
    <div ref={wrapperRef} className="home-query-wrap">
      <form className="home-query" action="/politico" method="get" role="search" onSubmit={handleSubmit}>
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
        <small>Busca diputados, senadores, autoridades, comunas y entidades.</small>
      </form>

      {showResults && (
        <div id={listboxId} className="home-query__results" role="listbox" aria-label="Resultados de búsqueda">
          {isLoading ? (
            <p className="home-query__message" role="status">Consultando registros publicados…</p>
          ) : error ? (
            <div className="home-query__message" role="alert">
              <p>{error}</p>
              <Link prefetch={false} href={fullSearchHref} onClick={() => setIsOpen(false)}>Abrir búsqueda completa →</Link>
            </div>
          ) : results.length === 0 ? (
            <div className="home-query__message" role="status">
              <p>Sin coincidencias verificadas con ese texto.</p>
              <Link prefetch={false} href={fullSearchHref} onClick={() => setIsOpen(false)}>Ver resultados completos →</Link>
            </div>
          ) : (
            <>
              <div className="home-query__results-heading"><span>Coincidencias</span><Link prefetch={false} href={fullSearchHref} onClick={() => setIsOpen(false)}>Ver todos →</Link></div>
              {results.map((result) => (
                <Link
                  prefetch={false}
                  key={`${result.type}-${result.id}`}
                  href={result.url}
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
