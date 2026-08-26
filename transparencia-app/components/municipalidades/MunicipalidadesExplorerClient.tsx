"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MunicipalidadListItem } from "@/lib/municipalidades-list";
import { getPartidoConfig } from "@/lib/partidos.config";
import ShareButton from "@/components/ShareButton";

interface MunicipalidadesExplorerClientProps {
  initialData: MunicipalidadListItem[];
  stats: {
    totalComunas: number;
    conAlcaldeCount: number;
    conPresupuestoCount: number;
    totalPresupuestoVigente: number;
    totalFuncionarios: number;
    totalMasaMensual: number;
    alDiaCount?: number;
    desfasadoCount?: number;
    sinDatosCount?: number;
  };
}

function formatCompactCLP(n: number | null | undefined): string {
  if (n === null || n === undefined || n <= 0) return "—";
  if (n >= 1_000_000_000_000)
    return `$${(n / 1_000_000_000_000).toLocaleString("es-CL", {
      maximumFractionDigits: 1,
    })} billones`;
  if (n >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toLocaleString("es-CL", {
      maximumFractionDigits: 0,
    })} mil millones`;
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toLocaleString("es-CL", {
      maximumFractionDigits: 0,
    })} MM`;
  return `$${n.toLocaleString("es-CL")}`;
}

function formatCLP(n: number | null | undefined): string {
  if (n === null || n === undefined || n <= 0) return "—";
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("es-CL");
}

