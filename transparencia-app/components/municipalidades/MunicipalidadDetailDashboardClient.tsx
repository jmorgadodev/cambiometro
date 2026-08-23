"use client";

import { useState, useMemo } from "react";

import Link from "next/link";
import AccessibleTooltip from "@/components/ui/AccessibleTooltip";
import {
  MunicipalidadEnriquecida,
  AlcaldeData,
  PresupuestoSinim,
  ResumenPersonal,
  ConcejalData,
  ComprasPublicasMuni,
  RadiografiaComunal,
  AuditoriaCgrData,
  TopFuncionarioRemuneracion,
  TopFuncionarioHorasExtras,
} from "@/lib/municipalidades-data";
import { getPartidoConfig } from "@/lib/partidos.config";
import OrganismoFuncionariosList from "@/components/OrganismoFuncionariosList";

interface Props {
  muniData: MunicipalidadEnriquecida;
  nombreComuna: string;
  region: string;
  cut: string;
}

function formatCLP(n?: number | null) {
  if (n === null || n === undefined || isNaN(n) || n <= 0) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompactCLP(n?: number | null) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000_000) {
    return `$${(n / 1_000_000_000_000).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} billones`;
  }
  if (n >= 1_000_000_000) {
    return `$${(n / 1_000_000_000).toLocaleString("es-CL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mil millones`;
  }
  return `$${(n / 1_000_000).toLocaleString("es-CL", {
    maximumFractionDigits: 0,
  })} MM`;
}

function formatNum(n?: number | null) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es-CL");
}

function getModalityBadge(ocid?: string | null, titulo?: string) {
  const oc = (ocid || "").toUpperCase();
  const tit = (titulo || "").toUpperCase();
  if (oc.includes("-TD") || tit.includes("TRATO DIRECTO")) {
    return { label: "Trato Directo", color: "var(--warn)", bg: "var(--warn-bg)", border: "1px solid var(--warn)" };
  }
  if (oc.includes("-CM") || tit.includes("CONVENIO MARCO")) {
    return { label: "Convenio Marco", color: "var(--accent)", bg: "var(--info-bg)", border: "1px solid var(--border)" };
  }
  if (oc.includes("-LP") || oc.includes("-LE") || oc.includes("-LR") || oc.includes("-L1") || tit.includes("LICITACION")) {
    return { label: "Licitación Pública", color: "var(--ok)", bg: "var(--ok-bg)", border: "1px solid var(--ok)" };
  }
  return { label: "OCDS ChileCompra", color: "var(--text-muted)", bg: "var(--surface-2)", border: "1px solid var(--border)" };
}

function formatCompraDate(iso?: string | null) {
  if (!iso) return "Julio 2026";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Julio 2026";
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "Julio 2026";
  }
}

