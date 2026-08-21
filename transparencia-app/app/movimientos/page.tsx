"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  MOVIMIENTOS,
  MOVIMIENTOS_TIPO_LABEL,
  MOTIVOS_CATEGORIAS,
  type MovimientoTipo,
  type MovimientoMotivoCategoria,
} from "@/lib/movimientos";
import Link from "next/link";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { ListadoSkeleton } from "@/components/ui/Skeleton";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MESES_ABR = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

function formatFechaCorta(fechaStr: string): string {
  const parts = fechaStr.slice(0, 10).split("-");
  if (parts.length !== 3) return fechaStr;
  const dia = parseInt(parts[2], 10);
  const mesIndex = parseInt(parts[1], 10) - 1;
  const anio = parts[0];
  return `${dia}·${MESES_ABR[mesIndex] || parts[1]}·${anio}`;
}

export default function MovimientosPage() {
  return (
    <Suspense fallback={<ListadoSkeleton title="Cargando catálogo de movimientos..." cardsCount={6} />}>
      <MovimientosContent />
    </Suspense>
  );
}

function MovimientosContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Estados de filtrado sincronizados con URL
  const [filtroTipo, setFiltroTipo] = useState<MovimientoTipo | "todos">(() => {
    const t = searchParams.get("tipo");
    if (t && (t === "todos" || t in MOVIMIENTOS_TIPO_LABEL)) return t as MovimientoTipo | "todos";
    return "todos";
  });
  const [filtroMinisterio, setFiltroMinisterio] = useState<string>(() => searchParams.get("ministerio") || "todos");
  const [filtroRegion, setFiltroRegion] = useState<string>(() => searchParams.get("region") || "todos");
  const [filtroMotivo, setFiltroMotivo] = useState<MovimientoMotivoCategoria | "todos">(() => {
    const m = searchParams.get("motivo");
    if (m && (m === "todos" || (MOTIVOS_CATEGORIAS as string[]).includes(m))) return m as MovimientoMotivoCategoria | "todos";
    return "todos";
  });
  const [busqueda, setBusqueda] = useState<string>(() => searchParams.get("q") || "");
  const [soloVerificados, setSoloVerificados] = useState<boolean>(() => searchParams.get("verificado") === "true");
  const [vista, setVista] = useState<"timeline" | "tabla">(() => {
    const v = searchParams.get("vista");
    return v === "tabla" ? "tabla" : "timeline";
  });

  // Estado de tarjetas expandidas
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState(false);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Sincronizar URL en tiempo real
  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroTipo !== "todos") params.set("tipo", filtroTipo);
    if (filtroMinisterio !== "todos") params.set("ministerio", filtroMinisterio);
    if (filtroRegion !== "todos") params.set("region", filtroRegion);
    if (filtroMotivo !== "todos") params.set("motivo", filtroMotivo);
    if (busqueda.trim()) params.set("q", busqueda.trim());
    if (soloVerificados) params.set("verificado", "true");
    if (vista !== "timeline") params.set("vista", vista);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    if (typeof window !== "undefined" && window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [filtroTipo, filtroMinisterio, filtroRegion, filtroMotivo, busqueda, soloVerificados, vista, pathname]);

  const copiarEnlace = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, []);

  // Opciones únicas
  const ministeriosUnicos = useMemo(() => {
    return Array.from(new Set(MOVIMIENTOS.map((m) => m.ministerio).filter(Boolean))).sort();
  }, []);

  const regionesUnicas = useMemo(() => {
    return Array.from(new Set(MOVIMIENTOS.map((m) => m.region).filter(Boolean))).sort();
  }, []);

  // Filtrado reactivo e instantáneo (< 200 ms)
  const filtrados = useMemo(() => {
    return MOVIMIENTOS.filter((m) => {
      if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
      if (filtroMinisterio !== "todos" && m.ministerio !== filtroMinisterio) return false;
      if (filtroRegion !== "todos" && m.region !== filtroRegion) return false;
      if (filtroMotivo !== "todos" && m.salio?.motivo_categoria !== filtroMotivo) return false;
      if (soloVerificados && m.estado !== "verificado") return false;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const matchText = [
          m.cargo,
          m.organismo,
          m.ministerio,
          m.salio?.nombre,
          m.entro?.nombre,
          m.saliente,
          m.entrante,
          m.salio?.motivo_texto,
          m.motivo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => (a.fecha === b.fecha ? 0 : a.fecha < b.fecha ? 1 : -1));
  }, [filtroTipo, filtroMinisterio, filtroRegion, filtroMotivo, busqueda, soloVerificados]);

  const agrupados = useMemo(() => {
    const grupos: Record<string, typeof MOVIMIENTOS> = {};
    for (const m of filtrados) {
      const k = m.fecha.slice(0, 7);
      (grupos[k] ??= []).push(m);
    }
    return Object.entries(grupos).sort((a, b) => (a[0] === b[0] ? 0 : a[0] < b[0] ? 1 : -1));
  }, [filtrados]);

  const stats = useMemo(() => {
    const total = MOVIMIENTOS.length;
    const verificados = MOVIMIENTOS.filter((m) => m.estado === "verificado").length;
    const enConfirmacion = MOVIMIENTOS.filter((m) => m.estado !== "verificado").length;
    const ultimos7 = MOVIMIENTOS.filter((m) => m.fecha >= "2026-08-10").length;
    return { total, verificados, enConfirmacion, ultimos7 };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
      {/* HEADER */}
      <section
        style={{
          background: "var(--surface)",
          padding: "2rem 0 1.25rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="container-main">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="live-dot" />
            <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Pipeline Nocturno 03:00 CLT · Actualizado 17 de agosto 2026
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.2rem)", fontWeight: 800, margin: "0 0 0.4rem 0" }}>
            🔄 Movimientos de Autoridades
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-2)" }}>
            <span><strong>{stats.total}</strong> movimientos registrados</span>
            <span>·</span>
            <span style={{ color: "var(--ok)", fontWeight: 600 }}>✅ {stats.verificados} verificados oficial</span>
            <span>·</span>
            <span style={{ color: "var(--warn)", fontWeight: 600 }}>🟡 {stats.enConfirmacion} en confirmación</span>
            <span>·</span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>⚡ {stats.ultimos7} últimos 7 días</span>
          </div>
        </div>
      </section>

      {/* OPCIONES DE LA PÁGINA: BUSCADOR + FILTROS + CONTADOR + VISTA + COPIAR ENLACE */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="container-main" style={{ padding: "0.75rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {/* Fila 1: Buscador + Selectores + Checkbox Solo verificados */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 180 }}>
              <input
                type="text"
                placeholder="🔍 Buscar por persona, organismo o cargo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text-1)",
                  fontSize: "0.82rem",
                }}
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as MovimientoTipo | "todos")}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                fontSize: "0.8rem",
              }}
            >
              <option value="todos">Tipo: Todos</option>
              {Object.entries(MOVIMIENTOS_TIPO_LABEL).map(([val, lbl]) => (
                <option key={val} value={val}>
                  {lbl}
                </option>
              ))}
            </select>

            <select
              value={filtroMinisterio}
              onChange={(e) => setFiltroMinisterio(e.target.value)}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                fontSize: "0.8rem",
              }}
            >
              <option value="todos">Ministerio: Todos</option>
              {ministeriosUnicos.map((min) => (
                <option key={min} value={min}>
                  {min}
                </option>
              ))}
            </select>

            <select
              value={filtroRegion}
              onChange={(e) => setFiltroRegion(e.target.value)}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                fontSize: "0.8rem",
              }}
            >
              <option value="todos">Región: Todas</option>
              {regionesUnicas.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>

            <select
              value={filtroMotivo}
              onChange={(e) => setFiltroMotivo(e.target.value as MovimientoMotivoCategoria | "todos")}
              style={{
                padding: "0.45rem 0.6rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                fontSize: "0.8rem",
              }}
            >
              <option value="todos">Motivo: Todos</option>
              {MOTIVOS_CATEGORIAS.map((mot) => (
                <option key={mot} value={mot}>
                  {mot}
                </option>
              ))}
            </select>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text-1)",
                cursor: "pointer",
                userSelect: "none",
                marginLeft: "auto",
              }}
            >
              <input
                type="checkbox"
                checked={soloVerificados}
                onChange={(e) => setSoloVerificados(e.target.checked)}
                style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--ok)" }}
              />
              Solo verificados
            </label>
          </div>

          {/* Fila 2: Contador vivo "N casos" + [Timeline | Tabla] + [🔗 Copiar enlace] */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--text-1)",
                }}
              >
                🎯 {filtrados.length} {filtrados.length === 1 ? "caso encontrado" : "casos encontrados"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ display: "inline-flex", borderRadius: 6, border: "1px solid var(--border)", overflow: "hidden" }}>
                <button
                  onClick={() => setVista("timeline")}
                  style={{
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "none",
                    background: vista === "timeline" ? "var(--accent)" : "var(--surface-2)",
                    color: vista === "timeline" ? "var(--surface)" : "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  📅 Timeline
                </button>
                <button
                  onClick={() => setVista("tabla")}
                  style={{
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "none",
                    borderLeft: "1px solid var(--border)",
                    background: vista === "tabla" ? "var(--accent)" : "var(--surface-2)",
                    color: vista === "tabla" ? "var(--surface)" : "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  📊 Tabla
                </button>
              </div>

              {/* Botón: Copiar enlace (URL con los filtros aplicados) */}
              <button
                onClick={copiarEnlace}
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: copiado ? "var(--ok)" : "var(--text-1)",
                  cursor: "pointer",
                }}
                title="Copiar enlace con los filtros aplicados"
              >
                {copiado ? "✅ ¡Copiado!" : "🔗 Copiar enlace"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="container-main" style={{ padding: "2rem 1.5rem" }}>
        {filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <p style={{ color: "var(--text-2)", fontSize: "0.95rem", margin: 0 }}>
              🔍 No se encontraron movimientos para los filtros seleccionados.
            </p>
          </div>
        ) : vista === "tabla" ? (
          /* VISTA TABLA */
          <div
            style={{
              overflowX: "auto",
              background: "var(--surface)",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-3)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Fecha</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Organismo / Cargo</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Salió</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Asume</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Motivo</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Estado</th>
                  <th style={{ padding: "0.6rem 0.75rem" }}>Fuentes</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((mov) => (
                  <tr key={mov.id} style={{ borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                    <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap", fontWeight: 600, fontSize: "0.78rem" }}>
                      {formatFechaCorta(mov.fecha)}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{mov.organismo}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{mov.cargo} · {mov.region}</div>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      {mov.saliente ? (
                        <span style={{ color: "var(--bad)", fontWeight: 600 }}>
                          {mov.saliente}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      {mov.entrante ? (
                        <span style={{ color: "var(--ok)", fontWeight: 600 }}>
                          {mov.entrante}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span style={{ color: "var(--text-2)" }}>
                        {mov.salio?.motivo_categoria || mov.motivo}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
                      <span style={{ color: mov.estado === "verificado" ? "var(--ok)" : "var(--warn)", fontWeight: 600 }}>
                        {mov.estado === "verificado" ? "✅ Verificado" : "🟡 En confirmación"}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                        {mov.fuentes.map((f, fIdx) => (
                          <a
                            key={fIdx}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", fontSize: "0.85rem" }}
                            title={`${f.nivel === "oficial" ? "Oficial" : "Prensa"}: ${f.medio} — ${f.titulo}`}
                          >
                            {f.nivel === "oficial" ? "📜" : "📰"}
                          </a>
                        ))}
                        {mov.cgr_informe && (
                          <a
                            href={mov.cgr_informe.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", fontSize: "0.85rem" }}
                            title={`CGR SIAPER: ${mov.cgr_informe.titulo}`}
                          >
                            ⚖️
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* VISTA TIMELINE — LA TARJETA SIMPLE Y CLARA */
          agrupados.map(([mes, lista]) => {
            const [y, m] = mes.split("-").map(Number);
            return (
              <div key={mes} style={{ marginBottom: "2rem" }}>
                {/* Separador simple de mes */}
                <h2
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    margin: "0 0 1rem 0",
                    color: "var(--text-1)",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "0.4rem",
                  }}
                >
                  {MESES[m - 1]} {y}
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {lista.map((mov) => {
                    const isExpanded = expandedIds.has(mov.id);

                    return (
                      <div
                        key={mov.id}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "1.15rem 1.25rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.45rem",
                        }}
                      >
                        {/* Línea 1: [fecha] [Organismo en negrita] ........ [✅ Verificado | 🟡 En confirmación] */}
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.75rem" }}>
                          <div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-3)", marginRight: "0.5rem" }}>
                              {formatFechaCorta(mov.fecha)}
                            </span>
                            <strong style={{ fontSize: "1.05rem", color: "var(--text-1)", fontWeight: 700 }}>
                              {mov.organismo}
                            </strong>
                          </div>

                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              color: mov.estado === "verificado" ? "var(--ok)" : "var(--warn)",
                            }}
                          >
                            {mov.estado === "verificado" ? "✅ Verificado" : "🟡 En confirmación"}
                          </span>
                        </div>

                        {/* Línea 2: Cargo · Región */}
                        <div style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>
                          {mov.cargo} · {mov.region}
                          {mov.dias_en_cargo && (
                            <span style={{ fontSize: "0.78rem", color: "var(--text-3)", marginLeft: "0.6rem" }}>
                              ⏱ {mov.dias_en_cargo} días ({mov.dias_en_cargo_origen === "oficial" ? "oficial" : "estimado"})
                            </span>
                          )}
                        </div>

                        {/* Línea 3: Salió: Nombre → Asume: Nombre (color solo en nombres) */}
                        <div style={{ fontSize: "0.88rem", color: "var(--text-1)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                          {mov.saliente && (
                            <span>
                              Salió:{" "}
                              <strong style={{ color: "var(--bad)" }}>
                                {(() => {
                                  const p = POLITICOS_SEED.find((x) => x.nombre_completo.toLowerCase() === mov.saliente!.toLowerCase());
                                  if (p) return <Link href={`/politico/${p.id}`} style={{ color: "var(--bad)", textDecoration: "underline" }}>{mov.saliente}</Link>;
                                  return <Link href={`/cruces?q=${encodeURIComponent(mov.saliente!)}`} style={{ color: "var(--bad)", textDecoration: "underline" }}>{mov.saliente}</Link>;
                                })()}
                              </strong>
                            </span>
                          )}

                          {mov.saliente && mov.entrante && (
                            <span style={{ color: "var(--text-3)", margin: "0 0.2rem" }}>→</span>
                          )}

                          {mov.entrante && (
                            <span>
                              Asume:{" "}
                              <strong style={{ color: "var(--ok)" }}>
                                {(() => {
                                  const p = POLITICOS_SEED.find((x) => x.nombre_completo.toLowerCase() === mov.entrante!.toLowerCase());
                                  if (p) return <Link href={`/politico/${p.id}`} style={{ color: "var(--ok)", textDecoration: "underline" }}>{mov.entrante}</Link>;
                                  return <Link href={`/cruces?q=${encodeURIComponent(mov.entrante!)}`} style={{ color: "var(--ok)", textDecoration: "underline" }}>{mov.entrante}</Link>;
                                })()}
                              </strong>
                            </span>
                          )}
                        </div>

                        {/* Línea 4: Motivo (una línea) + Botón [▾ Ver detalle] */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.2rem" }}>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Motivo: <strong>{mov.salio?.motivo_categoria || mov.motivo}</strong>
                          </div>

                          <button
                            onClick={() => toggleExpand(mov.id)}
                            style={{
                              background: "transparent",
                              border: "1px solid var(--border)",
                              borderRadius: 4,
                              padding: "0.25rem 0.6rem",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "var(--accent)",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {isExpanded ? "▴ Ocultar detalle" : "▾ Ver detalle"}
                          </button>
                        </div>

                        {/* ACORDEÓN EXPANDIDO: Motivo completo + Fuentes + Enlace CGR si aplica */}
                        {isExpanded && (
                          <div
                            style={{
                              marginTop: "0.6rem",
                              paddingTop: "0.6rem",
                              borderTop: "1px solid var(--border)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                            }}
                          >
                            {/* Motivo completo */}
                            <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>
                              {mov.salio?.motivo_texto || mov.motivo}
                            </p>

                            {/* Cruce CGR SIAPER si aplica */}
                            {mov.cgr_informe && (
                              <div>
                                <a
                                  href={mov.cgr_informe.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    color: "var(--warn)",
                                    textDecoration: "underline",
                                  }}
                                >
                                  ⚖️ Informe CGR SIAPER: {mov.cgr_informe.numero} ({mov.cgr_informe.titulo}) ↗
                                </a>
                              </div>
                            )}

                            {/* Fuentes: Diario Oficial y prensa con enlace directo */}
                            <div style={{ fontSize: "0.8rem", color: "var(--text-3)", display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                              <span style={{ fontWeight: 600 }}>Fuentes:</span>
                              {mov.fuentes.map((f, fIdx) => (
                                <a
                                  key={fIdx}
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "var(--accent)",
                                    textDecoration: "underline",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  {f.nivel === "oficial" ? "📜 Diario Oficial / Decreto" : `📰 ${f.medio}`} ({f.fecha}) ↗
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* NOTA DE TRAZABILIDAD */}
        <footer
          style={{
            marginTop: "3rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border)",
            fontSize: "0.78rem",
            color: "var(--text-3)",
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>
            * <strong>Trazabilidad y Resguardo:</strong> El catálogo de movimientos se sincroniza diariamente a las 03:00 CLT mediante <code>etl_movimientos_autoridades</code> y <code>etl_diario_oficial</code>. Los eventos detectados en prensa permanecen en estado <em>“🟡 En confirmación”</em> y no modifican las autoridades en fichas ministeriales hasta su verificación oficial T1/T2 (Decreto o Diario Oficial).
          </p>
        </footer>
      </div>
    </div>
  );
}
