"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
  MOVIMIENTOS,
  MOVIMIENTOS_TIPO_LABEL,
  MOVIMIENTOS_TIPO_COLOR,
  MOVIMIENTOS_TIPO_EMOJI,
  MOVIMIENTOS_PIPELINE_METADATA,
  latestMovementPublicationDate,
  MOVIMIENTOS_PUBLICATION_BLOCKED,
  MOTIVOS_CATEGORIAS,
  isMovimientoDocumentoPendienteMayor30,
  esMovimientoRespaldado,
  type MovimientoTipo,
  type MovimientoMotivoCategoria,
  type Movimiento,
  type MovimientoSignal,
} from "@/lib/movimientos";
import Link from "next/link";
import { POLITICOS_SEED } from "@/lib/seed-politicos";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MESES_ABR = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

type EntradaCronologica =
  | { kind: "movement"; id: string; date: string; movement: Movimiento }
  | { kind: "signal"; id: string; date: string; signal: MovimientoSignal };

function normalizarBusqueda(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLocaleLowerCase("es-CL");
}

function formatFechaCorta(fechaStr: string): string {
  const parts = fechaStr.slice(0, 10).split("-");
  if (parts.length !== 3) return fechaStr;
  const dia = parseInt(parts[2], 10);
  const mesIndex = parseInt(parts[1], 10) - 1;
  const anio = parts[0];
  return `${dia}·${MESES_ABR[mesIndex] || parts[1]}·${anio}`;
}

