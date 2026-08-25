"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "@/components/SiteLink";
import type { TransferenciaDetalle, Ley19862Summary, ReceptorResumen, EmisorResumen } from "@/lib/transferencias-data";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface KPIs {
  total_monto_clp: number;
  total_transfers: number;
  total_receptores: number;
  total_emisores: number;
}

interface Props {
  kpis: KPIs;
  topReceptores: ReceptorResumen[];
  topEmisores: EmisorResumen[];
  byYear: Record<string, { count: number; total: number }>;
  initialTransfers: TransferenciaDetalle[];
  initialTotal: number;
  initialTotalPages: number;
  initialPage?: number;
  initialPageSize?: number;
  initialQuery?: string;
  initialYear?: string;
  initialEmisor?: string;
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
    })} mil millones`;
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toLocaleString("es-CL", {
      maximumFractionDigits: 0,
    })} MM`;
  return `$${n.toLocaleString("es-CL")}`;
}

function fmtNum(n: number): string {
  return (n || 0).toLocaleString("es-CL");
}

function fmtDate(fecha: string | null): string {
  if (!fecha) return "—";
  const parts = fecha.slice(0, 10).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return fecha;
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface StaticSearchEntry {
  i: number;
  p: number;
  y: string | null;
  d: string | null;
  e: string | null;
  r: string | null;
  t: string | null;
  m: number;
}

interface StaticManifest {
  totalRows: number;
  totalPages: number;
  pageSize: number;
  pages: Array<{ page: number; path: string }>;
  searchIndex: { path: string };
}

function matchesSearch(entry: StaticSearchEntry, query: string): boolean {
  if (!query) return true;
  const needle = query.toLocaleLowerCase("es-CL");
  return [entry.t, entry.e, entry.r, entry.y]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase("es-CL").includes(needle));
}

