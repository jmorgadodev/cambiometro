"use client";

import Link from "@/components/SiteLink";
import { useEffect, useId, useRef, useState } from "react";

interface SearchResult {
  type: "politico" | "municipalidad" | "funcionario" | "entidad";
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
  results: {
    autoridades: SearchResult[];
    municipalidades: SearchResult[];
    funcionarios: SearchResult[];
    entidades: SearchResult[];
  };
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  politico: "Autoridad",
  municipalidad: "Municipalidad",
  funcionario: "Funcionario/a",
  entidad: "Entidad jurídica",
};

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
        setResults([
          ...payload.results.autoridades,
          ...payload.results.municipalidades,
          ...payload.results.funcionarios,
          ...(payload.results.entidades ?? []),
        ].slice(0, 9));
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") {
          setResults([]);
          setError("No fue posible consultar el índice público.");
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
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div ref={dropdownRef} className="header-search">
      <label className="sr-only" htmlFor="global-search">Buscar en la plataforma</label>
      <div className="header-search__control">
        <span aria-hidden="true" className="header-search__icon">⌕</span>
        <input
          id="global-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showDropdown}
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
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          placeholder="Buscar autoridad, comuna, entidad o RUT…"
        />
        {isLoading && <span className="header-search__loading" role="status">Consultando</span>}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setError(null);
              setIsLoading(false);
            }}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <div id={listboxId} role="listbox" className="header-search__results">
          {error ? (
            <p role="alert" className="header-search__message">{error}</p>
          ) : !isLoading && results.length === 0 ? (
            <div role="status" className="header-search__message">
              <p>Sin coincidencias verificadas para “{query}”.</p>
              <Link href={`/politico?q=${encodeURIComponent(query.trim())}`} onClick={() => setIsOpen(false)}>
                Ver listado de diputados y senadores con “{query.trim()}” →
              </Link>
            </div>
          ) : (
            results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.url}
                role="option"
                aria-selected="false"
                className="header-search__result"
                onClick={() => setIsOpen(false)}
              >
                <span className="header-search__type">{TYPE_LABELS[result.type]}</span>
                <span>
                  <strong>{result.nombre}</strong>
                  <small>
                    {[result.cargo ?? result.alcalde, result.partido, result.region ?? result.organo]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
