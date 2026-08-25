"use client";

import { useState, useMemo, useEffect } from "react";
import { formatFechaChilena } from "@/lib/format";

export interface VotacionFila {
  id: string;
  fecha: string;
  opcion: string;
  descripcion: string;
  url?: string;
  tipo?: string | null;
  quorum?: string | null;
  resultado?: string | null;
  total_si?: string | null;
  total_no?: string | null;
  total_abstencion?: string | null;
  total_dispensados?: string | null;
  esRebelde?: boolean;
  consensoPartido?: string | null;
  boletin?: string | null;
  url_tramitacion?: string | null;
  tramite?: string | null;
  informe?: string | null;
}

interface Props {
  votaciones: VotacionFila[];
  cargo?: "Diputado" | "Senador" | "Alcalde" | "Gobernador" | "Consejero Regional" | "Concejal" | "Ministro" | "Subsecretario" | "Convencional";
  dataUrl?: string;
}

function normalizarSliceVotaciones(value: unknown): VotacionFila[] {
  if (!value || typeof value !== "object") return [];
  const votos = (value as { votos?: unknown }).votos;
  if (!Array.isArray(votos)) return [];

  return votos
    .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object")
    .map((v) => ({
      id: String(v.id ?? ""),
      fecha: typeof v.fecha === "string" ? v.fecha : "",
      opcion: typeof v.opcion === "string" ? v.opcion : "",
      descripcion: typeof v.descripcion === "string" ? v.descripcion : "Votación en sala",
      url: typeof v.url === "string" ? v.url : undefined,
      tipo: typeof v.tipo === "string" ? v.tipo : null,
      quorum: typeof v.quorum === "string" ? v.quorum : null,
      resultado: typeof v.resultado === "string" ? v.resultado : null,
      total_si: typeof v.total_si === "string" ? v.total_si : null,
      total_no: typeof v.total_no === "string" ? v.total_no : null,
      total_abstencion: typeof v.total_abstencion === "string" ? v.total_abstencion : null,
      boletin: typeof v.boletin === "string" ? v.boletin : null,
      url_tramitacion: typeof v.url_tramitacion === "string" ? v.url_tramitacion : null,
      tramite: typeof v.tramite === "string" ? v.tramite : null,
      informe: typeof v.informe === "string" ? v.informe : null,
    }));
}

const OPCION_COLOR: Record<string, string> = {
  Afirmativo: "var(--ok)",
  "A favor": "var(--ok)",
  "En Contra": "var(--danger)",
  "En contra": "var(--danger)",
  Abstención: "var(--warn)",
  Abstencion: "var(--warn)",
  "No Vota": "var(--text-subtle)",
  "Sin Emitir": "var(--text-subtle)",
  Pareo: "var(--info)",
};

function opcionLegible(opcion: string): string {
  const norm = opcion.trim().toLowerCase();
  if (norm === "afirmativo" || norm === "a favor") return "A favor";
  if (norm === "en contra") return "En contra";
  if (norm === "abstención" || norm === "abstencion") return "Abstención";
  if (norm === "pareo") return "Pareo reglamentario";
  if (norm === "no vota" || norm === "sin emitir" || norm === "no emite") return "Presente, no votó";
  return opcion;
}

export function esProcedimental(v: VotacionFila): boolean {
  const d = (v.descripcion ?? "").trim().toLowerCase();
  const t = (v.tipo ?? "").trim().toLowerCase();
  const tr = (v.tramite ?? "").trim().toLowerCase();
  return (
    /^\d+-/i.test(d) ||
    d.includes("1-otros") ||
    /^proyecto de resolución\s*n[°º]?\s*\d+$/i.test(d) ||
    d.includes("votación separada") ||
    d.includes("votacion separada") ||
    d.includes("admisibilidad") ||
    d.includes("enmienda de forma") ||
    d.includes("comisión mixta") ||
    d.includes("comision mixta") ||
    d.includes("trámite de urgencia") ||
    d.includes("tramite de urgencia") ||
    d.includes("fijación de tabla") ||
    d.includes("orden del día") ||
    d.includes("sesionar de forma simultánea") ||
    d.includes("sesionar de forma simultanea") ||
    d.includes("pase a la comisión") ||
    d.includes("pase a la comision") ||
    d.includes("observación n°") ||
    d.includes("observacion n°") ||
    d.includes("observación nº") ||
    d.includes("observacion nº") ||
    d.includes("indicación") ||
    d.includes("indicacion") ||
    d.includes("procedimiento") ||
    t.includes("procedimental") ||
    t.includes("urgencia") ||
    tr.includes("mixta")
  );
}