export default function TransferenciasExplorerClient({
  kpis,
  topReceptores,
  topEmisores,
  byYear,
  initialTransfers,
  initialTotal,
  initialTotalPages,
  initialPage = 1,
  initialPageSize = DEFAULT_PAGE_SIZE,
  initialQuery = "",
  initialYear = "Todos",
  initialEmisor = "Todos",
  generatedAt,
}: Props) {
  const [search, setSearch] = useState(initialQuery);
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [emisorFilter, setEmisorFilter] = useState(initialEmisor);
  const [sortBy, setSortBy] = useState<"monto" | "fecha">("monto");
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const r = Number(sp.get("rows"));
      if (r === 25 || r === 50 || r === 10) return r;
    }
    return initialPageSize;
  });

  const [transfers, setTransfers] = useState<TransferenciaDetalle[]>(initialTransfers);
  const [total, setTotal] = useState<number>(initialTotal);
  const [totalPages, setTotalPages] = useState<number>(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const isInitialMount = useRef(true);

  // Lista única de organismos emisores para el select
  const emisoresOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of topEmisores) if (e.name) set.add(e.name);
    for (const t of initialTransfers) if (t.emitter_name) set.add(t.emitter_name);
    return Array.from(set).sort();
  }, [topEmisores, initialTransfers]);

  // Carga del manifest e índice estáticos publicados en Pages. La API Worker
  // sigue disponible para clientes externos, pero la UI no depende de ella.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    const loadId = window.setTimeout(async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const manifestResponse = await fetch("/data/transferencias/manifest.json", { signal: controller.signal, cache: "no-store" });
        if (!manifestResponse.ok) throw new Error(`manifest HTTP ${manifestResponse.status}`);
        const manifest = await manifestResponse.json() as StaticManifest;
        if (!manifest.totalRows || !manifest.pages?.length || !manifest.searchIndex?.path) {
          throw new Error("manifest incompleto");
        }
        const indexResponse = await fetch(manifest.searchIndex.path, { signal: controller.signal, cache: "no-store" });
        if (!indexResponse.ok) throw new Error(`índice HTTP ${indexResponse.status}`);
        const index = await indexResponse.json() as StaticSearchEntry[];
        const normalizedSearch = search.trim();
        const matching = index.filter((entry) => {
          if (yearFilter !== "Todos" && entry.y !== yearFilter) return false;
          if (emisorFilter !== "Todos" && entry.e !== emisorFilter) return false;
          return matchesSearch(entry, normalizedSearch);
        });
        matching.sort((left, right) => {
          if (sortBy === "fecha") return String(right.d ?? "").localeCompare(String(left.d ?? "")) || right.m - left.m;
          return right.m - left.m || String(right.d ?? "").localeCompare(String(left.d ?? ""));
        });
        const matchingPage = matching.slice((page - 1) * pageSize, page * pageSize);
        const pageNumbers = [...new Set(matchingPage.map((entry) => entry.p))];
        const pageRows = await Promise.all(pageNumbers.map(async (pageNumber) => {
          const pageInfo = manifest.pages.find((candidate) => candidate.page === pageNumber);
          if (!pageInfo) throw new Error(`chunk ${pageNumber} ausente`);
          const response = await fetch(pageInfo.path, { signal: controller.signal, cache: "no-store" });
          if (!response.ok) throw new Error(`chunk ${pageNumber} HTTP ${response.status}`);
          return await response.json() as TransferenciaDetalle[];
        }));
        const byIndex = new Map<number, TransferenciaDetalle>();
        pageNumbers.forEach((pageNumber, pageIndex) => {
          pageRows[pageIndex].forEach((row, rowIndex) => byIndex.set((pageNumber - 1) * manifest.pageSize + rowIndex, row));
        });
        setTransfers(matchingPage.map((entry) => byIndex.get(entry.i)).filter((row): row is TransferenciaDetalle => Boolean(row)));
        setTotal(matching.length);
        setTotalPages(Math.max(1, Math.ceil(matching.length / pageSize)));
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setLoadError("La carga tardó demasiado. Reintenta para volver a consultar los datos publicados.");
        } else {
          console.error("Error cargando chunks de transferencias:", err);
          setLoadError("No se pudo cargar el índice de transferencias. Revisa tu conexión y reintenta.");
        }
        setTransfers([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        window.clearTimeout(timeoutId);
        setIsLoading(false);
      }
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(loadId);
      window.clearTimeout(timeoutId);
    };
  }, [page, pageSize, search, yearFilter, emisorFilter, sortBy, retryNonce]);

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

  const handleSortChange = (newSort: "monto" | "fecha") => {
    setSortBy(newSort);
    setPage(1);
  };

  // ── Serie anual derivada del manifest vigente ────────────────────────────────
  const yearChartData = useMemo(() => {
    return Object.entries(byYear).map(([yr, info]) => {
      return {
        label: yr,
        value: info.total,
        count: info.count,
        extra: `${fmtCompact(info.total)} · ${fmtNum(info.count)} transferencias`,
      };
    });
  }, [byYear]);

  const yearsOptions = useMemo(() => ["Todos", ...Object.keys(byYear).sort()], [byYear]);
  const maxYearVal = Math.max(1, ...yearChartData.map((d) => d.value));

  // Max value para barras de rankings top 10
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
            Explore quién recibe fondos, qué organismo emite y el desglose de montos con trazabilidad oficial a <code>registros19862.gob.cl</code>.
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
                sub: `${fmtNum(kpis.total_transfers)} registros oficiales indexados`,
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
              🏆 Muestra Ranking: Top 10 Entidades Receptoras
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0 0 1rem 0" }}>
              Haz clic en cualquier entidad para filtrar el explorador inferior
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
              📤 Muestra Ranking: Top 10 Organismos Emisores
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0 0 1rem 0" }}>
              Haz clic en cualquier organismo para filtrar el explorador inferior
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

        {/* ── SERIE ANUAL DEL MANIFEST VIGENTE ────────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "1.25rem",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-1)", marginBottom: "0.2rem" }}>
            📅 Serie Anual de Transferencias
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: "0 0 1.25rem 0" }}>
            Monto consolidado y volumen de transferencias por año oficial. Haz clic en cualquier barra para filtrar el explorador por ese año.
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
                    border: isActive ? "2px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "0.75rem 0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                  title={d.extra}
                >
                  <div style={{ fontSize: "0.72rem", color: "var(--money)", fontWeight: 700 }}>
                    {fmtCompact(d.value)}
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "70px",
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

        {/* ── EXPLORADOR DE TRANSFERENCIAS (PÁGINAS DE 50 FILAS SOBRE UNIVERSO COMPLETO) ── */}
        <div
          id="tabla-transferencias-explorador"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "1.25rem",
          }}
        >
          {/* Banner de Muestra Indexada / Universo Oficial Rotulado */}
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              marginBottom: "1rem",
              fontSize: "0.8rem",
              color: "var(--text-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              📌 <strong>Explorador de Transferencias Ley 19.862:</strong> {fmtNum(total)} transferencias oficiales registradas · datos trazables a <code>registros19862.gob.cl</code> · coherente con{" "}
              <Link href="/datos/calidad" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
                /datos/calidad
              </Link>
            </div>
            <div style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.78rem" }}>
              Pág. {page} de {fmtNum(totalPages)}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-1)", marginBottom: "0.2rem" }}>
              🔍 Explorador de Transferencias
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-3)", margin: 0 }}>
              Busque por nombre, RUT, organismo emisor o receptor. Registros trazables con enlace oficial a <code>registros19862.gob.cl</code>.
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
                placeholder="🔍 Buscar por nombre, RUT, organismo o materia..."
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
              {yearsOptions.map((yr) => (
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

            {/* Selector de Orden */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as "monto" | "fecha")}
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
              <option value="monto">Ordenar: Mayor Monto</option>
              <option value="fecha">Ordenar: Más Recientes</option>
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
              Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de <strong>{fmtNum(total)}</strong> transferencias · página {page} de {fmtNum(totalPages)}
            </span>
            {isLoading && (
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>Cargando transferencias...</span>
            )}
          </div>

          {loadError && (
            <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem 1rem", marginBottom: "1rem", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-2)" }}>
              <span>{loadError}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRetryNonce((value) => value + 1)}>Reintentar</button>
            </div>
          )}

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
                {transfers.length === 0 ? (
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
                  transfers.map((t, i) => (
                    <tr
                      key={t.id || i}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        verticalAlign: "middle",
                        contentVisibility: "auto",
                        containIntrinsicSize: "auto 54px",
                      }}
                    >
                      {/* Fecha */}
                      <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap", fontSize: "0.78rem", color: "var(--text-2)" }}>
                        {fmtDate(t.fecha)}
                      </td>

                      {/* Organismo Emisor */}
                      <td style={{ padding: "0.6rem 0.75rem", maxWidth: 220 }}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", lineHeight: 1.3 }}>
                          {t.emitter_name ?? "No informado en la fuente oficial"}
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
                          {t.receiver_name ?? "No informado en la fuente oficial"}
                        </div>
                        {t.receiver_rut && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                            RUT: {t.receiver_rut}
                          </div>
                        )}
                      </td>

                      {/* Materia / Programa */}
                      <td style={{ padding: "0.6rem 0.75rem", maxWidth: 280, color: "var(--text-2)", lineHeight: 1.3 }}>
                        <div>{t.title ?? t.description ?? "No informado en la fuente oficial"}</div>
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

          {/* Paginación y Selector de Filas */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
              flexWrap: "wrap",
              gap: "0.75rem",
              borderTop: "1px solid var(--border)",
              paddingTop: "1rem",
            }}
          >
            {/* Izquierda: Selector de Filas por página (10 / 25 / 50) */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-3)" }}>
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
                      background: isActive ? "var(--accent)" : "var(--surface-2)",
                      color: isActive ? "var(--bg)" : "var(--text-2)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Derecha: Paginador («, ‹, Página X de Y, ›, ») */}
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    style={{
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.75rem",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: page <= 1 ? "var(--text-3)" : "var(--text-1)",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                    }}
                    title="Primera página"
                  >
                    « Primera
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.75rem",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: page <= 1 ? "var(--text-3)" : "var(--text-1)",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                    }}
                    title="Página anterior"
                  >
                    ‹ Anterior
                  </button>
                </div>

                <span style={{ fontSize: "0.78rem", color: "var(--text-2)", fontWeight: 700 }}>
                  Página {page} de {fmtNum(totalPages)}
                </span>

                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.75rem",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: page >= totalPages ? "var(--text-3)" : "var(--text-1)",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                    }}
                    title="Página siguiente"
                  >
                    Siguiente ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    style={{
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.75rem",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: page >= totalPages ? "var(--text-3)" : "var(--text-1)",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                    }}
                    title="Última página"
                  >
                    Última »
                  </button>
                </div>
              </div>
            )}
          </div>
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
