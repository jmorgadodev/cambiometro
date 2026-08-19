"use client";

import { useState } from "react";
import { POLITICOS_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import { comparePorApellido } from "@/lib/format";

export default function PoliticosExplorer() {
  const [search, setSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("Todos");
  const [partidoFilter, setPartidoFilter] = useState<string>("Todos");
  const [sortBy, setSortBy] = useState<"apellido" | "nombre" | "region" | "partido">("apellido");
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Filtrado
  const filtered = POLITICOS_SEED.filter((pol) => {
    const matchSearch =
      pol.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      pol.distrito_region.toLowerCase().includes(search.toLowerCase());

    const matchCargo = cargoFilter === "Todos" || pol.cargo === cargoFilter;
    const matchPartido = partidoFilter === "Todos" || pol.partido_id === partidoFilter;

    return matchSearch && matchCargo && matchPartido;
  });

  // Ordenamiento
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "apellido") {
      return comparePorApellido(a.nombre_completo, b.nombre_completo);
    }
    if (sortBy === "region") {
      return a.distrito_region.localeCompare(b.distrito_region, "es-CL");
    }
    if (sortBy === "partido") {
      return (a.partido_id ?? "").localeCompare(b.partido_id ?? "", "es-CL");
    }
    return a.nombre_completo.localeCompare(b.nombre_completo, "es-CL");
  });

  const visiblePoliticos = sorted.slice(0, visibleCount);

  return (
    <div>
      {/* Controles de Búsqueda y Filtros */}
      <div
        className="card-flat"
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          {/* Búsqueda */}
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              Buscar Político / Región
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: Gabriel Boric, UDI, RM..."
              className="calculator-input"
              style={{ fontSize: "0.875rem", padding: "0.6rem 0.875rem" }}
            />
          </div>

          {/* Filtro Cargo */}
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              Filtrar por Cargo
            </label>
            <select
              value={cargoFilter}
              onChange={(e) => setCargoFilter(e.target.value)}
              className="calculator-input"
              style={{ fontSize: "0.875rem", padding: "0.6rem 0.875rem" }}
            >
              <option value="Todos">Todos (155 Dip. + 50 Sen.)</option>
              <option value="Diputado">Solo Diputados (155)</option>
              <option value="Senador">Solo Senadores (50)</option>
            </select>
          </div>

          {/* Filtro Partido */}
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              Filtrar por Partido
            </label>
            <select
              value={partidoFilter}
              onChange={(e) => setPartidoFilter(e.target.value)}
              className="calculator-input"
              style={{ fontSize: "0.875rem", padding: "0.6rem 0.875rem" }}
            >
              <option value="Todos">Todos los partidos (12)</option>
              {PARTIDOS_SEED.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sigla} — {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenar */}
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", display: "block" }}>
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="calculator-input"
              style={{ fontSize: "0.875rem", padding: "0.6rem 0.875rem" }}
            >
              <option value="apellido">🔤 Apellido (A-Z)</option>
              <option value="nombre">🔤 Nombre (A-Z)</option>
              <option value="region">🗺️ Región y Distrito</option>
              <option value="partido">🏛️ Partido Político</option>
            </select>
          </div>
        </div>

        {/* Counter Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "0.75rem",
          }}
        >
          <span>
            Mostrando <strong>{visiblePoliticos.length}</strong> de <strong>{sorted.length}</strong> autoridades encontradas (Total: {POLITICOS_SEED.length})
          </span>
          {(search || cargoFilter !== "Todos" || partidoFilter !== "Todos") && (
            <button
              onClick={() => {
                setSearch("");
                setCargoFilter("Todos");
                setPartidoFilter("Todos");
              }}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}
            >
              Restablecer filtros ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid de Tarjetas de Políticos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {visiblePoliticos.map((pol) => {
          const partido = PARTIDOS_SEED.find((p) => p.id === pol.partido_id);

          return (
            <a
              key={pol.id}
              href={`/politico/${getPoliticoSlug(pol)}`}
              className="card"
              style={{ textDecoration: "none", display: "block" }}
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                {/* Avatar: emblema del partido (foto local estable) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pol.foto_url}
                  alt={pol.nombre_completo}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "2px solid var(--border)",
                    background: "var(--surface-2)",
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: "var(--text-primary)",
                      marginBottom: "0.3rem",
                      lineHeight: 1.3,
                      wordBreak: "break-word",
                    }}
                  >
                    {pol.nombre_completo}
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 99,
                        background: partido?.color_hex ? `${partido.color_hex}22` : "var(--info-bg)",
                        color: partido?.color_hex ?? "var(--accent)",
                        border: `1px solid ${partido?.color_hex ?? "var(--border)"}`,
                        fontWeight: 700,
                      }}
                    >
                      {partido?.sigla ?? "IND"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                      {pol.cargo} · {pol.distrito_region.replace("Región ", "")}
                    </span>
                  </div>

                  {/* Métricas de probidad: pendientes (datos reales ETL) */}
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-3)",
                      marginTop: "0.5rem",
                      paddingTop: "0.5rem",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    Ficha oficial de transparencia parlamentaria
                  </div>
                </div>
              </div>

            </a>
          );
        })}
      </div>

      {/* Cargar Más */}
      {visibleCount < sorted.length && (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={() => setVisibleCount((prev) => prev + 24)}
            className="btn btn-primary"
            style={{ padding: "0.875rem 2.5rem", fontSize: "0.95rem" }}
          >
            Cargar más autoridades ({sorted.length - visibleCount} restantes) ↓
          </button>
        </div>
      )}
    </div>
  );
}