export default function MovimientosPage() {
  if (MOVIMIENTOS_PUBLICATION_BLOCKED) {
    return (
      <main className="container-main" style={{ minHeight: "60vh", padding: "5rem 1.25rem" }}>
        <section style={{ maxWidth: "48rem", margin: "0 auto", border: "1px solid var(--border)", borderRadius: "1rem", padding: "2rem", background: "var(--surface-1)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>MOVIMIENTOS DE AUTORIDADES</p>
          <h1 style={{ margin: "0.75rem 0", fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>Movimientos y Relevos de Autoridades</h1>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.15rem" }}>Validación documental en curso</h2>
          <p style={{ margin: 0, color: "var(--text-2)", maxWidth: "40rem" }}>
            Estamos revisando cada salida de autoridad contra su documento oficial antes de volver a publicar este listado. La información se mostrará nuevamente cuando el corte quede validado.
          </p>
        </section>
      </main>
    );
  }
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", padding: "2.25rem 0 1.75rem" }} className="container-main">
          <h1 style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.4rem)", fontWeight: 900, margin: "0 0 0.5rem 0" }}>
            Movimientos y Relevos de Autoridades
          </h1>
          <div
            className="movement-page-skeleton"
            aria-hidden="true"
            style={{
              width: "min(30rem, 100%)",
              height: "1rem",
              marginTop: "0.75rem",
              borderRadius: "999px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      }
    >
      <MovimientosContent />
    </Suspense>
  );
}

function MovimientosContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const señalesPendientes = MOVIMIENTOS_PIPELINE_METADATA.signals;

  // Estados de filtrado sincronizados con URL
  const [filtroTipo, setFiltroTipo] = useState<MovimientoTipo | "todos">(() => {
    const t = searchParams.get("tipo");
    if (t && (t === "todos" || t in MOVIMIENTOS_TIPO_LABEL)) return t as MovimientoTipo | "todos";
    return "todos";
  });
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "verificado" | "en_confirmacion">(() => {
    const e = searchParams.get("estado");
    if (e === "verificado" || e === "en_confirmacion") return e;
    if (searchParams.get("verificado") === "true") return "verificado";
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
    if (filtroEstado !== "todos") params.set("estado", filtroEstado);
    if (filtroMinisterio !== "todos") params.set("ministerio", filtroMinisterio);
    if (filtroRegion !== "todos") params.set("region", filtroRegion);
    if (filtroMotivo !== "todos") params.set("motivo", filtroMotivo);
    if (busqueda.trim()) params.set("q", busqueda.trim());
    if (vista !== "timeline") params.set("vista", vista);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    if (typeof window !== "undefined" && window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [filtroTipo, filtroEstado, filtroMinisterio, filtroRegion, filtroMotivo, busqueda, vista, pathname]);

  const copiarEnlace = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, []);

  // Opciones únicas para selectores (deduplicadas y normalizadas)
  const ministeriosUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const m of MOVIMIENTOS) {
      const min = m.ministerio?.trim();
      if (min) set.add(min);
    }
    for (const signal of señalesPendientes) if (signal.ministry?.trim()) set.add(signal.ministry.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-CL"));
  }, [señalesPendientes]);

  const regionesUnicas = useMemo(() => {
    const set = new Set<string>();
    for (const m of MOVIMIENTOS) {
      const reg = m.region?.trim();
      if (reg) set.add(reg);
    }
    for (const signal of señalesPendientes) if (signal.region?.trim()) set.add(signal.region.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es-CL"));
  }, [señalesPendientes]);

  // Filtrado reactivo
  const filtrados = useMemo(() => {
    return MOVIMIENTOS.filter((m) => {
      if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
      if (filtroEstado === "verificado" && !esMovimientoRespaldado(m)) return false;
      if (filtroEstado === "en_confirmacion" && esMovimientoRespaldado(m)) return false;
      if (filtroMinisterio !== "todos" && m.ministerio !== filtroMinisterio) return false;
      if (filtroRegion !== "todos" && m.region !== filtroRegion) return false;
      if (filtroMotivo !== "todos" && m.salio?.motivo_categoria !== filtroMotivo) return false;

      if (busqueda.trim()) {
        const q = normalizarBusqueda(busqueda);
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
          m.decreto_numero,
          m.id_norma,
          m.detectado_por,
        ]
          .filter(Boolean)
          .join(" ")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .toLocaleLowerCase("es-CL");
        if (!matchText.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => (a.fecha === b.fecha ? 0 : a.fecha < b.fecha ? 1 : -1));
  }, [filtroTipo, filtroEstado, filtroMinisterio, filtroRegion, filtroMotivo, busqueda]);

  const señalesFiltradas = useMemo(() => señalesPendientes.filter((signal) => {
    if (filtroTipo !== "todos" && signal.tipo !== filtroTipo) return false;
    if (filtroEstado === "verificado") return false;
    if (filtroMinisterio !== "todos" && signal.ministry !== filtroMinisterio) return false;
    if (filtroRegion !== "todos" && signal.region !== filtroRegion) return false;
    if (filtroMotivo !== "todos" && filtroMotivo !== "Renuncia pedida por el Gobierno") return false;
    if (busqueda.trim()) {
      const haystack = normalizarBusqueda([
        signal.title,
        signal.summary,
        signal.source_label,
        signal.person_name,
        signal.role,
        signal.ministry,
        signal.region,
      ].filter(Boolean).join(" "));
      if (!haystack.includes(normalizarBusqueda(busqueda))) return false;
    }
    return true;
  }), [señalesPendientes, filtroTipo, filtroEstado, filtroMinisterio, filtroRegion, filtroMotivo, busqueda]);

  const entradasFiltradas = useMemo<EntradaCronologica[]>(() => [
    ...filtrados.map((movement) => ({ kind: "movement" as const, id: movement.id, date: movement.fecha, movement })),
    ...señalesFiltradas.filter((signal): signal is MovimientoSignal & { date: string } => Boolean(signal.date)).map((signal) => ({
      kind: "signal" as const,
      id: signal.signal_id,
      date: signal.date,
      signal,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), [filtrados, señalesFiltradas]);

  // Agrupación cronológica mensual
  const agrupados = useMemo(() => {
    const grupos: Record<string, EntradaCronologica[]> = {};
    for (const entry of entradasFiltradas) {
      const k = entry.date.slice(0, 7);
      (grupos[k] ??= []).push(entry);
    }
    return Object.entries(grupos).sort((a, b) => (a[0] === b[0] ? 0 : a[0] < b[0] ? 1 : -1));
  }, [entradasFiltradas]);

  const [nowMs] = useState<number>(() => Date.now());
  const [shareFeedback, setShareFeedback] = useState(false);

  // KPIs 100% DINÁMICOS DESDE EL DATASET (RECONCILIACIÓN EXTERNA + TRANSPARENCIA)
  const {
    totalCambiosGobierno,
    totalSalidas,
    desgloseGobierno,
    ultFechaFormateada,
    haceTexto,
    diasEntreCambios,
    totalVerificados,
    totalEnConfirmacion,
    ultimaPublicacionTexto,
    senalesEnConfirmacion,
  } = useMemo(() => {
    const enGobierno = MOVIMIENTOS.filter((m) => m.fecha >= "2026-03-11");
    const totalGob = enGobierno.length;

    const renuncias = enGobierno.filter((m) => m.tipo === "renuncia").length;
    const ceses = enGobierno.filter((m) => m.tipo === "cese" || m.tipo === "remocion").length;
    const salidas = renuncias + ceses;
    // Última fecha en el dataset. Cuando el ETL la declara explícitamente,
    // esa fecha es la referencia del evento y no la fecha de ejecución.
    const maxFecha = MOVIMIENTOS.reduce(
      (max, m) => (m.fecha && m.fecha > max ? m.fecha : max),
      MOVIMIENTOS[0]?.fecha ?? ""
    );
    const fechaEventoDeclarada = MOVIMIENTOS_PIPELINE_METADATA.last_event_date;
    const fechaEvento = /^\d{4}-\d{2}-\d{2}$/.test(String(fechaEventoDeclarada ?? ""))
      ? fechaEventoDeclarada as string
      : maxFecha;

    let fechaTxt = "—";
    let haceTxt = "—";
    if (fechaEvento) {
      const parts = fechaEvento.slice(0, 10).split("-");
      if (parts.length === 3) {
        const dia = parseInt(parts[2], 10);
        const mesIndex = parseInt(parts[1], 10) - 1;
        const anio = parts[0];
        fechaTxt = `${dia} de ${MESES[mesIndex]?.toLowerCase() || parts[1]} ${anio}`;
      }

      // Cálculo de "hace X días" contra fecha actual (nunca hardcodeado)
      if (nowMs !== null) {
        const diffMs = nowMs - new Date(fechaEvento + "T12:00:00Z").getTime();
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        haceTxt = diffDays === 0 ? "hoy" : diffDays === 1 ? "hace 1 día" : `hace ${diffDays} días`;
      }
    }

    // Rotación: promedio de días transcurridos desde el 2026-03-11 dividido por total de cambios en el gobierno
    let promedioRotacion = "—";
    if (fechaEvento && totalGob > 0) {
      const inicio = new Date("2026-03-11T00:00:00Z").getTime();
      const fin = new Date(fechaEvento + "T00:00:00Z").getTime();
      const diasTranscurridos = Math.max(1, Math.round((fin - inicio) / (1000 * 60 * 60 * 24)));
      promedioRotacion = (diasTranscurridos / totalGob).toFixed(1).replace(".", ",");
    }

    const verificados = MOVIMIENTOS.filter(esMovimientoRespaldado).length;
    const enConfirmacion = MOVIMIENTOS.filter((m) => m.estado === "en_confirmacion").length;
    const ultimaPublicacion = latestMovementPublicationDate(MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA.signals);
    const ultimaPublicacionDate = ultimaPublicacion ? new Date(`${ultimaPublicacion}T12:00:00Z`) : null;
    const ultimaPublicacionTexto = ultimaPublicacionDate && !Number.isNaN(ultimaPublicacionDate.getTime())
      ? ultimaPublicacionDate.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" })
      : "sin registro";

    return {
      totalCambiosGobierno: totalGob + señalesPendientes.length,
      totalSalidas: salidas,
      desgloseGobierno: `${totalGob} salidas revisadas · ${señalesPendientes.length} en confirmación`,
      ultFecha: maxFecha,
      ultFechaFormateada: fechaTxt,
      haceTexto: haceTxt,
      diasEntreCambios: promedioRotacion,
      totalVerificados: verificados,
      totalEnConfirmacion: enConfirmacion,
      ultimaPublicacionTexto,
      senalesEnConfirmacion: señalesPendientes.length,
    };
  }, [nowMs, señalesPendientes.length]);

  // Botón Compartir reactivo para Hero y Toolbar (URL con filtros activos + share nativo)
  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (busqueda.trim()) url.searchParams.set("q", busqueda.trim());
    else url.searchParams.delete("q");
    if (filtroTipo !== "todos") url.searchParams.set("tipo", filtroTipo);
    else url.searchParams.delete("tipo");
    if (filtroEstado !== "todos") url.searchParams.set("estado", filtroEstado);
    else url.searchParams.delete("estado");
    if (filtroMinisterio !== "todos") url.searchParams.set("ministerio", filtroMinisterio);
    else url.searchParams.delete("ministerio");
    if (filtroRegion !== "todas") url.searchParams.set("region", filtroRegion);
    else url.searchParams.delete("region");
    if (filtroMotivo !== "todos") url.searchParams.set("motivo", filtroMotivo);
    else url.searchParams.delete("motivo");
    if (vista !== "timeline") url.searchParams.set("vista", vista);
    else url.searchParams.delete("vista");

    const shareUrl = url.toString();

    if (navigator.share) {
      navigator
        .share({
          title: "Cambiometro — Movimientos y Salidas de Autoridades",
      text: `Registro de movimientos de autoridades: ${totalCambiosGobierno} registros, incluidas señales en confirmación; ${totalSalidas} salidas publicadas.`,
          url: shareUrl,
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2500);
    }
  }, [busqueda, filtroTipo, filtroEstado, filtroMinisterio, filtroRegion, filtroMotivo, vista, totalCambiosGobierno, totalSalidas]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}>
      {/* ─── 1. HERO MASTHEAD CON LOS 3 KPIS DINÁMICOS Y BOTÓN COMPARTIR ────── */}
      <section className="page-masthead" style={{ padding: "2.25rem 0 1.75rem", borderBottom: "1px solid var(--border)" }}>
        <div className="container-main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <div style={{ maxWidth: 780 }}>
              <h1 style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.4rem)", fontWeight: 900, margin: "0 0 0.5rem 0", letterSpacing: "-0.02em" }}>
                Movimientos y Relevos de Autoridades
              </h1>
              <p style={{ fontSize: "0.95rem", color: "var(--text-2)", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                Registro cronológico trazable de renuncias, ceses, cambios de puesto y nombramientos en el Poder Ejecutivo. Cada fila identifica si cuenta con documento oficial o corroboración pública.
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.45, margin: "0.65rem 0 0", maxWidth: 720 }}>
                  El total distingue movimientos con respaldo público de señales recientes cuya salida efectiva aún está en confirmación.
              </p>
            </div>

            {/* BOTÓN COMPARTIR EN EL HERO */}
            <div>
              <button
                type="button"
                onClick={handleShare}
                className="btn btn--secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.6rem 1.1rem",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                  cursor: "pointer",
                  boxShadow: "var(--card-shadow)",
                  transition: "all 0.15s ease",
                }}
                title="Compartir enlace con los filtros activos"
              >
                <span aria-hidden="true">🔗</span> {shareFeedback ? "¡Enlace copiado!" : "Compartir"}
              </button>
            </div>
          </div>

          {/* 3 KPIS HERO DINÁMICOS */}
          <div
            className="stat-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* KPI 1: CAMBIOS EN EL GOBIERNO ACTUAL */}
            <div
              className="stat-tile stat-tile--accent"
              title="Total de movimientos registrados en el Poder Ejecutivo desde la asunción constitucional del 11 de marzo de 2026."
            >
              <div className="stat-tile__value">{totalCambiosGobierno}</div>
              <div className="stat-tile__label">Movimientos y señales publicadas</div>
              <div className="stat-tile__hint" style={{ fontSize: "0.78rem", lineHeight: 1.4 }}>
                {desgloseGobierno}
              </div>
            </div>

            {/* KPI 2: ÚLTIMO CAMBIO */}
            <div
              className="stat-tile stat-tile--ok"
              title="Fecha del último movimiento registrado en el dataset y días transcurridos calculados en tiempo real."
            >
              <div className="stat-tile__value" style={{ fontSize: "1.4rem", whiteSpace: "nowrap" }}>
                {ultFechaFormateada}
              </div>
              <div className="stat-tile__label">Último Cambio Registrado</div>
              <div className="stat-tile__hint" style={{ color: "var(--ok)", fontWeight: 600 }}>
                {haceTexto} · {totalVerificados} con respaldo documental público
              </div>
            </div>

            {/* KPI 3: DÍAS ENTRE CAMBIOS (PROMEDIO ROTACIÓN) */}
            <div
              className="stat-tile stat-tile--warn"
              title="Indicador de rotación: días transcurridos desde el 11 de marzo de 2026 divididos por la cantidad de eventos registrados."
            >
              <div className="stat-tile__value">~{diasEntreCambios} días</div>
              <div className="stat-tile__label">Días Entre Cambios (Promedio)</div>
              <div className="stat-tile__hint">
                1 relevo cada ~{diasEntreCambios} días ·{" "}
                <Link prefetch={false} href="/como-funciona" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  Metodología →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="container-main" aria-labelledby="freshness-heading" style={{ paddingTop: "1.25rem" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem 1.2rem" }}>
          <h2 id="freshness-heading" style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>Estado de actualización</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", margin: 0 }}>
            <div><dt>Última actualización pública</dt><dd style={{ margin: "0.25rem 0 0", fontWeight: 700 }}>{ultimaPublicacionTexto}</dd></div>
            <div><dt>Última salida documentada</dt><dd style={{ margin: "0.25rem 0 0", fontWeight: 700 }}>{ultFechaFormateada}</dd></div>
            <div><dt>Con respaldo documental</dt><dd style={{ margin: "0.25rem 0 0", fontWeight: 700 }}>{totalVerificados}</dd></div>
            <div><dt>En confirmación</dt><dd style={{ margin: "0.25rem 0 0", fontWeight: 700 }}>{totalEnConfirmacion + senalesEnConfirmacion}</dd></div>
          </dl>
        </div>
      </section>

      {/* ─── 2. BARRA DE HERRAMIENTAS, FILTROS Y BÚSQUEDA ──────────────────────── */}
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
        <div className="container-main" style={{ padding: "0.85rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {/* Fila 1: Buscador + Filtros por Tipo, Estado, Ministerio, Región */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 200 }}>
              <input
                type="text"
                placeholder="Buscar por persona, cargo, organismo o decreto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.48rem 0.8rem",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text-1)",
                  fontSize: "0.82rem",
                }}
              />
            </div>

            {/* Filtro Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as MovimientoTipo | "todos")}
              style={{
                padding: "0.48rem 0.65rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                fontSize: "0.8rem",
              }}
            >
              <option value="todos">Tipo: Todos los tipos</option>
              <option value="renuncia">Renuncia</option>
              <option value="remocion">Cese / Remoción</option>
              <option value="cambio">Cambio de puesto</option>
              <option value="designacion">Nombramiento</option>
              <option value="fallido">Nombramiento fallido</option>
            </select>

            {/* Filtro Estado */}
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as "todos" | "verificado" | "en_confirmacion")}
              style={{
                padding: "0.48rem 0.65rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-1)",
                fontSize: "0.8rem",
              }}
            >
              <option value="todos">Estado: Todos ({MOVIMIENTOS.length + señalesPendientes.length})</option>
              <option value="verificado">Respaldado públicamente ({totalVerificados})</option>
              <option value="en_confirmacion">En confirmación ({totalEnConfirmacion + senalesEnConfirmacion})</option>
            </select>

            {/* Filtro Ministerio */}
            <select
              value={filtroMinisterio}
              onChange={(e) => setFiltroMinisterio(e.target.value)}
              style={{
                padding: "0.48rem 0.65rem",
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

            {/* Filtro Región */}
            <select
              value={filtroRegion}
              onChange={(e) => setFiltroRegion(e.target.value)}
              style={{
                padding: "0.48rem 0.65rem",
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
          </div>

          {/* Fila 2: Contador de casos + Toggle Vista + Copiar Enlace */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-1)" }}>
                {entradasFiltradas.length} {entradasFiltradas.length === 1 ? "registro" : "registros"}
                {señalesFiltradas.length > 0 && <span style={{ color: "var(--text-2)", fontWeight: 500 }}> · {señalesFiltradas.length} en confirmación</span>}
              </span>
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ display: "inline-flex", borderRadius: 6, border: "1px solid var(--border)", overflow: "hidden" }}>
                <button
                  onClick={() => setVista("timeline")}
                  style={{
                    padding: "0.32rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "none",
                    background: vista === "timeline" ? "var(--accent)" : "var(--surface-2)",
                    color: vista === "timeline" ? "var(--surface)" : "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  Timeline Vertical
                </button>
                <button
                  onClick={() => setVista("tabla")}
                  style={{
                    padding: "0.32rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "none",
                    borderLeft: "1px solid var(--border)",
                    background: vista === "tabla" ? "var(--accent)" : "var(--surface-2)",
                    color: vista === "tabla" ? "var(--surface)" : "var(--text-2)",
                    cursor: "pointer",
                  }}
                >
                  Tabla Resumen
                </button>
              </div>

              <button
                onClick={copiarEnlace}
                style={{
                  padding: "0.32rem 0.75rem",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: copiado ? "var(--ok)" : "var(--text-1)",
                  cursor: "pointer",
                }}
                title="Copiar enlace directo con los filtros actuales"
              >
                {copiado ? "Enlace copiado" : "Copiar enlace"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. CONTENIDO PRINCIPAL: TIMELINE MEJORADO O TABLA ───────────────── */}
      <div className="container-main" style={{ padding: "2.5rem 1.5rem 4rem" }}>
        {entradasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <p style={{ color: "var(--text-2)", fontSize: "0.95rem", margin: "0 0 1rem 0" }}>
              No se encontraron movimientos para los filtros seleccionados.
            </p>
            <button
              onClick={() => {
                setFiltroTipo("todos");
                setFiltroEstado("todos");
                setFiltroMinisterio("todos");
                setFiltroRegion("todos");
                setFiltroMotivo("todos");
                setBusqueda("");
              }}
              className="btn btn-secondary"
              style={{ fontSize: "0.82rem" }}
            >
              Restablecer todos los filtros
            </button>
          </div>
        ) : vista === "tabla" ? (
          /* ─── VISTA TABLA ─────────────────────────────────────────────────── */
          <div style={{ overflowX: "auto", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-3)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Fecha</th>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Tipo</th>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Organismo / Cargo</th>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Salió</th>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Asume</th>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Motivo</th>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Estado</th>
                  <th style={{ padding: "0.65rem 0.85rem" }}>Documento</th>
                </tr>
              </thead>
              <tbody>
                {entradasFiltradas.map((entry) => {
                  if (entry.kind === "signal") {
                    const signal = entry.signal;
                    return (
                      <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)", verticalAlign: "middle", background: "var(--surface-2)" }}>
                        <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap", fontWeight: 600, fontSize: "0.78rem" }}>
                          {signal.date ? formatFechaCorta(signal.date) : "—"}<div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>Publicación</div>
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.45rem", borderRadius: 4, background: "var(--surface-2)", color: MOVIMIENTOS_TIPO_COLOR[signal.tipo], border: `1px solid ${MOVIMIENTOS_TIPO_COLOR[signal.tipo]}` }}>
                            {MOVIMIENTOS_TIPO_LABEL[signal.tipo]} · señal
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{signal.ministry ?? signal.source_label}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{signal.role ?? "Cargo por confirmar"}{signal.region ? ` · ${signal.region}` : ""}</div>
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--alert)", fontWeight: 600 }}>{signal.person_name ?? signal.title}</td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-3)" }}>—</td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-2)" }}>{signal.summary}</td>
                        <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}><span className="badge badge-warn" style={{ fontSize: "0.7rem" }}>En confirmación</span></td>
                        <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}>
                          {signal.url ? <a href={signal.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline", fontSize: "0.78rem", fontWeight: 600 }}>Ver fuente ↗</a> : <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Sin enlace</span>}
                        </td>
                      </tr>
                    );
                  }
                  const mov = entry.movement;
                  return (
                  <tr key={mov.id} style={{ borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
                    <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap", fontWeight: 600, fontSize: "0.78rem" }}>
                      {formatFechaCorta(mov.fecha)}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.45rem",
                          borderRadius: 4,
                          background: "var(--surface-2)",
                          color: MOVIMIENTOS_TIPO_COLOR[mov.tipo] || "var(--text-1)",
                          border: `1px solid ${MOVIMIENTOS_TIPO_COLOR[mov.tipo] || "var(--border)"}`,
                        }}
                      >
                        {MOVIMIENTOS_TIPO_LABEL[mov.tipo] || mov.tipo}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{mov.organismo}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{mov.cargo} · {mov.region}</div>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      {mov.saliente ? (
                        <span style={{ color: "var(--alert)", fontWeight: 600 }}>{mov.saliente}</span>
                      ) : (
                        <span style={{ color: "var(--text-3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      {mov.entrante ? (
                        <span style={{ color: "var(--ok)", fontWeight: 600 }}>{mov.entrante}</span>
                      ) : (
                        <span style={{ color: "var(--text-3)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem" }}>
                      <span style={{ color: "var(--text-2)" }}>{mov.salio?.motivo_categoria || mov.motivo}</span>
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}>
                      {mov.estado === "verificado" ? (
                        <span className="badge badge-ok" style={{ fontSize: "0.7rem" }}>Verificado</span>
                      ) : mov.estado === "corroborado" ? (
                        <span className="badge badge-ok" style={{ fontSize: "0.7rem" }}>Corroborado públicamente</span>
                      ) : (
                        <span className="badge badge-warn" style={{ fontSize: "0.7rem" }}>Información en confirmación</span>
                      )}
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}>
                      {mov.decreto_url ? (
                        <a
                          href={mov.decreto_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent)", textDecoration: "underline", fontSize: "0.78rem", fontWeight: 600 }}
                        >
                          Ver decreto ↗
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Pendiente</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── VISTA TIMELINE VERTICAL MEJORADO ────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {agrupados.map(([mes, lista]) => {
              const [y, m] = mes.split("-").map(Number);
              return (
                <section key={mes} aria-labelledby={`month-title-${mes}`}>
                  {/* Separador de Mes */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "1.5rem",
                      borderBottom: "2px solid var(--border)",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    <h2
                      id={`month-title-${mes}`}
                      className="movimientos-month-title"
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        margin: 0,
                        color: "var(--text-1)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {MESES[m - 1]} {y}
                    </h2>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        background: "var(--surface-2)",
                        borderRadius: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {lista.length} {lista.length === 1 ? "movimiento" : "movimientos"}
                    </span>
                  </div>

                  {/* Pista del Timeline Vertical con línea conectora */}
                  <div
                    style={{
                      position: "relative",
                      paddingLeft: "2.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.25rem",
                    }}
                  >
                    {/* Línea vertical central */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: "11px",
                        top: "14px",
                        bottom: "14px",
                        width: "2px",
                        background: "var(--border)",
                        zIndex: 1,
                      }}
                    />

                    {lista.map((entry) => {
                      if (entry.kind === "signal") {
                        const signal = entry.signal;
                        const typeColor = MOVIMIENTOS_TIPO_COLOR[signal.tipo] || "var(--text-1)";
                        return (
                          <article
                            key={entry.id}
                            style={{ position: "relative", background: "var(--surface-2)", border: "1px solid var(--warn)", borderRadius: 10, padding: "1.25rem 1.4rem", boxShadow: "var(--card-shadow)", display: "flex", flexDirection: "column", gap: "0.6rem" }}
                          >
                            <div aria-hidden="true" style={{ position: "absolute", left: "-2.25rem", top: "1.2rem", width: 24, height: 24, borderRadius: "50%", background: "var(--surface)", border: `3px solid ${typeColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", zIndex: 2, boxShadow: "0 0 0 3px var(--bg)" }}>⚠</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>{signal.date ? formatFechaCorta(signal.date) : "Fecha no informada"}</span>
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 4, background: "var(--surface)", color: typeColor, border: `1px solid ${typeColor}` }}>Fecha de publicación</span>
                              </div>
                              <span className="badge badge-warn" style={{ fontSize: "0.72rem" }}>En confirmación</span>
                            </div>
                            <div>
                              <h3 style={{ fontSize: "1.08rem", fontWeight: 800, margin: "0 0 0.15rem", color: "var(--text-1)" }}>{signal.person_name ?? signal.title}</h3>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-2)", fontWeight: 500 }}>
                                {[signal.role, signal.ministry, signal.region].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                            <p style={{ fontSize: "0.88rem", color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>{signal.summary}</p>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.6rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{signal.source_label} · La fecha efectiva de salida está pendiente de confirmación.</span>
                              {signal.url && <a href={signal.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: "0.78rem", fontWeight: 700 }}>Ver fuente ↗</a>}
                            </div>
                          </article>
                        );
                      }
                      const mov = entry.movement;
                      const isExpanded = expandedIds.has(mov.id);
                      const tipoColor = MOVIMIENTOS_TIPO_COLOR[mov.tipo] || "var(--text-1)";
                      const tipoLabel = MOVIMIENTOS_TIPO_LABEL[mov.tipo] || mov.tipo;
                      const tipoEmoji = MOVIMIENTOS_TIPO_EMOJI[mov.tipo] || "•";

                      return (
                        <article
                          key={mov.id}
                          style={{
                            position: "relative",
                            background: "var(--surface)",
                            border: `1px solid ${mov.estado === "verificado" ? "var(--border)" : "var(--warn)"}`,
                            borderRadius: 10,
                            padding: "1.25rem 1.4rem",
                            boxShadow: "var(--card-shadow)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.6rem",
                          }}
                        >
                          {/* Nodo del Timeline en la línea */}
                          <div
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              left: "-2.25rem",
                              top: "1.2rem",
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              background: "var(--surface)",
                              border: `3px solid ${tipoColor}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.65rem",
                              transform: "translateX(0px)",
                              zIndex: 2,
                              boxShadow: "0 0 0 3px var(--bg)",
                            }}
                          >
                            <span style={{ transform: "scale(0.8)" }}>{tipoEmoji}</span>
                          </div>

                          {/* Encabezado de la Tarjeta: Fecha + Tipo + Badges de Estado */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
                                {formatFechaCorta(mov.fecha)}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: 4,
                                  background: "var(--surface-2)",
                                  color: tipoColor,
                                  border: `1px solid ${tipoColor}`,
                                }}
                              >
                                {tipoLabel}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              {mov.estado === "verificado" ? (
                                <span className="badge badge-ok" style={{ fontSize: "0.72rem" }}>
                                  ✓ Verificado oficial
                                </span>
                              ) : mov.estado === "corroborado" ? (
                                <span className="badge badge-ok" style={{ fontSize: "0.72rem" }}>
                                  ✓ Corroborado públicamente
                                </span>
                              ) : (
                                <span className="badge badge-warn" style={{ fontSize: "0.72rem" }}>
                                  Información en confirmación
                                </span>
                              )}

                              {mov.documento_pendiente && mov.estado === "en_confirmacion" && (
                                <span
                                  className="badge badge-alert"
                                  style={{ fontSize: "0.7rem" }}
                                  title={isMovimientoDocumentoPendienteMayor30(mov, nowMs)
                                    ? "Han transcurrido más de 30 días desde la fecha del evento sin publicación de decreto oficial en Ley Chile / Diario Oficial."
                                    : "El anuncio está pendiente de su decreto o resolución oficial en Ley Chile / Diario Oficial."}
                                >
                                  {isMovimientoDocumentoPendienteMayor30(mov, nowMs)
                                    ? "⚠️ Documento oficial pendiente (&gt;30d)"
                                    : "Documento oficial pendiente"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Cargo e Institución */}
                          <div>
                            <h3 style={{ fontSize: "1.08rem", fontWeight: 800, margin: "0 0 0.15rem 0", color: "var(--text-1)" }}>
                              {mov.cargo}
                            </h3>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-2)", fontWeight: 500 }}>
                              {mov.organismo} · <span style={{ color: "var(--text-muted)" }}>{mov.region}</span>
                              {mov.dias_en_cargo && (
                                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                  (⏱ {mov.dias_en_cargo} días en el cargo · {mov.dias_en_cargo_origen})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Flujo de Autoridades: Salió → Asume */}
                          <div style={{ fontSize: "0.88rem", color: "var(--text-1)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                            {mov.saliente && (
                              <span>
                                Salió:{" "}
                                <strong style={{ color: "var(--alert)" }}>
                                  {(() => {
                                    const p = POLITICOS_SEED.find((x) => x.nombre_completo.toLowerCase() === mov.saliente!.toLowerCase());
                                    if (p) return <Link prefetch={false} href={`/politico/${p.id}`} style={{ color: "var(--alert)", textDecoration: "underline" }}>{mov.saliente}</Link>;
                                    return <Link prefetch={false} href={`/cruces?q=${encodeURIComponent(mov.saliente!)}`} style={{ color: "var(--alert)", textDecoration: "underline" }}>{mov.saliente}</Link>;
                                  })()}
                                </strong>
                              </span>
                            )}

                            {mov.saliente && mov.entrante && (
                              <span style={{ color: "var(--text-muted)", margin: "0 0.2rem" }}>→</span>
                            )}

                            {mov.entrante ? (
                              <span>
                                Asume:{" "}
                                <strong style={{ color: "var(--ok)" }}>
                                  {(() => {
                                    const p = POLITICOS_SEED.find((x) => x.nombre_completo.toLowerCase() === mov.entrante!.toLowerCase());
                                    if (p) return <Link prefetch={false} href={`/politico/${p.id}`} style={{ color: "var(--ok)", textDecoration: "underline" }}>{mov.entrante}</Link>;
                                    return <Link prefetch={false} href={`/cruces?q=${encodeURIComponent(mov.entrante!)}`} style={{ color: "var(--ok)", textDecoration: "underline" }}>{mov.entrante}</Link>;
                                  })()}
                                </strong>
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)" }}>Reemplazo: no informado en las fuentes consultadas</span>
                            )}
                          </div>

                          {/* Motivo y Acciones de Trazabilidad */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.2rem" }}>
                            <div style={{ fontSize: "0.84rem", color: "var(--text-2)", maxWidth: "65%" }}>
                              Motivo: <strong>{mov.salio?.motivo_categoria || mov.motivo}</strong>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {/* Botón Ver Decreto Oficial */}
                              {mov.decreto_url && (
                                <a
                                  href={mov.decreto_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary"
                                  style={{
                                    fontSize: "0.76rem",
                                    padding: "0.3rem 0.65rem",
                                    color: "var(--accent)",
                                    fontWeight: 700,
                                  }}
                                >
                                  Ver decreto oficial ↗
                                </a>
                              )}

                              {/* Toggle de detalles */}
                              <button
                                onClick={() => toggleExpand(mov.id)}
                                style={{
                                  background: "transparent",
                                  border: "1px solid var(--border)",
                                  borderRadius: 4,
                                  padding: "0.28rem 0.6rem",
                                  fontSize: "0.76rem",
                                  fontWeight: 600,
                                  color: "var(--text-2)",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isExpanded ? "▴ Ocultar detalle" : "▾ Ver detalle"}
                              </button>
                            </div>
                          </div>

                          {/* Proveniencia visible para detecciones tempranas */}
                          {mov.detectado_por && mov.estado === "en_confirmacion" && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "-0.2rem" }}>
                              ℹ️ <strong>Detectado por:</strong> {mov.detectado_por} (en espera de toma de razón o decreto en Ley Chile)
                            </div>
                          )}

                          {/* Acordeón de Evidencias Expandido */}
                          {isExpanded && (
                            <div
                              style={{
                                marginTop: "0.6rem",
                                paddingTop: "0.75rem",
                                borderTop: "1px solid var(--border)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.6rem",
                                background: "var(--surface-2)",
                                padding: "0.85rem 1rem",
                                borderRadius: 6,
                              }}
                            >
                              <div>
                                <strong style={{ fontSize: "0.8rem", color: "var(--text-1)" }}>Descripción detallada:</strong>
                                <p style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.5, margin: "0.2rem 0 0 0" }}>
                                  {mov.salio?.motivo_texto || mov.motivo}
                                </p>
                              </div>

                              {mov.cgr_informe && (
                                <div>
                                  <a
                                    href={mov.cgr_informe.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      fontSize: "0.8rem",
                                      fontWeight: 700,
                                      color: "var(--alert)",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    Dictamen CGR SIAPER: {mov.cgr_informe.numero} ({mov.cgr_informe.titulo}) ↗
                                  </a>
                                </div>
                              )}

                              <div>
                                <strong style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Fuentes y Evidencias Trazables:</strong>
                                <p style={{ margin: "0.25rem 0 0", fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                                  <strong>Fecha del evento:</strong> {formatFechaCorta(mov.fecha)}. La fecha entre paréntesis en cada fuente corresponde a su <strong>fecha de publicación</strong>; puede ser posterior al cambio efectivo.
                                </p>
                                <ul style={{ margin: "0.3rem 0 0 0", paddingLeft: "1.2rem", fontSize: "0.78rem", color: "var(--text-2)" }}>
                                  {mov.fuentes.map((f, fIdx) => (
                                    <li key={fIdx}>
                                      <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "var(--accent)", textDecoration: "underline" }}
                                      >
                                        [{f.nivel.toUpperCase()}] {f.medio}: {f.titulo} ({f.fecha}) ↗
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ─── 4. NOTA DE POLÍTICA Y METODOLOGÍA MULTIFUENTE ───────────────────── */}
        <footer
          style={{
            marginTop: "3.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid var(--border)",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            lineHeight: 1.55,
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0" }}>
            * <strong>Cómo leer el catálogo:</strong> Cada fila conserva sus fuentes públicas. “Verificado oficial” requiere un documento oficial; “Corroborado públicamente” indica que la salida está respaldada por una fuente periodística identificable. Si no existe respaldo suficiente, la fila queda “En confirmación”.
          </p>
          <p style={{ margin: "0 0 0.5rem 0" }}>
            * <strong>Corte público:</strong> Este listado contiene 46 salidas documentadas hasta el 14 de septiembre de 2026, distribuidas en 3 ministras, 6 subsecretarías, 36 seremis y 1 delegado provincial. Cada fila indica si existe reemplazo informado y qué tipo de respaldo tiene.
          </p>
        </footer>
      </div>
    </div>
  );
}
