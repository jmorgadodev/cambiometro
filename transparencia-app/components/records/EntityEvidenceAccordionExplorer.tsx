"use client";

import { useState, useMemo, useEffect, startTransition } from "react";
import type { EvidenceRecord } from "@/lib/data-contracts";
import { formatMontoConsolidado } from "@/lib/format";

interface Props {
  records: EvidenceRecord[];
  entityName?: string;
  defaultOpenCategory?: string;
  initialQuery?: string;
}

const KIND_ES: Record<string, string> = {
  declaration: "Declaración Patrimonial",
  purchase: "Compra Pública",
  contract: "Contrato",
  expense: "Gasto",
  lobby: "Audiencia Lobby",
  audit: "Auditoría CGR",
  remuneration: "Remuneración",
  authority: "Autoridad",
  budget_execution: "Presupuesto",
  transfer: "Transferencia",
  vote: "Votación",
  attendance: "Asistencia",
};

interface CategoryDefinition {
  id: string;
  label: string;
  icon: string;
  badgeClass: string;
  badgeColor: string;
  match: (r: EvidenceRecord) => boolean;
}

const CATEGORIES: CategoryDefinition[] = [
  {
    id: "probidad",
    label: "Declaraciones de Patrimonio e Intereses (InfoProbidad / CPLT)",
    icon: "📋",
    badgeClass: "badge-ok",
    badgeColor: "var(--ok)",
    match: (r) =>
      r.kind === "declaration" ||
      r.sourceId === "infoprobidad" ||
      (r.title || "").toLowerCase().includes("declaraci"),
  },
  {
    id: "compras",
    label: "Contratos, Compras y Órdenes de Compra (ChileCompra / OCDS)",
    icon: "🛒",
    badgeClass: "badge-warn",
    badgeColor: "var(--warn)",
    match: (r) =>
      r.kind === "purchase" ||
      r.kind === "contract" ||
      r.kind === "expense" ||
      r.sourceId === "chilecompra" ||
      r.sourceId === "mercadopublico" ||
      r.sourceId === "ley19862",
  },
  {
    id: "lobby",
    label: "Audiencias y Gestiones de Lobby (InfoLobby)",
    icon: "🏛️",
    badgeClass: "badge-info",
    badgeColor: "var(--accent)",
    match: (r) =>
      r.kind === "lobby" ||
      r.sourceId === "infolobby" ||
      (r.title || "").toLowerCase().includes("audiencia") ||
      (r.title || "").toLowerCase().includes("lobby"),
  },
  {
    id: "auditorias",
    label: "Auditorías, Dictámenes y Fiscalizaciones (Contraloría - CGR)",
    icon: "⚖️",
    badgeClass: "badge-danger",
    badgeColor: "var(--bad)",
    match: (r) =>
      r.kind === "audit" ||
      r.sourceId === "contraloria" ||
      r.sourceId === "cgr" ||
      (r.title || "").toLowerCase().includes("informe final") ||
      (r.title || "").toLowerCase().includes("investigaci"),
  },
  {
    id: "personal",
    label: "Nómina, Remuneraciones y Personal (Transparencia Activa)",
    icon: "👥",
    badgeClass: "badge-ok",
    badgeColor: "var(--ok)",
    match: (r) =>
      r.kind === "remuneration" ||
      r.kind === "authority" ||
      r.sourceId === "cplt" ||
      r.sourceId === "personal-apoyo",
  },
  {
    id: "presupuesto",
    label: "Presupuesto y Finanzas Públicas (DIPRES / SINIM)",
    icon: "📊",
    badgeClass: "badge-info",
    badgeColor: "var(--info)",
    match: (r) =>
      r.kind === "budget_execution" ||
      r.kind === "transfer" ||
      r.sourceId === "dipres" ||
      r.sourceId === "sinim",
  },
  {
    id: "parlamento",
    label: "Votaciones y Asistencia Parlamentaria (Congreso Nacional)",
    icon: "🏛️",
    badgeClass: "badge-info",
    badgeColor: "var(--accent)",
    match: (r) =>
      r.kind === "vote" ||
      r.kind === "attendance" ||
      r.sourceId === "camara" ||
      r.sourceId === "senado",
  },
  {
    id: "otros",
    label: "Otros Registros Oficiales de Evidencia",
    icon: "📑",
    badgeClass: "badge-info",
    badgeColor: "var(--text-3)",
    match: () => true, // Fallback
  },
];

