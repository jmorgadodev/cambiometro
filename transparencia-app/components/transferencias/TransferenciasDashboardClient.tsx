"use client";

import { useState, useMemo } from "react";
import Link from "@/components/SiteLink";
import type { Ley19862Summary, ReceptorResumen, EmisorResumen, TransferenciaDetalle } from "@/lib/transferencias-data";

interface Props {
  summary: Ley19862Summary;
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCLP(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    return `$${(amount / 1_000_000_000_000).toLocaleString("es-CL", { maximumFractionDigits: 2 })} billones`;
  }
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} mil mill.`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} M`;
  }
  return `$${amount.toLocaleString("es-CL")}`;
}

export default function TransferenciasDashboardClient({ summary }: Props) {
  const [activeTab, setActiveTab] = useState<"receptores" | "emisores" | "buscador">("receptores");
  const [searchReceptor, setSearchReceptor] = useState("");
  const [searchEmisor, setSearchEmisor] = useState("");
  const [searchTransfers, setSearchTransfers] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filtrado de Receptores
  const filteredReceptores = useMemo(() => {
    const q = searchReceptor.toLowerCase().trim();
    if (!q) return summary.top_receptores;
    return summary.top_receptores.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.rut.toLowerCase().includes(q) ||
        (r.class ?? "").toLowerCase().includes(q)
    );
  }, [summary.top_receptores, searchReceptor]);

  // Filtrado de Emisores
  const filteredEmisores = useMemo(() => {
    const q = searchEmisor.toLowerCase().trim();
    if (!q) return summary.top_emisores;
    return summary.top_emisores.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.rut.toLowerCase().includes(q) ||
        (e.class ?? "").toLowerCase().includes(q)
    );
  }, [summary.top_emisores, searchEmisor]);

  // Filtrado de Transferencias Detalladas
  const filteredTransfers = useMemo(() => {
    const q = searchTransfers.toLowerCase().trim();
    if (!q) return summary.transfers_sample;
    return summary.transfers_sample.filter(
      (t) =>
        (t.receiver_name || "").toLowerCase().includes(q) ||
        (t.emitter_name || "").toLowerCase().includes(q) ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.receiver_rut || "").toLowerCase().includes(q)
    );
  }, [summary.transfers_sample, searchTransfers]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize));
  const paginatedTransfers = filteredTransfers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      
      {/* ═══ 1. KPIs SUPERIORES CONSOLIDADOS ════════════════════════════════════ */}
      <section aria-label="Métricas clave de transferencias estatales">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              padding: "1.25rem",
              background: "var(--surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              Total Transferido por el Estado
            </span>
            <strong style={{ fontSize: "1.65rem", color: "var(--ok)", fontFamily: "monospace", display: "block", marginTop: "0.25rem" }}>
              {formatCompactCLP(summary.kpis.total_monto_clp)}
            </strong>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem", display: "block" }}>
              Ley 19.862 · Subtítulos 24 y 33
            </span>
          </div>

          <div
            style={{
              padding: "1.25rem",
              background: "var(--surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              N° Total de Transferencias
            </span>
            <strong style={{ fontSize: "1.65rem", color: "var(--accent)", fontFamily: "monospace", display: "block", marginTop: "0.25rem" }}>
              {summary.kpis.total_transfers.toLocaleString("es-CL")}
            </strong>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem", display: "block" }}>
              Registros oficiales indexados
            </span>
          </div>

          <div
            style={{
              padding: "1.25rem",
              background: "var(--surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              Instituciones Receptoras
            </span>
            <strong style={{ fontSize: "1.65rem", color: "var(--warn)", fontFamily: "monospace", display: "block", marginTop: "0.25rem" }}>
              {summary.kpis.total_receptores.toLocaleString("es-CL")}
            </strong>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem", display: "block" }}>
              Fundaciones, ONGs, Corporaciones y Univ.
            </span>
          </div>

          <div
            style={{
              padding: "1.25rem",
              background: "var(--surface)",
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", display: "block" }}>
              Organismos Emisores
            </span>
            <strong style={{ fontSize: "1.65rem", color: "var(--accent)", fontFamily: "monospace", display: "block", marginTop: "0.25rem" }}>
              {summary.kpis.total_emisores.toLocaleString("es-CL")}
            </strong>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem", display: "block" }}>
              Ministerios, GOREs y Municipalidades
            </span>
          </div>
        </div>
      </section>

      {/* ═══ 2. TABS DE NAVEGACIÓN ═════════════════════════════════════════════ */}
      <nav
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.5rem",
          flexWrap: "wrap",
        }}
        aria-label="Vistas de transferencias"
      >
        <button
          type="button"
          onClick={() => setActiveTab("receptores")}
          className={`btn ${activeTab === "receptores" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
        >
          🏢 Top Fundaciones & Receptoras ({filteredReceptores.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("emisores")}
          className={`btn ${activeTab === "emisores" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
        >
          🏛️ Top Organismos Emisores ({filteredEmisores.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("buscador")}
          className={`btn ${activeTab === "buscador" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}
        >
          🔍 Buscador de Transferencias ({filteredTransfers.length})
        </button>
      </nav>

      {/* ═══ 3. TAB 1: TOP RECEPTORAS (FUNDACIONES, ONGS, PRIVADOS) ════════════ */}
      {activeTab === "receptores" && (
        <section className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 0.2rem", color: "var(--text-primary)" }}>
                Ranking de Entidades Receptoras de Fondos Públicos
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                Fundaciones, corporaciones, universidades y personas jurídicas receptoras ordenadas por monto total adjudicado.
              </p>
            </div>

            <div style={{ minWidth: 260 }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Buscar por nombre de fundación o RUT..."
                value={searchReceptor}
                onChange={(e) => setSearchReceptor(e.target.value)}
                style={{ width: "100%", fontSize: "0.82rem", padding: "0.4rem 0.75rem" }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-2)", fontSize: "0.72rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "0.75rem 1rem", width: 50 }}>#</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Razón Social / Fundación</th>
                  <th style={{ padding: "0.75rem 1rem", width: 120 }}>RUT</th>
                  <th style={{ padding: "0.75rem 1rem", width: 140 }}>Tipo Entidad</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", width: 140 }}>N° Transferencias</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", width: 180 }}>Monto Total CLP</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceptores.slice(0, 50).map((r, i) => (
                  <tr key={`${r.rut}-${i}`} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "var(--bg-surface-2)" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.85rem" }}>
                        {r.name}
                      </strong>
                      {r.top_emisores && r.top_emisores.length > 0 && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.15rem" }}>
                          Aportantes: {r.top_emisores.join(" · ")}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", color: "var(--accent)" }}>
                      {r.rut}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span className="badge badge-warn" style={{ fontSize: "0.68rem" }}>
                        {r.class}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {r.count.toLocaleString("es-CL")}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--ok)" }}>
                      {formatCLP(r.total_clp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ═══ 4. TAB 2: TOP EMISORES (MINISTERIOS, GORES, MUNICIPALIDADES) ═══════ */}
      {activeTab === "emisores" && (
        <section className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 0.2rem", color: "var(--text-primary)" }}>
                Organismos Públicos con Mayor Transferencia de Fondos
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                Ministerios, Gobiernos Regionales y Municipalidades ordenados por volumen de recursos transferidos bajo la Ley 19.862.
              </p>
            </div>

            <div style={{ minWidth: 260 }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Buscar por nombre de organismo o RUT..."
                value={searchEmisor}
                onChange={(e) => setSearchEmisor(e.target.value)}
                style={{ width: "100%", fontSize: "0.82rem", padding: "0.4rem 0.75rem" }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-2)", fontSize: "0.72rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "0.75rem 1rem", width: 50 }}>#</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Organismo Público Emisor</th>
                  <th style={{ padding: "0.75rem 1rem", width: 120 }}>RUT</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", width: 140 }}>N° Transferencias</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", width: 180 }}>Monto Total Transferido</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmisores.slice(0, 50).map((e, i) => (
                  <tr key={`${e.rut}-${i}`} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "var(--bg-surface-2)" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.85rem" }}>
                        {e.name}
                      </strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                        {e.class}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", color: "var(--accent)" }}>
                      {e.rut}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      {e.count.toLocaleString("es-CL")}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>
                      {formatCLP(e.total_clp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ═══ 5. TAB 3: EXPLORADOR DETALLADO DE TRANSFERENCIAS PAGINADO ═════════ */}
      {activeTab === "buscador" && (
        <section className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 0.2rem", color: "var(--text-primary)" }}>
                Explorador de Transferencias Individuales
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                Búsqueda en tiempo real por receptor, organismo emisor, programa u objetivo.
              </p>
            </div>

            <div style={{ minWidth: 280 }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Buscar por fundación, emisor o materia..."
                value={searchTransfers}
                onChange={(e) => {
                  setSearchTransfers(e.target.value);
                  setPage(1);
                }}
                style={{ width: "100%", fontSize: "0.82rem", padding: "0.4rem 0.75rem" }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-2)", fontSize: "0.72rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "0.75rem 1rem", width: 100 }}>Fecha</th>
                  <th style={{ padding: "0.75rem 1rem", minWidth: 200 }}>Entidad Receptora (Fundación / ONG)</th>
                  <th style={{ padding: "0.75rem 1rem", minWidth: 180 }}>Organismo Emisor</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Objetivo / Materia</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", width: 140 }}>Monto CLP</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", width: 110 }}>Origen</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransfers.map((t, i) => (
                  <tr key={t.id || i} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "var(--bg-surface-2)" }}>
                    <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {t.fecha || t.period || "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.82rem" }}>
                        {t.receiver_name || "Receptor privado"}
                      </strong>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                        RUT: {t.receiver_rut || "—"} {t.municipality ? `· ${t.municipality}` : ""}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ color: "var(--accent)", fontSize: "0.78rem", display: "block", fontWeight: 600 }}>
                        {t.emitter_name || "Organismo del Estado"}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                        RUT: {t.emitter_rut || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.4 }}>
                        {t.title || t.description || "Transferencia regular bajo Ley 19.862"}
                      </p>
                      {t.classification && (
                        <span className="badge badge-info" style={{ fontSize: "0.62rem", marginTop: "0.2rem" }}>
                          {t.classification}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--ok)", whiteSpace: "nowrap" }}>
                      {formatCLP(t.monto_clp)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      {t.url ? (
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", color: "var(--accent)" }}>
                          Ley 19.862 ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>Verificado ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
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
                padding: "0.75rem 0",
                marginTop: "0.75rem",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "0.78rem",
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", opacity: page === 1 ? 0.4 : 1 }}
              >
                ‹ Anterior
              </button>

              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                Página <strong style={{ color: "var(--text-primary)" }}>{page}</strong> de {totalPages} ({filteredTransfers.length.toLocaleString("es-CL")} transferencias)
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", opacity: page === totalPages ? 0.4 : 1 }}
              >
                Siguiente ›
              </button>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
