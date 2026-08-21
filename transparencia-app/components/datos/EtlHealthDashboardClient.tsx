"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icono, { type IconoNombre } from "@/components/ui/Icono";
import { ETL_SOURCES_DATA, type EtlSourceInfo } from "@/lib/etl-sources-data";

export type { EtlSourceInfo };

const CATEGORIES: { id: string; label: string; icon: IconoNombre }[] = [
  { id: "all", label: `Todas las Fuentes (${ETL_SOURCES_DATA.length})`, icon: "datos" },
  { id: "personal", label: "Personal y Nóminas", icon: "personas" },
  { id: "finanzas", label: "Presupuesto y Fondos", icon: "dinero" },
  { id: "compras", label: "Compras Públicas", icon: "compras" },
  { id: "probidad", label: "Probidad y Lobby", icon: "cgr" },
  { id: "parlamento", label: "Congreso Nacional", icon: "organismo" },
  { id: "municipios", label: "Municipalidades", icon: "territorio" },
];

export default function EtlHealthDashboardClient() {
  const [categoria, setCategoria] = useState<string>("all");
  const [filtroTexto, setFiltroTexto] = useState<string>("");

  const fuentesFiltradas = useMemo(() => {
    return ETL_SOURCES_DATA.filter((s) => {
      const coincideCat = categoria === "all" || s.category === categoria;
      const coincideTexto =
        !filtroTexto.trim() ||
        s.name.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        s.organization.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        s.description.toLowerCase().includes(filtroTexto.toLowerCase());
      return coincideCat && coincideTexto;
    });
  }, [categoria, filtroTexto]);

  const totalRegistros = useMemo(
    () => ETL_SOURCES_DATA.reduce((acc, s) => acc + s.recordCount, 0),
    []
  );
  const completeSources = ETL_SOURCES_DATA.filter((source) => source.status === "operational").length;

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(amount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ─── RESUMEN DE SALUD GENERAL ────────────────────────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
        aria-label="Indicadores generales de salud de datos"
      >
        <div className="stat-tile stat-tile--ok">
          <div className="stat-tile__value">{completeSources} / {ETL_SOURCES_DATA.length}</div>
          <div className="stat-tile__label">Cobertura completa</div>
          <div className="stat-tile__hint">El resto declara cobertura parcial</div>
        </div>
        <div className="stat-tile stat-tile--accent">
          <div className="stat-tile__value">+{totalRegistros.toLocaleString("es-CL")}</div>
          <div className="stat-tile__label">Registros Canónicos</div>
          <div className="stat-tile__hint">Indexados y auditados en el Lake</div>
        </div>
        <div className="stat-tile stat-tile--info">
          <div className="stat-tile__value">345 / 346</div>
          <div className="stat-tile__label">Cobertura Comunal</div>
          <div className="stat-tile__hint">Cobertura oficial SINIM disponible</div>
        </div>
        <div className="stat-tile stat-tile--warn">
          <div className="stat-tile__value">Derivado</div>
          <div className="stat-tile__label">KPIs oficiales</div>
          <div className="stat-tile__hint">Sin cifras manuales</div>
        </div>
      </section>

      {/* ─── CONTROLES DE FILTRADO Y BÚSQUEDA ───────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          padding: "1rem",
          background: "var(--bg-surface-2)",
          borderRadius: 10,
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Selector de Categorías */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoria(cat.id)}
              className="capsule"
              style={{
                cursor: "pointer",
                fontSize: "0.75rem",
                padding: "0.35rem 0.75rem",
                borderRadius: 99,
                border: categoria === cat.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: categoria === cat.id ? "var(--accent)" : "var(--bg-surface)",
                color: categoria === cat.id ? "var(--accent-contrast, white)" : "var(--text-primary)",
                fontWeight: categoria === cat.id ? 700 : 500,
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <Icono nombre={cat.icon} size={14} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Buscador de Fuentes */}
        <input
          type="search"
          placeholder="Buscar fuente por nombre, organismo o materia..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          style={{
            minWidth: 260,
            padding: "0.45rem 0.85rem",
            fontSize: "0.8rem",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        />
      </div>

      {/* ─── LISTADO DE CONECTORES Y ESTADO DE ACTUALIZACIÓN ───────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {fuentesFiltradas.map((fuente) => (
          <article
            key={fuente.id}
            className="card-flat"
            style={{
              padding: "1.25rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
            }}
          >
            {/* Cabecera del Conector */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{fuente.name}</h3>
                  <span className="badge badge-ok" style={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <span className="source-signal source-signal--partial" aria-hidden="true" style={{ width: 8, height: 8 }} />
                    {fuente.statusText}
                  </span>
                  {fuente.financialAmountClp && (
                    <span className="badge badge-info" style={{ fontSize: "0.7rem", fontFamily: "monospace" }}>
                      {formatCLP(fuente.financialAmountClp)}
                    </span>
                  )}
                </div>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {fuente.organization}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong style={{ display: "block", fontFamily: "monospace", fontSize: "1.15rem", color: "var(--text-primary)" }}>
                  {fuente.recordCount.toLocaleString("es-CL")}
                </strong>
                <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>registros catalogados</span>
              </div>
            </div>

            {/* Descripción y Detalles */}
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
              {fuente.description}
            </p>

            {/* Metadatos de Actualización y Campos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.75rem",
                padding: "0.75rem",
                background: "var(--bg-surface-2)",
                borderRadius: 8,
                fontSize: "0.75rem",
              }}
            >
              <div>
                <span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.68rem" }}>
                  Frecuencia Oficial
                </span>
                <strong style={{ color: "var(--text-primary)" }}>{fuente.frequency}</strong>
              </div>

              <div>
                <span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.68rem" }}>
                  Última Sincronización
                </span>
                <strong style={{ color: "var(--text-primary)" }}>{fuente.lastUpdatedRelative}</strong>
              </div>

              <div>
                <span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.68rem" }}>
                  Campos Principales Extraídos
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                  {fuente.keyFields.join(", ")}
                </span>
              </div>
            </div>

            {/* Enlaces de Acción */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", paddingTop: "0.25rem" }}>
              <a
                href={fuente.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textDecoration: "none" }}
              >
                Origen de Datos Abiertos del Estado ↗
              </a>

              <Link
                href={fuente.viewLink}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                {fuente.viewLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