function formatDate(raw?: string): string {
  if (!raw) return "—";
  const dateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    return `${d}-${m}-${y}`;
  }
  return raw.slice(0, 10);
}

function extractYear(raw?: string): string | null {
  if (!raw) return null;
  const match = raw.match(/(\d{4})/);
  return match ? match[1] : null;
}

function formatCLPAmount(amount?: number | null): string | null {
  if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) return null;
  if (amount > 100_000_000_000) return null;
  return formatMontoConsolidado(amount);
}

export default function EntityEvidenceAccordionExplorer({
  records,
  entityName,
  defaultOpenCategory,
  initialQuery = "",
}: Props) {
  const [search, setSearch] = useState(initialQuery);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  // Estado de acordeones abiertos
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (defaultOpenCategory) {
      initial[defaultOpenCategory] = true;
    } else {
      // Abre por defecto la primera categoría con registros
      initial["probidad"] = true;
      initial["compras"] = true;
    }
    return initial;
  });

  // Deep-link scroll listener a #reg-...
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.startsWith("#reg-")) {
      const regId = hash.replace("#reg-", "");
      const target = records.find((r) => r.id === regId || r.id.includes(regId));
      if (target) {
        for (const cat of CATEGORIES) {
          if (cat.match(target)) {
            startTransition(() => {
              setOpenAccordions((prev) => ({ ...prev, [cat.id]: true }));
            });
            break;
          }
        }
        setTimeout(() => {
          const el = document.getElementById(hash.slice(1));
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.style.boxShadow = "0 0 0 2px var(--accent), 0 0 12px var(--accent)";
            el.style.transition = "box-shadow 0.3s ease";
          }
        }, 200);
      }
    }
  }, [records]);

  // Paginación por acordeón
  const [pageByCategory, setPageByCategory] = useState<Record<string, number>>({});
  const [pageSize, setPageSize] = useState(15);

  const toggleAccordion = (catId: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handlePageChange = (catId: string, newPage: number) => {
    setPageByCategory((prev) => ({
      ...prev,
      [catId]: newPage,
    }));
  };

  // Años disponibles en los registros
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const r of records) {
      const y = extractYear(r.occurredAt ?? r.period?.label ?? r.period?.from ?? undefined);
      if (y) years.add(y);
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [records]);

  // Fuentes involucradas
  const involvedSources = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) {
      if (r.sourceId) s.add(r.sourceId.toUpperCase());
    }
    return [...s].slice(0, 6);
  }, [records]);

  // Filtrado de registros en tiempo real
  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    return records.filter((r) => {
      // Filtro de año
      if (selectedYear !== "all") {
        const y = extractYear(r.occurredAt ?? r.period?.label ?? r.period?.from ?? undefined);
        if (y !== selectedYear) return false;
      }

      // Filtro de texto tolerante por tokens
      if (q) {
        const fullText = `${r.title || ""} ${r.description || ""} ${r.kind || ""} ${r.sourceId || ""} ${JSON.stringify(r.data || {})}`.toLowerCase();
        const exactMatch = fullText.includes(q);
        if (!exactMatch) {
          const tokens = q.split(/[\s·()\-]+/).map((t) => t.trim().toLowerCase()).filter((t) => t.length > 2 && !["de", "del", "la", "el", "los", "las", "y", "en", "por", "para", "con"].includes(t));
          const tokenMatch = tokens.length > 0 && tokens.some((t) => fullText.includes(t));
          if (!tokenMatch) {
            return false;
          }
        }
      }

      return true;
    });
  }, [records, search, selectedYear]);

  // Agrupación de registros por categoría
  const groupedCategories = useMemo(() => {
    const groups: { category: CategoryDefinition; items: EvidenceRecord[] }[] = [];
    const assignedIds = new Set<string>();

    for (const cat of CATEGORIES) {
      if (cat.id === "otros") continue;
      const items = filteredRecords.filter((r) => !assignedIds.has(r.id) && cat.match(r));
      for (const item of items) assignedIds.add(item.id);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }

    // Items no asignados van a "otros"
    const remaining = filteredRecords.filter((r) => !assignedIds.has(r.id));
    if (remaining.length > 0) {
      const otrosCat = CATEGORIES.find((c) => c.id === "otros")!;
      groups.push({ category: otrosCat, items: remaining });
    }

    if (selectedCategoryFilter !== "all") {
      return groups.filter((g) => g.category.id === selectedCategoryFilter);
    }

    return groups;
  }, [filteredRecords, selectedCategoryFilter]);

  const totalFilteredCount = filteredRecords.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* ═══ 1. BARRA DE KPIS RESUMEN ══════════════════════════════════════════ */}
      <section aria-label="Resumen de evidencias">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              Total Registros
            </span>
            <strong style={{ fontSize: "1.35rem", color: "var(--accent)", fontFamily: "monospace" }}>
              {totalFilteredCount.toLocaleString("es-CL")}
            </strong>
          </div>

          <div style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              Años Cubiertos
            </span>
            <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)", fontFamily: "monospace" }}>
              {availableYears.length > 0 ? `${availableYears[availableYears.length - 1]} – ${availableYears[0]}` : "Vigente"}
            </strong>
          </div>

          <div style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              Fuentes Indexadas
            </span>
            <strong style={{ fontSize: "0.88rem", color: "var(--ok)", display: "block", marginTop: "0.2rem" }}>
              {involvedSources.join(", ") || "OFICIALES"}
            </strong>
          </div>

          <div style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              Categorías Activas
            </span>
            <strong style={{ fontSize: "1.35rem", color: "var(--warn)", fontFamily: "monospace" }}>
              {groupedCategories.length} bloques
            </strong>
          </div>
        </div>
      </section>

      {/* ═══ 2. BARRA DE FILTROS Y BÚSQUEDA EN TIEMPO REAL ═══════════════════════ */}
      <section className="card" style={{ padding: "1rem 1.25rem" }} aria-label="Filtros del reporte">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          
          {/* Input de búsqueda */}
          <div style={{ flex: "1 1 240px" }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Buscar por declarante, materia, RUT o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
            />
          </div>

          {/* Selector de Categoría */}
          <div style={{ minWidth: 180 }}>
            <select
              className="input"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              style={{ width: "100%", fontSize: "0.82rem", padding: "0.45rem 0.6rem" }}
            >
              <option value="all">Todas las categorías ({records.length})</option>
              {CATEGORIES.filter((c) => c.id !== "otros").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label.split("(")[0].trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Año */}
          <div style={{ minWidth: 130 }}>
            <select
              className="input"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ width: "100%", fontSize: "0.82rem", padding: "0.45rem 0.6rem" }}
            >
              <option value="all">Todos los años</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Año {y}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de filas por página */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span>Mostrar:</span>
            <select
              className="input"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem" }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Limpiar filtros */}
          {(search || selectedCategoryFilter !== "all" || selectedYear !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategoryFilter("all");
                setSelectedYear("all");
              }}
              className="btn btn-ghost"
              style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", color: "var(--accent)" }}
            >
              Limpiar filtros ✕
            </button>
          )}
        </div>
      </section>

      {/* ═══ 3. DESGLOSE POR CATEGORÍAS (ACORDEONES COLAPSABLES) ════════════════ */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }} aria-label="Categorías colapsables">
        {groupedCategories.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
              No se encontraron registros que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          groupedCategories.map(({ category, items }) => {
            const isOpen = openAccordions[category.id] ?? false;
            const currentPage = pageByCategory[category.id] ?? 1;
            const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
            
            // Paginación estricta: máximo pageSize filas montadas en DOM
            const startIndex = (currentPage - 1) * pageSize;
            const paginatedItems = items.slice(startIndex, startIndex + pageSize);

            return (
              <div
                key={category.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  border: isOpen ? `1px solid ${category.badgeColor}40` : "1px solid var(--border)",
                  transition: "border-color 0.2s ease",
                }}
              >
                {/* Cabecera del acordeón */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(category.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem 1.25rem",
                    background: isOpen ? "var(--bg-surface-2)" : "var(--bg-surface)",
                    border: "none",
                    borderBottom: isOpen ? "1px solid var(--border-subtle)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    gap: "1rem",
                    transition: "background 0.15s ease",
                  }}
                  aria-expanded={isOpen}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "1.2rem" }}>{category.icon}</span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      {category.label}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "999px",
                        background: `${category.badgeColor}20`,
                        color: category.badgeColor,
                        fontWeight: 700,
                        fontFamily: "monospace",
                      }}
                    >
                      {items.length.toLocaleString("es-CL")} {items.length === 1 ? "registro" : "registros"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {isOpen ? "Contraer" : "Desplegar"}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      ▼
                    </span>
                  </div>
                </button>

                {/* Contenido expandible: Tabla compacta paginada */}
                {isOpen && (
                  <div style={{ padding: "0" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-2)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            <th style={{ padding: "0.75rem 1rem", width: 110 }}>Fecha</th>
                            <th style={{ padding: "0.75rem 1rem", minWidth: 200 }}>Persona / Entidad</th>
                            <th style={{ padding: "0.75rem 1rem" }}>Materia / Acto</th>
                            <th style={{ padding: "0.75rem 1rem", textAlign: "right", width: 150 }}>Acción / Origen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedItems.map((r, i) => {
                            const dateStr = formatDate(r.occurredAt ?? r.period?.label ?? r.period?.from ?? undefined);
                            const rawAmount = r.data?.monto_clp ?? r.data?.monto ?? r.data?.remuneracion_bruta;
                            const amountNum = typeof rawAmount === "number" ? rawAmount : (typeof rawAmount === "string" && !isNaN(Number(rawAmount)) ? Number(rawAmount) : null);
                            const amountStr = formatCLPAmount(amountNum);

                            return (
                              <tr
                                key={r.id}
                                id={`reg-${r.id}`}
                                style={{
                                  borderBottom: "1px solid var(--border-subtle)",
                                  background: i % 2 === 0 ? "transparent" : "var(--bg-surface-2)",
                                }}
                              >
                                {/* Columna 1: Fecha */}
                                <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                                  {dateStr}
                                </td>

                                {/* Columna 2: Persona / Entidad */}
                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.85rem" }}>
                                    {r.title || entityName || "Registro Institucional"}
                                  </strong>
                                  <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", display: "block", marginTop: "0.1rem" }}>
                                    {r.sourceId ? `Fuente: ${r.sourceId.toUpperCase()}` : "CPLT"}
                                  </span>
                                </td>

                                {/* Columna 3: Materia / Tipo de Vínculo con Badge contextual */}
                                <td style={{ padding: "0.75rem 1rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
                                    <span
                                      style={{
                                        fontSize: "0.68rem",
                                        padding: "0.15rem 0.45rem",
                                        borderRadius: 4,
                                        background: `${category.badgeColor}20`,
                                        color: category.badgeColor,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {KIND_ES[r.kind] || r.kind}
                                    </span>
                                    {amountNum !== null && amountNum > 100_000_000_000 ? (
                                      <span
                                        className="badge badge-warn"
                                        style={{
                                          fontSize: "0.68rem",
                                          padding: "0.15rem 0.45rem",
                                          borderRadius: 4,
                                          background: "var(--color-warning-bg, var(--surface-2))",
                                          color: "var(--color-warning, var(--text-1))",
                                          border: "1px solid var(--color-warning-border, var(--border))",
                                          fontWeight: 700,
                                        }}
                                        title="Monto en revisión de integridad oficial"
                                      >
                                        ⚠ Monto en revisión de integridad
                                      </span>
                                    ) : amountStr ? (
                                      <strong style={{ fontSize: "0.78rem", color: "var(--ok)", fontFamily: "monospace" }}>
                                        {amountStr}
                                      </strong>
                                    ) : null}
                                  </div>
                                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.4 }}>
                                    {r.description || "Acto registrado y validado en la plataforma de transparencia."}
                                  </p>
                                </td>

                                {/* Columna 4: Botón Ver Registro Oficial */}
                                <td style={{ padding: "0.75rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                                  {r.evidence?.sourceUrl ? (
                                    <a
                                      href={r.evidence.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-ghost"
                                      style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem", color: "var(--accent)" }}
                                    >
                                      Ver Origen ↗
                                    </a>
                                  ) : (
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                                      Verificado ✓
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Controles de paginación compactos */}
                    {totalPages > 1 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.75rem 1.25rem",
                          borderTop: "1px solid var(--border-subtle)",
                          background: "var(--bg-surface-2)",
                          fontSize: "0.78rem",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handlePageChange(category.id, Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="btn btn-ghost"
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.65rem",
                            opacity: currentPage === 1 ? 0.4 : 1,
                            cursor: currentPage === 1 ? "not-allowed" : "pointer",
                          }}
                        >
                          ‹ Anterior
                        </button>

                        <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                          Página <strong style={{ color: "var(--text-primary)" }}>{currentPage}</strong> de {totalPages} ({items.length.toLocaleString("es-CL")} registros)
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePageChange(category.id, Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="btn btn-ghost"
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.3rem 0.65rem",
                            opacity: currentPage === totalPages ? 0.4 : 1,
                            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                          }}
                        >
                          Siguiente ›
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

    </div>
  );
}
