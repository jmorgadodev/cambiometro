"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface KPIs {
  total_monto_clp: number;
  total_transfers: number;
  total_receptores: number;
  total_emisores: number;
}

interface TopEntry {
  name: string;
  rut: string;
  class: string;
  total_clp: number;
  count: number;
  top_emisores?: string[];
}

interface Transfer {
  id: string;
  fecha: string;
  period: string;
  title: string;
  description: string;
  classification: string;
  emitter_name: string;
  emitter_rut: string;
  receiver_name: string;
  receiver_rut: string;
  monto_clp: number;
  url: string;
  municipality?: string;
}

interface Props {
  kpis: KPIs;
  topReceptores: TopEntry[];
  topEmisores: TopEntry[];
  byYear: Record<string, { count: number; total: number }>;
  transfers: Transfer[];
  generatedAt: string;
}

// ── Formateadores ─────────────────────────────────────────────────────────────
function fmtCompact(n: number): string {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000_000)
    return `$${(n / 1_000_000_000_000).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} billones`;
  if (n >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mil MM`;
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toLocaleString("es-CL", {
      maximumFractionDigits: 0,
    })} MM`;
  return `$${n.toLocaleString("es-CL")}`;
}

function fmtNum(n: number): string {
  return (n || 0).toLocaleString("es-CL");
}

function fmtDate(fecha: string): string {
  if (!fecha) return "—";
  const parts = fecha.slice(0, 10).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return fecha;
}

const ITEMS_PER_PAGE = 20;
const YEARS_OPTIONS = ["Todos", "2023", "2024", "2025", "2026"];

