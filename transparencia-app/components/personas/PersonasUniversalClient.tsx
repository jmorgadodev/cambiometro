"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getPartidoBranding } from "@/lib/partidos.config";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import type { FuncionarioPublico } from "@/lib/funcionarios";
import {
  formatEstamentoCorto,
  formatTipoContrato,
  getInitials,
} from "@/lib/estamentos-format";
import { classifyFuncionarioRecord } from "@/lib/funcionarios-quality";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

export type PersonaTab = "parlamentarios" | "alcaldes" | "autoridades" | "funcionarios";

export interface ParlamentarioItem {
  id: string;
  nombre_completo: string;
  cargo_actual: string;
  partido_actual: string;
  distrito_o_circunscripcion: string;
  region: string;
  foto_url?: string;
  asistencia_sala_pct?: number;
  proyectos_presentados_count?: number;
  gastos_operacionales_promedio_mensual_clp?: number;
}

export interface AlcaldeItem {
  muni_id: string;
  cut: string;
  nombre_comuna: string;
  region: string;
  alcalde_nombre: string;
  cargo: string;
  remuneracion_bruta?: number;
  remuneracion_liquida?: number;
  grado_eus?: string;
  formacion?: string;
  partido_alcalde?: string | null;
  poblacion_censo_2024?: number;
}

export interface AutoridadItem {
  id: string;
  nombre_canonico: string;
  sigla?: string;
  tipo: string;
  director_jefe_actual?: string;
  fuente_director?: string;
  ministerio_dependiente?: string;
  dotacion_total: number | null;
  partida_capitulo_dipres: string | null;
  sitio_web_oficial?: string;
}

export interface OrganismoOption {
  id: string;
  nombre_canonico: string;
  sigla?: string;
  tipo: string;
  region: string | null;
}

interface PersonasUniversalClientProps {
  parlamentarios: ParlamentarioItem[];
  alcaldes: AlcaldeItem[];
  autoridades: AutoridadItem[];
  organismos: OrganismoOption[];
  totalFuncionariosEstimados?: number;
}

function formatCLP(n?: number | null) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

const TIPOS_ORGANISMO_OPTIONS = [
  { id: "Todos", label: "Todos los tipos" },
  { id: "Municipalidad", label: "Municipalidades" },
  { id: "Ministerio", label: "Ministerios" },
  { id: "Subsecretaría", label: "Subsecretarías" },
  { id: "Servicio", label: "Servicios Públicos" },
  { id: "GORE", label: "Gobiernos Regionales (GORE)" },
  { id: "Empresa pública", label: "Empresas Públicas" },
  { id: "Superintendencia", label: "Superintendencias" },
];

const ESTAMENTOS_OPTIONS = [
  { id: "Todos", label: "Todos los estamentos" },
  { id: "Directivo", label: "Directivo / Jefatura" },
  { id: "Profesional", label: "Profesional" },
  { id: "Tecnico", label: "Técnico" },
  { id: "Administrativo", label: "Administrativo" },
  { id: "Auxiliar", label: "Auxiliar / Servicios" },
  { id: "Salud", label: "Salud y Médicos" },
  { id: "Educacion", label: "Docentes y Educación" },
];

const CONTRATOS_OPTIONS = [
  { id: "Todos", label: "Todos los contratos" },
  { id: "Planta", label: "Planta" },
  { id: "Contrata", label: "Contrata" },
  { id: "Honorarios", label: "Honorarios" },
  { id: "CodigoTrabajo", label: "Código del Trabajo" },
];

const SORTS_FUNCIONARIOS = [
  { id: "sueldo_desc", label: "Sueldo bruto: Mayor a menor" },
  { id: "sueldo_asc", label: "Sueldo bruto: Menor a mayor" },
  { id: "horas_extras_desc", label: "Horas extras: Mayor a menor" },
  { id: "nombre_asc", label: "Nombre: A - Z" },
  { id: "nombre_desc", label: "Nombre: Z - A" },
];

const ITEMS_PER_PAGE = 20;

