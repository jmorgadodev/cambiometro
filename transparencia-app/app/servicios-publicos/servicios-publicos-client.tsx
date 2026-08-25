"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "@/components/SiteLink";
import type { ServicioPublicoEnriquecido } from "@/lib/servicios-publicos-data";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import ShareButton from "@/components/ShareButton";

type ServicioConPolitico = ServicioPublicoEnriquecido & {
  politico_id?: string | null;
};

interface Props {
  servicios: ServicioConPolitico[];
  totalServicios: number;
  /** @deprecated use totalConPartida */
  totalConPresupuesto?: number;
  totalConPartida?: number;
  /** Pre-computed server-side for Cloudflare Workers runtime */
  presupuestoTotalLey?: number;
  gastoDevengado?: number;
}

function formatCLP(n: number) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000_000) {
    return `$${(n / 1_000_000_000_000).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} billones`;
  }
  if (n >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} mil millones`;
  }
  return `$${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 0 })} MM`;
}

function pctEjecutado(inicial: number, ejecutado: number): string {
  if (inicial === 0) return "—";
  return `${((ejecutado / inicial) * 100).toFixed(1)}%`;
}

const CATEGORIAS_TABS = [
  { id: "Todos", label: "Todas las instituciones" },
  { id: "Ministerios", label: "🏛️ Ministerios (25)" },
  { id: "GOREs", label: "🗺️ Gobiernos Regionales (16)" },
  { id: "Superintendencias", label: "⚖️ Superintendencias" },
  { id: "Servicios", label: "🏢 Servicios Nacionales" },
  { id: "Empresas", label: "⛏️ Empresas Públicas" },
  { id: "Autonomos", label: "🛡️ Organismos Autónomos" },
];

export default function ServiciosPublicosClient({
  servicios,
  totalServicios,
  totalConPresupuesto,
  totalConPartida,
  presupuestoTotalLey: presupuestoTotalLeyProp,
  gastoDevengado: gastoDevengadoProp,
}: Props) {
  const totalConPresupuestoEfectivo = totalConPartida ?? totalConPresupuesto ?? 0;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<string>(() => searchParams.get("tab") || "Todos");
  const [search, setSearch] = useState<string>(() => searchParams.get("search") || "");
  const [soloConPresupuesto, setSoloConPresupuesto] = useState(() => searchParams.get("presupuesto") === "true");
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => (searchParams.get("view") as "cards" | "table") || "cards");

  const [page, setPage] = useState<number>(() => {
    const p = searchParams.get("page");
    const num = Number(p);
    return Number.isSafeInteger(num) && num > 0 ? num : 1;
  });
  const itemsPerPage = 20;

  const syncUrl = useCallback(
    (tab: string, s: string, pres: boolean, vMode: string, pNum: number) => {
      const params = new URLSearchParams();
      if (tab !== "Todos") params.set("tab", tab);
      if (s.trim()) params.set("search", s.trim());
      if (pres) params.set("presupuesto", "true");
      if (vMode !== "cards") params.set("view", vMode);
      if (pNum > 1) params.set("page", String(pNum));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
    syncUrl(tab, search, soloConPresupuesto, viewMode, 1);
  };

  const handleSearchChange = (s: string) => {
    setSearch(s);
    setPage(1);
    syncUrl(activeTab, s, soloConPresupuesto, viewMode, 1);
  };

  const handlePresupuestoToggle = (pres: boolean) => {
    setSoloConPresupuesto(pres);
    setPage(1);
    syncUrl(activeTab, search, pres, viewMode, 1);
  };

  const handleViewModeChange = (vMode: "cards" | "table") => {
    setViewMode(vMode);
    syncUrl(activeTab, search, soloConPresupuesto, vMode, page);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    syncUrl(activeTab, search, soloConPresupuesto, viewMode, newPage);
    window.scrollTo({ top: 360, behavior: "smooth" });
  };

  const filteredAndSorted = useMemo(() => {
    return servicios
      .filter((serv) => {
        let matchTab = true;
        if (activeTab === "Ministerios") {
          matchTab = serv.tipo_organo === "Ministerio";
        } else if (activeTab === "GOREs") {
          matchTab = serv.tipo_organo === "Gobierno Regional";
        } else if (activeTab === "Superintendencias") {
          matchTab = serv.tipo_organo === "Superintendencia";
        } else if (activeTab === "Servicios") {
          matchTab =
            serv.tipo_organo === "Servicio Nacional" ||
            serv.tipo_organo === "Servicio Público" ||
            serv.tipo_organo === "Subsecretaría";
        } else if (activeTab === "Empresas") {
          matchTab = serv.tipo_organo === "Empresa Pública";
        } else if (activeTab === "Autonomos") {
          matchTab =
            serv.ministerio_dependiente === "Autónomo" ||
            serv.id === "serv-servel" ||
            serv.nombre.toLowerCase().includes("autónom") ||
            serv.nombre.toLowerCase().includes("electoral");
        }

        const q = search.toLowerCase().trim();
        const matchSearch =
          q === "" ||
          serv.nombre.toLowerCase().includes(q) ||
          serv.sigla.toLowerCase().includes(q) ||
          (serv.director_jefe_actual ?? "").toLowerCase().includes(q) ||
          (serv.ministerio_dependiente ?? "").toLowerCase().includes(q);

        const matchPresupuesto = !soloConPresupuesto || serv.presupuesto !== null;

        return matchTab && matchSearch && matchPresupuesto;
      })
      .sort((a, b) => {
        if (a.tipo_organo === "Ministerio" && b.tipo_organo !== "Ministerio") return -1;
        if (b.tipo_organo === "Ministerio" && a.tipo_organo !== "Ministerio") return 1;
        if (a.tipo_organo === "Gobierno Regional" && b.tipo_organo !== "Gobierno Regional") return -1;
        if (b.tipo_organo === "Gobierno Regional" && a.tipo_organo !== "Gobierno Regional") return 1;
        return a.nombre.localeCompare(b.nombre, "es-CL");
      });
  }, [search, activeTab, soloConPresupuesto, servicios]);

  const totalFiltered = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pagedServicios = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const presupuestoTotal = useMemo(() => {
    let inicialLey = 0;
    let ejecutado = 0;
    const partidas = new Set<string>();
    for (const s of filteredAndSorted) {
      if (s.presupuesto) {
        inicialLey += s.presupuesto.inicial_ley_clp;
        ejecutado += s.presupuesto.ejecutado_clp;
        partidas.add(s.presupuesto.partida);
      }
    }
    const finalInicial = presupuestoTotalLeyProp && presupuestoTotalLeyProp > 0 && activeTab === "Todos"
      ? presupuestoTotalLeyProp
      : inicialLey;

    const finalEjecutado = gastoDevengadoProp && gastoDevengadoProp > 0 && activeTab === "Todos"
      ? gastoDevengadoProp
      : ejecutado;

    return {
      inicialLey: finalInicial,
      ejecutado: finalEjecutado,
      partidas: partidas.size > 0 ? partidas.size : totalConPresupuestoEfectivo,
    };
  }, [filteredAndSorted, presupuestoTotalLeyProp, gastoDevengadoProp, activeTab, totalConPresupuestoEfectivo]);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem" }}>
      {/* ═══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="page-masthead">
        <div className="container-main" id="directorio-servicios-capture">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span className="badge badge-info">Directorio Oficial del Estado</span>
                <span className="badge badge-ok">Presupuesto DIPRES 2026</span>
              </div>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                  fontWeight: 900,
                  color: "var(--text-1)",
                  margin: "0 0 0.5rem",
                  letterSpacing: "-0.02em",
                }}
              >
                Servicios Públicos, Ministerios y Gobiernos Regionales
              </h1>
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text-2)",
                  maxWidth: "700px",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Panel de control y fiscalización del gasto público en Chile: presupuestos asignados por Ley, dotaciones de personal en Transparencia Activa y órdenes de compra en MercadoPúblico.
              </p>
            </div>

            <ShareButton
              title="Servicios Públicos y Ministerios de Chile — El Cambiómetro"
              text="Explora los presupuestos DIPRES 2026, dotación de personal y compras públicas de las instituciones del Estado."
              captureTargetId="directorio-servicios-capture"
              variant="primary"
            />
          </div>

          {/* Estadísticas de Cabecera */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            <div
              className="card"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", padding: "1.25rem" }}
              title="Suma de presupuestos institucionales monitoreados; incluye transferencias internas."
            >
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Presupuesto Ley Inicial</span>
                <span style={{ fontSize: "0.75rem", cursor: "help" }} title="Suma de presupuestos institucionales monitoreados; incluye transferencias internas.">
                  ℹ️
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "1.35rem", fontWeight: 900, color: "var(--accent)", marginTop: "0.2rem" }}>
                {presupuestoTotal.inicialLey > 0 ? formatCLP(presupuestoTotal.inicialLey) : "—"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
                Ley de Presupuestos 2026 · DIPRES
              </div>
            </div>

            <div className="card" style={{ background: "var(--surface-2)", borderColor: "var(--border)", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
                Gasto Devengado / Ejecutado
              </div>
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "1.35rem", fontWeight: 900, color: "var(--ok)", marginTop: "0.2rem" }}>
                {presupuestoTotal.ejecutado > 0 ? (
                  formatCLP(presupuestoTotal.ejecutado)
                ) : (
                  <span className="badge badge-info" style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}>
                    pendiente de publicación
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
                {presupuestoTotal.inicialLey > 0 && presupuestoTotal.ejecutado > 0
                  ? `${pctEjecutado(presupuestoTotal.inicialLey, presupuestoTotal.ejecutado)} de avance presupuestario`
                  : "Reporte fiscal oficial"}
              </div>
            </div>

            <div className="card" style={{ background: "var(--surface-2)", borderColor: "var(--border)", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
                Instituciones Monitoreadas
              </div>
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "1.35rem", fontWeight: 900, color: "var(--warn)", marginTop: "0.2rem" }}>
                {totalServicios} Organismos
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: "0.25rem" }}>
                {totalConPresupuestoEfectivo} con partida o capítulo DIPRES
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CONTENIDO Y FILTROS ═══════════════════════════════════════════════ */}
      <div className="container-main" style={{ marginTop: "2rem" }}>
        
        {/* Barra de Filtros y Búsqueda */}
        <div
          className="card"
          style={{
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Pestañas de Categoría */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {CATEGORIAS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-ghost"}`}
                style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Búsqueda + Filtro Presupuesto + Vista */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <input
                type="text"
                className="input"
                placeholder="🔍 Buscar por nombre, sigla (SII, MOP, CODELCO, GORE), ministro o director..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ width: "100%", fontSize: "0.88rem" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  color: soloConPresupuesto ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: soloConPresupuesto ? 700 : 500,
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={soloConPresupuesto}
                  onChange={(e) => handlePresupuestoToggle(e.target.checked)}
                  style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
                />
                <span>Solo con presupuesto publicado</span>
              </label>

              {/* Botones de Vista: Cards / Tabla */}
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
                  onClick={() => handleViewModeChange("cards")}
                  style={{
                    padding: "0.35rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: viewMode === "cards" ? 700 : 500,
                    background: viewMode === "cards" ? "var(--bg-surface)" : "transparent",
                    color: viewMode === "cards" ? "var(--accent)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  🗂️ Tarjetas
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange("table")}
                  style={{
                    padding: "0.35rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: viewMode === "table" ? 700 : 500,
                    background: viewMode === "table" ? "var(--bg-surface)" : "transparent",
                    color: viewMode === "table" ? "var(--accent)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  📊 Tabla
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contador de resultados y paginación */}
        <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <span>
            Mostrando <strong>{totalFiltered > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> - <strong>{Math.min(currentPage * itemsPerPage, totalFiltered)}</strong> de <strong>{totalFiltered}</strong> instituciones oficiales
          </span>
          {totalPages > 1 && (
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> (20 por página)
            </span>
          )}
        </div>

        {/* ═══ VISTA 1: CARDS (PAGINADA A 20 POR PÁGINA) ═════════════════════════════ */}
        {viewMode === "cards" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {pagedServicios.map((serv) => {
              const p = serv.presupuesto;
              const personal = serv.personal;
              const compras = serv.compras;

              return (
                <article
                  key={serv.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.85rem",
                    padding: "1.35rem",
                  }}
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                      <span
                        className={`badge ${
                          serv.tipo_organo === "Ministerio"
                            ? "badge-info"
                            : serv.tipo_organo === "Empresa Pública"
                            ? "badge-warn"
                            : serv.tipo_organo === "Gobierno Regional"
                            ? "badge-ok"
                            : "badge-info"
                        }`}
                        style={{ fontSize: "0.72rem" }}
                      >
                        {serv.tipo_organo}
                      </span>
                      {serv.sigla && (
                        <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono, monospace)", color: "var(--accent)", fontWeight: 700 }}>
                          {serv.sigla}
                        </span>
                      )}
                    </div>

                    <h2
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        margin: "0 0 0.35rem",
                        lineHeight: 1.3,
                      }}
                    >
                      {serv.nombre}
                    </h2>

                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                      Dependencia: <strong style={{ color: "var(--text-primary)" }}>{serv.ministerio_dependiente}</strong>
                    </div>

                    {/* Autoridad Titular */}
                    <div
                      style={{
                        padding: "0.6rem 0.75rem",
                        background: "var(--bg-surface-2)",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        {serv.tipo_organo === "Ministerio"
                          ? "Ministro/a de Estado"
                          : serv.tipo_organo === "Gobierno Regional"
                          ? "Gobernador/a Regional Electo"
                          : "Director/a Institucional"}
                      </div>
                      <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.1rem" }}>
                        {serv.director_jefe_actual ? (
                          serv.politico_id ? (
                            <Link href={`/politico/${getPoliticoSlug(serv.politico_id)}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                              👤 {serv.director_jefe_actual}
                            </Link>
                          ) : (
                            serv.director_jefe_actual
                          )
                        ) : (
                          <span style={{ color: "var(--text-subtle)", fontStyle: "italic", fontSize: "0.82rem" }}>
                            En proceso de confirmación oficial
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Métricas Consolidadas Reales: Dotación + Compras */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <div style={{ padding: "0.5rem 0.6rem", background: "var(--bg-surface-2)", borderRadius: 6 }}>
                        <span style={{ fontSize: "0.66rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Dotación</span>
                        <strong style={{ fontSize: "0.86rem", color: "var(--ok)", fontFamily: "monospace" }}>
                          {personal?.dotacion_total !== null && personal?.dotacion_total !== undefined ? `${personal.dotacion_total.toLocaleString("es-CL")} pers.` : "—"}
                        </strong>
                      </div>
                      <div style={{ padding: "0.5rem 0.6rem", background: "var(--bg-surface-2)", borderRadius: 6 }}>
                        <span style={{ fontSize: "0.66rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Compras OCDS</span>
                        <strong style={{ fontSize: "0.86rem", color: "var(--warn)", fontFamily: "monospace" }}>
                          {compras?.monto_total_clp !== null && compras?.monto_total_clp !== undefined ? formatCLP(compras.monto_total_clp) : "—"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Presupuesto DIPRES + Acciones */}
                  <div>
                    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                      {p && p.vigente_clp > 0 ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Presupuesto Vigente:</span>
                            <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 800, color: "var(--accent)", fontSize: "0.9rem" }}>
                              {formatCLP(p.vigente_clp)}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>Ejecutado acum.:</span>
                            <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "var(--ok)", fontSize: "0.82rem" }}>
                              {formatCLP(p.ejecutado_clp)} <small style={{ color: "var(--text-subtle)" }}>({p.porcentaje_ejecucion}%)</small>
                            </span>
                          </div>
                          <div style={{ height: 5, background: "var(--bg-surface-2)", borderRadius: 3, marginTop: "0.3rem", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, p.porcentaje_ejecucion)}%`,
                                background: "linear-gradient(90deg, var(--accent), var(--ok))",
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", padding: "0.25rem 0" }}>
                          Subordinado a presupuesto ministerial
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem" }}>
                      <Link
                        href={`/servicios-publicos/${serv.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem", flex: 1, textAlign: "center", justifyContent: "center" }}
                      >
                        Ver Dashboard Completo →
                      </Link>
                      {serv.sitio_web_oficial && (
                        <a
                          href={serv.sitio_web_oficial}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost"
                          style={{ fontSize: "0.75rem", padding: "0.4rem 0.65rem" }}
                          title="Sitio web oficial"
                        >
                          🌐
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ═══ VISTA 2: TABLA COMPACTA (PAGINADA A 20 POR PÁGINA) ═════════════════════════════ */}
        {viewMode === "table" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-sticky-col" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.85rem 1rem" }}>Organismo / Institución</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Tipo</th>
                    <th style={{ padding: "0.85rem 1rem" }}>Autoridad Titular</th>
                    <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Presupuesto Vigente</th>
                    <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Dotación</th>
                    <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Compras OCDS</th>
                    <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedServicios.map((serv, index) => {
                    const p = serv.presupuesto;
                    const personal = serv.personal;
                    const compras = serv.compras;

                    return (
                      <tr
                        key={serv.id}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          background: index % 2 === 0 ? "transparent" : "var(--bg-surface-2)",
                        }}
                      >
                        <td style={{ padding: "0.85rem 1rem", fontWeight: 700 }}>
                          <Link href={`/servicios-publicos/${serv.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                            {serv.nombre}
                          </Link>
                          {serv.sigla && (
                            <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", color: "var(--accent)" }}>
                              ({serv.sigla})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          {serv.tipo_organo}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", fontSize: "0.82rem" }}>
                          {serv.director_jefe_actual || "—"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: p && p.vigente_clp > 0 ? "var(--accent)" : "var(--text-subtle)" }}>
                          {p && p.vigente_clp > 0 ? formatCLP(p.vigente_clp) : "Subordinado"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--ok)", fontWeight: 700 }}>
                          {personal?.dotacion_total !== null && personal?.dotacion_total !== undefined ? `${personal.dotacion_total.toLocaleString("es-CL")} pers.` : "—"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--warn)", fontWeight: 700 }}>
                          {compras?.monto_total_clp !== null && compras?.monto_total_clp !== undefined ? formatCLP(compras.monto_total_clp) : "—"}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                          <Link href={`/servicios-publicos/${serv.id}`} className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>
                            Ver Ficha →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ CONTROLES DE PAGINACIÓN ═════════════════════════════════════════ */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "2.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(1)}
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: currentPage <= 1 ? 0.4 : 1, cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
            >
              « Primera
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: currentPage <= 1 ? 0.4 : 1, cursor: currentPage <= 1 ? "not-allowed" : "pointer" }}
            >
              ‹ Anterior
            </button>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", padding: "0 0.6rem" }}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: currentPage >= totalPages ? 0.4 : 1, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
            >
              Siguiente ›
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(totalPages)}
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: currentPage >= totalPages ? 0.4 : 1, cursor: currentPage >= totalPages ? "not-allowed" : "pointer" }}
            >
              Última »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