export default function VotacionesHistorial({ votaciones: initialVotaciones, cargo = "Diputado", dataUrl }: Props) {
  const [votaciones, setVotaciones] = useState<VotacionFila[]>(initialVotaciones);
  const [estadoCarga, setEstadoCarga] = useState<"loading" | "ready" | "empty" | "error">(
    initialVotaciones.length > 0 || !dataUrl ? (initialVotaciones.length > 0 ? "ready" : "empty") : "loading"
  );
  const [intento, setIntento] = useState(0);
  const [filtroOpcion, setFiltroOpcion] = useState<string>("todas");
  const [filtroProcedimental, setFiltroProcedimental] = useState<"todos" | "sustantivos" | "procedimentales">("todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [detallesExpandidos, setDetallesExpandidos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!dataUrl || initialVotaciones.length > 0) return;

    let activo = true;
    fetch(dataUrl, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return normalizarSliceVotaciones(await response.json());
      })
      .then((cargadas) => {
        if (!activo) return;
        setVotaciones(cargadas);
        setEstadoCarga(cargadas.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (activo) setEstadoCarga("error");
      });

    return () => {
      activo = false;
    };
  }, [dataUrl, initialVotaciones.length, intento]);

  const toggleDetalle = (id: string) => {
    setDetallesExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const stats = useMemo(() => {
    let afirmativo = 0;
    let enContra = 0;
    let abstencion = 0;
    let noVota = 0;
    let pareo = 0;
    let procedimentales = 0;

    for (const v of votaciones) {
      const opc = v.opcion.trim().toLowerCase();
      if (opc === "afirmativo" || opc === "a favor") afirmativo++;
      else if (opc === "en contra") enContra++;
      else if (opc === "abstención" || opc === "abstencion") abstencion++;
      else if (opc === "pareo") pareo++;
      else noVota++;

      if (esProcedimental(v)) procedimentales++;
    }

    const total = votaciones.length;
    const emitidos = afirmativo + enContra + abstencion;
    const presentes = emitidos + noVota;
    const asistencia = total > 0 ? Math.round((presentes / total) * 100) : null;

    return {
      total,
      afirmativo,
      enContra,
      abstencion,
      noVota,
      pareo,
      procedimentales,
      sustantivos: total - procedimentales,
      presentes,
      asistencia,
    };
  }, [votaciones]);

  const filtradas = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return votaciones
      .filter((v) => {
        // Filtro por sentido del voto
        if (filtroOpcion !== "todas") {
          const opc = v.opcion.trim().toLowerCase();
          if (filtroOpcion === "Afirmativo" && !(opc === "afirmativo" || opc === "a favor")) return false;
          if (filtroOpcion === "En Contra" && !(opc === "en contra")) return false;
          if (filtroOpcion === "Abstención" && !(opc === "abstención" || opc === "abstencion")) return false;
          if (filtroOpcion === "No Vota" && !(opc === "no vota" || opc === "sin emitir" || opc === "no emite")) return false;
          if (filtroOpcion === "Pareo" && !(opc === "pareo")) return false;
        }

        // Filtro por procedimental / sustantivo
        if (filtroProcedimental === "sustantivos" && esProcedimental(v)) return false;
        if (filtroProcedimental === "procedimentales" && !esProcedimental(v)) return false;

        // Búsqueda por texto
        if (!query) return true;
        return [v.descripcion, v.quorum, v.resultado, v.tipo, v.boletin]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query));
      })
      .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  }, [votaciones, filtroOpcion, filtroProcedimental, busqueda]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginadas = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtradas.slice(startIndex, startIndex + pageSize);
  }, [filtradas, currentPage, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const humanizar = (texto: string) =>
    texto.toLocaleLowerCase("es-CL").replace(/(^|\s)\S/g, (m) => m.toUpperCase());

  const parseTitulo = (votacion: VotacionFila) => {
    const raw = (votacion.descripcion ?? "").trim();
    if (/^\d+-/i.test(raw) || raw.toLowerCase().includes("1-otros")) {
      return "Votación de procedimiento de Sala";
    }
    if (!raw || /^(decreto|oficio|archivo|proyecto de ley|resolución|proyecto de acuerdo|informe)\s*$/i.test(raw) || raw.length < 10) {
      return votacion.boletin ? `Proyecto de Ley (Boletín N° ${votacion.boletin})` : "Materia no catalogada — ver tramitación oficial";
    }
    if (raw.length > 120) {
      const firstSentence = raw.split(/[.;]/)[0].trim();
      if (firstSentence.length >= 20 && firstSentence.length <= 120) {
        return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1).toLowerCase();
      }
      return raw.slice(0, 118).trim() + "…";
    }
    return raw;
  };

  const colorResultado = (resultado: string | null) => {
    if (!resultado) return null;
    const bajo = resultado.toLocaleLowerCase("es-CL");
    if (bajo.includes("rechaz")) return "var(--danger)";
    if (bajo.includes("aprob")) return "var(--ok)";
    return "var(--warn)";
  };

  return (
    <div className="votaciones-historial">
      {estadoCarga === "loading" ? (
        <p className="votaciones-historial__vacio" role="status">Cargando votaciones de sala…</p>
      ) : estadoCarga === "error" ? (
        <div className="votaciones-historial__vacio" role="alert">
          <p>No fue posible cargar las votaciones de esta ficha.</p>
          <button type="button" onClick={() => { setEstadoCarga("loading"); setIntento((value) => value + 1); }}>Reintentar</button>
        </div>
      ) : votaciones.length === 0 ? (
        <p className="votaciones-historial__vacio">
          {cargo === "Diputado"
            ? "Sin votaciones en sala registradas para este período en la fuente oficial."
            : "Sin votaciones de sala registradas para este período en el API oficial del Senado."}
        </p>
      ) : (
        <>
          {/* ─── FILTROS Y RESUMEN SUPERIOR ───────────────────────────────── */}
          <div className="votaciones-historial__resumen">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))" }}>
              <button
                type="button"
                className="stat-tile stat-tile--accent"
                onClick={() => {
                  setFiltroOpcion("todas");
                  setPage(1);
                }}
                aria-pressed={filtroOpcion === "todas"}
                title="Mostrar todas las votaciones"
                style={{ cursor: "pointer", textAlign: "center", font: "inherit" }}
              >
                <div className="stat-tile__value">{stats.total}</div>
                <div className="stat-tile__label">votaciones en sala</div>
              </button>

              {[
                { target: "Afirmativo", label: "A favor", value: stats.afirmativo, tone: "stat-tile--ok" },
                { target: "En Contra", label: "En contra", value: stats.enContra, tone: "stat-tile--danger" },
                { target: "Abstención", label: "Abstenciones", value: stats.abstencion, tone: "stat-tile--warn" },
                { target: "No Vota", label: "Presente, no votó", value: stats.noVota, tone: "" },
              ].map((ficha) => {
                const activa = filtroOpcion === ficha.target;
                return (
                  <button
                    key={ficha.target}
                    type="button"
                    className={["stat-tile", activa ? "stat-tile--accent" : ficha.tone].filter(Boolean).join(" ")}
                    onClick={() => {
                      setFiltroOpcion(activa ? "todas" : ficha.target);
                      setPage(1);
                    }}
                    aria-pressed={activa}
                    title={activa ? "Quitar filtro" : `Filtrar votaciones: ${ficha.label}`}
                    style={{
                      cursor: "pointer",
                      textAlign: "center",
                      font: "inherit",
                      ...(activa ? { boxShadow: "0 0 0 2px var(--border-glow)" } : {}),
                    }}
                  >
                    <div className="stat-tile__value">{ficha.value}</div>
                    <div className="stat-tile__label">{ficha.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Presencia en votaciones */}
            <div className="stat-tile" style={{ textAlign: "left", justifyContent: "flex-start", background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}>
              <div className="stat-tile__label" style={{ textTransform: "none", letterSpacing: "normal", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Presencia efectiva en votaciones de Sala: {stats.asistencia === null ? "—" : `${stats.asistencia}%`} ({stats.presentes}/{stats.total})
              </div>
              <div className="stat-tile__value" style={{ fontSize: "1.8rem", color: stats.asistencia !== null && stats.asistencia >= 90 ? "var(--ok)" : stats.asistencia !== null && stats.asistencia >= 75 ? "var(--warn)" : "var(--danger)" }}>
                {stats.asistencia === null ? "—" : `${stats.asistencia}%`}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", lineHeight: 1.5, marginTop: "0.2rem" }}>
                Calculado sobre las <strong>{stats.total} votaciones de sala</strong> registradas ({stats.sustantivos} proyectos sustantivos y {stats.procedimentales} de procedimiento).
              </div>
            </div>
          </div>

          {/* ─── CONTROLES DE BÚSQUEDA Y TIPO DE VOTACIÓN ───────────────────── */}
          <div style={{ display: "flex", gap: "0.75rem", margin: "1.25rem 0", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              placeholder={`Buscar en ${stats.total} votaciones (materia, boletín, quórum)…`}
              aria-label="Buscar votación"
              style={{
                flex: 1,
                minWidth: 0,
                width: "100%",
                padding: "0.6rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                fontSize: "0.85rem",
              }}
            />

            {/* Chips de filtro Sustantivos / Procedimentales */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {[
                { id: "todos", label: "Todas" },
                { id: "sustantivos", label: `Leyes y Proyectos (${stats.sustantivos})` },
                { id: "procedimentales", label: `Procedimentales (${stats.procedimentales})` },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setFiltroProcedimental(chip.id as "todos" | "sustantivos" | "procedimentales");
                    setPage(1);
                  }}
                  className="capsule"
                  style={{
                    cursor: "pointer",
                    fontSize: "0.72rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: 99,
                    border: filtroProcedimental === chip.id ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: filtroProcedimental === chip.id ? "var(--accent)" : "var(--surface)",
                    color: filtroProcedimental === chip.id ? "var(--bg)" : "var(--text-1)",
                    fontWeight: filtroProcedimental === chip.id ? 700 : 500,
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── LISTADO DE VOTACIONES ────────────────────────────────────── */}
          {filtradas.length === 0 ? (
            <p className="votaciones-historial__vacio">
              Sin votaciones que coincidan con el filtro aplicado.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {paginadas.map((votacion) => {
                const si = parseInt(votacion.total_si ?? "0") || 0;
                const no = parseInt(votacion.total_no ?? "0") || 0;
                const abs = parseInt(votacion.total_abstencion ?? "0") || 0;
                const totalVotos = si + no + abs;
                const pctSi = totalVotos > 0 ? (si / totalVotos) * 100 : 0;
                const pctNo = totalVotos > 0 ? (no / totalVotos) * 100 : 0;
                const pctAbs = totalVotos > 0 ? (abs / totalVotos) * 100 : 0;

                const tituloPrimario = parseTitulo(votacion);
                const descripcionLarga = (votacion.descripcion ?? "").trim();
                const esTextoLargo = descripcionLarga.length > 140 && descripcionLarga !== tituloPrimario;
                const detalleExpandido = Boolean(detallesExpandidos[votacion.id]);

                const tramitacionLink = votacion.url_tramitacion ?? (
                  votacion.boletin
                    ? (cargo === "Senador"
                        ? `https://www.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=${votacion.boletin.split("-")[0]}`
                        : `https://www.camara.cl/legislacion/ProyectosDeLey/tramitacion.aspx?prmID=${votacion.boletin}`)
                    : votacion.url
                );

                return (
                  <article
                    className="card-flat"
                    key={votacion.id}
                    style={{
                      padding: "1.1rem 1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    {/* Encabezado: Fecha, Estado y Voto del Político */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700 }}>
                          {formatFechaChilena(votacion.fecha)}
                        </span>
                        {votacion.resultado && (
                          <span
                            className="capsule"
                            style={{
                              background: `${colorResultado(votacion.resultado) ?? "var(--text-muted)"}22`,
                              color: colorResultado(votacion.resultado) ?? "var(--text-muted)",
                              borderColor: colorResultado(votacion.resultado) ?? "var(--text-muted)",
                              fontSize: "0.68rem",
                            }}
                          >
                            {humanizar(votacion.resultado)}
                          </span>
                        )}
                        {votacion.esRebelde && (
                          <span className="capsule capsule--danger" style={{ fontSize: "0.68rem" }} title={`La mayoría de su bancada votó: ${votacion.consensoPartido}`}>
                            Voto Rebelde
                          </span>
                        )}
                        {votacion.boletin && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                            Boletín N° {votacion.boletin}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Voto emitido:</span>
                        <span
                          className="capsule"
                          style={{
                            background: `${OPCION_COLOR[votacion.opcion] ?? "var(--text-muted)"}22`,
                            color: OPCION_COLOR[votacion.opcion] ?? "var(--text-muted)",
                            borderColor: OPCION_COLOR[votacion.opcion] ?? "var(--text-muted)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {opcionLegible(votacion.opcion)}
                        </span>
                      </div>
                    </div>

                    {/* Título Primario del Proyecto */}
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.98rem", color: "var(--text-primary)", lineHeight: 1.45 }}>
                        {tituloPrimario}
                      </h4>

                      {/* Expandible para texto técnico largo del Senado */}
                      {esTextoLargo && (
                        <div style={{ marginTop: "0.35rem" }}>
                          <button
                            type="button"
                            onClick={() => toggleDetalle(votacion.id)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              color: "var(--accent)",
                              cursor: "pointer",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                          >
                            {detalleExpandido ? "▲ Ocultar detalle técnico" : "▼ Ver detalle técnico oficial"}
                          </button>
                          {detalleExpandido && (
                            <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)", background: "var(--bg-surface-2)", padding: "0.6rem", borderRadius: 6, lineHeight: 1.5 }}>
                              {descripcionLarga}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Metadatos secundarios */}
                      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.35rem", fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                        {votacion.tipo && <span>Trámite: {humanizar(votacion.tipo)}</span>}
                        {votacion.quorum && <span>Quórum: {humanizar(votacion.quorum)}</span>}
                      </div>
                    </div>

                    {/* Distribución de Votos en Sala y Link Oficial */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                      {totalVotos > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                          <div style={{ width: 140, height: 6, borderRadius: 99, display: "flex", overflow: "hidden", background: "var(--bg-surface-2)" }}>
                            <div style={{ width: `${pctSi}%`, background: "var(--ok)" }} title={`A favor: ${si}`} />
                            <div style={{ width: `${pctNo}%`, background: "var(--danger)" }} title={`En contra: ${no}`} />
                            <div style={{ width: `${pctAbs}%`, background: "var(--warn)" }} title={`Abstenciones: ${abs}`} />
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                            Sala: {si} a favor · {no} en contra · {abs} abst.
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>Sin desglose nominal de Sala</span>
                      )}

                      {tramitacionLink && (
                        <a
                          href={tramitacionLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                        >
                          Ver tramitación oficial ↗
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}

              {/* ─── BARRA DE PAGINACIÓN ESTÁNDAR (10 / 25 / 50) ─────────────── */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  padding: "0.85rem 0.5rem 0.25rem",
                  borderTop: "1px solid var(--border)",
                  marginTop: "0.5rem",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                {/* Selector de Filas por página */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-2)", flexWrap: "wrap" }}>
                  <span>Filas por página:</span>
                  {[10, 25, 50].map((size) => {
                    const isActive = pageSize === size;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handlePageSizeChange(size)}
                        style={{
                          padding: "0.25rem 0.55rem",
                          fontSize: "0.75rem",
                          fontWeight: isActive ? 800 : 500,
                          borderRadius: 6,
                          border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
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

                {/* Controles de navegación */}
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={currentPage <= 1}
                      style={{
                        padding: "0.3rem 0.55rem",
                        fontSize: "0.72rem",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        color: currentPage <= 1 ? "var(--text-3)" : "var(--text-1)",
                        cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                      }}
                      title="Primera página"
                    >
                      « Primera
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      style={{
                        padding: "0.3rem 0.55rem",
                        fontSize: "0.72rem",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        color: currentPage <= 1 ? "var(--text-3)" : "var(--text-1)",
                        cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                      }}
                      title="Página anterior"
                    >
                      ‹ Ant.
                    </button>
                  </div>

                  <span style={{ fontSize: "0.74rem", color: "var(--text-2)", fontWeight: 700, textAlign: "center" }}>
                    {currentPage} / {totalPages} ({filtradas.length})
                  </span>

                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      style={{
                        padding: "0.3rem 0.55rem",
                        fontSize: "0.72rem",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        color: currentPage >= totalPages ? "var(--text-3)" : "var(--text-1)",
                        cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                      }}
                      title="Página siguiente"
                    >
                      Sig. ›
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      style={{
                        padding: "0.3rem 0.55rem",
                        fontSize: "0.72rem",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        color: currentPage >= totalPages ? "var(--text-3)" : "var(--text-1)",
                        cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                      }}
                      title="Última página"
                    >
                      Última »
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Microcopy de fuente oficial alineado sutil */}
      <p style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: "1rem", lineHeight: 1.5 }}>
        Fuente: {cargo === "Diputado" ? "Cámara de Diputadas y Diputados (WSLegislativo)" : "Senado de la República (API Sala)"} · Datos Abiertos oficiales del Congreso Nacional.
      </p>
    </div>
  );
}
