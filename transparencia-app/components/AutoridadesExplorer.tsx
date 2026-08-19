"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { POLITICOS_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import { comparePorApellido } from "@/lib/format";

export default function AutoridadesExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [cargoFilter, setCargoFilter] = useState<string>(() => searchParams.get("cargo") || "Todos");
  const [partidoFilter, setPartidoFilter] = useState<string>(() => searchParams.get("partido") || "Todos");
  const [regionFilter, setRegionFilter] = useState<string>(() => searchParams.get("region") || "Todos");
  const [sortBy, setSortBy] = useState<"apellido" | "nombre" | "partido" | "territorio">(
    () => (searchParams.get("sort") as "apellido" | "nombre" | "partido" | "territorio") || "apellido"
  );
  const [viewMode, setViewMode] = useState<"cards" | "table">(
    () => (searchParams.get("view") as "cards" | "table") || "cards"
  );
  const [visibleCount, setVisibleCount] = useState<number>(30);

  const syncUrl = useCallback(
    (q: string, cargo: string, partido: string, region: string, sort: string, view: string) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (cargo !== "Todos") params.set("cargo", cargo);
      if (partido !== "Todos") params.set("partido", partido);
      if (region !== "Todos") params.set("region", region);
      if (sort !== "apellido") params.set("sort", sort);
      if (view !== "cards") params.set("view", view);

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const handleSearchChange = (q: string) => {
    setSearch(q);
    syncUrl(q, cargoFilter, partidoFilter, regionFilter, sortBy, viewMode);
  };

  const handleCargoChange = (cargo: string) => {
    setCargoFilter(cargo);
    syncUrl(search, cargo, partidoFilter, regionFilter, sortBy, viewMode);
  };

  const handlePartidoChange = (partido: string) => {
    setPartidoFilter(partido);
    syncUrl(search, cargoFilter, partido, regionFilter, sortBy, viewMode);
  };

  const handleRegionChange = (region: string) => {
    setRegionFilter(region);
    syncUrl(search, cargoFilter, partidoFilter, region, sortBy, viewMode);
  };

  const handleSortChange = (sort: "apellido" | "nombre" | "partido" | "territorio") => {
    setSortBy(sort);
    syncUrl(search, cargoFilter, partidoFilter, regionFilter, sort, viewMode);
  };

  const handleViewModeChange = (view: "cards" | "table") => {
    setViewMode(view);
    syncUrl(search, cargoFilter, partidoFilter, regionFilter, sortBy, view);
  };

  // Extraer regiones únicas para el filtro
  const regionesUnicas = Array.from(
    new Set(
      POLITICOS_SEED.map((p) => {
        const text = p.distrito_region;
        const match = text.match(/Región (?:de |del |de la |de los |de las )?([^,·]+)/i) || text.match(/(?:Distrito \d+ · )?(.+)/);
        return match ? match[1].trim() : text;
      })
    )
  ).sort((a, b) => a.localeCompare(b, "es-CL"));

  // Filtrado
  const filtered = POLITICOS_SEED.filter((pol) => {
    const matchSearch =
      pol.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      pol.distrito_region.toLowerCase().includes(search.toLowerCase());

    const matchCargo = cargoFilter === "Todos" || pol.cargo === cargoFilter;
    const matchPartido = partidoFilter === "Todos" || pol.partido_id === partidoFilter;
    const matchRegion = regionFilter === "Todos" || pol.distrito_region.toLowerCase().includes(regionFilter.toLowerCase());

    return matchSearch && matchCargo && matchPartido && matchRegion;
  });

  // Ordenamiento
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "apellido") {
      return comparePorApellido(a.nombre_completo, b.nombre_completo);
    }
    if (sortBy === "territorio") {
      return a.distrito_region.localeCompare(b.distrito_region, "es-CL");
    }
    if (sortBy === "partido") {
      return (a.partido_id ?? "").localeCompare(b.partido_id ?? "", "es-CL");
    }
    return a.nombre_completo.localeCompare(b.nombre_completo, "es-CL");
  });

  const visible = sorted.slice(0, visibleCount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Controles de Búsqueda y Filtros */}
      <div
        className="card-flat"
        style={{
          padding: "1.25rem",
          background: "var(--bg-surface-2)",
          borderRadius: 12,
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          {/* Búsqueda */}
          <div style={{ gridColumn: "span 2" }}>
            <label htmlFor="auth-search" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              🔍 Buscar por nombre o territorio
            </label>
            <input
              id="auth-search"
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Ej: Raúl Soto, Boric, Valparaíso, Distrito 10..."
              className="calculator-input"
              style={{ fontSize: "0.85rem", padding: "0.55rem 0.8rem", width: "100%" }}
            />
          </div>

          {/* Filtro Cargo */}
          <div>
            <label htmlFor="auth-cargo" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              🏛️ Cargo
            </label>
            <select
              id="auth-cargo"
              value={cargoFilter}
              onChange={(e) => handleCargoChange(e.target.value)}
              className="calculator-input"
              style={{ fontSize: "0.85rem", padding: "0.55rem 0.8rem", width: "100%" }}
            >
              <option value="Todos">Todos ({POLITICOS_SEED.length})</option>
              <option value="Diputado">Diputados (155)</option>
              <option value="Senador">Senadores (50)</option>
            </select>
          </div>

          {/* Filtro Partido */}
          <div>
            <label htmlFor="auth-partido" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              🚩 Partido
            </label>
            <select
              id="auth-partido"
              value={partidoFilter}
              onChange={(e) => handlePartidoChange(e.target.value)}
              className="calculator-input"
              style={{ fontSize: "0.85rem", padding: "0.55rem 0.8rem", width: "100%" }}
            >
              <option value="Todos">Todos los partidos</option>
              {PARTIDOS_SEED.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.sigla} — {pr.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Región */}
          <div>
            <label htmlFor="auth-region" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              🗺️ Región
            </label>
            <select
              id="auth-region"
              value={regionFilter}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="calculator-input"
              style={{ fontSize: "0.85rem", padding: "0.55rem 0.8rem", width: "100%" }}
            >
              <option value="Todos">Todas las regiones</option>
              {regionesUnicas.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenar */}
          <div>
            <label htmlFor="auth-sort" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              ↕ Ordenar por
            </label>
            <select
              id="auth-sort"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as "apellido" | "nombre" | "partido" | "territorio")}
              className="calculator-input"
              style={{ fontSize: "0.85rem", padding: "0.55rem 0.8rem", width: "100%" }}
            >
              <option value="apellido">Apellido (A-Z)</option>
              <option value="nombre">Nombre (A-Z)</option>
              <option value="partido">Partido (A-Z)</option>
              <option value="territorio">Territorio / Región</option>
            </select>
          </div>
        </div>

        {/* Barra de Estado y Switch de Vista */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-subtle)" }}>
            Mostrando <strong>{sorted.length}</strong> autoridades oficiales
          </div>

          <div style={{ display: "flex", gap: "0.3rem" }}>
            <button
              type="button"
              onClick={() => handleViewModeChange("cards")}
              className="capsule"
              style={{
                cursor: "pointer",
                fontSize: "0.7rem",
                padding: "0.2rem 0.55rem",
                background: viewMode === "cards" ? "var(--accent)" : "var(--bg-surface)",
                color: viewMode === "cards" ? "var(--bg-primary)" : "var(--text-muted)",
                fontWeight: viewMode === "cards" ? 700 : 500,
              }}
            >
              Tarjetas
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              className="capsule"
              style={{
                cursor: "pointer",
                fontSize: "0.7rem",
                padding: "0.2rem 0.55rem",
                background: viewMode === "table" ? "var(--accent)" : "var(--bg-surface)",
                color: viewMode === "table" ? "var(--bg-primary)" : "var(--text-muted)",
                fontWeight: viewMode === "table" ? 700 : 500,
              }}
            >
              Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Resultados en Vista Cards */}
      {viewMode === "cards" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {visible.map((pol) => {
            const partido = PARTIDOS_SEED.find((pr) => pr.id === pol.partido_id);
            return (
              <div
                key={pol.id}
                className="card hover-row"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "1.25rem",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pol.foto_url || "/default-avatar.png"}
                    alt={pol.nombre_completo}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      border: "1.5px solid var(--border)",
                      objectFit: "cover",
                      background: "var(--bg-surface-2)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
                      <span
                        style={{
                          padding: "0.1rem 0.4rem",
                          borderRadius: 4,
                          background: partido ? `${partido.color_hex}22` : "var(--bg-surface-2)",
                          border: `1px solid ${partido?.color_hex ?? "var(--border)"}`,
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          color: partido?.color_hex ?? "var(--text-muted)",
                        }}
                      >
                        {partido?.sigla ?? "IND"}
                      </span>
                      <span className="badge badge-subtle" style={{ fontSize: "0.65rem" }}>
                        {pol.cargo}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: 1.25 }}>
                      {pol.nombre_completo}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginTop: "0.25rem" }}>
                      📍 {pol.distrito_region}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/politico/${getPoliticoSlug(pol)}`}
                  className="btn btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    fontSize: "0.78rem",
                    padding: "0.5rem 0.8rem",
                    textDecoration: "none",
                    width: "100%",
                    fontWeight: 700,
                  }}
                >
                  Ver ficha completa →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Resultados en Vista Tabla */}
      {viewMode === "table" && (
        <div className="table-sticky-col" style={{ overflowX: "auto", background: "var(--bg-surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 640 }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)", textAlign: "left", fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Autoridad</th>
                <th style={{ padding: "0.75rem 0.75rem" }}>Partido</th>
                <th style={{ padding: "0.75rem 0.75rem" }}>Cargo</th>
                <th style={{ padding: "0.75rem 0.75rem" }}>Territorio</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((pol) => {
                const partido = PARTIDOS_SEED.find((pr) => pr.id === pol.partido_id);
                const slug = getPoliticoSlug(pol);
                return (
                  <tr key={pol.id} style={{ borderTop: "1px solid var(--border-subtle)" }} className="hover-row">
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <Link
                        href={`/politico/${slug}`}
                        style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none", color: "inherit" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pol.foto_url || "/default-avatar.png"}
                          alt={pol.nombre_completo}
                          style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }}
                        />
                        <strong style={{ color: "var(--text-primary)" }}>{pol.nombre_completo}</strong>
                      </Link>
                    </td>
                    <td style={{ padding: "0.75rem 0.75rem" }}>
                      <span
                        style={{
                          padding: "0.15rem 0.45rem",
                          borderRadius: 4,
                          background: partido ? `${partido.color_hex}22` : "var(--bg-surface-2)",
                          border: `1px solid ${partido?.color_hex ?? "var(--border)"}`,
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: partido?.color_hex ?? "var(--text-muted)",
                        }}
                      >
                        {partido?.sigla ?? "IND"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 0.75rem" }}>{pol.cargo}</td>
                    <td style={{ padding: "0.75rem 0.75rem", color: "var(--text-subtle)" }}>{pol.distrito_region}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <Link href={`/politico/${slug}`} className="data-link" style={{ fontSize: "0.78rem" }}>
                        Ver ficha →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Botón Cargar Más */}
      {visibleCount < sorted.length && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 30)}
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem", padding: "0.6rem 1.5rem", cursor: "pointer" }}
          >
            Cargar más autoridades ({sorted.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