export default function TransferenciasExplorerClient({
  kpis,
  topReceptores,
  topEmisores,
  byYear,
  transfers,
  generatedAt,
}: Props) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("Todos");
  const [emisorFilter, setEmisorFilter] = useState("Todos");
  const [page, setPage] = useState(1);

  // Lista única de organismos emisores para el select
  const emisoresOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of topEmisores) if (e.name) set.add(e.name);
    for (const t of transfers) if (t.emitter_name) set.add(t.emitter_name);
    return Array.from(set).sort();
  }, [topEmisores, transfers]);

  // ── Filtrado interactivo en tiempo real (< 200 ms) ───────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transfers.filter((t) => {
      const matchYear =
        yearFilter === "Todos" ||
        t.period === yearFilter ||
        (t.fecha && t.fecha.startsWith(yearFilter));

      const matchEmisor =
        emisorFilter === "Todos" ||
        (t.emitter_name && t.emitter_name.toLowerCase() === emisorFilter.toLowerCase());

      const matchSearch =
        !q ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.receiver_name && t.receiver_name.toLowerCase().includes(q)) ||
        (t.emitter_name && t.emitter_name.toLowerCase().includes(q)) ||
        (t.receiver_rut && t.receiver_rut.toLowerCase().includes(q)) ||
        (t.emitter_rut && t.emitter_rut.toLowerCase().includes(q)) ||
        (t.municipality && t.municipality.toLowerCase().includes(q));

      return matchYear && matchEmisor && matchSearch;
    });
  }, [transfers, search, yearFilter, emisorFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleYearChange = (v: string) => {
    setYearFilter(v);
    setPage(1);
  };

  const handleEmisorChange = (v: string) => {
    setEmisorFilter(v);
    setPage(1);
  };

  // ── Serie anual (4 barras 2023-2026) ─────────────────────────────────────────
  const yearChartData = useMemo(() => {
    const defaultYears = ["2023", "2024", "2025", "2026"];
    return defaultYears.map((yr) => {
      const info = byYear[yr] || { total: 0, count: 0 };
      return {
        label: yr,
        value: info.total,
        count: info.count,
        extra: `${fmtCompact(info.total)} · ${fmtNum(info.count)} transferencias`,
      };
    });
  }, [byYear]);

  const maxYearVal = Math.max(1, ...yearChartData.map((d) => d.value));

  // Max value para barras de receptores y emisores
  const maxReceptorVal = Math.max(1, ...topReceptores.slice(0, 10).map((r) => r.total_clp));
  const maxEmisorVal = Math.max(1, ...topEmisores.slice(0, 10).map((e) => e.total_clp));

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem", background: "var(--bg)", color: "var(--text-1)" }}>
      {/* ═══ 1. HERO HEADER ════════════════════════════════════════════════════ */}
      <section
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "2.5rem 0 1.5rem",
        }}
      >
        <div className="container-main">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span className="live-dot" />
            <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Ley 19.862 · Registros Oficiales de Fondos Públicos
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.75rem, 3.2vw, 2.4rem)",
              fontWeight: 800,
              margin: "0 0 0.5rem",
              color: "var(--text-1)",
            }}
          >
            💸 Transferencias de Fondos Públicos
          </h1>

          <p
            style={{
              fontSize: "0.92rem",
              color: "var(--text-2)",
              maxWidth: "750px",
              lineHeight: 1.6,
              margin: "0 0 1.5rem",
            }}
          >
            Registro oficial de transferencias del Estado de Chile a entidades receptoras bajo la Ley 19.862.
            Explore quién recibe fondos, qué organismo emite y el desglose de montos con trazabilidad por fila a <code>registros19862.gob.cl</code>.
          </p>

          {/* KPIs Principales */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {[
              {
                label: "Monto Total Transado",
                value: fmtCompact(kpis.total_monto_clp),
                sub: "Ley 19.862 · consolidado oficial",
                color: "var(--money)",
              },
              {
                label: "Total Transferencias",
                value: fmtNum(kpis.total_transfers),
                sub: "Registros de transferencias",
                color: "var(--info)",
              },
              {
                label: "Entidades Receptoras",
                value: fmtNum(kpis.total_receptores),
                sub: "Organizaciones e instituciones",
                color: "var(--ok)",
              },
              {
                label: "Organismos Emisores",
                value: fmtNum(kpis.total_emisores),
                sub: "Ministerios, GOREs y Servicios",
                color: "var(--accent)",
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "1rem 1.25rem",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
                  {kpi.label}
                </div>
                <div
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: kpi.color,
                    marginTop: "0.2rem",
                  }}
                >
                  {kpi.value}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: "0.2rem" }}>
                  {kpi.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 2. CUERPO PRINCIPAL ══════════════════════════════════════════════ */}
      <div
        className="container-main"
        style={{
          marginTop: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
        }}
      >
        {/* ── SECCIÓN DE GRÁFICOS: TOP 10 RECEPTORAS Y TOP 10 EMISORES ──────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {/* Top 10 Receptoras */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "1.25rem",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-1)", marginBottom: "0.2rem" }}>
              🏆 Top 10 Entidades Receptoras
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0 0 1rem 0" }}>
              Click en cualquier barra para filtrar el explorador inferior
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {topReceptores.slice(0, 10).map((r, idx) => {
                const pct = (r.total_clp / maxReceptorVal) * 100;
                const isSelected = search.toLowerCase() === r.name.toLowerCase();

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleSearchChange(isSelected ? "" : r.name);
                    }}
                    style={{
                      background: isSelected ? "var(--surface-2)" : "transparent",
                      border: "none",
                      padding: "0.3rem 0.4rem",
                      borderRadius: 4,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      width: "100%",
                    }}
                    title={`Click para filtrar por ${r.name} (${fmtNum(r.count)} transferencias)`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? "var(--accent)" : "var(--text-1)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {idx + 1}. {r.name}
                      </span>
                      <span style={{ color: "var(--money)", fontWeight: 700, flexShrink: 0, fontSize: "0.75rem" }}>
                        {fmtCompact(r.total_clp)}
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div style={{ height: 6, width: "100%", background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(3, pct)}%`,
                          background: isSelected ? "var(--accent)" : "var(--ok)",
                          borderRadius: 3,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top 10 Emisores */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "1.25rem",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-1)", marginBottom: "0.2rem" }}>
              📤 Top 10 Organismos Emisores
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0 0 1rem 0" }}>
              Click en cualquier barra para filtrar el explorador inferior
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {topEmisores.slice(0, 10).map((e, idx) => {
                const pct = (e.total_clp / maxEmisorVal) * 100;
                const isSelected = emisorFilter.toLowerCase() === e.name.toLowerCase();

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      handleEmisorChange(isSelected ? "Todos" : e.name);
                    }}
                    style={{
                      background: isSelected ? "var(--surface-2)" : "transparent",
                      border: "none",
                      padding: "0.3rem 0.4rem",
                      borderRadius: 4,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      width: "100%",
                    }}
                    title={`Click para filtrar por ${e.name} (${fmtNum(e.count)} transferencias)`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", gap: "0.5rem" }}>
                      <span
                        style={{
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? "var(--accent)" : "var(--text-1)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {idx + 1}. {e.name}
                      </span>
                      <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0, fontSize: "0.75rem" }}>
                        {fmtCompact(e.total_clp)}
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div style={{ height: 6, width: "100%", background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(3, pct)}%`,
                          background: isSelected ? "var(--accent)" : "var(--warn)",
                          borderRadius: 3,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SERIE ANUAL 2023-2026 (4 BARRAS) ───────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "1.25rem",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-1)", marginBottom: "0.2rem" }}>
            📅 Serie Anual de Transferencias (2023–2026)
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0 0 1.25rem 0" }}>
            Monto total y volumen de transferencias por año. Click en cualquier barra para filtrar el explorador por ese año.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "0.75rem",
              alignItems: "end",
            }}
          >
            {yearChartData.map((d) => {
              const pct = (d.value / maxYearVal) * 100;
              const isActive = yearFilter === d.label;

              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => handleYearChange(isActive ? "Todos" : d.label)}
                  style={{
                    background: isActive ? "var(--surface-2)" : "transparent",
                    border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                  title={d.extra}
                >
                  <div style={{ fontSize: "0.72rem", color: "var(--money)", fontWeight: 700 }}>
                    {fmtCompact(d.value)}
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "60px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "65%",
                        height: `${Math.max(10, pct)}%`,
                        background: isActive ? "var(--accent)" : "var(--info)",
                        borderRadius: "4px 4px 0 0",
                        transition: "all 0.3s ease",
                      }}
                    />
                  </div>

                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: isActive ? "var(--accent)" : "var(--text-1)" }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-3)" }}>
                    {fmtNum(d.count)} transf.
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── EXPLORADOR DE TRANSFERENCIAS (PRIMERAS 20 FILAS VISIBLES AL CARGAR) ── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "1.25rem",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-1)", marginBottom: "0.2rem" }}>
              🔍 Explorador de Transferencias
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>
              Busque por nombre, RUT, organismo emisor o receptor. Registros trazables con enlace oficial a registros19862.gob.cl.
            </p>
          </div>

          {/* Filtros Toolbar */}
          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            {/* Input de Búsqueda */}
            <div style={{ flex: "1 1 240px", minWidth: 200 }}>
              <input
                type="search"
                placeholder="🔍 Buscar por nombre, RUT, organismo..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-1)",
                  fontSize: "0.82rem",
                }}
              />
            </div>

            {/* Select Año */}
            <select
              value={yearFilter}
              onChange={(e) => handleYearChange(e.target.value)}
              style={{
                padding: "0.45rem 0.65rem",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-1)",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {YEARS_OPTIONS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr === "Todos" ? "Año: Todos" : `Año ${yr}`}
                </option>
              ))}
            </select>

            {/* Select Organismo Emisor */}
            <select
              value={emisorFilter}
              onChange={(e) => handleEmisorChange(e.target.value)}
              style={{
                padding: "0.45rem 0.65rem",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-1)",
                fontSize: "0.8rem",
                cursor: "pointer",
                maxWidth: 240,
              }}
            >
              <option value="Todos">Emisor: Todos</option>
              {emisoresOptions.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>

            {/* Botón para limpiar filtros */}
            {(search || yearFilter !== "Todos" || emisorFilter !== "Todos") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setYearFilter("Todos");
                  setEmisorFilter("Todos");
                  setPage(1);
                }}
                style={{
                  padding: "0.4rem 0.65rem",
                  fontSize: "0.75rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-2)",
                  cursor: "pointer",
                }}
              >
                ✕ Limpiar filtros
              </button>
            )}
          </div>

          {/* Contador de resultados */}
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-3)",
              marginBottom: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span>
              Mostrando <strong>{Math.min(ITEMS_PER_PAGE, filtered.length)}</strong> de <strong>{fmtNum(filtered.length)}</strong> registros · página {page} de {totalPages}
            </span>
          </div>

          {/* TABLA LIMPIA (HAIRLINES, SIN CHIPS PESADOS) */}
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--surface-2)",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-3)",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "0.6rem 0.75rem" }}>Fecha</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Organismo Emisor</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Entidad Receptora</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Materia / Programa</th>
                  <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Monto</th>
                  <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Fuente</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "3rem 1.5rem",
                        textAlign: "center",
                        color: "var(--text-2)",
                      }}
                    >
                      🔍 No se encontraron transferencias con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginated.map((t, i) => (
                    <tr
                      key={t.id || i}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        verticalAlign: "middle",
                      }}
                    >
                      {/* Fecha */}
                      <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap", fontSize: "0.78rem", color: "var(--text-2)" }}>
                        {fmtDate(t.fecha)}
                      </td>

                      {/* Organismo Emisor */}
                      <td style={{ padding: "0.6rem 0.75rem", maxWidth: 220 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", lineHeight: 1.3 }}>
                          {t.emitter_name || "Organismo Público"}
                        </div>
                        {t.emitter_rut && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                            RUT: {t.emitter_rut}
                          </div>
                        )}
                      </td>

                      {/* Entidad Receptora */}
                      <td style={{ padding: "0.6rem 0.75rem", maxWidth: 240 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", lineHeight: 1.3 }}>
                          {t.receiver_name || "Entidad Receptora"}
                        </div>
                        {t.receiver_rut && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                            RUT: {t.receiver_rut}
                          </div>
                        )}
                      </td>

                      {/* Materia / Programa */}
                      <td style={{ padding: "0.6rem 0.75rem", maxWidth: 280, color: "var(--text-2)", lineHeight: 1.3 }}>
                        <div>{t.title || t.description || "Transferencia Corriente"}</div>
                        {t.classification && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                            {t.classification}
                          </div>
                        )}
                      </td>

                      {/* Monto (--money) */}
                      <td
                        style={{
                          padding: "0.6rem 0.75rem",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--money)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ${(t.monto_clp || 0).toLocaleString("es-CL")}
                      </td>

                      {/* Fuente ↗ */}
                      <td style={{ padding: "0.6rem 0.75rem", textAlign: "center", whiteSpace: "nowrap" }}>
                        <a
                          href={t.url || `https://registros19862.gob.cl/transferencia/${t.id.replace("ley-19862-transfer-", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--accent)",
                            textDecoration: "underline",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                          }}
                          title="Ver registro oficial en registros19862.gob.cl"
                        >
                          registros19862.gob.cl ↗
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: page <= 1 ? "var(--text-3)" : "var(--text-1)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Anterior
              </button>

              <span style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: page >= totalPages ? "var(--text-3)" : "var(--text-1)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>

        {/* ═══ 3. NOTA METODOLÓGICA ══════════════════════════════════════════ */}
        <section
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "1.25rem",
            fontSize: "0.82rem",
            color: "var(--text-2)",
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--text-1)", marginBottom: "0.35rem" }}>
            📌 Marco Legal y Metodología (Ley 19.862)
          </div>
          <p style={{ margin: "0 0 0.5rem 0" }}>
            La <strong>Ley 19.862</strong> establece el Registro Central de Personas Jurídicas Receptoras de Fondos Públicos de Chile.
            Todos los órganos de la Administración del Estado deben registrar las transferencias que efectúen a personas jurídicas que postulen a recibir fondos públicos.
          </p>
          <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-3)" }}>
            * Fuente de datos: Catálogo oficial de <code>registros19862.gob.cl</code>. Montos expresados en Pesos Chilenos (CLP). Actualización periódica vía ETL automatizado.
          </p>
        </section>
      </div>
    </div>
  );
}