export default function PersonasUniversalClient({
  parlamentarios,
  alcaldes,
  autoridades,
  organismos,
  totalFuncionariosEstimados = 1203287,
}: PersonasUniversalClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Tab State derived from URL
  const rawTab = searchParams.get("tab") as PersonaTab | null;
  const activeTab: PersonaTab = (rawTab && ["parlamentarios", "alcaldes", "autoridades", "funcionarios"].includes(rawTab))
    ? rawTab
    : "parlamentarios";

  // Search & Filters
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") || "");
  const [tipoFilter, setTipoFilter] = useState(() => searchParams.get("tipo") || "Todos");
  const [organismoFilter, setOrganismoFilter] = useState(() => searchParams.get("org") || searchParams.get("muni") || "Todos");
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [contratoFilter, setContratoFilter] = useState(() => searchParams.get("contrato") || "Todos");
  const [estamentoFilter, setEstamentoFilter] = useState(() => searchParams.get("estamento") || "Todos");
  const [soloHorasExtras, setSoloHorasExtras] = useState(() => searchParams.get("extras") === "true");
  const [partidoFilter, setPartidoFilter] = useState(() => searchParams.get("partido") || "Todos");
  const [regionFilter, setRegionFilter] = useState(() => searchParams.get("region") || "Todas");
  const [sortFuncionarios, setSortFuncionarios] = useState(() => searchParams.get("sort") || "sueldo_desc");
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => (searchParams.get("view") as "cards" | "table") || "cards");
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);

  // Modal para detalle nominal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalItem, setModalItem] = useState<{
    tipo: "parlamentario" | "alcalde" | "autoridad" | "funcionario";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  } | null>(null);

  // State para tab Funcionarios (API Fetching)
  const [funcionariosData, setFuncionariosData] = useState<FuncionarioPublico[]>([]);
  const [funcionariosTotal, setFuncionariosTotal] = useState(0);
  const [funcionariosLoading, setFuncionariosLoading] = useState(false);
  const [funcionariosStats, setFuncionariosStats] = useState({
    totalMuni: 0,
    promedioSueldo: 0,
    conHorasExtras: 0,
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(handler);
  }, [search]);

  // Sync URL
  const syncUrl = useCallback(
    (opts: {
      tab?: PersonaTab;
      search?: string;
      tipo?: string;
      org?: string;
      contrato?: string;
      estamento?: string;
      extras?: boolean;
      partido?: string;
      region?: string;
      sort?: string;
      view?: "cards" | "table";
      page?: number;
    }) => {
      const params = new URLSearchParams();
      const nextTab = opts.tab ?? activeTab;
      params.set("tab", nextTab);

      const nextSearch = opts.search !== undefined ? opts.search : search;
      if (nextSearch) params.set("search", nextSearch);

      const nextTipo = opts.tipo !== undefined ? opts.tipo : tipoFilter;
      if (nextTipo !== "Todos") params.set("tipo", nextTipo);

      const nextOrg = opts.org !== undefined ? opts.org : organismoFilter;
      if (nextOrg !== "Todos") params.set("org", nextOrg);

      const nextContrato = opts.contrato !== undefined ? opts.contrato : contratoFilter;
      if (nextContrato !== "Todos") params.set("contrato", nextContrato);

      const nextEstamento = opts.estamento !== undefined ? opts.estamento : estamentoFilter;
      if (nextEstamento !== "Todos") params.set("estamento", nextEstamento);

      const nextExtras = opts.extras !== undefined ? opts.extras : soloHorasExtras;
      if (nextExtras) params.set("extras", "true");

      const nextPartido = opts.partido !== undefined ? opts.partido : partidoFilter;
      if (nextPartido !== "Todos") params.set("partido", nextPartido);

      const nextRegion = opts.region !== undefined ? opts.region : regionFilter;
      if (nextRegion !== "Todas") params.set("region", nextRegion);

      const nextSort = opts.sort !== undefined ? opts.sort : sortFuncionarios;
      if (nextSort !== "sueldo_desc") params.set("sort", nextSort);

      const nextView = opts.view !== undefined ? opts.view : viewMode;
      if (nextView !== "cards") params.set("view", nextView);

      const nextPage = opts.page !== undefined ? opts.page : page;
      if (nextPage > 1) params.set("page", String(nextPage));

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [activeTab, search, tipoFilter, organismoFilter, contratoFilter, estamentoFilter, soloHorasExtras, partidoFilter, regionFilter, sortFuncionarios, viewMode, page, router, pathname]
  );

  // Fetch Funcionarios cuando la pestaña activa es "funcionarios"
  useEffect(() => {
    if (activeTab !== "funcionarios") return;

    let isMounted = true;
    const timer = setTimeout(() => {
      setFuncionariosLoading(true);

      const params = new URLSearchParams();
      if (debouncedSearch) params.set("query", debouncedSearch);
      if (organismoFilter !== "Todos") params.set("muni", organismoFilter);
      if (tipoFilter !== "Todos") params.set("tipo", tipoFilter);
      if (contratoFilter !== "Todos") params.set("contrato", contratoFilter);
      if (estamentoFilter !== "Todos") params.set("estamento", estamentoFilter);
      if (soloHorasExtras) params.set("horas_extras", "true");
      params.set("sortBy", sortFuncionarios);
      params.set("page", String(page));
      params.set("limit", String(ITEMS_PER_PAGE));

      fetch(`/api/funcionarios?${params.toString()}`)
        .then((res) => res.json())
        .then((json) => {
          if (!isMounted) return;
          if (json.data && Array.isArray(json.data)) {
            setFuncionariosData(json.data);
            setFuncionariosTotal(json.pagination?.total || json.data.length);
            if (json.pagination?.stats) {
              setFuncionariosStats(json.pagination.stats);
            }
          } else {
            setFuncionariosData([]);
            setFuncionariosTotal(0);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setFuncionariosData([]);
          setFuncionariosTotal(0);
        })
        .finally(() => {
          if (isMounted) setFuncionariosLoading(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab, debouncedSearch, organismoFilter, tipoFilter, contratoFilter, estamentoFilter, soloHorasExtras, sortFuncionarios, page]);

  // Handle Tab Switch
  const handleTabChange = (newTab: PersonaTab) => {
    setPage(1);
    syncUrl({ tab: newTab, page: 1 });
  };

  // Filtrado Tab Parlamentarios
  const filteredParlamentarios = useMemo(() => {
    return parlamentarios.filter((p) => {
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const match =
          p.nombre_completo.toLowerCase().includes(s) ||
          p.partido_actual.toLowerCase().includes(s) ||
          p.distrito_o_circunscripcion.toLowerCase().includes(s) ||
          p.region.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (partidoFilter !== "Todos" && p.partido_actual !== partidoFilter) return false;
      if (regionFilter !== "Todas" && p.region !== regionFilter) return false;
      return true;
    });
  }, [parlamentarios, debouncedSearch, partidoFilter, regionFilter]);

  // Filtrado Tab Alcaldes
  const filteredAlcaldes = useMemo(() => {
    return alcaldes.filter((a) => {
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const match =
          a.alcalde_nombre.toLowerCase().includes(s) ||
          a.nombre_comuna.toLowerCase().includes(s) ||
          a.region.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (regionFilter !== "Todas" && a.region !== regionFilter) return false;
      return true;
    });
  }, [alcaldes, debouncedSearch, regionFilter]);

  // Filtrado Tab Autoridades (DIP)
  const filteredAutoridades = useMemo(() => {
    return autoridades.filter((aut) => {
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const match =
          (aut.director_jefe_actual || "").toLowerCase().includes(s) ||
          aut.nombre_canonico.toLowerCase().includes(s) ||
          (aut.sigla || "").toLowerCase().includes(s) ||
          (aut.ministerio_dependiente || "").toLowerCase().includes(s);
        if (!match) return false;
      }
      if (tipoFilter !== "Todos" && aut.tipo !== tipoFilter) return false;
      return true;
    });
  }, [autoridades, debouncedSearch, tipoFilter]);

  // Paginación segura para parlamentarios, alcaldes y autoridades
  const paginatedParlamentarios = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredParlamentarios.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredParlamentarios, page]);

  const paginatedAlcaldes = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredAlcaldes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlcaldes, page]);

  const paginatedAutoridades = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredAutoridades.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAutoridades, page]);

  // Opciones únicas de partidos y regiones
  const uniquePartidos = useMemo(() => {
    const set = new Set(parlamentarios.map((p) => p.partido_actual).filter(Boolean));
    return Array.from(set).sort();
  }, [parlamentarios]);

  const uniqueRegiones = useMemo(() => {
    const set = new Set(alcaldes.map((a) => a.region).filter(Boolean));
    return Array.from(set).sort();
  }, [alcaldes]);

  // Filtrado de organismos para el selector
  const filteredOrganismosOptions = useMemo(() => {
    if (!orgSearchQuery.trim()) return organismos.slice(0, 100);
    const q = orgSearchQuery.toLowerCase();
    return organismos
      .filter((o) => o.nombre_canonico.toLowerCase().includes(q) || (o.sigla && o.sigla.toLowerCase().includes(q)))
      .slice(0, 60);
  }, [organismos, orgSearchQuery]);

  // Conteos
  const totalCount =
    activeTab === "parlamentarios"
      ? filteredParlamentarios.length
      : activeTab === "alcaldes"
      ? filteredAlcaldes.length
      : activeTab === "autoridades"
      ? filteredAutoridades.length
      : funcionariosTotal;

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)", paddingBottom: "5rem" }}>
      {/* Hero Banner */}
      <section className="page-masthead">
        <div className="container-main">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
              <div style={{ maxWidth: 720 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
                  <span className="badge badge-ok">
                    Registro Universal de Personas y Autoridades
                  </span>
                  <span className="badge badge-info">
                    Transparencia Activa CPLT
                  </span>
                </div>
                <h1 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 900, color: "var(--text-1)", margin: "0 0 0.5rem 0" }}>
                  Directorio de Personas del Estado
                </h1>
                <p style={{ fontSize: "0.9rem", color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
                  Consolidación de parlamentarios, alcaldes, ministros, directores de servicio y nóminas oficiales de personal según la cobertura publicada por cada organismo.
                </p>
              </div>

              {/* Quick Metrics Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: "0.75rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0.85rem",
                  minWidth: 280,
                }}
              >
                <div style={{ textAlign: "center", padding: "0 0.5rem" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-1)" }}>{parlamentarios.length}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 600 }}>Parlamentarios</div>
                </div>
                <div style={{ textAlign: "center", padding: "0 0.5rem", borderLeft: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-1)" }}>{alcaldes.length}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 600 }}>Alcaldes</div>
                </div>
                <div style={{ textAlign: "center", padding: "0 0.5rem", borderLeft: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-1)" }}>{autoridades.length}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 600 }}>Altas Autoridades</div>
                </div>
                <div style={{ textAlign: "center", padding: "0 0.5rem", borderLeft: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--money)" }}>CPLT</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 600 }}>Cobertura por organismo</div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
              {[
                { id: "parlamentarios" as PersonaTab, label: "🏛️ Parlamentarios", count: String(parlamentarios.length) },
                { id: "alcaldes" as PersonaTab, label: "🏙️ Alcaldes", count: String(alcaldes.length) },
                { id: "autoridades" as PersonaTab, label: "⚖️ Altas autoridades DIP", count: String(autoridades.length) },
                { id: "funcionarios" as PersonaTab, label: "📋 Funcionarios", count: "CPLT" },
              ].map((t) => {
                const activo = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTabChange(t.id)}
                    className="capsule"
                    style={{
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "0.82rem",
                      fontWeight: activo ? 800 : 500,
                      padding: "0.5rem 1rem",
                      borderRadius: 8,
                      border: activo ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: activo ? "var(--accent)" : "var(--surface-2)",
                      color: activo ? "var(--bg)" : "var(--text-1)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>{t.label}</span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: 99,
                        fontFamily: "var(--font-mono)",
                        background: activo ? "var(--surface-2)" : "var(--surface)",
                        color: activo ? "var(--bg)" : "var(--text-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container-main" style={{ paddingTop: "1.5rem" }}>
        {/* Controls and Search Bar */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            {/* Search Input */}
            <div style={{ flex: "1 1 280px", position: "relative" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "parlamentarios"
                    ? "Buscar por nombre, partido o región..."
                    : activeTab === "alcaldes"
                    ? "Buscar por alcalde, comuna o región..."
                    : activeTab === "autoridades"
                    ? "Buscar por ministro, director, ministerio..."
                    : "Buscar por nombre, cargo u organismo..."
                }
                style={{
                  width: "100%",
                  padding: "0.6rem 0.9rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  color: "var(--text-1)",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-3)",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tab Specific Filters */}
            {activeTab === "parlamentarios" && (
              <>
                <select
                  value={partidoFilter}
                  onChange={(e) => {
                    setPartidoFilter(e.target.value);
                    setPage(1);
                    syncUrl({ partido: e.target.value, page: 1 });
                  }}
                  style={{
                    padding: "0.6rem 0.8rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    color: "var(--text-1)",
                  }}
                >
                  <option value="Todos">Todos los partidos</option>
                  {uniquePartidos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <select
                  value={regionFilter}
                  onChange={(e) => {
                    setRegionFilter(e.target.value);
                    setPage(1);
                    syncUrl({ region: e.target.value, page: 1 });
                  }}
                  style={{
                    padding: "0.6rem 0.8rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    color: "var(--text-1)",
                  }}
                >
                  <option value="Todas">Todas las regiones</option>
                  {uniqueRegiones.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </>
            )}

            {activeTab === "alcaldes" && (
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setPage(1);
                  syncUrl({ region: e.target.value, page: 1 });
                }}
                style={{
                  padding: "0.6rem 0.8rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  color: "var(--text-1)",
                }}
              >
                <option value="Todas">Todas las regiones de Chile</option>
                {uniqueRegiones.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            {activeTab === "autoridades" && (
              <select
                value={tipoFilter}
                onChange={(e) => {
                  setTipoFilter(e.target.value);
                  setPage(1);
                  syncUrl({ tipo: e.target.value, page: 1 });
                }}
                style={{
                  padding: "0.6rem 0.8rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  color: "var(--text-1)",
                }}
              >
                {TIPOS_ORGANISMO_OPTIONS.filter((t) => t.id !== "Municipalidad").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}

            {activeTab === "funcionarios" && (
              <>
                <select
                  value={tipoFilter}
                  onChange={(e) => {
                    setTipoFilter(e.target.value);
                    setPage(1);
                    syncUrl({ tipo: e.target.value, page: 1 });
                  }}
                  style={{
                    padding: "0.6rem 0.8rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    color: "var(--text-1)",
                  }}
                >
                  {TIPOS_ORGANISMO_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <select
                  id="select-muni"
                  value={organismoFilter}
                  onChange={(e) => {
                    setOrganismoFilter(e.target.value);
                    setPage(1);
                    syncUrl({ org: e.target.value, page: 1 });
                  }}
                  style={{
                    padding: "0.6rem 0.8rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.85rem",
                    color: "var(--text-1)",
                  }}
                >
                  <option value="Todos">Todos los organismos ({organismos.length})</option>
                  {filteredOrganismosOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.sigla ? `[${o.sigla}] ` : ""}{o.nombre_canonico}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* View Mode Toggle */}
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem", background: "var(--surface-2)", padding: "0.2rem", borderRadius: 8, border: "1px solid var(--border)" }}>
              <button
                onClick={() => {
                  setViewMode("cards");
                  syncUrl({ view: "cards" });
                }}
                title="Vista de Tarjetas"
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "cards" ? "var(--surface)" : "transparent",
                  color: viewMode === "cards" ? "var(--accent)" : "var(--text-3)",
                  cursor: "pointer",
                  fontWeight: viewMode === "cards" ? 700 : 500,
                  fontSize: "0.75rem",
                }}
              >
                Tarjetas
              </button>
              <button
                onClick={() => {
                  setViewMode("table");
                  syncUrl({ view: "table" });
                }}
                title="Vista de Tabla"
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: 6,
                  border: "none",
                  background: viewMode === "table" ? "var(--surface)" : "transparent",
                  color: viewMode === "table" ? "var(--accent)" : "var(--text-3)",
                  cursor: "pointer",
                  fontWeight: viewMode === "table" ? 700 : 500,
                  fontSize: "0.75rem",
                }}
              >
                Tabla
              </button>
            </div>
          </div>

          {/* Subfilters for Funcionarios Tab */}
          {activeTab === "funcionarios" && (
            <div style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ color: "var(--text-3)", fontWeight: 600 }}>Contrato:</span>
                <select
                  value={contratoFilter}
                  onChange={(e) => {
                    setContratoFilter(e.target.value);
                    setPage(1);
                    syncUrl({ contrato: e.target.value, page: 1 });
                  }}
                  style={{
                    padding: "0.35rem 0.6rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text-1)",
                  }}
                >
                  {CONTRATOS_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ color: "var(--text-3)", fontWeight: 600 }}>Estamento:</span>
                <select
                  value={estamentoFilter}
                  onChange={(e) => {
                    setEstamentoFilter(e.target.value);
                    setPage(1);
                    syncUrl({ estamento: e.target.value, page: 1 });
                  }}
                  style={{
                    padding: "0.35rem 0.6rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text-1)",
                  }}
                >
                  {ESTAMENTOS_OPTIONS.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ color: "var(--text-3)", fontWeight: 600 }}>Ordenar:</span>
                <select
                  value={sortFuncionarios}
                  onChange={(e) => {
                    setSortFuncionarios(e.target.value);
                    setPage(1);
                    syncUrl({ sort: e.target.value, page: 1 });
                  }}
                  style={{
                    padding: "0.35rem 0.6rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--text-1)",
                  }}
                >
                  {SORTS_FUNCIONARIOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", marginLeft: "auto", color: "var(--text-2)", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={soloHorasExtras}
                  onChange={(e) => {
                    setSoloHorasExtras(e.target.checked);
                    setPage(1);
                    syncUrl({ extras: e.target.checked, page: 1 });
                  }}
                />
                <span>Solo con horas extras</span>
              </label>
            </div>
          )}
        </div>

        {/* Results summary header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", padding: "0 0.25rem" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
            Mostrando <strong style={{ color: "var(--text-1)" }}>{totalCount.toLocaleString("es-CL")}</strong>{" "}
            {activeTab === "parlamentarios"
              ? "parlamentarios encontrados"
              : activeTab === "alcaldes"
              ? "alcaldes de Chile"
              : activeTab === "autoridades"
              ? "altas autoridades institucionales"
              : "funcionarios públicos clasificados"}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PARLAMENTARIOS */}
        {/* ========================================================================= */}
        {activeTab === "parlamentarios" && (
          <>
            {viewMode === "cards" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                {paginatedParlamentarios.map((p) => {
                  const branding = getPartidoBranding(p.partido_actual);
                  const asistPct = p.asistencia_sala_pct ?? null;
                  const asistColor = asistPct === null ? "var(--text-3)" : asistPct >= 85 ? "var(--ok)" : asistPct >= 70 ? "var(--warn)" : "var(--bad)";
                  return (
                    <Link
                      key={p.id}
                      href={`/politico/${getPoliticoSlug(p.id)}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderTop: `3px solid ${branding.color_oficial}`,
                        borderRadius: "1rem",
                        padding: "1rem",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "all 0.2s ease",
                      }}
                      className="hover-card"
                    >
                      <div>
                        {/* Avatar + nombre */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: "0.75rem",
                              background: "var(--surface-2)",
                              border: "1px solid var(--border)",
                              overflow: "hidden",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "1.1rem",
                              color: branding.color_oficial,
                            }}
                          >
                            {p.foto_url ? (
                              <img src={p.foto_url} alt={p.nombre_completo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              getInitials(p.nombre_completo)
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "0.92rem", lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.nombre_completo}
                            </h3>
                            <p style={{ fontSize: "0.72rem", color: "var(--text-2)", marginTop: "0.15rem", fontWeight: 600 }}>
                              {p.cargo_actual}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "0.35rem",
                                  fontSize: "0.68rem",
                                  fontWeight: 800,
                                  color: "var(--surface)",
                                  background: branding.color_oficial,
                                }}
                              >
                                {branding.logo_url && (
                                  <img
                                    src={branding.logo_url}
                                    alt={branding.sigla}
                                    style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }}
                                  />
                                )}
                                {branding.sigla}
                              </span>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.region}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Estadísticas */}
                        <div style={{ marginTop: "0.9rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                            <div>
                              <span style={{ fontSize: "0.6rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Distrito / Circ.</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-1)", fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.distrito_o_circunscripcion}
                              </span>
                            </div>
                            {asistPct !== null && (
                              <div>
                                <span style={{ fontSize: "0.6rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>Asistencia</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <div style={{ flex: 1, height: 4, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
                                    <div style={{ width: `${asistPct}%`, height: "100%", background: asistColor, borderRadius: 99 }} />
                                  </div>
                                  <span style={{ fontSize: "0.75rem", color: asistColor, fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>{asistPct}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {p.gastos_operacionales_promedio_mensual_clp ? (
                            <div style={{ marginTop: "0.4rem", display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
                              <span style={{ color: "var(--text-3)" }}>Gasto op. mensual</span>
                              <span style={{ color: "var(--warn)", fontFamily: "monospace", fontWeight: 700 }}>
                                {formatCLP(p.gastos_operacionales_promedio_mensual_clp)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ marginTop: "0.9rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
                        <span
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "0.5rem",
                            background: "var(--ok-bg)",
                            border: "1px solid var(--ok)",
                            color: "var(--ok)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                        >
                          Ver ficha parlamentaria →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.75rem 1rem" }}>Parlamentario/a</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Cámara</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Partido</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Región / Territorio</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Asistencia</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedParlamentarios.map((p) => {
                      const branding = getPartidoBranding(p.partido_actual);
                      return (
                        <tr key={p.id}>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-1)" }}>
                            {p.nombre_completo}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-2)" }}>{p.cargo_actual}</td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.15rem 0.5rem",
                                borderRadius: 4,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: "var(--surface)",
                                background: branding.color_oficial,
                              }}
                            >
                              {branding.logo_url && (
                                <img
                                  src={branding.logo_url}
                                  alt={branding.sigla}
                                  style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }}
                                />
                              )}
                              {branding.sigla}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)", fontSize: "0.8rem" }}>
                            {p.region} ({p.distrito_o_circunscripcion})
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 700, color: "var(--ok)", fontFamily: "monospace" }}>
                            {p.asistencia_sala_pct ? `${p.asistencia_sala_pct}%` : "—"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            <Link
                              href={`/politico/${getPoliticoSlug(p.id)}`}
                              style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
                            >
                              Ver Ficha →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ALCALDES */}
        {/* ========================================================================= */}
        {activeTab === "alcaldes" && (
          <>
            {viewMode === "cards" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                {paginatedAlcaldes.map((a) => (
                  <Link
                    key={a.muni_id}
                    href={`/municipalidades/${a.muni_id}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderTop: "3px solid var(--accent)",
                      borderRadius: "1rem",
                      padding: "1rem",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "all 0.2s ease",
                    }}
                    className="hover-card"
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "0.35rem", background: "var(--info-bg)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                          CUT {a.cut}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                          {a.region}
                        </span>
                      </div>

                      <h3 style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "0.92rem", lineHeight: 1.3, margin: "0 0 0.15rem" }}>
                        {a.alcalde_nombre}
                      </h3>
                      <p style={{ fontSize: "0.72rem", color: "var(--ok)", fontWeight: 600, margin: 0 }}>
                        Alcalde/sa de {a.nombre_comuna}
                      </p>

                      <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.72rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-3)" }}>Sueldo Bruto:</span>
                          <span style={{ color: "var(--text-1)", fontFamily: "monospace", fontWeight: 700 }}>{formatCLP(a.remuneracion_bruta)}</span>
                        </div>
                        {a.grado_eus && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-3)" }}>Grado EUS:</span>
                            <span style={{ color: "var(--text-2)", fontFamily: "monospace" }}>Grado {a.grado_eus}</span>
                          </div>
                        )}
                        {a.poblacion_censo_2024 && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-3)" }}>Población:</span>
                            <span style={{ color: "var(--text-2)" }}>{a.poblacion_censo_2024.toLocaleString("es-CL")} hab.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
                      <span
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "0.5rem",
                          background: "var(--info-bg)",
                          border: "1px solid var(--border)",
                          color: "var(--accent)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        Ver ficha comunal y concejo →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.75rem 1rem" }}>Alcalde/sa Titular</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Municipalidad</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Región</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Sueldo Bruto</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Grado</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAlcaldes.map((a) => (
                      <tr key={a.muni_id}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-1)" }}>{a.alcalde_nombre}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--ok)", fontWeight: 600 }}>Municipalidad de {a.nombre_comuna}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)", fontSize: "0.8rem" }}>{a.region}</td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--text-1)" }}>
                          {formatCLP(a.remuneracion_bruta)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-3)" }}>
                          {a.grado_eus ? `Grado ${a.grado_eus}` : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                          <Link
                            href={`/municipalidades/${a.muni_id}`}
                            style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
                          >
                            Ver Comuna →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ALTAS AUTORIDADES DIP */}
        {/* ========================================================================= */}
        {activeTab === "autoridades" && (
          <>
            {viewMode === "cards" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                {paginatedAutoridades.map((aut) => (
                  <div
                    key={aut.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderTop: "3px solid var(--accent)",
                      borderRadius: "1rem",
                      padding: "1rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "0.35rem", background: "var(--info-bg)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                          {aut.tipo}
                        </span>
                        {aut.partida_capitulo_dipres && (
                          <span style={{ fontSize: "0.68rem", color: "var(--warn)", fontFamily: "monospace", fontWeight: 700 }}>
                            DIPRES {aut.partida_capitulo_dipres}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "0.95rem", lineHeight: 1.3, margin: "0 0 0.2rem" }}>
                        {aut.director_jefe_actual || "Jefatura Superior"}
                      </h3>
                      <p style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600, margin: 0 }}>
                        {aut.sigla ? `[${aut.sigla}] ` : ""}{aut.nombre_canonico}
                      </p>

                      <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.72rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-3)" }}>Dotación Personal:</span>
                          <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{aut.dotacion_total === null ? "Dotación no publicada" : `${aut.dotacion_total.toLocaleString("es-CL")} funcionarios`}</span>
                        </div>
                        {aut.ministerio_dependiente && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-3)" }}>Dependencia:</span>
                            <span style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{aut.ministerio_dependiente}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
                      <Link
                        href={`/servicios-publicos/${aut.id}`}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "0.5rem",
                          background: "var(--info-bg)",
                          border: "1px solid var(--border)",
                          color: "var(--accent)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        Ver ficha del organismo →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.75rem 1rem" }}>Autoridad Titular</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Organismo Público</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Tipo</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Partida DIPRES</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Dotación</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAutoridades.map((aut) => (
                      <tr key={aut.id}>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-1)" }}>{aut.director_jefe_actual || "Jefatura Superior"}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--accent)", fontWeight: 600 }}>
                          {aut.sigla ? `[${aut.sigla}] ` : ""}{aut.nombre_canonico}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)", fontSize: "0.8rem" }}>{aut.tipo}</td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", color: "var(--warn)", fontSize: "0.75rem" }}>
                          {aut.partida_capitulo_dipres ? `Partida ${aut.partida_capitulo_dipres}` : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>
                          {aut.dotacion_total === null ? "—" : aut.dotacion_total.toLocaleString("es-CL")}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                          <Link
                            href={`/servicios-publicos/${aut.id}`}
                            style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
                          >
                            Ver Organismo →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FUNCIONARIOS */}
        {/* ========================================================================= */}
        {activeTab === "funcionarios" && (
          <>
            {funcionariosLoading ? (
              viewMode === "cards" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <SkeletonTable rows={10} />
              )
            ) : funcionariosData.length === 0 ? (
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔍</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-1)", margin: "0 0 0.5rem" }}>No se encontraron funcionarios</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-3)", maxWidth: 420, margin: "0 auto 1.5rem" }}>
                  Prueba cambiando los filtros de organismo, tipo, contrato o término de búsqueda.
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setTipoFilter("Todos");
                    setOrganismoFilter("Todos");
                    setContratoFilter("Todos");
                    setEstamentoFilter("Todos");
                    setSoloHorasExtras(false);
                    syncUrl({ search: "", tipo: "Todos", org: "Todos", contrato: "Todos", estamento: "Todos", extras: false, page: 1 });
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
                >
                  Restablecer todos los filtros
                </button>
              </div>
            ) : viewMode === "cards" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                {funcionariosData.map((f) => {
                  const bruto = f.remuneracion_bruta_mensual || 0;
                  const qualityInfo = classifyFuncionarioRecord(f);

                  return (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "1rem",
                        padding: "1rem",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "0.35rem", background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
                            {formatEstamentoCorto(f.estamento).label}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-3)", fontFamily: "monospace" }}>
                            {f.tipo_contrato}
                          </span>
                        </div>

                        <h3 style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "0.95rem", lineHeight: 1.3, margin: "0 0 0.2rem" }}>
                          {f.nombre_completo}
                        </h3>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-2)", margin: "0 0 0.4rem" }}>
                          {f.cargo}
                        </p>

                        <div style={{ fontSize: "0.72rem", color: "var(--ok)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.organo_nombre}
                        </div>

                        <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.72rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "var(--text-3)" }}>{qualityInfo.isSinPago ? "Estado:" : "Sueldo Bruto:"}</span>
                            {qualityInfo.isSinPago ? (
                              <span className="badge badge-subtle" style={{ fontSize: "0.68rem", fontWeight: 700 }}>
                                Sin pago registrado
                              </span>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <span style={{ color: qualityInfo.isMicroMonto ? "var(--warn)" : "var(--text-1)", fontWeight: 800, fontFamily: "monospace" }}>
                                  {formatCLP(bruto)}
                                </span>
                                {qualityInfo.isMicroMonto && (
                                  <span
                                    className="badge badge-warn"
                                    style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", cursor: "help" }}
                                    title={`${qualityInfo.etiquetaCausa}: ${qualityInfo.explicacionCiudadana}`}
                                  >
                                    ⚠️ {qualityInfo.etiquetaCausa}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {f.remuneracion_liquida_mensual && !qualityInfo.isSinPago && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--text-3)" }}>Sueldo Líquido:</span>
                              <span style={{ color: "var(--money)", fontFamily: "monospace" }}>
                                {formatCLP(f.remuneracion_liquida_mensual)}
                              </span>
                            </div>
                          )}
                          {f.horas_extras_mes_anterior > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warn)", fontWeight: 700 }}>
                              <span>Horas extras:</span>
                              <span>{f.horas_extras_mes_anterior} hrs ({formatCLP(f.monto_horas_extras_clp)})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border)" }}>
                        <button
                          onClick={() => setModalItem({ tipo: "funcionario", data: f })}
                          style={{
                            width: "100%",
                            padding: "0.4rem 0.75rem",
                            borderRadius: "0.5rem",
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text-1)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Ver detalle de remuneración →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.75rem 1rem" }}>Funcionario/a</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Organismo del Estado</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Cargo / Función</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Estamento</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Sueldo Bruto</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Horas Extras</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funcionariosData.map((f) => {
                      const bruto = f.remuneracion_bruta_mensual || 0;
                      const qualityInfo = classifyFuncionarioRecord(f);

                      return (
                        <tr key={f.id}>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-1)" }}>{f.nombre_completo}</td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-2)", fontSize: "0.8rem" }}>{f.organo_nombre}</td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-3)", fontSize: "0.8rem" }}>{f.cargo}</td>
                          <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontFamily: "monospace" }}>{formatEstamentoCorto(f.estamento).label}</td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--text-1)" }}>
                            {qualityInfo.isSinPago ? (
                              <span className="badge badge-subtle" style={{ fontSize: "0.7rem" }}>Sin pago</span>
                            ) : (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                                <span style={{ color: qualityInfo.isMicroMonto ? "var(--warn)" : "inherit" }}>{formatCLP(bruto)}</span>
                                {qualityInfo.isMicroMonto && (
                                  <span
                                    className="badge badge-warn"
                                    style={{ fontSize: "0.6rem", padding: "0.1rem 0.3rem", cursor: "help" }}
                                    title={`${qualityInfo.etiquetaCausa}: ${qualityInfo.explicacionCiudadana}`}
                                  >
                                    ⚠️ {qualityInfo.etiquetaCausa}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontSize: "0.75rem" }}>
                            {f.horas_extras_mes_anterior > 0 ? (
                              <span style={{ color: "var(--warn)", fontWeight: 700 }}>
                                {f.horas_extras_mes_anterior} hrs
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-3)" }}>0</span>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            <button
                              onClick={() => setModalItem({ tipo: "funcionario", data: f })}
                              style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}
                            >
                              Ver →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* PAGINATION CONTROLS */}
        {/* ========================================================================= */}
        {totalPages > 1 && (
          <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <button
              onClick={() => {
                const prev = Math.max(1, page - 1);
                setPage(prev);
                syncUrl({ page: prev });
              }}
              disabled={page <= 1}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 8,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.4 : 1,
              }}
            >
              ← Anterior
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5) {
                  if (page > 3 && page < totalPages - 2) {
                    p = page - 2 + i;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  }
                }
                const isSelected = page === p;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setPage(p);
                      syncUrl({ page: p });
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: isSelected ? "var(--accent)" : "var(--surface)",
                      color: isSelected ? "var(--bg)" : "var(--text-1)",
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                syncUrl({ page: next });
              }}
              disabled={page >= totalPages}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 8,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.4 : 1,
              }}
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* DETAILED MODAL FOR FUNCIONARIO */}
      {/* ========================================================================= */}
      {modalItem && modalItem.tipo === "funcionario" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "var(--overlay)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, width: "100%", maxWidth: 520, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <span className="badge badge-ok" style={{ fontSize: "0.68rem" }}>
                  {modalItem.data.organo_nombre}
                </span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-1)", marginTop: "0.5rem", marginBottom: "0.2rem" }}>
                  {modalItem.data.nombre_completo}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", margin: 0 }}>{modalItem.data.cargo}</p>
              </div>
              <button
                onClick={() => setModalItem(null)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", color: "var(--text-3)", cursor: "pointer", padding: "0.25rem" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", background: "var(--surface-2)", padding: "0.85rem", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-3)", display: "block", textTransform: "uppercase", fontWeight: 700 }}>Remuneración Bruta</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-1)", fontFamily: "monospace" }}>{formatCLP(modalItem.data.remuneracion_bruta_mensual)}</span>
                </div>
                <div>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-3)", display: "block", textTransform: "uppercase", fontWeight: 700 }}>Remuneración Líquida</span>
                  <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--money)", fontFamily: "monospace" }}>{formatCLP(modalItem.data.remuneracion_liquida_mensual)}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.75rem" }}>
                <div>
                  <span style={{ color: "var(--text-3)", display: "block" }}>Estamento:</span>
                  <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{modalItem.data.estamento}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-3)", display: "block" }}>Tipo Contrato:</span>
                  <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{modalItem.data.tipo_contrato}</span>
                </div>
                {modalItem.data.grado_eus && (
                  <div>
                    <span style={{ color: "var(--text-3)", display: "block" }}>Grado EUS:</span>
                    <span style={{ color: "var(--text-1)", fontFamily: "monospace" }}>{modalItem.data.grado_eus}</span>
                  </div>
                )}
                {modalItem.data.fecha_ingreso && (
                  <div>
                    <span style={{ color: "var(--text-3)", display: "block" }}>Fecha Ingreso:</span>
                    <span style={{ color: "var(--text-1)", fontFamily: "monospace" }}>{modalItem.data.fecha_ingreso}</span>
                  </div>
                )}
              </div>

              {modalItem.data.formacion && (
                <div style={{ fontSize: "0.75rem", background: "var(--surface-2)", padding: "0.75rem", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--text-3)", display: "block", fontWeight: 700, marginBottom: "0.2rem" }}>Formación Profesional:</span>
                  <span style={{ color: "var(--text-1)" }}>{modalItem.data.formacion}</span>
                </div>
              )}

              {modalItem.data.horas_extras_mes_anterior > 0 && (
                <div style={{ fontSize: "0.75rem", background: "var(--warn-bg)", padding: "0.75rem", borderRadius: 8, border: "1px solid var(--warn)" }}>
                  <span style={{ color: "var(--warn)", display: "block", fontWeight: 700, marginBottom: "0.2rem" }}>Horas Extras Registradas:</span>
                  <span style={{ color: "var(--text-1)" }}>
                    {modalItem.data.horas_extras_mes_anterior} horas — Monto: {formatCLP(modalItem.data.monto_horas_extras_clp)}
                  </span>
                </div>
              )}

              {modalItem.data && (() => {
                const q = classifyFuncionarioRecord(modalItem.data);
                if (q.isMicroMonto) {
                  return (
                    <div style={{ fontSize: "0.75rem", background: "var(--warn-bg)", border: "1px solid var(--warn)", padding: "0.85rem", borderRadius: 8 }}>
                      <span style={{ color: "var(--warn)", display: "block", fontWeight: 800, marginBottom: "0.3rem" }}>
                        ⚠️ {q.etiquetaCausa} ({q.nivelConfianza})
                      </span>
                      <p style={{ margin: "0 0 0.5rem", color: "var(--text-1)", lineHeight: 1.45 }}>
                        {q.explicacionCiudadana}
                      </p>
                      <a
                        href={q.urlRegistroOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none", fontSize: "0.72rem" }}
                      >
                        Ver registro oficial en portal de Transparencia Activa ↗
                      </a>
                    </div>
                  );
                }
                return null;
              })()}

              <div style={{ fontSize: "0.7rem", color: "var(--text-3)", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                Fuente oficial: {modalItem.data.fuente || "Transparencia Activa CPLT / portaltransparencia.cl"} ({modalItem.data.fuente_periodo || "2026"})
              </div>
            </div>

            <div style={{ padding: "0.85rem 1.25rem", background: "var(--surface-2)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setModalItem(null)}
                className="btn btn-primary"
                style={{ fontSize: "0.75rem", padding: "0.4rem 1rem" }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
