"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { formatCLP, formatMontoConsolidado } from "@/lib/format";
import type { CrossEdge, EvidenceRecord } from "@/lib/data-contracts";
import CrucesDetailDrawer from "./CrucesDetailDrawer";
import {
  traducirPredicado,
  traducirTipoEntidad,
  formatearFuenteYConfianza,
  formatNombreInstitucional,
  DICCIONARIO_CRUCES_ES,
} from "@/lib/diccionario-cruces";

interface Props {
  initialRows: CrossEdge[];
  initialQuery?: string;
  initialRowsPerPage?: number;
}

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const PRESET_CRUCES = [
  {
    id: "lobby-compras",
    icon: "🤝",
    title: "Proveedores y Lobby",
    subtitle: "ChileCompra OCDS + Audiencias Ley 20.730",
    query: "chilecompra",
    chip: "Compras",
    tag: "Compras y Audiencias",
  },
  {
    id: "personal-apoyo",
    icon: "👥",
    title: "Asesorías Parlamentarias",
    subtitle: "Personal de Apoyo en Cámara de Diputados y Senado",
    query: "camara",
    chip: "Votaciones",
    tag: "Congreso Nacional",
  },
  {
    id: "ley-19862",
    icon: "📑",
    title: "Transferencias Ley 19.862",
    subtitle: "Aportes fiscales a entidades receptoras privadas",
    query: "transferencia",
    chip: "Transferencias",
    tag: "Hacienda y Fondos",
  },
  {
    id: "contraloria-munis",
    icon: "🔍",
    title: "Auditorías CGR y Municipios",
    subtitle: "Informes de fiscalización de Contraloría en comunas",
    query: "contraloria",
    chip: "Auditorías",
    tag: "Control y CGR",
  },
];

export const CHIPS_CONFIG = [
  { id: "todos", label: "Todos los tipos", icon: "🌐" },
  { id: "Compras", label: "Compras Públicas", icon: "🛒" },
  { id: "Lobby", label: "Audiencias InfoLobby", icon: "🤝" },
  { id: "Transferencias", label: "Transferencias Ley 19.862", icon: "📑" },
  { id: "Auditorías", label: "Auditorías CGR", icon: "⚖️" },
  { id: "Declaraciones", label: "Declaraciones InfoProbidad", icon: "📋" },
  { id: "Votaciones", label: "Votaciones Congreso", icon: "🏛️" },
];

export function getTipoCruceBadge(row: CrossEdge): {
  tipo: string;
  badgeClass: string;
} {
  const sourceIds = (row.fromEntity.sourceIds || [])
    .concat(row.toEntity.sourceIds || [])
    .concat(row.evidence.map((e) => e.sourceId));
  const pred = row.relation.predicate.toLowerCase();
  const sourcesJoined = sourceIds.join(" ").toLowerCase();

  if (sourcesJoined.includes("contraloria") || pred.includes("audit")) {
    return { tipo: "Auditorías CGR", badgeClass: "badge-warn" };
  }
  if (sourcesJoined.includes("infoprobidad") || pred.includes("declaration")) {
    return { tipo: "Declaraciones", badgeClass: "badge-neutral" };
  }
  if (
    sourcesJoined.includes("chilecompra") ||
    pred.includes("contract") ||
    pred.includes("purchase") ||
    pred.includes("awarded")
  ) {
    return { tipo: "Compras Públicas", badgeClass: "badge-ok" };
  }
  if (sourcesJoined.includes("infolobby") || pred.includes("lobby")) {
    return { tipo: "Audiencias InfoLobby", badgeClass: "badge-accent" };
  }
  if (
    sourcesJoined.includes("ley-19862") ||
    sourcesJoined.includes("transfer") ||
    pred.includes("transfer")
  ) {
    return { tipo: "Transferencias", badgeClass: "badge-info" };
  }
  if (
    sourcesJoined.includes("camara") ||
    sourcesJoined.includes("senado") ||
    pred.includes("vote") ||
    pred.includes("mandate") ||
    pred.includes("office") ||
    pred.includes("cast")
  ) {
    return { tipo: "Votaciones", badgeClass: "badge-brand" };
  }
  return { tipo: "Cruce Institucional", badgeClass: "badge-neutral" };
}

