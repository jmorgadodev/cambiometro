"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { FuncionarioPublico } from "@/lib/seed-politicos";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import {
  formatEstamentoCorto,
  formatTipoContrato,
  getInitials,
} from "@/lib/estamentos-format";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

function formatCLP(n?: number | null) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

const RANGOS_SUELDO = [
  { id: "todos", label: "Todos los sueldos", min: undefined, max: undefined },
  { id: "hasta-1m", label: "Hasta $1.000.000", min: undefined, max: 1_000_000 },
  { id: "1m-2.5m", label: "$1.000.000 a $2.500.000", min: 1_000_000, max: 2_500_000 },
  { id: "2.5m-5m", label: "$2.500.000 a $5.000.000", min: 2_500_000, max: 5_000_000 },
  { id: "mas-5m", label: "Más de $5.000.000", min: 5_000_000, max: undefined },
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

const SORTS_OPTIONS = [
  { id: "sueldo_desc", label: "Sueldo bruto: Mayor a menor" },
  { id: "sueldo_asc", label: "Sueldo bruto: Menor a mayor" },
  { id: "horas_extras_desc", label: "Horas extras: Mayor a menor" },
  { id: "nombre_asc", label: "Nombre: A - Z" },
  { id: "nombre_desc", label: "Nombre: Z - A" },
];

export default function GlobalFuncionariosClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Filtros inicializados desde URLSearchParams (por defecto: Todas las municipalidades)
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("search") || "");
  const [muniFilter, setMuniFilter] = useState(() => searchParams.get("muni") || "Todos");
  const [muniSearchQuery, setMuniSearchQuery] = useState("");
  const [contratoFilter, setContratoFilter] = useState(() => searchParams.get("contrato") || "Todos");
  const [estamentoFilter, setEstamentoFilter] = useState(() => searchParams.get("estamento") || "Todos");
  const [rangoSueldo, setRangoSueldo] = useState(() => searchParams.get("rango") || "todos");
  const [soloHorasExtras, setSoloHorasExtras] = useState(() => searchParams.get("extras") === "true");
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "sueldo_desc");
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => (searchParams.get("view") as "cards" | "table") || "cards");
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1);

  // Sincronizar URL de manera shallow
  const syncUrl = useCallback(
    (opts: {
      muni?: string;
      contrato?: string;
      estamento?: string;
      rango?: string;
      extras?: boolean;
      sort?: string;
      view?: string;
      p?: number;
      s?: string;
    }) => {
      const pMuni = opts.muni ?? muniFilter;
      const pContrato = opts.contrato ?? contratoFilter;
      const pEstamento = opts.estamento ?? estamentoFilter;
      const pRango = opts.rango ?? rangoSueldo;
      const pExtras = opts.extras !== undefined ? opts.extras : soloHorasExtras;
      const pSort = opts.sort ?? sortBy;
      const pView = opts.view ?? viewMode;
      const pPage = opts.p ?? page;
      const pSearch = opts.s !== undefined ? opts.s : debouncedSearch;

      const params = new URLSearchParams();
      if (pMuni && pMuni !== "Todos") params.set("muni", pMuni);
      if (pContrato !== "Todos") params.set("contrato", pContrato);
      if (pEstamento !== "Todos") params.set("estamento", pEstamento);
      if (pRango !== "todos") params.set("rango", pRango);
      if (pExtras) params.set("extras", "true");
      if (pSort !== "sueldo_desc") params.set("sort", pSort);
      if (pView !== "cards") params.set("view", pView);
      if (pPage > 1) params.set("page", String(pPage));
      if (pSearch.trim()) params.set("search", pSearch.trim());

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [muniFilter, contratoFilter, estamentoFilter, rangoSueldo, soloHorasExtras, sortBy, viewMode, page, debouncedSearch, pathname, router]
  );

  // Datos
  const [data, setData] = useState<FuncionarioPublico[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalMuni?: number;
    promedioSueldo?: number;
    conHorasExtras?: number;
  } | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Rango de sueldo seleccionado
  const selectedRango = useMemo(() => {
    return RANGOS_SUELDO.find((r) => r.id === rangoSueldo) ?? RANGOS_SUELDO[0];
  }, [rangoSueldo]);

  // Lista ordenada estrictamente en orden alfabético A-Z por nombre de comuna
  const comunasFiltradas = useMemo(() => {
    const sorted = [...MUNICIPALIDADES_SEED].sort((a, b) =>
      a.nombre_comuna.localeCompare(b.nombre_comuna, "es-CL")
    );
    if (!muniSearchQuery.trim()) return sorted;
    const q = muniSearchQuery.toLowerCase();
    return sorted.filter(
      (m) =>
        m.nombre_comuna.toLowerCase().includes(q) ||
        (m.region && m.region.toLowerCase().includes(q))
    );
  }, [muniSearchQuery]);

  // Info de la municipalidad activa (null si es 'Todos')
  const activeMuni = useMemo(() => {
    if (!muniFilter || muniFilter === "Todos") return null;
    return MUNICIPALIDADES_SEED.find((m) => m.id === muniFilter) ?? null;
  }, [muniFilter]);

  // Fetch data
  useEffect(() => {
    if (muniFilter === "Todos") {
      setData([]);
      setTotal(0);
      setTotalPages(1);
      setStats(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({
          muni: muniFilter,
          contrato: contratoFilter,
          estamento: estamentoFilter,
          sortBy,
          page: page.toString(),
          limit: "24",
        });

        if (debouncedSearch.trim()) {
          params.set("query", debouncedSearch.trim());
        }

        if (soloHorasExtras) {
          params.set("horas_extras", "true");
        }

        if (selectedRango.min !== undefined) {
          params.set("min_sueldo", selectedRango.min.toString());
        }

        if (selectedRango.max !== undefined) {
          params.set("max_sueldo", selectedRango.max.toString());
        }

        const res = await fetch(`/api/funcionarios?${params.toString()}`);
        const result = await res.json();

        if (!res.ok) {
          throw new Error(result?.error?.message ?? "Error al cargar la nómina.");
        }

        setData(result.data || []);
        setTotal(result.meta?.total || 0);
        setTotalPages(result.meta?.totalPages || 1);
        setStats(result.meta?.stats || null);
      } catch (err) {
        setData([]);
        setTotal(0);
        setTotalPages(1);
        setStats(null);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "La nómina oficial no está disponible para esta municipalidad."
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [
    debouncedSearch,
    muniFilter,
    contratoFilter,
    estamentoFilter,
    selectedRango,
    soloHorasExtras,
    sortBy,
    page,
  ]);

  // Limpiar filtros
  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setContratoFilter("Todos");
    setEstamentoFilter("Todos");
    setRangoSueldo("todos");
    setSoloHorasExtras(false);
    setSortBy("sueldo_desc");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    contratoFilter !== "Todos" ||
    estamentoFilter !== "Todos" ||
    rangoSueldo !== "todos" ||
    soloHorasExtras ||
    sortBy !== "sueldo_desc";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* ═══ PANEL DE FILTROS Y BÚSQUEDA ════════════════════════════════════════ */}
      <div
        className="card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Fila 1: Buscador de texto + Selector de Municipalidad */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Búsqueda por persona / cargo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label
              htmlFor="search-funcionario"
              style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700 }}
            >
              Buscar por nombre o cargo
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-subtle)",
                  fontSize: "0.95rem",
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
              <input
                id="search-funcionario"
                type="text"
                className="input"
                placeholder="Ej. Claudio Adaros, Enfermero, Abogado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: "2.4rem",
                  fontSize: "0.9rem",
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                  title="Borrar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Selector de Municipalidad */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label
              htmlFor="select-muni"
              style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 700 }}
            >
              Municipalidad
            </label>
            <select
              id="select-muni"
              className="input"
              value={muniFilter}
              onChange={(e) => {
                const val = e.target.value;
                setMuniFilter(val);
                setPage(1);
                syncUrl({ muni: val, p: 1 });
              }}
              style={{
                width: "100%",
                fontSize: "0.9rem",
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              <option value="Todos">🇨🇱 Todas las municipalidades (Consolidado Nacional)</option>
              {comunasFiltradas.map((m) => (
                <option key={m.id} value={m.id}>
                  Municipalidad de {m.nombre_comuna} {m.region ? `(${m.region})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 2: Filtros secundarios (Estamento, Contrato, Rango Sueldo, Orden) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.85rem",
          }}
        >
          {/* Estamento */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Estamento / Categoría
            </label>
            <select
              className="input"
              value={estamentoFilter}
              onChange={(e) => {
                setEstamentoFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.65rem", borderRadius: 6 }}
            >
              {ESTAMENTOS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo Contrato */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Tipo de Contrato
            </label>
            <select
              className="input"
              value={contratoFilter}
              onChange={(e) => {
                setContratoFilter(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.65rem", borderRadius: 6 }}
            >
              {CONTRATOS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rango de Sueldo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Rango de Sueldo Bruto
            </label>
            <select
              className="input"
              value={rangoSueldo}
              onChange={(e) => {
                setRangoSueldo(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.65rem", borderRadius: 6 }}
            >
              {RANGOS_SUELDO.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Ordenar por
            </label>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.65rem", borderRadius: 6 }}
            >
              {SORTS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 3: Checkbox Horas Extras + Switch Vista (Cards / Tabla) + Botón Reset */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {/* Checkbox horas extras */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              userSelect: "none",
              color: soloHorasExtras ? "var(--accent)" : "var(--text-primary)",
              fontWeight: soloHorasExtras ? 700 : 500,
            }}
          >
            <input
              type="checkbox"
              checked={soloHorasExtras}
              onChange={(e) => {
                setSoloHorasExtras(e.target.checked);
                setPage(1);
              }}
              style={{ accentColor: "var(--accent)", width: 16, height: 16, cursor: "pointer" }}
            />
            <span>Solo con horas extras pagadas</span>
          </label>

          {/* Controles de vista y reset */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-ghost"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", height: "auto" }}
              >
                ✕ Limpiar filtros
              </button>
            )}

            {/* Switch de modo de vista */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg-surface-2)",
                borderRadius: 8,
                padding: "2px",
                border: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  fontWeight: viewMode === "cards" ? 700 : 500,
                  background: viewMode === "cards" ? "var(--bg-surface)" : "transparent",
                  color: viewMode === "cards" ? "var(--accent)" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  boxShadow: "none",
                }}
              >
                <span>🗂️</span> Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  padding: "0.35rem 0.75rem",
                  fontSize: "0.78rem",
                  fontWeight: viewMode === "table" ? 700 : 500,
                  background: viewMode === "table" ? "var(--surface)" : "transparent",
                  color: viewMode === "table" ? "var(--accent)" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  boxShadow: "none",
                }}
              >
                <span>📊</span> Tabla
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TARJETA DE RESUMEN MUNICIPAL / NACIONAL ════════════════════════════ */}
      {stats && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1.25rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "var(--info-bg)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                flexShrink: 0,
              }}
            >
              {activeMuni ? "🏛️" : "🇨🇱"}
            </span>
            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {activeMuni ? "Resumen de Nómina Oficial" : "Consulta por municipalidad"}
              </span>
              <h2 style={{ fontSize: "1.15rem", margin: "0.1rem 0 0.2rem 0", color: "var(--text-primary)" }}>
                {activeMuni ? `Municipalidad de ${activeMuni.nombre_comuna}` : "Selecciona una municipalidad para consultar su nómina"}
              </h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {activeMuni ? `${activeMuni.region ?? "Chile"} · CUT: ${activeMuni.cut ?? "—"}` : "La consulta nacional requiere elegir una comuna"}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                Funcionarios en nómina
              </span>
              <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>
                {activeMuni ? (stats.totalMuni ?? total).toLocaleString("es-CL") : "—"}
              </strong>
            </div>

            {stats.promedioSueldo !== undefined && stats.promedioSueldo > 0 && (
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                  Sueldo bruto promedio
                </span>
                <strong style={{ fontSize: "1.1rem", color: "var(--ok)", fontFamily: "var(--font-mono, monospace)" }}>
                  {formatCLP(stats.promedioSueldo)}
                </strong>
              </div>
            )}

            {stats.conHorasExtras !== undefined && stats.conHorasExtras > 0 && (
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                  Con horas extras
                </span>
                <strong style={{ fontSize: "1.1rem", color: "var(--warn)" }}>
                  {stats.conHorasExtras.toLocaleString("es-CL")} pers.
                </strong>
              </div>
            )}

            {activeMuni ? (
              <Link prefetch={false}
                href={`/municipalidades/${activeMuni.id}`}
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem", alignSelf: "center" }}
              >
                Ficha Comunal ↗
              </Link>
            ) : (
              <Link prefetch={false}
                href="/municipalidades"
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem", alignSelf: "center" }}
              >
                Directorio Municipal ↗
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ═══ CONTADOR DE RESULTADOS ═════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "0 0.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {isLoading ? "Consultando nómina..." : activeMuni ? `${total.toLocaleString("es-CL")} funcionarios encontrados` : "Selecciona una municipalidad para comenzar"}
          </span>
          {hasActiveFilters && (
            <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>
              Filtros activos
            </span>
          )}
        </div>

        {totalPages > 1 && (
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Página {page} de {totalPages}
          </span>
        )}
      </div>

      {/* ═══ MENSAJES DE ERROR O ESTADO VACÍO ═══════════════════════════════════ */}
      {errorMessage && (
        <div
          className="card"
          style={{
            padding: "2rem",
            textAlign: "center",
            borderColor: "var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>ℹ️</div>
          <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>Nómina no disponible</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 500, margin: "0 auto 1.25rem" }}>
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => setMuniFilter("muni-maipu")}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            Ver nómina de Municipalidad de Maipú
          </button>
        </div>
      )}

      {/* ═══ ESTADO DE CARGA ═══════════════════════════════════════════════════ */}
      {isLoading && (
        viewMode === "table" ? (
          <SkeletonTable rows={8} cols={6} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {[...Array(6)].map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        )
      )}

      {/* ═══ VISTA 1: CARDS DE FUNCIONARIOS ═════════════════════════════════════ */}
      {!isLoading && !errorMessage && viewMode === "cards" && data.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {data.map((f) => {
            const estamentoStyle = formatEstamentoCorto(f.estamento);
            const contratoStyle = formatTipoContrato(f.tipo_contrato);
            const initials = getInitials(f.nombre_completo);
            const hasHorasExtras = (f.horas_extras_mes_anterior || 0) > 0;

            return (
              <article
                key={f.id}
                className="card"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "1.35rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
              >
                {/* Cabecera: Avatar + Nombre + Municipio */}
                <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                  {/* Avatar con Iniciales sobrias */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: estamentoStyle.bg,
                      border: `1.5px solid ${estamentoStyle.border}`,
                      color: estamentoStyle.text,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      flexShrink: 0,
                    }}
                    title={f.nombre_completo}
                  >
                    {initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={f.nombre_completo}
                    >
                      {f.nombre_completo}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        display: "block",
                        marginTop: "0.15rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.organo_nombre || "Municipalidad"}
                    </span>
                  </div>
                </div>

                {/* Cargo / Función */}
                <div style={{ minHeight: "2.4rem" }}>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-muted)",
                      margin: 0,
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                    title={f.cargo}
                  >
                    {f.cargo || "Sin cargo especificado"}
                  </p>
                  {f.formacion && f.formacion !== "NO ESPECIFICA" && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-subtle)",
                        display: "block",
                        marginTop: "0.2rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={`Formación: ${f.formacion}`}
                    >
                      🎓 {f.formacion}
                    </span>
                  )}
                </div>

                {/* Pastillas: Estamento Corto (con tooltip) + Tipo de Contrato */}
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "0.2rem 0.55rem",
                      borderRadius: 6,
                      background: estamentoStyle.bg,
                      color: estamentoStyle.text,
                      border: `1px solid ${estamentoStyle.border}`,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "help",
                    }}
                    title={`Estamento oficial: ${estamentoStyle.original}`}
                  >
                    {estamentoStyle.label}
                  </span>

                  <span
                    style={{
                      padding: "0.2rem 0.55rem",
                      borderRadius: 6,
                      background: contratoStyle.bg,
                      color: contratoStyle.text,
                      border: `1px solid ${contratoStyle.border}`,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                    }}
                  >
                    {contratoStyle.label}
                  </span>

                  {f.grado_eus && f.grado_eus !== "0" && (
                    <span
                      style={{
                        padding: "0.2rem 0.45rem",
                        borderRadius: 6,
                        background: "var(--bg-surface-2)",
                        color: "var(--text-subtle)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.68rem",
                      }}
                      title="Grado Escala Única de Sueldos"
                    >
                      Grado {f.grado_eus}
                    </span>
                  )}
                </div>

                {/* Sueldo Bruto y Horas Extras */}
                <div
                  style={{
                    paddingTop: "0.75rem",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                      Sueldo Bruto Mensual
                    </span>
                    <strong
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        color: "var(--ok)",
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatCLP(f.remuneracion_bruta_mensual)}
                    </strong>
                  </div>

                  {hasHorasExtras && (
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: 6,
                          background: "var(--warn-bg)",
                          color: "var(--warn)",
                          border: "1px solid var(--warn-border)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          display: "inline-block",
                        }}
                        title={`Monto por horas extras: ${formatCLP(f.monto_horas_extras_clp)}`}
                      >
                        +{f.horas_extras_mes_anterior} hrs extras
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ═══ VISTA 2: TABLA COMPACTA ═════════════════════════════════════════════ */}
      {!isLoading && !errorMessage && viewMode === "table" && data.length > 0 && (
        <div
          className="card"
          style={{
            padding: 0,
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          <div className="table-sticky-col" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--bg-surface-2)",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "0.75rem 1rem" }}>Funcionario / Cargo</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Municipalidad</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Estamento</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Contrato</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Sueldo Bruto</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Horas Extras</th>
                </tr>
              </thead>
              <tbody>
                {data.map((f, idx) => {
                  const estamentoStyle = formatEstamentoCorto(f.estamento);
                  const contratoStyle = formatTipoContrato(f.tipo_contrato);
                  const hasHorasExtras = (f.horas_extras_mes_anterior || 0) > 0;

                  return (
                    <tr
                      key={f.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: idx % 2 === 0 ? "transparent" : "var(--surface-2)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.9rem" }}>
                          {f.nombre_completo}
                        </strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {f.cargo || "Sin cargo especificado"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {f.organo_nombre?.replace("Municipalidad de ", "") || "Municipalidad"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: 4,
                            background: estamentoStyle.bg,
                            color: estamentoStyle.text,
                            border: `1px solid ${estamentoStyle.border}`,
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            cursor: "help",
                          }}
                          title={`Estamento oficial: ${estamentoStyle.original}`}
                        >
                          {estamentoStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: 4,
                            background: contratoStyle.bg,
                            color: contratoStyle.text,
                            border: `1px solid ${contratoStyle.border}`,
                            fontSize: "0.72rem",
                            fontWeight: 600,
                          }}
                        >
                          {contratoStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                        <strong style={{ color: "var(--ok)", fontFamily: "var(--font-mono, monospace)", fontSize: "0.95rem" }}>
                          {formatCLP(f.remuneracion_bruta_mensual)}
                        </strong>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                        {hasHorasExtras ? (
                          <span style={{ color: "var(--warn)", fontWeight: 700, fontSize: "0.8rem" }}>
                            +{f.horas_extras_mes_anterior} hrs
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-subtle)", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ ESTADO VACÍO (SIN RESULTADOS CON FILTROS) ══════════════════════════ */}
      {!isLoading && !errorMessage && data.length === 0 && (
        <div
          className="card"
          style={{
            padding: "3rem 1.5rem",
            textAlign: "center",
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
          <h3 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>{activeMuni ? "No se encontraron funcionarios" : "Selecciona una municipalidad"}</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 450, margin: "0 auto 1.25rem" }}>
            {activeMuni ? "No hay registros que coincidan con los filtros aplicados en esta municipalidad." : "Elige una comuna en el selector para consultar datos oficiales y usar la búsqueda de funcionarios."}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn btn-secondary"
            style={{ fontSize: "0.85rem" }}
          >
            Restablecer todos los filtros
          </button>
        </div>
      )}

      {/* ═══ PAGINACIÓN ═════════════════════════════════════════════════════════ */}
      {!isLoading && !errorMessage && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.82rem",
              opacity: page === 1 ? 0.5 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Anterior
          </button>

          {/* Números de página */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && page > 3) {
                pageNum = page - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    border: "1px solid",
                    borderColor: page === pageNum ? "var(--accent)" : "var(--border)",
                    background: page === pageNum ? "var(--accent)" : "var(--bg-surface)",
                    color: page === pageNum ? "var(--surface)" : "var(--text-primary)",
                    fontWeight: page === pageNum ? 800 : 500,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary"
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.82rem",
              opacity: page === totalPages ? 0.5 : 1,
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
