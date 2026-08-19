"use client";

import { useEffect, useState, useRef, useMemo, useId } from "react";
import { useRouter } from "next/navigation";
import { getSearchEngine, getSearchDocs, type SearchDoc } from "@/lib/search-index";

interface OmniboxSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OmniboxSearch({ isOpen, onClose }: OmniboxSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Manejar atajo Escape y teclado
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Realizar búsqueda instantánea
  const results: SearchDoc[] = useMemo(() => {
    const q = query.trim();
    if (!q) {
      // Si no hay búsqueda, mostrar sugerencias destacadas (primeras autoridades y partidos)
      return getSearchDocs().slice(0, 8);
    }

    try {
      const engine = getSearchEngine();
      const searchResults = engine.search(q, { prefix: true, fuzzy: 0.2 });
      return searchResults.slice(0, 12).map((res) => ({
        id: res.id,
        title: res.title,
        subtitle: res.subtitle,
        category: res.category,
        categoryCode: res.categoryCode,
        url: res.url,
        keywords: "",
      }));
    } catch {
      return [];
    }
  }, [query]);

  const activeIndex = selectedIndex < results.length ? selectedIndex : 0;

  const handleSelectDoc = (doc: SearchDoc) => {
    onClose();
    router.push(doc.url);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) {
        handleSelectDoc(results[activeIndex]);
      }
    }
  };

  // Función para resaltar coincidencias
  const highlightMatch = (text: string, searchPhrase: string) => {
    if (!searchPhrase.trim()) return text;
    const parts = text.split(new RegExp(`(${searchPhrase.trim()})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchPhrase.toLowerCase() ? (
        <span key={i} className="omnibox-highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="omnibox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="omnibox-label"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="omnibox-modal">
        {/* Input Header */}
        <div className="omnibox-header">
          <span style={{ fontSize: "1.2rem", color: "var(--accent)" }} aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            id="omnibox-search-input"
            className="omnibox-input"
            type="search"
            placeholder="Buscar autoridades, partidos, ministerios, municipalidades…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "0.2rem 0.5rem",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="omnibox-body" id={listboxId} role="listbox">
          {results.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No se encontraron coincidencias para &quot;<strong>{query}</strong>&quot;.
            </div>
          ) : (
            <div>
              <div className="omnibox-group-title">
                {query.trim() ? `Resultados (${results.length})` : "Sugerencias destacadas"}
              </div>
              {results.map((doc, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <div
                    key={doc.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`omnibox-item ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleSelectDoc(doc)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {highlightMatch(doc.title, query)}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {doc.subtitle}
                      </div>
                    </div>
                    <span className="omnibox-item-badge">{doc.category}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="omnibox-footer">
          <span>
            Navegar con <kbd style={{ padding: "0.15rem 0.35rem", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 4 }}>↑</kbd> <kbd style={{ padding: "0.15rem 0.35rem", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 4 }}>↓</kbd>
          </span>
          <span>
            Seleccionar con <kbd style={{ padding: "0.15rem 0.35rem", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 4 }}>Enter</kbd>
          </span>
          <span>
            Cerrar con <kbd style={{ padding: "0.15rem 0.35rem", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: 4 }}>Esc</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