export default function MunicipalidadesExplorerClient({
  initialData,
  stats,
}: MunicipalidadesExplorerClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados de filtrado sincronizados con URL
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [regionFilter, setRegionFilter] = useState(
    searchParams.get("region") || "Todas"
  );
  const [sizeFilter, setSizeFilter] = useState(
    searchParams.get("tamano") || "Todos"
  );
  const [fcmFilter, setFcmFilter] = useState(
    searchParams.get("fcm") || "Todos"
  );
  const [perCapitaFilter, setPerCapitaFilter] = useState(
    searchParams.get("percapita") || "Todos"
  );
  const [partidoFilter, setPartidoFilter] = useState(
    searchParams.get("partido") || "Todos"
  );
  const [frescuraFilter, setFrescuraFilter] = useState(
    searchParams.get("frescura") || "Todos"
  );
  const [sortBy, setSortBy] = useState<
    "presupuesto" | "percapita" | "nomina" | "dotacion" | "poblacion" | "nombre"
  >(
    (searchParams.get("sort") as
      | "presupuesto"
      | "percapita"
      | "nomina"
      | "dotacion"
      | "poblacion"
      | "nombre") || "presupuesto"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("order") as "asc" | "desc") || "desc"
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10)
  );
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showCharts, setShowCharts] = useState(true);

  // Regiones y Partidos únicos
  const regiones = useMemo(() => {
    return [
      "Todas",
      ...Array.from(new Set(initialData.map((m) => m.region))).sort(),
    ];
  }, [initialData]);

  const partidos = useMemo(() => {
    const set = new Set<string>();
    for (const m of initialData) {
      if (m.partido_alcalde) set.add(m.partido_alcalde);
      if (m.alcalde?.partido_alcalde) set.add(m.alcalde.partido_alcalde);
    }
    return ["Todos", ...Array.from(set).sort()];
  }, [initialData]);

  // Actualizar URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (regionFilter !== "Todas") params.set("region", regionFilter);
    if (sizeFilter !== "Todos") params.set("tamano", sizeFilter);
    if (fcmFilter !== "Todos") params.set("fcm", fcmFilter);
    if (perCapitaFilter !== "Todos") params.set("percapita", perCapitaFilter);
    if (partidoFilter !== "Todos") params.set("partido", partidoFilter);
    if (frescuraFilter !== "Todos") params.set("frescura", frescuraFilter);
    if (sortBy !== "presupuesto") params.set("sort", sortBy);
    if (sortOrder !== "desc") params.set("order", sortOrder);
    if (page > 1) params.set("page", String(page));

    const newQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (newQuery !== currentQuery) {
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ""}`, {
        scroll: false,
      });
    }
  }, [
    search,
    regionFilter,
    sizeFilter,
    fcmFilter,
    perCapitaFilter,
    partidoFilter,
    frescuraFilter,
    sortBy,
    sortOrder,
    page,
    router,
    pathname,
    searchParams,
  ]);

  // Filtrado reactivo multidimensional
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return initialData.filter((m) => {
      // Búsqueda de texto
      if (q) {
        const matchName = m.nombre_comuna.toLowerCase().includes(q);
        const matchAlcalde =
          m.alcalde?.nombre?.toLowerCase().includes(q) || false;
        const matchRegion = m.region.toLowerCase().includes(q);
        const matchCut = m.cut.includes(q);
        if (!matchName && !matchAlcalde && !matchRegion && !matchCut) {
          return false;
        }
      }

      // Filtro de Región
      if (regionFilter !== "Todas" && m.region !== regionFilter) {
        return false;
      }

      // Filtro de Tamaño Poblacional
      const pop = m.poblacion_censo_2024 ?? 0;
      if (sizeFilter === "metropolitana" && pop < 150000) return false;
      if (sizeFilter === "grande" && (pop < 70000 || pop >= 150000))
        return false;
      if (sizeFilter === "mediana" && (pop < 25000 || pop >= 70000))
        return false;
      if (sizeFilter === "pequena" && pop >= 25000) return false;

      // Filtro de Dependencia FCM
      const fcm = m.fcm_dependencia_pct ?? 0;
      if (fcmFilter === "alta" && fcm <= 60) return false;
      if (fcmFilter === "media" && (fcm <= 30 || fcm > 60)) return false;
      if (fcmFilter === "baja" && fcm > 30) return false;

      // Filtro de Presupuesto Per Cápita
      const pc = m.presupuesto_per_capita_clp ?? 0;
      if (perCapitaFilter === "alto" && pc < 600000) return false;
      if (perCapitaFilter === "medio" && (pc < 300000 || pc >= 600000))
        return false;
      if (perCapitaFilter === "bajo" && pc >= 300000) return false;

      // Filtro de Partido
      if (partidoFilter !== "Todos") {
        const pAlcalde = m.partido_alcalde || m.alcalde?.partido_alcalde;
        if (pAlcalde !== partidoFilter) return false;
      }

      // Filtro de Frescura CPLT
      if (frescuraFilter === "al_dia" && m.estado_frescura !== "al_dia") return false;
      if (frescuraFilter === "desfasado" && m.estado_frescura !== "desfasado") return false;
      if (frescuraFilter === "sin_datos" && m.estado_frescura !== "sin_datos") return false;

      return true;
    });
  }, [
    initialData,
    search,
    regionFilter,
    sizeFilter,
    fcmFilter,
    perCapitaFilter,
    partidoFilter,
    frescuraFilter,
  ]);

  // Ordenamiento reactivo
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let diff = 0;
      if (sortBy === "presupuesto") {
        const valA = a.presupuesto?.vigente_clp ?? 0;
        const valB = b.presupuesto?.vigente_clp ?? 0;
        diff = valB - valA;
      } else if (sortBy === "percapita") {
        const valA = a.presupuesto_per_capita_clp ?? 0;
        const valB = b.presupuesto_per_capita_clp ?? 0;
        diff = valB - valA;
      } else if (sortBy === "nomina") {
        const valA = a.resumen_personal?.masa_mensual_clp ?? 0;
        const valB = b.resumen_personal?.masa_mensual_clp ?? 0;
        diff = valB - valA;
      } else if (sortBy === "dotacion") {
        const valA = a.resumen_personal?.total_funcionarios ?? 0;
        const valB = b.resumen_personal?.total_funcionarios ?? 0;
        diff = valB - valA;
      } else if (sortBy === "poblacion") {
        const valA = a.poblacion_censo_2024 ?? 0;
        const valB = b.poblacion_censo_2024 ?? 0;
        diff = valB - valA;
      } else if (sortBy === "nombre") {
        diff = a.nombre_comuna.localeCompare(b.nombre_comuna, "es");
      }

      return sortOrder === "asc" ? -diff : diff;
    });
  }, [filteredData, sortBy, sortOrder]);

  // Paginación segura (20 filas)
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  // Datos para gráficas comparativas
  const top10Presupuestos = useMemo(() => {
    return [...initialData]
      .filter((m) => (m.presupuesto?.vigente_clp ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.presupuesto?.vigente_clp ?? 0) - (a.presupuesto?.vigente_clp ?? 0)
      )
      .slice(0, 10);
  }, [initialData]);

  const maxTopPres = top10Presupuestos[0]?.presupuesto?.vigente_clp || 1;

  // Manejo de reset de filtros
  const handleResetFilters = () => {
    setSearch("");
    setRegionFilter("Todas");
    setSizeFilter("Todos");
    setFcmFilter("Todos");
    setPerCapitaFilter("Todos");
    setPartidoFilter("Todos");
    setFrescuraFilter("Todos");
    setSortBy("presupuesto");
    setSortOrder("desc");
    setPage(1);
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem" }}>
      {/* ═══ 1. HERO HEADER ════════════════════════════════════════════════════ */}
      <section className="page-masthead">
        <div className="container-main" id="directorio-munis-capture" style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span className="badge badge-info">
                  Observatorio Territorial y Municipal
                </span>
                <span className="badge badge-ok">SINIM SUBDERE Oficial</span>
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
                Directorio de las 346 Municipalidades
              </h1>

              <p
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text-2)",
                  maxWidth: "720px",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Monitoreo oficial de presupuestos vigentes SINIM, nóminas de
                personal CPLT, sueldos de alcaldes, dependencia del Fondo Común
                Municipal (FCM), concejos SERVEL 2024 y compras públicas OCDS en
                todo Chile.
              </p>
            </div>

            <ShareButton
              title="Directorio de Municipalidades de Chile — El Cambiómetro"
              text="Explora los presupuestos SINIM, dotaciones de personal y dependencia FCM de las 346 comunas de Chile."
              captureTargetId="directorio-munis-capture"
              variant="primary"
            />
          </div>

          {/* 4 KPIs Clave */}
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
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Comunas Catalogadas
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "var(--accent)",
                  marginTop: "0.2rem",
                }}
              >
                346 Comunas
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--ok)",
                  marginTop: "0.25rem",
                }}
              >
                ✓ 100% Cobertura Nacional
              </div>
            </div>

            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Presupuesto SINIM</span>
                <span
                  title="Ámbito: Presupuesto municipal consolidado reportado a SUBDERE/SINIM. Incluye administración central municipal e ingresos por transferencias de todas las comunas."
                  style={{
                    color: "var(--ok)",
                    cursor: "help",
                    fontSize: "0.68rem",
                  }}
                >
                  Ámbito ⓘ
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "var(--ok)",
                  marginTop: "0.2rem",
                }}
              >
                {formatCompactCLP(stats.totalPresupuestoVigente)}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  marginTop: "0.25rem",
                }}
              >
                Presupuesto Vigente Consolidado
              </div>
            </div>

            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Dotación Total</span>
                <span
                  title="Ámbito: Dotación nominal consolidada (Planta, Contrata, Honorarios y Código del Trabajo / Salud Ley 19.378 / Educación DAEM)."
                  style={{
                    color: "var(--accent)",
                    cursor: "help",
                    fontSize: "0.68rem",
                  }}
                >
                  Ámbito ⓘ
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "var(--accent)",
                  marginTop: "0.2rem",
                }}
              >
                {formatNum(stats.totalFuncionarios)} pers.
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  marginTop: "0.25rem",
                }}
              >
                Planta + Contrata + Honorarios + Sectorial
              </div>
            </div>

            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Masa Salarial Mensual</span>
                <span
                  title="Ámbito: Gasto mensual en personal de administración municipal central (CPLT) y dotaciones sectoriales de salud y educación."
                  style={{
                    color: "var(--warn)",
                    cursor: "help",
                    fontSize: "0.68rem",
                  }}
                >
                  Ámbito ⓘ
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "var(--warn)",
                  marginTop: "0.2rem",
                }}
              >
                {formatCompactCLP(stats.totalMasaMensual)}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  marginTop: "0.25rem",
                }}
              >
                Gasto Mensual en Personal
              </div>
            </div>

            {/* KPI 5: Cumplimiento Transparencia Activa Ley 20.285 */}
            <div
              className="card"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
                padding: "1.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Transparencia Activa</span>
                <span
                  title="Auditoría de cumplimiento Ley 20.285: Municipalidades que mantienen sus nóminas de personal CPLT informadas con menos de 90 días de desfase respecto a la fecha actual."
                  style={{
                    color: "var(--ok)",
                    cursor: "help",
                    fontSize: "0.68rem",
                  }}
                >
                  Ley 20.285 ⓘ
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "1.35rem",
                  fontWeight: 900,
                  color: "var(--ok)",
                  marginTop: "0.2rem",
                }}
              >
                {stats.alDiaCount ?? 0} / 346
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-3)",
                  marginTop: "0.25rem",
                }}
              >
                Comunas con nómina al día (≤ 90 días)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. GRÁFICAS COMPARATIVAS (COLAPSABLES) ═══════════════════════════ */}
      <div className="container-main" style={{ marginTop: "2rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <div
                className="section-title"
                style={{ marginBottom: "0.2rem" }}
              >
                📊 Análisis Comparativo Municipal
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-subtle)",
                  margin: 0,
                }}
              >
                Concentración de recursos y dispersión per cápita vs FCM (Ámbito
                oficial SINIM 2025)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCharts(!showCharts)}
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem" }}
            >
              {showCharts
                ? "▲ Ocultar Gráficas"
                : "▼ Ver Gráficas Comparativas"}
            </button>
          </div>

          {showCharts && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "1.5rem",
                paddingTop: "0.5rem",
              }}
            >
              {/* Gráfica 1: Top 10 Presupuestos */}
              <div
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      🏆 Top 10 Presupuestos Comunales (SINIM)
                    </h3>
                    <p
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-subtle)",
                        margin: "0.15rem 0 0",
                      }}
                    >
                      Presupuesto vigente municipal reportado
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  {top10Presupuestos.map((m, idx) => {
                    const pres = m.presupuesto?.vigente_clp ?? 0;
                    const pct = Math.max(
                      4,
                      Math.round((pres / maxTopPres) * 100)
                    );
                    return (
                      <Link
                        key={m.id}
                        href={`/municipalidades/${m.id}`}
                        prefetch={false}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          display: "block",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.75rem",
                            marginBottom: "0.2rem",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {idx + 1}. {m.nombre_comuna}{" "}
                            <span
                              style={{
                                color: "var(--text-subtle)",
                                fontWeight: 400,
                              }}
                            >
                              ({m.region})
                            </span>
                          </span>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "var(--ok)",
                            }}
                          >
                            {formatCompactCLP(pres)}
                          </span>
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: 6,
                            background: "var(--bg-primary)",
                            borderRadius: 99,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: "var(--accent)",
                              borderRadius: 99,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Gráfica 2: Dispersión Presupuesto Per Cápita vs Dependencia FCM */}
              <div
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      ⚖️ Dispersión: Per Cápita vs Dependencia FCM
                    </h3>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-subtle)",
                      }}
                    >
                      346 Comunas
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      margin: "0 0 1rem",
                    }}
                  >
                    Las comunas con mayor autonomía financiera (menor % FCM)
                    concentran los presupuestos per cápita más altos, mientras
                    que comunas con alta dependencia del FCM perciben ingresos
                    per cápita más reducidos.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.75rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: 8,
                        background: "var(--ok-bg)",
                        border: "1px solid var(--ok)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "var(--ok)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Alta Autonomía (FCM &lt; 30%)
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {
                          initialData.filter(
                            (m) => (m.fcm_dependencia_pct ?? 0) < 30
                          ).length
                        }{" "}
                        comunas
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-subtle)",
                          marginTop: "0.2rem",
                        }}
                      >
                        Ej: Las Condes, Providencia, Santiago
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: 8,
                        background: "var(--warn-bg)",
                        border: "1px solid var(--warn)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "var(--warn)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Alta Dependencia (FCM &gt; 60%)
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {
                          initialData.filter(
                            (m) => (m.fcm_dependencia_pct ?? 0) > 60
                          ).length
                        }{" "}
                        comunas
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-subtle)",
                          marginTop: "0.2rem",
                        }}
                      >
                        Ej: La Pintana, comunas rurales
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderRadius: 6,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                  }}
                >
                  💡 Haz clic en cualquier comuna para ver su presupuesto,
                  nómina y concejo comunal.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 3. FILTROS Y ORDENAMIENTO AVANZADO ════════════════════════════════ */}
      <div className="container-main" style={{ marginTop: "1.5rem" }}>
        <div
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Barra de Búsqueda y Selector de Vista */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 280px" }}>
              <input
                type="search"
                placeholder="Buscar por comuna, alcalde, región o código CUT..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.85rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            {/* Toggle Cards / Tabla */}
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
                onClick={() => setViewMode("cards")}
                style={{
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.75rem",
                  fontWeight: viewMode === "cards" ? 700 : 500,
                  background:
                    viewMode === "cards" ? "var(--bg-surface)" : "transparent",
                  color:
                    viewMode === "cards"
                      ? "var(--accent)"
                      : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                🎴 Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.75rem",
                  fontWeight: viewMode === "table" ? 700 : 500,
                  background:
                    viewMode === "table" ? "var(--bg-surface)" : "transparent",
                  color:
                    viewMode === "table"
                      ? "var(--accent)"
                      : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                📊 Tabla
              </button>
            </div>
          </div>

          {/* Grid de 6 Selectores de Filtro */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "0.6rem",
            }}
          >
            {/* 1. Región */}
            <div>
              <label
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-subtle)",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Región
              </label>
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                {regiones.map((r) => (
                  <option key={r} value={r}>
                    {r === "Todas" ? "Todas las regiones" : r}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Tamaño Poblacional */}
            <div>
              <label
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-subtle)",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Población
              </label>
              <select
                value={sizeFilter}
                onChange={(e) => {
                  setSizeFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                <option value="Todos">Todos los tamaños</option>
                <option value="metropolitana">&gt; 150k hab.</option>
                <option value="grande">70k - 150k hab.</option>
                <option value="mediana">25k - 70k hab.</option>
                <option value="pequena">&lt; 25k hab.</option>
              </select>
            </div>

            {/* 3. Dependencia FCM */}
            <div>
              <label
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-subtle)",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                FCM (% Ingresos)
              </label>
              <select
                value={fcmFilter}
                onChange={(e) => {
                  setFcmFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                <option value="Todos">Cualquier % FCM</option>
                <option value="alta">Alta (&gt; 60%)</option>
                <option value="media">Media (30% - 60%)</option>
                <option value="baja">Baja (&lt; 30%)</option>
              </select>
            </div>

            {/* 4. Presupuesto Per Cápita */}
            <div>
              <label
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-subtle)",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Per Cápita
              </label>
              <select
                value={perCapitaFilter}
                onChange={(e) => {
                  setPerCapitaFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                <option value="Todos">Cualquier monto</option>
                <option value="alto">Alto (&gt; $600k)</option>
                <option value="medio">Medio ($300k - $600k)</option>
                <option value="bajo">Bajo (&lt; $300k)</option>
              </select>
            </div>

            {/* 5. Partido del Alcalde */}
            <div>
              <label
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-subtle)",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Partido Alcalde
              </label>
              <select
                value={partidoFilter}
                onChange={(e) => {
                  setPartidoFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                {partidos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Frescura de Nómina CPLT */}
            <div>
              <label
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-subtle)",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Frescura Nómina
              </label>
              <select
                value={frescuraFilter}
                onChange={(e) => {
                  setFrescuraFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                }}
              >
                <option value="Todos">Cualquier estado</option>
                <option value="al_dia">✓ Al día (≤ 90 días)</option>
                <option value="desfasado">⚠️ Con desfase (&gt; 90 días)</option>
                <option value="sin_datos">Sin nómina CPLT</option>
              </select>
            </div>

            {/* 7. Ordenar por */}
            <div>
              <label
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "var(--text-subtle)",
                  display: "block",
                  marginBottom: "0.2rem",
                }}
              >
                Ordenar por
              </label>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(
                      e.target.value as
                        | "presupuesto"
                        | "percapita"
                        | "nomina"
                        | "dotacion"
                        | "poblacion"
                        | "nombre"
                    );
                    setPage(1);
                  }}
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.5rem",
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="presupuesto">Presupuesto</option>
                  <option value="percapita">Per Cápita</option>
                  <option value="nomina">Masa Salarial</option>
                  <option value="dotacion">Dotación</option>
                  <option value="poblacion">Población</option>
                  <option value="nombre">Nombre</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                  }
                  className="btn btn-ghost"
                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.78rem" }}
                  title={sortOrder === "desc" ? "Descendente" : "Ascendente"}
                >
                  {sortOrder === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>
          </div>

          {/* Resumen de Resultados y Reset */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "0.5rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              Mostrando{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {sortedData.length}
              </strong>{" "}
              de{" "}
              <strong style={{ color: "var(--text-primary)" }}>346</strong>{" "}
              comunas
              {search ||
              regionFilter !== "Todas" ||
              sizeFilter !== "Todos" ||
              fcmFilter !== "Todos" ||
              perCapitaFilter !== "Todos" ||
              partidoFilter !== "Todos" ? (
                <span
                  style={{
                    color: "var(--accent)",
                    marginLeft: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  (Filtros activos)
                </span>
              ) : null}
            </div>

            {(search ||
              regionFilter !== "Todas" ||
              sizeFilter !== "Todos" ||
              fcmFilter !== "Todos" ||
              perCapitaFilter !== "Todos" ||
              partidoFilter !== "Todos") && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  textDecoration: "underline",
                }}
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 4. LISTADO DE MUNICIPALIDADES ════════════════════════════════════ */}
      <div className="container-main" style={{ marginTop: "1.5rem" }}>
        {paginatedData.length === 0 ? (
          <div
            className="card"
            style={{ padding: "3rem 1.5rem", textAlign: "center" }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
              🔍
            </div>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: "0 0 0.4rem",
              }}
            >
              No se encontraron municipalidades
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: "1rem",
              }}
            >
              Intenta ajustar los criterios de búsqueda o limpiar los filtros.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-primary"
              style={{ fontSize: "0.8rem" }}
            >
              Restablecer Filtros
            </button>
          </div>
        ) : viewMode === "cards" ? (
          /* VISTA EN TARJETAS (100% CLICKABLE ENVOLVIENDO EN <Link prefetch={false}>) */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {paginatedData.map((m) => {
              const pres = m.presupuesto?.vigente_clp ?? 0;
              const perCapita = m.presupuesto_per_capita_clp ?? 0;
              const fcm = m.fcm_dependencia_pct ?? 0;
              const staff = m.resumen_personal?.total_funcionarios ?? 0;
              const masa = m.resumen_personal?.masa_mensual_clp ?? 0;
              const partido =
                m.partido_alcalde ||
                m.alcalde?.partido_alcalde ||
                "Independiente";
              const branding = getPartidoConfig(partido);

              return (
                <Link
                  key={m.id}
                  href={`/municipalidades/${m.id}`}
                  prefetch={false}
                  className="card hover-card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderTop: `3px solid ${branding.color_oficial || "var(--accent)"}`,
                    padding: "1.25rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div>
                    {/* Header Card */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                          <span
                            className="badge"
                            style={{ fontSize: "0.68rem" }}
                          >
                            {m.region}
                          </span>
                          {m.estado_frescura === "al_dia" && (
                            <span
                              className="badge badge-ok"
                              style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", fontWeight: 700 }}
                              title="Nómina informada en los últimos 90 días"
                            >
                              ✓ Nómina {m.periodo_nomina}
                            </span>
                          )}
                          {m.estado_frescura === "desfasado" && (
                            <span
                              className="badge badge-warn"
                              style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", fontWeight: 700 }}
                              title={`Nómina con ${m.desfase_meses} meses de desfase oficial`}
                            >
                              ⚠️ Desfase {m.desfase_meses}m ({m.periodo_nomina})
                            </span>
                          )}
                          {m.estado_frescura === "sin_datos" && (
                            <span
                              className="badge"
                              style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", opacity: 0.7 }}
                              title="Sin registros de nómina en CPLT"
                            >
                              Sin nómina CPLT
                            </span>
                          )}
                          {m.auditorias_cgr_count !== undefined && m.auditorias_cgr_count > 0 && (
                            <span
                              className="badge badge-warn"
                              style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", fontWeight: 800 }}
                              title={`Contraloría General: ${m.auditorias_cgr_count} informe(s) de fiscalización oficial`}
                            >
                              ⚖️ CGR: {m.auditorias_cgr_count}
                            </span>
                          )}
                        </div>
                        <h2
                          style={{
                            fontSize: "1.15rem",
                            fontWeight: 800,
                            color: "var(--text-primary)",
                            margin: "0.35rem 0 0",
                            lineHeight: 1.3,
                          }}
                        >
                          {m.nombre_comuna}
                        </h2>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontFamily: "monospace",
                          color: "var(--text-subtle)",
                        }}
                      >
                        CUT {m.cut}
                      </span>
                    </div>

                    {/* Alcalde & Partido */}
                    <div
                      style={{
                        marginBottom: "0.85rem",
                        paddingBottom: "0.75rem",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <span>👔</span>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {m.alcalde?.nombre || "Alcaldía Titular"}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: branding.color_oficial || "var(--text-3)",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-subtle)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 220,
                          }}
                        >
                          {branding.nombre || partido}
                        </span>
                      </div>
                    </div>

                    {/* KPIs Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.6rem",
                        marginBottom: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          padding: "0.6rem",
                          borderRadius: 8,
                          background: "var(--bg-surface-2)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.62rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "var(--text-subtle)",
                            fontWeight: 700,
                          }}
                        >
                          Presupuesto SINIM
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "var(--ok)",
                            fontFamily: "monospace",
                            marginTop: "0.15rem",
                          }}
                        >
                          {formatCompactCLP(pres)}
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            marginTop: "0.1rem",
                          }}
                        >
                          {formatCLP(perCapita)} / hab
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "0.6rem",
                          borderRadius: 8,
                          background: "var(--bg-surface-2)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.62rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "var(--text-subtle)",
                            fontWeight: 700,
                          }}
                        >
                          Personal Municipal
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "var(--accent)",
                            fontFamily: "monospace",
                            marginTop: "0.15rem",
                          }}
                        >
                          {formatNum(staff)} pers.
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            marginTop: "0.1rem",
                          }}
                        >
                          Masa: {formatCompactCLP(masa)}/m
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Card */}
                  <div
                    style={{
                      paddingTop: "0.65rem",
                      borderTop: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.72rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <span style={{ color: "var(--text-subtle)" }}>FCM:</span>
                      <strong
                        style={{
                          fontFamily: "monospace",
                          color:
                            fcm > 60
                              ? "var(--warn)"
                              : fcm < 30
                              ? "var(--ok)"
                              : "var(--text-primary)",
                        }}
                      >
                        {fcm.toFixed(1)}%
                      </strong>
                    </div>

                    <span
                      style={{
                        color: "var(--accent)",
                        fontWeight: 700,
                      }}
                    >
                      Ver Ficha Comunal →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* VISTA EN TABLA (100% CLICKABLE ENVOLVIENDO FILA) */
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-sticky-col" style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.82rem",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-surface-2)",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                    }}
                  >
                    <th style={{ padding: "0.75rem 1rem" }}>Comuna / Región</th>
                    <th style={{ padding: "0.75rem 1rem" }}>
                      Alcalde / Colectividad
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "right",
                      }}
                    >
                      Población (2024)
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "right",
                      }}
                    >
                      Presupuesto SINIM
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "right",
                      }}
                    >
                      Per Cápita
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "center",
                      }}
                    >
                      FCM %
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "right",
                      }}
                    >
                      Dotación
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "center",
                      }}
                    >
                      Nómina CPLT
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "center",
                      }}
                    >
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((m) => {
                    const pres = m.presupuesto?.vigente_clp ?? 0;
                    const perCapita = m.presupuesto_per_capita_clp ?? 0;
                    const fcm = m.fcm_dependencia_pct ?? 0;
                    const staff = m.resumen_personal?.total_funcionarios ?? 0;
                    const partido =
                      m.partido_alcalde ||
                      m.alcalde?.partido_alcalde ||
                      "Independiente";
                    const branding = getPartidoConfig(partido);

                    return (
                      <tr
                        key={m.id}
                        className="hover-row"
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          transition: "background 0.1s ease",
                        }}
                      >
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Link
                              href={`/municipalidades/${m.id}`}
                              prefetch={false}
                              style={{
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                textDecoration: "none",
                              }}
                            >
                              {m.nombre_comuna}
                            </Link>
                            {m.auditorias_cgr_count !== undefined && m.auditorias_cgr_count > 0 && (
                              <span
                                className="badge badge-warn"
                                style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", fontWeight: 800 }}
                                title={`Contraloría General: ${m.auditorias_cgr_count} informe(s)`}
                              >
                                ⚖️ {m.auditorias_cgr_count}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--text-subtle)",
                            }}
                          >
                            {m.region} · CUT {m.cut}
                          </span>
                        </td>

                        <td style={{ padding: "0.8rem 1rem" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {m.alcalde?.nombre || "—"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--text-subtle)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-block",
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor:
                                  branding.color_oficial || "var(--text-3)",
                              }}
                            />
                            {branding.nombre || partido}
                          </div>
                        </td>

                        <td
                          style={{
                            padding: "0.8rem 1rem",
                            textAlign: "right",
                            fontFamily: "monospace",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatNum(m.poblacion_censo_2024)}
                        </td>

                        <td
                          style={{
                            padding: "0.8rem 1rem",
                            textAlign: "right",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "var(--ok)",
                          }}
                        >
                          {formatCompactCLP(pres)}
                        </td>

                        <td
                          style={{
                            padding: "0.8rem 1rem",
                            textAlign: "right",
                            fontFamily: "monospace",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCLP(perCapita)}
                        </td>

                        <td
                          style={{
                            padding: "0.8rem 1rem",
                            textAlign: "center",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color:
                              fcm > 60
                                ? "var(--warn)"
                                : fcm < 30
                                ? "var(--ok)"
                                : "var(--text-primary)",
                          }}
                        >
                          {fcm.toFixed(1)}%
                        </td>

                        <td
                          style={{
                            padding: "0.8rem 1rem",
                            textAlign: "right",
                            fontFamily: "monospace",
                            color: "var(--accent)",
                          }}
                        >
                          {formatNum(staff)}
                        </td>

                        <td
                          style={{
                            padding: "0.8rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {m.estado_frescura === "al_dia" && (
                            <span className="badge badge-ok" style={{ fontSize: "0.65rem" }} title="Nómina informada en los últimos 90 días">
                              {m.periodo_nomina}
                            </span>
                          )}
                          {m.estado_frescura === "desfasado" && (
                            <span className="badge badge-warn" style={{ fontSize: "0.65rem" }} title={`Nómina con ${m.desfase_meses} meses de desfase oficial`}>
                              ⚠️ {m.periodo_nomina} ({m.desfase_meses}m)
                            </span>
                          )}
                          {m.estado_frescura === "sin_datos" && (
                            <span className="badge" style={{ fontSize: "0.65rem", opacity: 0.7 }}>
                              Sin datos
                            </span>
                          )}
                        </td>

                        <td
                          style={{
                            padding: "0.8rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          <Link
                            href={`/municipalidades/${m.id}`}
                            prefetch={false}
                            className="btn btn-ghost"
                            style={{
                              fontSize: "0.72rem",
                              padding: "0.25rem 0.55rem",
                            }}
                          >
                            Ver ↗
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-ghost"
              style={{ fontSize: "0.8rem" }}
            >
              ← Anterior
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`btn ${
                    page === pageNum ? "btn-primary" : "btn-ghost"
                  }`}
                  style={{ fontSize: "0.8rem", minWidth: "2rem" }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn btn-ghost"
              style={{ fontSize: "0.8rem" }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