export default function CrucesExplorerClient({
  initialRows,
  initialQuery = "",
  initialRowsPerPage = DEFAULT_PAGE_SIZE,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedChip, setSelectedChip] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [selectedCross, setSelectedCross] = useState<CrossEdge | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const r = Number(urlParams.get("rows"));
      if (r === 10 || r === 25 || r === 50) return r;
    }
    return initialRowsPerPage === 25 || initialRowsPerPage === 50 ? initialRowsPerPage : DEFAULT_PAGE_SIZE;
  });
  const [isPending, startTransition] = useTransition();

  // Conteo reactivo por Chip sobre el universo total
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {
      todos: initialRows.length,
      Auditorías: 0,
      Declaraciones: 0,
      Compras: 0,
      Lobby: 0,
      Transferencias: 0,
      Votaciones: 0,
    };
    for (const row of initialRows) {
      const sourceIds = (row.fromEntity.sourceIds || [])
        .concat(row.toEntity.sourceIds || [])
        .concat(row.evidence.map((e) => e.sourceId));
      const pred = row.relation.predicate.toLowerCase();
      const sourcesJoined = sourceIds.join(" ").toLowerCase();

      if (sourcesJoined.includes("contraloria") || pred.includes("audit")) {
        counts.Auditorías++;
      }
      if (sourcesJoined.includes("infoprobidad") || pred.includes("declaration")) {
        counts.Declaraciones++;
      }
      if (
        sourcesJoined.includes("chilecompra") ||
        pred.includes("contract") ||
        pred.includes("purchase") ||
        pred.includes("awarded")
      ) {
        counts.Compras++;
      }
      if (sourcesJoined.includes("infolobby") || pred.includes("lobby")) {
        counts.Lobby++;
      }
      if (
        sourcesJoined.includes("ley-19862") ||
        sourcesJoined.includes("transfer") ||
        pred.includes("transfer")
      ) {
        counts.Transferencias++;
      }
      if (
        sourcesJoined.includes("camara") ||
        sourcesJoined.includes("senado") ||
        pred.includes("vote") ||
        pred.includes("mandate") ||
        pred.includes("office") ||
        pred.includes("cast")
      ) {
        counts.Votaciones++;
      }
    }
    return counts;
  }, [initialRows]);

  // Filtrado y ordenamiento reactivo en cliente con búsqueda y chips
  const filteredRows = useMemo(() => {
    let rows = initialRows;

    // Filtro por Chip
    if (selectedChip !== "todos") {
      rows = rows.filter((row) => {
        const sourceIds = (row.fromEntity.sourceIds || [])
          .concat(row.toEntity.sourceIds || [])
          .concat(row.evidence.map((e) => e.sourceId));
        const pred = row.relation.predicate.toLowerCase();
        const sourcesJoined = sourceIds.join(" ").toLowerCase();

        if (selectedChip === "Auditorías") {
          return sourcesJoined.includes("contraloria") || pred.includes("audit");
        }
        if (selectedChip === "Declaraciones") {
          return sourcesJoined.includes("infoprobidad") || pred.includes("declaration");
        }
        if (selectedChip === "Compras") {
          return sourcesJoined.includes("chilecompra") || pred.includes("contract") || pred.includes("purchase") || pred.includes("awarded");
        }
        if (selectedChip === "Lobby") {
          return sourcesJoined.includes("infolobby") || pred.includes("lobby");
        }
        if (selectedChip === "Transferencias") {
          return sourcesJoined.includes("ley-19862") || sourcesJoined.includes("transfer") || pred.includes("transfer");
        }
        if (selectedChip === "Votaciones") {
          return sourcesJoined.includes("camara") || sourcesJoined.includes("senado") || pred.includes("vote") || pred.includes("mandate") || pred.includes("office") || pred.includes("cast");
        }
        return true;
      });
    }

    // Filtro por Texto
    const q = query.toLowerCase().trim();
    if (q) {
      rows = rows.filter((row) => {
        const fromName = row.fromEntity.name.toLowerCase();
        const toName = row.toEntity.name.toLowerCase();
        const pred = traducirPredicado(row.relation.predicate).toLowerCase();
        const evidenceMatches = row.evidence.some(
          (e: EvidenceRecord) =>
            e.title.toLowerCase().includes(q) ||
            (e.description && e.description.toLowerCase().includes(q))
        );
        return fromName.includes(q) || toName.includes(q) || pred.includes(q) || evidenceMatches;
      });
    }

    // Ordenamiento por monto consolidado desc con Lobby+Ventas al inicio
    return [...rows].sort((a, b) => {
      const hasLobbyAndSalesA =
        (a.evidence.some((e) => e.sourceId === "chilecompra" || e.kind === "contract") &&
          a.evidence.some((e) => e.sourceId === "infolobby" || e.kind === "lobby")) ||
        a.relation.id.includes("lobby-ventas");
      const hasLobbyAndSalesB =
        (b.evidence.some((e) => e.sourceId === "chilecompra" || e.kind === "contract") &&
          b.evidence.some((e) => e.sourceId === "infolobby" || e.kind === "lobby")) ||
        b.relation.id.includes("lobby-ventas");

      if (hasLobbyAndSalesA && !hasLobbyAndSalesB) return -1;
      if (!hasLobbyAndSalesA && hasLobbyAndSalesB) return 1;

      const montoA = Math.max(
        ...a.evidence.map((e) => e.amount?.amountClp || 0),
        Number(a.fromEntity.attributes?.monto_total_clp || a.fromEntity.attributes?.total_adjudicado_clp || 0),
        Number(a.toEntity.attributes?.monto_total_clp || a.toEntity.attributes?.total_adjudicado_clp || 0),
      );
      const montoB = Math.max(
        ...b.evidence.map((e) => e.amount?.amountClp || 0),
        Number(b.fromEntity.attributes?.monto_total_clp || b.fromEntity.attributes?.total_adjudicado_clp || 0),
        Number(b.toEntity.attributes?.monto_total_clp || b.toEntity.attributes?.total_adjudicado_clp || 0),
      );

      if (montoB !== montoA) {
        return montoB - montoA;
      }
      const dateA = a.evidence[0]?.occurredAt || a.relation.period?.from || "";
      const dateB = b.evidence[0]?.occurredAt || b.relation.period?.from || "";
      return dateB.localeCompare(dateA);
    });
  }, [initialRows, selectedChip, query]);

  // Aplicar Preset con scroll suave a la tabla
  const handleApplyPreset = (preset: typeof PRESET_CRUCES[0]) => {
    if (activePreset === preset.id) {
      setActivePreset(null);
      setQuery("");
      setSelectedChip("todos");
    } else {
      setActivePreset(preset.id);
      setQuery(preset.query);
      setSelectedChip(preset.chip);
    }
    setPage(1);

    const el = document.getElementById("tabla-cruces-explorador");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newSize === DEFAULT_PAGE_SIZE) {
        url.searchParams.delete("rows");
      } else {
        url.searchParams.set("rows", String(newSize));
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setPage(1);
  };

  const handleChipSelect = (chipId: string) => {
    setSelectedChip(chipId);
    setPage(1);
  };

  // Apertura instantánea de drawer con skeleton < 100ms
  const handleOpenDrawer = (row: CrossEdge) => {
    setLoadingRowId(row.relation.id);
    setDrawerLoading(true);
    setSelectedCross(row);

    // Animación suave y transición a datos
    setTimeout(() => {
      setDrawerLoading(false);
      setLoadingRowId(null);
    }, 60);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ─── 1. CRUCES DESTACADOS (PRESETS) ─────────────────────────────────── */}
      <section aria-label="Cruces destacados predeterminados">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              🎯 Cruces Destacados de Alto Interés
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
              Patrones investigativos preconfigurados: haz clic para aplicar el filtro y navegar directamente a los registros.
            </p>
          </div>
          {activePreset && (
            <button
              type="button"
              onClick={() => {
                setActivePreset(null);
                setQuery("");
                setSelectedChip("todos");
                setPage(1);
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "0.75rem" }}
            >
              Restablecer filtros ✕
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {PRESET_CRUCES.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className="card hover-row"
                style={{
                  padding: "1.1rem",
                  cursor: "pointer",
                  border: isActive ? "2px solid var(--accent)" : "1px solid var(--border)",
                  background: isActive ? "var(--info-bg)" : "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.45rem",
                  transition: "all 0.15s ease",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.5rem" }}>{preset.icon}</span>
                  <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>{preset.tag}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  {preset.title}
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {preset.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 2. EXPLORADOR ÚNICO (BÚSQUEDA + CHIPS + TOGGLE TABLA/GRAFO) ────── */}
      <section id="tabla-cruces-explorador" aria-label="Explorador único de cruces">
        <div
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {/* Nota visible obligatoria: Muestra indexada vs Universo Canónico */}
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--bg-surface-2)",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              fontSize: "0.82rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <div>
              📌 <strong>Muestra indexada:</strong> {filteredRows.length.toLocaleString("es-CL")} relaciones (orden por monto/fecha) · los totales por fuente corresponden al universo oficial en{" "}
              <Link href="/datos/calidad" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
                /datos/calidad
              </Link>
            </div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.78rem" }}>
              Pág. {currentPage} de {totalPages}
            </div>
          </div>

          {/* Fila superior: Input de búsqueda y Toggle Vista */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ flex: "1 1 300px" }}>
              <input
                type="search"
                className="input"
                placeholder="Buscar por organismo, autoridad, proveedor o palabra clave..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                style={{ width: "100%", fontSize: "0.9rem", padding: "0.65rem 0.9rem" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                {filteredRows.length.toLocaleString("es-CL")} relaciones · Pág. {currentPage} de {totalPages}
              </span>

              {/* Selector de Vista Secundaria Tabla | Grafo */}
              <div
                style={{
                  display: "flex",
                  background: "var(--bg-surface-2)",
                  padding: "0.2rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: viewMode === "table" ? 800 : 500,
                    background: viewMode === "table" ? "var(--bg-surface)" : "transparent",
                    color: viewMode === "table" ? "var(--accent)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  📊 Vista Tabla
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("graph")}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: viewMode === "graph" ? 800 : 500,
                    background: viewMode === "graph" ? "var(--bg-surface)" : "transparent",
                    color: viewMode === "graph" ? "var(--accent)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  🕸️ Vista Grafo
                </button>
              </div>
            </div>
          </div>

          {/* Fila de Chips por Tipo de Cruce con Conteo Visible */}
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
            {CHIPS_CONFIG.map((chip) => {
              const isSelected = selectedChip === chip.id;
              const count = chipCounts[chip.id] || 0;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleChipSelect(chip.id)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: 999,
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    background: isSelected ? "var(--accent)" : "var(--bg-surface-2)",
                    color: isSelected ? "var(--bg-surface)" : "var(--text-primary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {chip.icon} {chip.label} ({count.toLocaleString("es-CL")})
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── VISTA 1: TABLA PAGINADA A 20 CON COLUMNAS EN ESPAÑOL ────────────── */}
        {viewMode === "table" && (
          <div style={{ marginTop: "1rem" }}>
            <div className="card" style={{ padding: 0, overflow: "hidden", background: "var(--surface)", borderColor: "var(--border)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>Entidad Origen</th>
                      <th style={{ padding: "0.75rem 0.85rem" }}>Relación Documentada</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Entidad Destino</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Evidencia Oficial</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Fuente y Confianza</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                          No se encontraron cruces documentales para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => {
                        const isLoadingThis = loadingRowId === row.relation.id;
                        const tipoInfo = getTipoCruceBadge(row);
                        const sourceInfo = formatearFuenteYConfianza(
                          row.evidence[0]?.sourceId,
                          row.relation.reconciliation?.method,
                          row.relation.reconciliation?.confidence
                        );

                        const hasLobbyAndSales =
                          (row.evidence.some((e) => e.sourceId === "chilecompra" || e.kind === "contract") &&
                            row.evidence.some((e) => e.sourceId === "infolobby" || e.kind === "lobby")) ||
                          row.relation.id.includes("lobby-ventas");

                        const rowAmount =
                          row.totalAmountClp ||
                          Math.max(...row.evidence.map((e) => e.amount?.amountClp || 0), 0);

                        return (
                          <tr
                            key={row.relation.id}
                            onClick={() => handleOpenDrawer(row)}
                            className="hover-row"
                            style={{
                              borderBottom: "1px solid var(--border-subtle)",
                              cursor: "pointer",
                              transition: "background 0.1s ease",
                              contentVisibility: "auto",
                              containIntrinsicSize: "auto 54px",
                            }}
                          >
                            {/* 1. Entidad Origen */}
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ fontWeight: 700, color: "var(--text-primary)" }} title={row.fromEntity.name}>
                                {formatNombreInstitucional(row.fromEntity.name).display}
                              </div>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "0.15rem" }}>
                                {traducirTipoEntidad(row.fromEntity.kind)}
                              </span>
                            </td>

                            {/* 2. Tipo de Relación y Badges de Categoría */}
                            <td style={{ padding: "0.85rem 0.85rem", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center" }}>
                                  <span className={`badge ${tipoInfo.badgeClass}`} style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.18rem 0.5rem" }}>
                                    {tipoInfo.tipo}
                                  </span>
                                  {hasLobbyAndSales && (
                                    <span className="badge badge-warn" style={{ fontSize: "0.66rem", fontWeight: 800, padding: "0.15rem 0.45rem" }}>
                                      ⚡ LOBBY + VENTAS
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: "0.76rem", color: "var(--text-primary)", fontWeight: 600 }}>
                                  {traducirPredicado(row.relation.predicate)}
                                </span>
                              </div>
                            </td>

                            {/* 3. Entidad Destino */}
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ fontWeight: 700, color: "var(--text-primary)" }} title={row.toEntity.name}>
                                {formatNombreInstitucional(row.toEntity.name).display}
                              </div>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "0.15rem" }}>
                                {traducirTipoEntidad(row.toEntity.kind)}
                              </span>
                            </td>

                            {/* 4. Evidencia Documental Oficial y Monto */}
                            <td style={{ padding: "0.85rem 1rem", maxWidth: 260 }}>
                              {row.evidence.slice(0, 1).map((record) => (
                                <div key={record.id}>
                                  <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 600, display: "block", lineHeight: 1.3 }}>
                                    {record.title}
                                  </span>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                                    {rowAmount > 0 && (
                                      <span className="badge badge-ok" style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                                        {formatMontoConsolidado(rowAmount)}
                                      </span>
                                    )}
                                    {record.evidence?.sourceUrl && (
                                      <a
                                        href={record.evidence.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ fontSize: "0.7rem", color: "var(--accent)", textDecoration: "none" }}
                                      >
                                        Documento oficial ↗
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {row.evidence.length > 1 && (
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginTop: "0.2rem" }}>
                                  +{row.evidence.length - 1} registro(s) adicional(es)
                                </span>
                              )}
                            </td>

                            {/* 5. Fuente y Confianza */}
                            <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                              <strong style={{ display: "block", fontSize: "0.78rem", color: "var(--text-primary)" }}>
                                {sourceInfo.nombre}
                              </strong>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", fontFamily: "var(--font-mono, monospace)" }}>
                                {sourceInfo.detalle}
                              </span>
                            </td>

                            {/* 6. Botón Ver Detalle */}
                            <td style={{ padding: "0.85rem 1rem", textAlign: "center", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDrawer(row);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.3rem 0.65rem",
                                  borderRadius: 6,
                                  fontWeight: 600,
                                }}
                              >
                                {isLoadingThis ? "Abriendo..." : "Ver detalle →"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginador y Selector de Filas por página */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.25rem",
                  borderTop: "1px solid var(--border)",
                  background: "var(--bg-surface-2)",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                {/* Izquierda: Info de rango + Selector de Filas (10 / 25 / 50) */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} de {filteredRows.length.toLocaleString("es-CL")} relaciones
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span style={{ fontWeight: 600 }}>Filas por página:</span>
                    {PAGE_SIZE_OPTIONS.map((size) => {
                      const isActive = pageSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handlePageSizeChange(size)}
                          style={{
                            padding: "0.2rem 0.55rem",
                            fontSize: "0.75rem",
                            fontWeight: isActive ? 800 : 500,
                            borderRadius: 6,
                            border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                            background: isActive ? "var(--accent)" : "var(--bg-surface)",
                            color: isActive ? "var(--bg-surface)" : "var(--text-muted)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Derecha: Paginador («, ‹, Página X de Y, ›, ») */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(1)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.72rem", opacity: currentPage <= 1 ? 0.4 : 1 }}
                      title="Primera página"
                    >
                      « Primera
                    </button>
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.72rem", opacity: currentPage <= 1 ? 0.4 : 1 }}
                      title="Página anterior"
                    >
                      ‹ Anterior
                    </button>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "0 0.4rem", color: "var(--text-primary)" }}>
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(currentPage + 1)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.72rem", opacity: currentPage >= totalPages ? 0.4 : 1 }}
                      title="Página siguiente"
                    >
                      Siguiente ›
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(totalPages)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.72rem", opacity: currentPage >= totalPages ? 0.4 : 1 }}
                      title="Última página"
                    >
                      Última »
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── VISTA 2: GRAFO RELACIONAL SECUNDARIO ────────────────────────────── */}
        {viewMode === "graph" && (
          <div style={{ marginTop: "1rem" }}>
            <div className="card" style={{ padding: "1.5rem", background: "var(--surface)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
                🕸️ Mapa Relacional Interactivo
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 1.25rem" }}>
                Nodos y aristas conciliados entre compradores públicos, autoridades, receptores de transferencias e informes de control.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "1rem",
                }}
              >
                {paginatedRows.slice(0, 12).map((row) => (
                  <div
                    key={row.relation.id}
                    onClick={() => handleOpenDrawer(row)}
                    className="card hover-row"
                    style={{
                      padding: "1rem",
                      border: "1px solid var(--border)",
                      background: "var(--bg-surface-2)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
                        {traducirPredicado(row.relation.predicate)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                        {row.evidence.length} evidencia(s)
                      </span>
                    </div>

                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {row.fromEntity.name}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--accent)", textAlign: "center" }}>
                      ↓ {traducirPredicado(row.relation.predicate).toLowerCase()} ↓
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {row.toEntity.name}
                    </div>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: "0.72rem", padding: "0.25rem 0.5rem", marginTop: "0.3rem", width: "100%" }}
                    >
                      Ver detalle del cruce →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── DRAWER LATERAL DE DETALLE ───────────────────────────────────────── */}
      <CrucesDetailDrawer
        cross={selectedCross}
        isLoading={drawerLoading}
        onClose={() => {
          setSelectedCross(null);
          setDrawerLoading(false);
          setLoadingRowId(null);
        }}
      />
    </div>
  );
}