export default function MunicipalidadDetailDashboardClient({
  muniData,
  nombreComuna,
  region,
  cut,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "presupuesto" | "personal" | "compras" | "concejo" | "control"
  >("presupuesto");

  // Estados interactivos para Compras Públicas
  const [comprasSearch, setComprasSearch] = useState("");
  const [comprasFilter, setComprasFilter] = useState<"todas" | "licitacion" | "trato_directo" | "convenio_marco">("todas");
  const [comprasSort, setComprasSort] = useState<"monto_desc" | "fecha_desc">("monto_desc");
  const [comprasVisibleCount, setComprasVisibleCount] = useState(10);
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());

  const toggleProcess = (procId: string) => {
    setExpandedProcesses((prev) => {
      const next = new Set(prev);
      if (next.has(procId)) next.delete(procId);
      else next.add(procId);
      return next;
    });
  };

  const alcalde = muniData.alcalde;
  const pres = muniData.presupuesto;
  const personal = muniData.resumen_personal;
  const compras = muniData.compras_publicas;
  const concejales = muniData.concejales ?? [];

  const radiografia = muniData.radiografia_comunal;
  const auditorias = muniData.auditorias_cgr ?? [];
  const topHorasExtras = muniData.top_horas_extras ?? [];
  const integrityAnomalies = muniData.anomalias_integridad ?? [];

  const periodosDisponibles = useMemo(() => muniData.periodos_disponibles || [], [muniData]);
  const defaultPeriod = muniData.periodo_cplt_reciente || periodosDisponibles.find((p) => !p.es_parcial)?.periodo || periodosDisponibles[0]?.periodo || "2026-06";
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    for (const p of periodosDisponibles) {
      if (p.ano) {
        yearsSet.add(p.ano);
      } else {
        const y = Number(p.periodo.split("-")[0]);
        if (!isNaN(y)) yearsSet.add(y);
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [periodosDisponibles]);

  const defaultYear = useMemo(() => {
    const y = Number(defaultPeriod.split("-")[0]);
    return !isNaN(y) && availableYears.includes(y) ? y : availableYears[0] || 2026;
  }, [defaultPeriod, availableYears]);

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  const monthsInSelectedYear = useMemo(() => {
    return periodosDisponibles.filter((p) => {
      const y = p.ano || Number(p.periodo.split("-")[0]);
      return y === selectedYear;
    });
  }, [periodosDisponibles, selectedYear]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    const monthsForYear = periodosDisponibles.filter((p) => (p.ano || Number(p.periodo.split("-")[0])) === year);
    if (monthsForYear.length > 0) {
      const isCurrentInYear = monthsForYear.some((p) => p.periodo === selectedPeriod);
      if (!isCurrentInYear) {
        const bestMonth = monthsForYear.find((p) => !p.es_parcial) || monthsForYear[0];
        setSelectedPeriod(bestMonth.periodo);
      }
    }
  };

  const selectedPeriodInfo = useMemo(() => {
    return periodosDisponibles.find((p) => p.periodo === selectedPeriod) || null;
  }, [periodosDisponibles, selectedPeriod]);

  const currentResumenPersonal = useMemo(() => {
    if (selectedPeriod && muniData.resumen_personal_por_periodo?.[selectedPeriod]) {
      return muniData.resumen_personal_por_periodo[selectedPeriod];
    }
    return muniData.resumen_personal;
  }, [muniData, selectedPeriod]);

  const topRemuneraciones = useMemo(() => {
    if (muniData.top_remuneraciones_por_periodo && muniData.top_remuneraciones_por_periodo[selectedPeriod]?.length) {
      return muniData.top_remuneraciones_por_periodo[selectedPeriod];
    }
    return muniData.top_remuneraciones ?? [];
  }, [muniData, selectedPeriod]);

  const desfaseMeses = muniData.desfase_meses ?? null;
  const esDesfasado = desfaseMeses !== null && desfaseMeses > 3;

  const partidoAlcalde =
    alcalde?.partido_alcalde ||
    muniData.partido_alcalde ||
    "Independiente";
  const brandingAlcalde = getPartidoConfig(partidoAlcalde);

  const presVigente = pres?.vigente_clp ?? pres?.inicial_clp ?? 0;
  const perCapita =
    muniData.presupuesto_per_capita_clp ??
    (muniData.poblacion_censo_2024 && presVigente > 0
      ? Math.round(presVigente / muniData.poblacion_censo_2024)
      : 0);
  const fcmPct = muniData.fcm_dependencia_pct ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* ═══ 4 KPIS SUPERIORES INTERACTIVOS ════════════════════════════════════ */}
      <section aria-label="KPIs Municipales">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* KPI 1: Presupuesto SINIM */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("presupuesto")}
            style={{
              padding: "1.1rem",
              borderTop: `3px solid ${
                activeTab === "presupuesto" ? "var(--ok)" : "var(--border)"
              }`,
              cursor: "pointer",
              background:
                activeTab === "presupuesto"
                  ? "var(--ok-bg)"
                  : "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--text-subtle)",
                letterSpacing: "0.06em",
                marginBottom: "0.3rem",
              }}
            >
              📊 Presupuesto SINIM 2025
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "1.45rem",
                fontWeight: 900,
                color: "var(--ok)",
              }}
            >
              {presVigente > 0 ? formatCompactCLP(presVigente) : "—"}
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
              }}
            >
              Presupuesto Per Cápita: {perCapita > 0 ? `${formatCLP(perCapita)} / hab` : "—"}
            </div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--text-subtle)",
                marginTop: "0.35rem",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <span>Cobertura SINIM: 345/346</span>
              <AccessibleTooltip
                ariaLabel="Detalle metodológico de cobertura nacional SINIM"
                content={
                  <div>
                    <strong style={{ display: "block", marginBottom: "0.25rem", color: "var(--accent)" }}>
                      Cobertura Nacional SINIM: 345/346 comunas
                    </strong>
                    <span>
                      La comuna de <strong>Antártica</strong> (sin municipalidad propia) es administrada por la Municipalidad de Cabo de Hornos; sus datos demográficos oficiales son complementados desde el Censo 2024 INE.
                    </span>
                  </div>
                }
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--accent)",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                  }}
                  title="Ver detalle de cobertura"
                >
                  ℹ️
                </span>
              </AccessibleTooltip>
            </div>
          </div>

          {/* KPI 2: Población Censo INE */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("personal")}
            style={{
              padding: "1.1rem",
              borderTop: `3px solid ${
                activeTab === "personal" ? "var(--accent)" : "var(--border)"
              }`,
              cursor: "pointer",
              background:
                activeTab === "personal"
                  ? "var(--info-bg)"
                  : "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--text-subtle)",
                letterSpacing: "0.06em",
                marginBottom: "0.3rem",
              }}
            >
              👥 Población Censo INE
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "1.45rem",
                fontWeight: 900,
                color: "var(--accent)",
              }}
            >
              {muniData.poblacion_censo_2024
                ? `${formatNum(muniData.poblacion_censo_2024)} hab.`
                : "—"}
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
              }}
            >
              {muniData.poblacion_censo_2024
                ? "Censo 2024 INE / SINIM"
                : "No publicado por la fuente"}
            </div>
          </div>

          {/* KPI 3: Remuneración Alcaldía */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("personal")}
            style={{
              padding: "1.1rem",
              borderTop: "3px solid var(--ok)",
              cursor: "pointer",
              background: "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--text-subtle)",
                letterSpacing: "0.06em",
                marginBottom: "0.3rem",
              }}
            >
              💼 Remuneración Oficial de la Alcaldía
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "1.45rem",
                fontWeight: 900,
                color: "var(--ok)",
              }}
            >
              {formatCLP(alcalde?.remuneracion_bruta)}
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
              }}
            >
              Alcaldía de {nombreComuna}
            </div>
          </div>

          {/* KPI 4: Dependencia FCM */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("presupuesto")}
            style={{
              padding: "1.1rem",
              borderTop: `3px solid ${
                fcmPct > 60 ? "var(--warn)" : "var(--info)"
              }`,
              cursor: "pointer",
              background: "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--text-subtle)",
                letterSpacing: "0.06em",
                marginBottom: "0.3rem",
              }}
            >
              🏛️ Dependencia del FCM
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "1.45rem",
                fontWeight: 900,
                color: fcmPct > 60 ? "var(--warn)" : "var(--info)",
              }}
            >
              {fcmPct.toFixed(1)}% FCM
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
              }}
            >
              Fondo Común Municipal
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SELECTOR DE PESTAÑAS (TABS) ═══════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.25rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("presupuesto")}
          className="btn"
          style={{
            background:
              activeTab === "presupuesto"
                ? "var(--bg-surface-2)"
                : "transparent",
            color:
              activeTab === "presupuesto"
                ? "var(--accent)"
                : "var(--text-muted)",
            borderBottom:
              activeTab === "presupuesto"
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "presupuesto" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          📊 Finanzas & Presupuesto (SINIM)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className="btn"
          style={{
            background:
              activeTab === "personal"
                ? "var(--bg-surface-2)"
                : "transparent",
            color:
              activeTab === "personal"
                ? "var(--accent)"
                : "var(--text-muted)",
            borderBottom:
              activeTab === "personal"
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "personal" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          👥 Nómina Detallada de Funcionarios (CPLT)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compras")}
          className="btn"
          style={{
            background:
              activeTab === "compras" ? "var(--bg-surface-2)" : "transparent",
            color:
              activeTab === "compras"
                ? "var(--accent)"
                : "var(--text-muted)",
            borderBottom:
              activeTab === "compras"
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "compras" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          🛒 Compras Públicas (OCDS)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("concejo")}
          className="btn"
          style={{
            background:
              activeTab === "concejo" ? "var(--bg-surface-2)" : "transparent",
            color:
              activeTab === "concejo"
                ? "var(--accent)"
                : "var(--text-muted)",
            borderBottom:
              activeTab === "concejo"
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "concejo" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          🏛️ Concejo Municipal & Censo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("control")}
          className="btn"
          style={{
            background:
              activeTab === "control" ? "var(--bg-surface-2)" : "transparent",
            color:
              activeTab === "control"
                ? "var(--accent)"
                : "var(--text-muted)",
            borderBottom:
              activeTab === "control"
                ? "2px solid var(--accent)"
                : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "control" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          ⚖️ Alertas y Auditorías Contraloría (CGR) ({auditorias.length})
        </button>
      </div>

      {/* ═══ PESTAÑA 1: FINANZAS & PRESUPUESTO SINIM ══════════════════════════ */}
      {activeTab === "presupuesto" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Tarjeta 1: Desglose Presupuestario */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div
                className="section-title"
                style={{ marginBottom: "0.2rem" }}
              >
                💰 Presupuesto Municipal SINIM (SUBDERE)
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-subtle)",
                  margin: "0 0 0.75rem",
                }}
              >
                Información oficial reportada por la Municipalidad de {nombreComuna}
              </p>

              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                  marginBottom: "1rem",
                }}
              >
                🏛️ <strong>Cobertura SINIM: 345/346</strong> · Comuna faltante (Antártica, sin administración propia) es administrada por Cabo de Hornos y complementada desde el Censo 2024 INE.
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Presupuesto Vigente Total
                  </span>
                  <strong
                    style={{
                      fontFamily: "monospace",
                      color: "var(--ok)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {formatCLP(presVigente)}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Presupuesto Per Cápita
                  </span>
                  <strong
                    style={{
                      fontFamily: "monospace",
                      color: "var(--text-primary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {formatCLP(perCapita)} / habitante
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Ingresos Totales Percibidos
                  </span>
                  <strong
                    style={{
                      fontFamily: "monospace",
                      color: "var(--text-primary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {muniData.ingresos_totales_clp
                      ? formatCLP(muniData.ingresos_totales_clp)
                      : "—"}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.8rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Ingresos por Fondo Común Municipal
                  </span>
                  <strong
                    style={{
                      fontFamily: "monospace",
                      color: "var(--warn)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {muniData.fcm_ingresos_clp
                      ? formatCLP(muniData.fcm_ingresos_clp)
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Análisis de Autonomía vs FCM */}
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div
                  className="section-title"
                  style={{ marginBottom: "0.2rem" }}
                >
                  🏛️ Dependencia del Fondo Común Municipal
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-subtle)",
                    margin: "0 0 1rem",
                  }}
                >
                  Proporción de ingresos generados localmente vs transferencias redistributivas
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.78rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>
                      Dependencia FCM:
                    </span>
                    <strong
                      style={{
                        fontFamily: "monospace",
                        color: fcmPct > 60 ? "var(--warn)" : "var(--ok)",
                      }}
                    >
                      {fcmPct.toFixed(1)}%
                    </strong>
                  </div>
                  <div
                    style={{
                      height: 12,
                      borderRadius: 99,
                      background: "var(--surface-2)",
                      overflow: "hidden",
                      display: "flex",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, fcmPct)}%`,
                        background:
                          fcmPct > 60
                            ? "var(--warn)"
                            : "var(--ok)",
                      }}
                    />
                    <div
                      style={{
                        width: `${Math.max(0, 100 - fcmPct)}%`,
                        background: "var(--info-bg)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.68rem",
                      color: "var(--text-subtle)",
                      marginTop: "0.3rem",
                    }}
                  >
                    <span>FCM ({fcmPct.toFixed(1)}%)</span>
                    <span>Ingresos Propios ({(100 - fcmPct).toFixed(1)}%)</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "0.85rem",
                    borderRadius: 8,
                    background: "var(--bg-surface-2)",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {fcmPct < 30 ? (
                    <span>
                      🟢 <strong>Alta Autonomía Financiera:</strong> La
                      Municipalidad de {nombreComuna} financia la mayor parte de
                      sus operaciones mediante ingresos propios (patentes, permisos
                      y derechos municipales) y transfiere recursos al FCM.
                    </span>
                  ) : fcmPct > 60 ? (
                    <span>
                      🟠 <strong>Alta Dependencia del FCM:</strong> Más del 60%
                      de los ingresos comunales provienen del Fondo Común
                      Municipal, lo que evidencia el rol del mecanismo
                      redistributivo del Estado.
                    </span>
                  ) : (
                    <span>
                      🔵 <strong>Autonomía Media:</strong> La comuna mantiene un
                      balance mixto entre ingresos locales propios y aportes
                      redistributivos del Fondo Común Municipal.
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: "0.72rem",
                  color: "var(--text-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <span>Fuente: Sistema Nacional de Información Municipal (SINIM / SUBDERE) · Partidas Variables M1 (Inicial), M2 (Vigente), M3 (Ingresos Propios), M4 (Gasto Personal) · Período 2025</span>
                <a
                  href="https://datos.sinim.gov.cl/datos_municipales.php"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "underline" }}
                >
                  datos.sinim.gov.cl ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PESTAÑA 2: PERSONAL & REMUNERACIONES (CPLT) ══════════════════════ */}
      {activeTab === "personal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {/* Alerta de Desfase de Transparencia Activa Ley 20.285 (>90 días) */}
          {esDesfasado && (
            <div
              role="alert"
              style={{
                padding: "1rem 1.25rem",
                borderRadius: 10,
                background: "var(--warn-bg)",
                border: "1px solid var(--warn)",
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <strong style={{ color: "var(--warn)", fontSize: "0.92rem", display: "block" }}>
                  Nómina con {desfaseMeses} meses de desfase respecto a la fecha actual
                </strong>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, display: "block", marginTop: "0.2rem" }}>
                  Fuente oficial: Transparencia Activa CPLT (Ley 20.285). La última declaración publicada por la Municipalidad de {nombreComuna} corresponde al período {muniData.periodo_cplt_reciente || "no informado"}.
                </span>
              </div>
            </div>
          )}

          {/* Selector Compacto Jerárquico de Períodos Históricos CPLT (Año -> Mes) */}
          {periodosDisponibles.length > 0 && (
            <div className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    📅 Declaraciones de Nómina CPLT
                  </span>
                  <span className="badge" style={{ fontSize: "0.68rem", background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
                    {periodosDisponibles.length} meses históricos
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {selectedPeriodInfo?.es_parcial && (
                    <span className="badge badge-warn" style={{ fontSize: "0.68rem" }}>
                      ⚠️ Declaración parcial ({selectedPeriodInfo.count.toLocaleString("es-CL")} reg.)
                    </span>
                  )}
                  <span className="badge badge-info" style={{ fontSize: "0.72rem", fontFamily: "monospace" }}>
                    Período activo: {selectedPeriodInfo?.etiqueta || selectedPeriod}
                  </span>
                </div>
              </div>

              {/* Nivel 1: Selector de Año */}
              {availableYears.length > 1 && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.35rem" }}>
                    1. Seleccionar Año
                  </div>
                  <div role="tablist" aria-label="Años disponibles" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {availableYears.map((year) => {
                      const isActive = year === selectedYear;
                      return (
                        <button
                          key={year}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          aria-pressed={isActive}
                          onClick={() => handleYearChange(year)}
                          className="btn-year"
                          style={{
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            padding: "0.35rem 0.85rem",
                            borderRadius: 8,
                            fontWeight: isActive ? 800 : 600,
                            border: isActive ? "2px solid var(--accent)" : "1px solid var(--border)",
                            background: isActive ? "var(--accent)" : "var(--bg-surface-2)",
                            color: isActive ? "var(--bg)" : "var(--text-primary)",
                            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Nivel 2: Meses disponibles del año seleccionado (máx 12) */}
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  2. Mes de nómina ({monthsInSelectedYear.length} disponibles en {selectedYear})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {monthsInSelectedYear.map((p) => {
                    const activo = p.periodo === selectedPeriod;
                    return (
                      <button
                        key={p.periodo}
                        type="button"
                        onClick={() => setSelectedPeriod(p.periodo)}
                        aria-pressed={activo}
                        aria-label={`Seleccionar período ${p.etiqueta}`}
                        className="capsule"
                        style={{
                          cursor: "pointer",
                          fontFamily: "monospace",
                          fontSize: "0.74rem",
                          padding: "0.35rem 0.7rem",
                          borderRadius: 99,
                          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                          border: activo
                            ? "1px solid var(--accent)"
                            : p.es_parcial
                            ? "1px dashed var(--warn)"
                            : "1px solid var(--border-subtle)",
                          background: activo
                            ? "var(--accent)"
                            : p.es_parcial
                            ? "var(--warn-bg)"
                            : "var(--bg-surface-2)",
                          color: activo
                            ? "var(--bg)"
                            : p.es_parcial
                            ? "var(--warn)"
                            : "var(--text-primary)",
                          fontWeight: activo ? 800 : 500,
                          boxShadow: activo ? "0 0 10px var(--accent-glow)" : "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        <span>{p.etiqueta}</span>
                        <span style={{ opacity: 0.8, fontSize: "0.66rem" }}>
                          ({p.count.toLocaleString("es-CL")}{p.es_parcial ? " ⚠️" : ""})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Ficha Alcalde/sa + KPIs Personal */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {/* Alcalde/sa Box */}
            <div
              className="card"
              style={{
                padding: "1.5rem",
                borderTop: `3px solid ${brandingAlcalde.color_oficial || "var(--accent)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.75rem",
                }}
              >
                <div>
                  <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
                    Máxima Autoridad Comunal
                  </span>
                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      margin: "0.35rem 0 0",
                    }}
                  >
                    {alcalde?.nombre || "Alcaldía en ejercicio"}
                  </h3>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.2rem 0.55rem",
                    borderRadius: 6,
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "var(--surface)",
                    backgroundColor: brandingAlcalde.color_oficial,
                  }}
                >
                  {brandingAlcalde.logo_url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={brandingAlcalde.logo_url}
                      alt={brandingAlcalde.sigla}
                      style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }}
                    />
                  )}
                  {brandingAlcalde.sigla || brandingAlcalde.nombre}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginTop: "1rem",
                }}
              >
                <div
                  style={{
                    padding: "0.75rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                    Sueldo Bruto Mensual
                  </span>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: "var(--ok)",
                      marginTop: "0.15rem",
                    }}
                  >
                    {formatCLP(alcalde?.remuneracion_bruta)}
                  </div>
                </div>

                <div
                  style={{
                    padding: "0.75rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                    Sueldo Líquido
                  </span>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      marginTop: "0.15rem",
                    }}
                  >
                    {formatCLP(alcalde?.remuneracion_liquida)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "0.85rem",
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <div>
                  <strong>Grado EUS:</strong> Grado {alcalde?.grado_eus || "1"}
                </div>
                {alcalde?.formacion && (
                  <div>
                    <strong>Profesión / Formación:</strong> {alcalde.formacion}
                  </div>
                )}
              </div>
            </div>

            {/* Dotación & Composición (M4) */}
            {currentResumenPersonal && (
              <div className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.2rem" }}>
                  <div
                    className="section-title"
                    style={{ marginBottom: "0.2rem" }}
                  >
                    👥 Composición de la Dotación Comunal
                  </div>
                  <span
                    title="Ámbito de dotación: Corresponde a la dotación comunal completa registrada en Transparencia Activa CPLT, consolidando la administración central municipal (Planta, Contrata y Honorarios) junto al personal sectorial de salud (Ley 19.378) y educación (DAEM / Código del Trabajo)."
                    style={{
                      color: "var(--accent)",
                      cursor: "help",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                  >
                    Ámbito ⓘ
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", margin: "0 0 0.8rem" }}>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-subtle)",
                      margin: 0,
                    }}
                  >
                    Dotación de <strong>{formatNum(currentResumenPersonal.total_funcionarios)}</strong> funcionarios en <strong>{selectedPeriodInfo?.etiqueta || selectedPeriod}</strong>
                  </p>
                  <span className="badge badge-info" style={{ fontSize: "0.68rem", fontFamily: "monospace" }}>
                    Período: {selectedPeriodInfo?.etiqueta || selectedPeriod}
                  </span>
                </div>

                {/* Stacked bar */}
                <div
                  style={{
                    height: 18,
                    borderRadius: 99,
                    overflow: "hidden",
                    display: "flex",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: `${(currentResumenPersonal.planta / (currentResumenPersonal.total_funcionarios || 1)) * 100}%`,
                      background: "var(--accent)",
                    }}
                    title={`Planta: ${currentResumenPersonal.planta}`}
                  />
                  <div
                    style={{
                      width: `${(currentResumenPersonal.contrata / (currentResumenPersonal.total_funcionarios || 1)) * 100}%`,
                      background: "var(--ok)",
                    }}
                    title={`Contrata: ${currentResumenPersonal.contrata}`}
                  />
                  <div
                    style={{
                      width: `${(currentResumenPersonal.honorarios / (currentResumenPersonal.total_funcionarios || 1)) * 100}%`,
                      background: "var(--warn)",
                    }}
                    title={`Honorarios: ${currentResumenPersonal.honorarios}`}
                  />
                  <div
                    style={{
                      width: `${(currentResumenPersonal.codigo_trabajo_salud_educacion / (currentResumenPersonal.total_funcionarios || 1)) * 100}%`,
                      background: "var(--info)",
                    }}
                    title={`Salud / Educación: ${currentResumenPersonal.codigo_trabajo_salud_educacion}`}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)" }}>
                    <span style={{ width: 10, height: 10, background: "var(--accent)", borderRadius: 2 }} />
                    <strong>{formatNum(currentResumenPersonal.planta)}</strong> Planta
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)" }}>
                    <span style={{ width: 10, height: 10, background: "var(--ok)", borderRadius: 2 }} />
                    <strong>{formatNum(currentResumenPersonal.contrata)}</strong> Contrata
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)" }}>
                    <span style={{ width: 10, height: 10, background: "var(--warn)", borderRadius: 2 }} />
                    <strong>{formatNum(currentResumenPersonal.honorarios)}</strong> Honorarios
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)" }}>
                    <span style={{ width: 10, height: 10, background: "var(--info)", borderRadius: 2 }} />
                    <strong>{formatNum(currentResumenPersonal.codigo_trabajo_salud_educacion)}</strong> Salud/Educación
                  </div>
                </div>

                {currentResumenPersonal.masa_mensual_clp ? (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.73rem", color: "var(--text-muted)" }}>
                    Masa salarial mensual del período: <strong style={{ color: "var(--ok)", fontFamily: "monospace" }}>{formatCLP(currentResumenPersonal.masa_mensual_clp)}</strong>
                  </div>
                ) : null}

                {/* Nota al pie: Total histórico consolidado deduplicado */}
                <div
                  style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.6rem",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "0.7rem",
                    color: "var(--text-subtle)",
                    lineHeight: 1.35,
                  }}
                >
                  * Total histórico consolidado en el sistema: <strong>{formatNum(muniData.resumen_personal?.total_funcionarios || 0)}</strong> personas físicas registradas a lo largo de {periodosDisponibles.length} declaraciones mensuales CPLT.
                </div>

                {currentResumenPersonal.es_parcial && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.45rem 0.65rem",
                      background: "var(--warn-bg)",
                      borderRadius: 6,
                      border: "1px solid var(--warn)",
                      fontSize: "0.72rem",
                      color: "var(--warn)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span>⚠️</span>
                    <span>
                      <strong>Declaración parcial:</strong> Este período registra {formatNum(currentResumenPersonal.total_funcionarios)} funcionarios (publicación preliminar o segmentada en la fuente CPLT).
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {integrityAnomalies.length > 0 && (
            <div className="card" role="alert" style={{ padding: "1.25rem", borderColor: "var(--bad)" }}>
              <div className="section-title" style={{ marginBottom: "0.4rem", color: "var(--bad)" }}>
                Hallazgos de integridad ALTA (V7)
              </div>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                Estas filas provienen de la fuente oficial, exceden los límites de plausibilidad y fueron excluidas de totales y rankings normales sin alterar su evidencia.
              </p>
              {integrityAnomalies.map((anomaly) => (
                <div key={anomaly.id} style={{ padding: "0.6rem 0", borderTop: "1px solid var(--border-subtle)", fontSize: "0.76rem" }}>
                  <strong>{anomaly.record.nombre_completo || anomaly.id}</strong>{" · "}
                  {anomaly.violations.includes("sueldo_mensual") && `remuneración ${formatCLP(anomaly.record.remuneracion_bruta_mensual)}`}
                  {anomaly.violations.length > 1 && " · "}
                  {anomaly.violations.includes("horas_extras") && `${anomaly.record.horas_extras_mes_anterior ?? 0} horas extra`}
                  {anomaly.source_url && (
                    <> · <a href={anomaly.source_url} target="_blank" rel="noopener noreferrer">ver fuente oficial ↗</a></>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Top Remuneraciones M1 */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div>
                <div
                  className="section-title"
                  style={{ marginBottom: "0.2rem" }}
                >
                  📋 Top Remuneraciones Brutas Totales
                </div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-subtle)",
                    margin: 0,
                  }}
                >
                  Ordenado por sueldo bruto total (base + horas extras), con idéntico criterio que el buscador de funcionarios.
                </p>
              </div>
              <span className="badge badge-info" style={{ fontSize: "0.7rem", fontFamily: "monospace" }}>
                Período nómina: {selectedPeriodInfo?.etiqueta || selectedPeriod}
              </span>
            </div>

            {topRemuneraciones.length === 0 ? (
              <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center" }}>
                Sin registros de remuneraciones informadas en {selectedPeriodInfo?.etiqueta || selectedPeriod}.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
                {topRemuneraciones.map((r, i) => (
                  <div
                    key={r.id || i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.75rem 0.95rem",
                      background: "var(--bg-surface-2)",
                      borderRadius: 8,
                      border: "1px solid var(--border-subtle)",
                      flexWrap: "wrap",
                      gap: "0.6rem",
                    }}
                  >
                    <div style={{ flex: "1 1 300px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--accent)" }}>#{i + 1}</span>
                        <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>
                          {r.nombre}
                        </strong>
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        {r.cargo} · <span style={{ color: "var(--accent)", fontWeight: 600 }}>{r.tipo_contrato}</span>
                        {r.grado_eus && r.grado_eus !== "—" && (
                          <span> · Grado {r.grado_eus}</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "var(--text-subtle)", fontFamily: "monospace", marginTop: "0.25rem" }}>
                        Base {formatCLP(r.sueldo_base ?? r.remuneracion_bruta)} · HH.EE. {formatCLP(r.horas_extras_monto ?? 0)} ({r.horas_extras_hrs ?? 0} hrs) · Total {formatCLP(r.remuneracion_bruta)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                        Sueldo Bruto Total
                      </div>
                      <strong style={{ fontFamily: "monospace", color: "var(--ok)", fontSize: "1.05rem", fontWeight: 800 }}>
                        {formatCLP(r.remuneracion_bruta)}
                      </strong>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", marginTop: "0.1rem" }}>
                        Líquido: {formatCLP(r.remuneracion_liquida)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nómina Interactiva Completa */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  margin: "0 0 0.3rem",
                  color: "var(--text-primary)",
                }}
              >
                📋 Buscador y Nómina Completa de Funcionarios
              </h2>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Consulta directa de la dotación de la Municipalidad de {nombreComuna} en el período {selectedPeriodInfo?.etiqueta || selectedPeriod} con sueldos brutos, líquidos, estamentos y asignaciones.
              </p>
            </div>

            <OrganismoFuncionariosList
              organismoId={muniData.id}
              nombreOrganismo={`Municipalidad de ${nombreComuna}`}
              periodo={selectedPeriod}
              periodoEtiqueta={selectedPeriodInfo?.etiqueta || selectedPeriod}
            />
          </div>
        </div>
      )}

      {/* ═══ PESTAÑA 3: COMPRAS PÚBLICAS (OCDS) (M2) ═════════════════════════ */}
      {activeTab === "compras" && (() => {
        const procesos = compras?.procesos || [];
        const totalProcesosCount = compras?.procesos_count ?? procesos.length;
        const totalOrdenesCount = compras?.ordenes_count ?? null;

        // Filtro por modalidad
        let filteredProcesos = [...procesos];
        if (comprasFilter === "licitacion") {
          filteredProcesos = filteredProcesos.filter(p => p.modalidad.toLowerCase().includes("licitaci"));
        } else if (comprasFilter === "trato_directo") {
          filteredProcesos = filteredProcesos.filter(p => p.modalidad.toLowerCase().includes("trato"));
        } else if (comprasFilter === "convenio_marco") {
          filteredProcesos = filteredProcesos.filter(p => p.modalidad.toLowerCase().includes("convenio"));
        }

        // Búsqueda
        const q = comprasSearch.trim().toLowerCase();
        if (q) {
          filteredProcesos = filteredProcesos.filter(p =>
            p.titulo_proceso.toLowerCase().includes(q) ||
            p.proveedor_adjudicado.toLowerCase().includes(q) ||
            p.ocid_padre.toLowerCase().includes(q) ||
            p.ordenes_compra.some(o => (o.titulo ?? "").toLowerCase().includes(q) || (o.ocid ?? "").toLowerCase().includes(q))
          );
        }

        // Ordenamiento
        filteredProcesos.sort((a, b) => {
          if (comprasSort === "monto_desc") {
            return (b.monto_adjudicado_clp || 0) - (a.monto_adjudicado_clp || 0);
          }
          return String(b.fecha_proceso || "").localeCompare(String(a.fecha_proceso || ""));
        });

        const licitacionesCount = procesos.filter(p => p.modalidad.toLowerCase().includes("licitaci")).length;
        const conveniosCount = procesos.filter(p => p.modalidad.toLowerCase().includes("convenio")).length;
        const tratosCount = procesos.filter(p => p.modalidad.toLowerCase().includes("trato")).length;

        const visibleProcesos = filteredProcesos.slice(0, comprasVisibleCount);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {compras ? (
              <>
                {(compras.anomalias_integridad?.length ?? 0) > 0 && (
                  <div className="card" style={{ padding: "1.25rem", border: "1px solid var(--warn)" }}>
                    <strong style={{ color: "var(--warn)", display: "block", marginBottom: "0.35rem" }}>
                      Hallazgo de integridad ALTA (V7) · valor oficial preservado
                    </strong>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {compras.anomalias_integridad?.length} orden(es) oficial(es) fuera del límite de sanidad fueron excluidas de totales y rankings, sin alterar su evidencia de origen.
                    </p>
                    <ul style={{ margin: "0.65rem 0 0", paddingLeft: "1.2rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {compras.anomalias_integridad?.map((anomaly) => (
                        <li key={anomaly.id ?? `${anomaly.titulo}-${anomaly.monto_oficial_clp}`}>
                          {anomaly.titulo ?? "Orden oficial sin título"} · {formatCLP(anomaly.monto_oficial_clp)}{anomaly.source_url ? <> · <a href={anomaly.source_url} target="_blank" rel="noopener noreferrer">fuente ↗</a></> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Métricas Generales M2 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <div className="card" style={{ padding: "1.25rem" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                      Monto Total Transado
                    </span>
                    <div style={{ fontFamily: "monospace", fontSize: "1.35rem", fontWeight: 900, color: "var(--warn)", marginTop: "0.2rem" }}>
                      {formatCompactCLP(compras.monto_total_clp)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      Total adjudicado MercadoPúblico OCDS
                    </div>
                  </div>

                  <div className="card" style={{ padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                        Jerarquía de Contrataciones
                      </span>
                      <span
                        title="Jerarquía OCDS: Los procesos corresponden a convocatorias o licitaciones públicas, convenios marco y tratos directos en MercadoPúblico. Cada proceso agrupa una o más órdenes de compra individuales emitidas."
                        style={{
                          color: "var(--accent)",
                          cursor: "help",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        Jerarquía ⓘ
                      </span>
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: "1.25rem", fontWeight: 900, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                      {totalProcesosCount} procesos · {totalOrdenesCount ?? "—"} órdenes de compra
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {totalOrdenesCount === null
                        ? "La fuente consultada no entrega un conteo verificable de órdenes"
                        : `${totalOrdenesCount} órdenes de compra agrupadas en ${totalProcesosCount} procesos OCDS`}
                    </div>
                  </div>
                </div>

                {/* Listado y Buscador de Procesos */}
                <div className="card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div>
                      <div className="section-title" style={{ marginBottom: "0.2rem" }}>
                        🛒 Contrataciones Públicas y Adquisiciones OCDS — Procesos y Órdenes
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", margin: 0 }}>
                        Explora los procesos de contratación pública y despliega las órdenes de compra hijas asociadas
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
                        Ordenar por:
                      </label>
                      <select
                        value={comprasSort}
                        onChange={(e) => setComprasSort(e.target.value as "monto_desc" | "fecha_desc")}
                        className="input"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem", borderRadius: 6 }}
                      >
                        <option value="monto_desc">Mayor Monto Proceso</option>
                        <option value="fecha_desc">Más Recientes</option>
                      </select>
                    </div>
                  </div>

                  {/* Barra de Filtros y Búsqueda */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
                    <div style={{ flex: "1 1 280px" }}>
                      <input
                        type="text"
                        placeholder="Buscar por proceso, proveedor, código OCID..."
                        value={comprasSearch}
                        onChange={(e) => {
                          setComprasSearch(e.target.value);
                          setComprasVisibleCount(10);
                        }}
                        className="input"
                        style={{ width: "100%", padding: "0.5rem 0.85rem", fontSize: "0.82rem", borderRadius: 6 }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => { setComprasFilter("todas"); setComprasVisibleCount(10); }}
                        className="btn"
                        style={{
                          padding: "0.4rem 0.75rem",
                          fontSize: "0.75rem",
                          borderRadius: 6,
                          background: comprasFilter === "todas" ? "var(--accent)" : "var(--surface-2)",
                          color: comprasFilter === "todas" ? "var(--surface)" : "var(--text-muted)",
                          border: "1px solid var(--border)",
                          fontWeight: comprasFilter === "todas" ? 700 : 500,
                        }}
                      >
                        Todos ({procesos.length})
                      </button>

                      {licitacionesCount > 0 && (
                        <button
                          type="button"
                          onClick={() => { setComprasFilter("licitacion"); setComprasVisibleCount(10); }}
                          className="btn"
                          style={{
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.75rem",
                            borderRadius: 6,
                            background: comprasFilter === "licitacion" ? "var(--ok)" : "var(--surface-2)",
                            color: comprasFilter === "licitacion" ? "var(--surface)" : "var(--text-muted)",
                            border: "1px solid var(--border)",
                            fontWeight: comprasFilter === "licitacion" ? 700 : 500,
                          }}
                        >
                          Licitaciones ({licitacionesCount})
                        </button>
                      )}

                      {conveniosCount > 0 && (
                        <button
                          type="button"
                          onClick={() => { setComprasFilter("convenio_marco"); setComprasVisibleCount(10); }}
                          className="btn"
                          style={{
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.75rem",
                            borderRadius: 6,
                            background: comprasFilter === "convenio_marco" ? "var(--accent)" : "var(--surface-2)",
                            color: comprasFilter === "convenio_marco" ? "var(--surface)" : "var(--text-muted)",
                            border: "1px solid var(--border)",
                            fontWeight: comprasFilter === "convenio_marco" ? 700 : 500,
                          }}
                        >
                          Convenio Marco ({conveniosCount})
                        </button>
                      )}

                      {tratosCount > 0 && (
                        <button
                          type="button"
                          onClick={() => { setComprasFilter("trato_directo"); setComprasVisibleCount(10); }}
                          className="btn"
                          style={{
                            padding: "0.4rem 0.75rem",
                            fontSize: "0.75rem",
                            borderRadius: 6,
                            background: comprasFilter === "trato_directo" ? "var(--warn)" : "var(--surface-2)",
                            color: comprasFilter === "trato_directo" ? "var(--surface)" : "var(--text-muted)",
                            border: "1px solid var(--border)",
                            fontWeight: comprasFilter === "trato_directo" ? 700 : 500,
                          }}
                        >
                          Trato Directo ({tratosCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Listado de Procesos con Acordeón de Órdenes */}
                  {visibleProcesos.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                      {visibleProcesos.map((p, i) => {
                        const badge = getModalityBadge(p.ocid_padre, p.titulo_proceso);
                        const isExpanded = expandedProcesses.has(p.id);
                        const childOrders = p.ordenes_compra || [];

                        return (
                          <div
                            key={p.id || p.ocid_padre || i}
                            style={{
                              padding: "1.1rem",
                              background: "var(--bg-surface-2)",
                              borderRadius: 10,
                              border: "1px solid var(--border)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.85rem" }}>
                              <div style={{ flex: "1 1 340px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                                  <span
                                    style={{
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: 4,
                                      background: badge.bg,
                                      color: badge.color,
                                      border: `1px solid ${badge.border}`,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.03em",
                                    }}
                                  >
                                    {badge.label}
                                  </span>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                                    {formatCompraDate(p.fecha_proceso)}
                                  </span>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                                    OCID: {p.ocid_padre}
                                  </span>
                                </div>

                                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.35, margin: "0 0 0.35rem" }}>
                                  {p.titulo_proceso}
                                </h4>

                                <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                  <span>🏢 Proveedor adjudicado:</span>
                                  <strong style={{ color: "var(--text-primary)" }}>{p.proveedor_adjudicado}</strong>
                                </div>
                              </div>

                              <div style={{ textAlign: "right", minWidth: "160px" }}>
                                <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                                  Monto Adjudicado Proceso
                                </div>
                                <strong style={{ fontFamily: "monospace", color: "var(--ok)", fontSize: "1.1rem", fontWeight: 900 }}>
                                  {formatCLP(p.monto_adjudicado_clp)}
                                </strong>

                                <div style={{ marginTop: "0.5rem" }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleProcess(p.id)}
                                    className="btn"
                                    style={{
                                      fontSize: "0.74rem",
                                      padding: "0.3rem 0.65rem",
                                      borderRadius: 6,
                                      background: isExpanded ? "var(--accent)" : "var(--surface)",
                                      color: isExpanded ? "var(--surface)" : "var(--accent)",
                                      border: "1px solid var(--accent)",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {isExpanded
                                      ? `▲ Ocultar órdenes (${childOrders.length})`
                                      : `▼ Ver ${childOrders.length} orden${childOrders.length > 1 ? "es" : ""} de compra`}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Acordeón de Órdenes Hijas */}
                            {isExpanded && (
                              <div
                                style={{
                                  marginTop: "1rem",
                                  paddingTop: "0.85rem",
                                  borderTop: "1px dashed var(--border)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.5rem",
                                }}
                              >
                                <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase" }}>
                                  Órdenes de Compra Hijas ({childOrders.length})
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                                  {childOrders.map((co, cIdx) => (
                                    <div
                                      key={co.ocid || cIdx}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "0.55rem 0.75rem",
                                        background: "var(--surface)",
                                        borderRadius: 6,
                                        border: "1px solid var(--border-subtle)",
                                        fontSize: "0.75rem",
                                        flexWrap: "wrap",
                                        gap: "0.4rem",
                                      }}
                                    >
                                      <div>
                                        <span style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 700 }}>
                                          {co.ocid}
                                        </span>
                                        <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                          {co.titulo}
                                        </span>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                                          {formatCompraDate(co.fecha)}
                                        </span>
                                        <strong style={{ fontFamily: "monospace", color: "var(--ok)", fontSize: "0.85rem" }}>
                                          {formatCLP(co.monto_clp)}
                                        </strong>
                                        <a
                                          href={co.url || `https://api.mercadopublico.cl/APISOCDS/OCDS/award/${encodeURIComponent(co.ocid ?? "")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.7rem", fontWeight: 700 }}
                                        >
                                          Ver ↗
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: "2rem", textAlign: "center", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                      <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.85rem" }}>
                        No se encontraron procesos de contratación que coincidan con los filtros.
                      </p>
                    </div>
                  )}

                  {/* Nota al pie M2 */}
                  <div
                    style={{
                      marginTop: "1.25rem",
                      paddingTop: "0.85rem",
                      borderTop: "1px solid var(--border-subtle)",
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <span>
                      📌 <strong>Nota OCDS:</strong> {totalOrdenesCount === null
                        ? `la fuente acredita ${totalProcesosCount} procesos; no publica un conteo verificable de órdenes.`
                        : `${totalOrdenesCount} órdenes de compra agrupadas en ${totalProcesosCount} procesos.`}
                    </span>
                    <span style={{ color: "var(--text-subtle)" }}>
                      Fuente: MercadoPúblico / Estándar OCDS ChileCompra
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", margin: 0 }}>
                  No se registran contrataciones públicas para esta municipalidad en el período analizado.
                </p>
              </div>
            )}
          </div>
        );
      })()}


      {/* ═══ PESTAÑA 4: CONCEJO MUNICIPAL & RADIOGRAFÍA ═══════════════════════ */}
      {activeTab === "concejo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Concejo Municipal */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div
              className="section-title"
              style={{ marginBottom: "0.2rem" }}
            >
              🏛️ Concejo Municipal (SERVEL 2024 - 2028)
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-subtle)",
                margin: "0 0 1rem",
              }}
            >
              Concejales electos, filiación partidaria y dieta mensual estimada
            </p>

            {concejales.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {concejales.map((c, i) => {
                  const cBranding = getPartidoConfig(c.partido || "Independiente");
                  return (
                    <div
                      key={c.id || i}
                      style={{
                        padding: "0.85rem",
                        background: "var(--bg-surface-2)",
                        border: "1px solid var(--border-subtle)",
                        borderLeft: `3px solid ${cBranding.color_oficial || "var(--accent)"}`,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                        {c.nombre}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {cBranding.logo_url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={cBranding.logo_url}
                            alt={c.partido || "IND"}
                            style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }}
                          />
                        )}
                        <span>{c.partido} {c.pacto ? `· ${c.pacto}` : ""}</span>
                      </div>

                      {c.dieta_mensual_estimada_clp && (
                        <div style={{ fontSize: "0.72rem", color: "var(--ok)", fontFamily: "monospace", marginTop: "0.3rem", fontWeight: 700 }}>
                          Dieta: {formatCLP(c.dieta_mensual_estimada_clp)}/m
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "1.25rem",
                  background: "var(--bg-surface-2)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.3rem" }}>🗳️</span>
                <div>
                  <strong style={{ color: "var(--text-primary)" }}>Nómina del Concejo Municipal en incorporación oficial SERVEL 2024.</strong>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                    Conforme al estándar de máxima integridad pública, los concejales electos se publicarán al concluir el cruce oficial de escrutinio comunal del Servicio Electoral (cero datos sintéticos).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Radiografía Comunal Demográfica y Electoral */}
          {radiografia && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <div
                className="section-title"
                style={{ marginBottom: "0.2rem" }}
              >
                📍 Radiografía Demográfica y Electoral (Censo 2024 + SERVEL)
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-subtle)",
                  margin: "0 0 1rem",
                }}
              >
                Indicadores oficiales del Instituto Nacional de Estadísticas y Servicio Electoral
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <div style={{ padding: "0.75rem", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Población 2024</span>
                  <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                    {muniData.poblacion_censo_2024 ? `${formatNum(muniData.poblacion_censo_2024)} hab.` : "—"}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Padrón Electoral</span>
                  <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                    {formatNum(radiografia.padron_electoral_servel)} electores
                  </div>
                </div>

                <div style={{ padding: "0.75rem", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Participación SERVEL</span>
                  <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "var(--ok)", marginTop: "0.15rem" }}>
                    {radiografia.participacion_electoral_pct}%
                  </div>
                </div>

                <div style={{ padding: "0.75rem", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Viviendas Censadas</span>
                  <div style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                    {formatNum(radiografia.viviendas_censo_2024)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PESTAÑA 5: AUDITORÍAS CGR & CONTROL (M3) ═════════════════════════ */}
      {activeTab === "control" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card" style={{ padding: "1.5rem" }}>
            <div
              className="section-title"
              style={{ marginBottom: "0.2rem" }}
            >
              ⚖️ Informes y Auditorías de Contraloría General de la República
            </div>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-subtle)",
                margin: "0 0 1rem",
              }}
            >
              Fiscalizaciones, auditorías e investigaciones especiales emitidas por la CGR sobre la Municipalidad de {nombreComuna}
            </p>

            {auditorias.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: "var(--ok-bg)",
                    border: "1px solid var(--ok)",
                    borderRadius: 8,
                    fontSize: "0.75rem",
                    color: "var(--ok)",
                    fontWeight: 600,
                  }}
                >
                  ✓ Se encontraron {auditorias.length} informe(s) de fiscalización oficial para esta comuna en la base nacional SIAPER.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {auditorias.map((a, i) => (
                    <div
                      key={a.id || i}
                      style={{
                        padding: "1rem",
                        background: "var(--bg-surface-2)",
                        borderRadius: 8,
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 300px" }}>
                          <span className="badge badge-warn" style={{ fontSize: "0.65rem", marginBottom: "0.3rem" }}>
                            {a.tipo || "Auditoría / Fiscalización CGR"}
                          </span>
                          <h4 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", margin: "0.25rem 0 0.35rem", lineHeight: 1.35 }}>
                            {a.titulo}
                          </h4>
                          {a.area && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              Área: {a.area}
                            </div>
                          )}
                        </div>
                        {a.fecha && (
                          <span style={{ fontSize: "0.74rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                            {a.fecha}
                          </span>
                        )}
                      </div>
                      {a.url && (
                        <div style={{ marginTop: "0.6rem" }}>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "0.76rem",
                              color: "var(--accent)",
                              textDecoration: "none",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            Ver informe oficial en Portal CGR ↗
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                  {auditorias.length} informe(s) oficial(es) vinculados a esta comuna en la proyección local.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div
                  style={{
                    padding: "1rem 1.2rem",
                    borderRadius: 8,
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <p style={{ color: "var(--text-primary)", fontSize: "0.85rem", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
                    La proyección CGR local no contiene coincidencias verificables para el CUT <strong>{cut}</strong> y la razón social oficial de esta comuna.
                  </p>
                  <div>
                    <a
                      href={`https://www.contraloria.cl/portal-cgr/buscador-informes?q=${encodeURIComponent("Municipalidad de " + nombreComuna)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      Buscar en Portal CGR ↗
                    </a>
                  </div>
                </div>

                <div
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: 8,
                    background: "var(--info-bg)",
                    border: "1px solid var(--border)",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                    📊 Cobertura de esta ficha: sin coincidencias verificables
                  </div>
                  <div>
                    Puedes comprobar el funcionamiento del cruce de auditorías en comunas con informes publicados:{" "}
                    <Link href="/municipalidades/muni-lascondes" style={{ color: "var(--accent)", fontWeight: 700 }}>
                      Las Condes
                    </Link>
                    {", "}
                    <Link href="/municipalidades/muni-quilicura" style={{ color: "var(--accent)", fontWeight: 700 }}>
                      Quilicura
                    </Link>
                    {", "}
                    <Link href="/municipalidades/muni-chillan" style={{ color: "var(--accent)", fontWeight: 700 }}>
                      Chillán
                    </Link>
                    .
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
