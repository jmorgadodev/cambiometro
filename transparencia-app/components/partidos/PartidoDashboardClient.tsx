"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import DonaPartido from "@/components/partidos/DonaPartido";
import VotosPartidoChart, { type FilaVotosChart } from "@/components/partidos/VotosPartidoChart";
import AsistenciaPartidoChart from "@/components/partidos/AsistenciaPartidoChart";
import GastosPartidoChart from "@/components/partidos/GastosPartidoChart";
import GastosParlamentarioChart, { type FilaGasto } from "@/components/partidos/GastosParlamentarioChart";
import RadiografiaElectoralCard from "@/components/partidos/RadiografiaElectoralCard";
import DisciplinaBancadaCard from "@/components/partidos/DisciplinaBancadaCard";
import { formatCLP, formatFechaCorta } from "@/lib/format";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import { useThemeTokens } from "@/lib/theme-tokens";
import type { Politico, ScoreProbidad } from "@/lib/seed-politicos";
import type { GastoPartido, SerieAsistencia, DisciplinaBancada } from "@/lib/partido-estadisticas";
import type { RadiografiaElectoral } from "@/lib/partido-electoral-data";

interface PartidoDashboardClientProps {
  partido: {
    id: string;
    sigla: string;
    nombre: string;
    color_hex: string;
    logo_url?: string;
  };
  esIndependiente: boolean;
  votosCamara: {
    emitidos: number;
    afirmativo: number;
    enContra: number;
    abstencion: number;
    noVota: number;
  };
  votosSenado: {
    emitidos: number;
    afirmativo: number;
    enContra: number;
    abstencion: number;
    noVota: number;
  };
  votacionesTodas: FilaVotosChart[];
  serieAsistencia: SerieAsistencia[];
  disciplina?: DisciplinaBancada;
  radiografia?: RadiografiaElectoral;
  gastos: GastoPartido;
  politicos: Politico[];
  scores: ScoreProbidad[];
}

export default function PartidoDashboardClient({
  partido,
  esIndependiente: _esIndependiente,
  votosCamara,
  votosSenado,
  votacionesTodas,
  serieAsistencia,
  disciplina,
  radiografia,
  gastos,
  politicos,
  scores,
}: PartidoDashboardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tokens = useThemeTokens();

  // ─── ESTADOS DE FILTRO INTERACTIVO CON URL INITIALIZATION ────────────────────
  const [filtroVoto, setFiltroVoto] = useState<string | null>(() => searchParams.get("voto") || null);
  const [filtroCamara, setFiltroCamara] = useState<"Todas" | "Diputado" | "Senador">(
    () => (searchParams.get("camara") as "Todas" | "Diputado" | "Senador") || "Todas"
  );
  const [limiteVotaciones, setLimiteVotaciones] = useState<number>(() => {
    const lim = Number(searchParams.get("limite"));
    return lim === 25 || lim === 50 ? lim : 10;
  });
  const [rangoFechas, setRangoFechas] = useState<"todas" | "ultimos_30" | "ultimos_60" | "ultimos_90" | "ultimos_180" | "2026">(
    () => (searchParams.get("periodo") as "todas" | "ultimos_30" | "ultimos_60" | "ultimos_90" | "ultimos_180" | "2026") || "todas"
  );
  const [busquedaParlamentario, setBusquedaParlamentario] = useState<string>(() => searchParams.get("busqueda") || "");
  const [selectedVotacion, setSelectedVotacion] = useState<FilaVotosChart | null>(null);

  // Sincronizar URL de manera shallow
  const syncUrlParams = useCallback(
    (voto: string | null, camara: string, limite: number, periodo: string, busqueda: string) => {
      const params = new URLSearchParams();
      if (voto) params.set("voto", voto);
      if (camara !== "Todas") params.set("camara", camara);
      if (limite !== 10) params.set("limite", String(limite));
      if (periodo !== "todas") params.set("periodo", periodo);
      if (busqueda.trim()) params.set("busqueda", busqueda.trim());

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  // Manejar clic en sectores de la dona
  const handleSelectDonutSegment = (segmentName: string) => {
    const nextVoto = !segmentName || segmentName === "Todos" || filtroVoto === segmentName ? null : segmentName;
    setFiltroVoto(nextVoto);
    syncUrlParams(nextVoto, filtroCamara, limiteVotaciones, rangoFechas, busquedaParlamentario);
  };

  const handleCamaraChange = (nextCamara: "Todas" | "Diputado" | "Senador") => {
    setFiltroCamara(nextCamara);
    syncUrlParams(filtroVoto, nextCamara, limiteVotaciones, rangoFechas, busquedaParlamentario);
  };

  const handleLimiteChange = (nextLimite: number) => {
    setLimiteVotaciones(nextLimite);
    syncUrlParams(filtroVoto, filtroCamara, nextLimite, rangoFechas, busquedaParlamentario);
  };

  const handleRangoChange = (nextRango: "todas" | "ultimos_30" | "ultimos_60" | "ultimos_90" | "ultimos_180" | "2026") => {
    setRangoFechas(nextRango);
    syncUrlParams(filtroVoto, filtroCamara, limiteVotaciones, nextRango, busquedaParlamentario);
  };

  const handleBusquedaChange = (nextBusqueda: string) => {
    setBusquedaParlamentario(nextBusqueda);
    syncUrlParams(filtroVoto, filtroCamara, limiteVotaciones, rangoFechas, nextBusqueda);
  };

  // ─── FILTRADO DE VOTACIONES RECIENTES ───────────────────────────────────────
  const votacionesFiltradas = useMemo(() => {
    let list = [...votacionesTodas];

    // Filtro de rango de fechas
    if (rangoFechas === "2026") {
      list = list.filter((v) => v.fecha?.startsWith("2026"));
    } else if (rangoFechas !== "todas") {
      const days =
        rangoFechas === "ultimos_30"
          ? 30
          : rangoFechas === "ultimos_60"
            ? 60
            : rangoFechas === "ultimos_90"
              ? 90
              : 180;
      const limite = new Date();
      limite.setDate(limite.getDate() - days);
      const isoLimit = limite.toISOString().slice(0, 10);
      list = list.filter((v) => (v.fecha ? v.fecha.slice(0, 10) >= isoLimit : true));
    }

    // Filtro cruzado por opción seleccionada en dona
    if (filtroVoto === "Sí") {
      list = list.filter((v) => (v.si || 0) > 0);
    } else if (filtroVoto === "No") {
      list = list.filter((v) => (v.no || 0) > 0);
    } else if (filtroVoto === "Abstención") {
      list = list.filter((v) => (v.abst || 0) > 0);
    } else if (filtroVoto === "No vota") {
      list = list.filter((v) => (v.noVota || 0) > 0);
    }

    // Selección con representatividad temporal (múltiples sesiones/fechas)
    const porFecha = new Map<string, FilaVotosChart[]>();
    for (const v of list) {
      const d = v.fecha?.slice(0, 10) || "sin-fecha-oficial";
      if (!porFecha.has(d)) porFecha.set(d, []);
      porFecha.get(d)!.push(v);
    }

    const seleccionadas: FilaVotosChart[] = [];
    const fechas = Array.from(porFecha.keys());

    // Ronda 1: 1 votación principal por fecha
    for (const f of fechas) {
      if (seleccionadas.length >= limiteVotaciones) break;
      const votacionesDia = porFecha.get(f)!;
      const ley =
        votacionesDia.find(
          (v) =>
            !v.descripcion?.toLowerCase().includes("procedimiento") &&
            !v.descripcion?.toLowerCase().includes("1-otros")
        ) || votacionesDia[0];
      if (ley) seleccionadas.push(ley);
    }

    // Ronda 2: Rellenar con las demás votaciones si faltan para el límite
    if (seleccionadas.length < limiteVotaciones) {
      const selIds = new Set(seleccionadas.map((s) => s.id));
      for (const f of fechas) {
        if (seleccionadas.length >= limiteVotaciones) break;
        const restantes = porFecha.get(f)!.filter((v) => !selIds.has(v.id));
        for (const r of restantes) {
          if (seleccionadas.length >= limiteVotaciones) break;
          seleccionadas.push(r);
          selIds.add(r.id);
        }
      }
    }

    // Preservar orden cronológico original
    const idOrder = new Map(list.map((v, i) => [v.id, i]));
    seleccionadas.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
    return seleccionadas;
  }, [votacionesTodas, rangoFechas, filtroVoto, limiteVotaciones]);

  // ─── FILTRADO DE PARLAMENTARIOS ─────────────────────────────────────────────
  const politicosFiltrados = useMemo(() => {
    let list = [...politicos];

    if (filtroCamara !== "Todas") {
      list = list.filter((p) => p.cargo === filtroCamara);
    }

    if (busquedaParlamentario.trim()) {
      const q = busquedaParlamentario.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nombre_completo.toLowerCase().includes(q) ||
          p.distrito_region.toLowerCase().includes(q)
      );
    }

    return list;
  }, [politicos, filtroCamara, busquedaParlamentario]);

  // Gastos por parlamentario (hasta 20 para cobertura completa de bancadas grandes)
  const filasGasto: FilaGasto[] = useMemo(() => {
    return gastos.porPolitico
      .filter((g) => g.total > 0)
      .slice(0, 20)
      .map((g) => ({ nombre: g.nombre, total: g.total }));
  }, [gastos]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* ─── RADIOGRAFÍA ELECTORAL SERVEL ────────────────────────────────── */}
      {radiografia && (
        <RadiografiaElectoralCard
          datos={radiografia}
          sigla={partido.sigla}
          nombrePartido={partido.nombre}
        />
      )}

      {/* ─── BANNER DE FILTRO ACTIVO ─────────────────────────────────────── */}
      {filtroVoto && (
        <div
          style={{
            background: "var(--info-bg)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.85rem 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🎯</span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-1)" }}>
              Filtrando proyectos y bancada por:{" "}
              <strong style={{ color: "var(--accent)" }}>{filtroVoto}</strong> (haz clic en otro sector o restablece)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFiltroVoto(null)}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "0.3rem 0.75rem",
              background: "var(--surface-2)",
              color: "var(--text-1)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontWeight: 600,
            }}
          >
            ✕ Restablecer filtro
          </button>
        </div>
      )}

      {/* ─── CÓMO HA VOTADO LA BANCADA (DONAS INTERACTIVAS) ─────────────── */}
      <div>
        <div className="section-title">🗳️ Cómo ha votado la bancada {partido.sigla}</div>
        <p style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: "-0.5rem", marginBottom: "1rem" }}>
          Haz clic en cualquier segmento de la dona (ej. <em>No</em> o <em>Abstención</em>) para filtrar las votaciones y parlamentarios en tiempo real.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          {/* Dona Cámara */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <div className="card-title" style={{ margin: 0 }}>Cámara de Diputadas y Diputados</div>
              <span className="badge" style={{ fontSize: "0.7rem" }}>Sala</span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: "0.75rem" }}>
              {votosCamara.emitidos.toLocaleString("es-CL")} votos emitidos por sus diputados en sala
            </p>
            <DonaPartido
              camaraNombre="Cámara"
              selectedSegment={filtroVoto}
              onSelectSegment={handleSelectDonutSegment}
              sectores={[
                { name: "Sí", value: votosCamara.afirmativo, color: tokens.ok },
                { name: "No", value: votosCamara.enContra, color: tokens.bad },
                { name: "Abstención", value: votosCamara.abstencion, color: tokens.warn },
                { name: "No vota", value: votosCamara.noVota, color: tokens.text3 },
              ]}
            />
          </div>

          {/* Dona Senado */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <div className="card-title" style={{ margin: 0 }}>Senado</div>
              <span className="badge" style={{ fontSize: "0.7rem" }}>Sala</span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: "0.75rem" }}>
              {votosSenado.emitidos.toLocaleString("es-CL")} votos emitidos por sus senadores en sala
            </p>
            <DonaPartido
              camaraNombre="Senado"
              selectedSegment={filtroVoto}
              onSelectSegment={handleSelectDonutSegment}
              sectores={[
                { name: "Sí", value: votosSenado.afirmativo, color: tokens.ok },
                { name: "No", value: votosSenado.enContra, color: tokens.bad },
                { name: "Abstención", value: votosSenado.abstencion, color: tokens.warn },
                { name: "No vota", value: votosSenado.noVota, color: tokens.text3 },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ─── DISCIPLINA DE BANCADA Y COHESIÓN ───────────────────────────── */}
      {disciplina && (
        <DisciplinaBancadaCard disciplina={disciplina} sigla={partido.sigla} />
      )}

      {/* ─── VOTACIONES RECIENTES CON SELECTOR Y MODAL ─────────────────── */}
      <div className="card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="card-title" style={{ margin: 0 }}>Votaciones recientes en la Cámara</div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "0.2rem", margin: 0 }}>
              Desglose de votos de los diputados del partido por sesión. Haz clic en una barra para ver el proyecto completo.
            </p>
          </div>

          {/* Controles de Rango y Volumen */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* Selector de volumen */}
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
              {[10, 25, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleLimiteChange(num)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    fontSize: "0.72rem",
                    fontWeight: limiteVotaciones === num ? 700 : 500,
                    background: limiteVotaciones === num ? "var(--accent)" : "var(--surface-2)",
                    color: limiteVotaciones === num ? "var(--surface)" : "var(--text-2)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Selector de fechas */}
            <select
              value={rangoFechas}
              onChange={(e) => handleRangoChange(e.target.value as "todas" | "ultimos_30" | "ultimos_60" | "ultimos_90" | "ultimos_180" | "2026")}
              style={{
                fontSize: "0.72rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                background: "var(--bg-surface-2)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <option value="todas">Todo el período</option>
              <option value="ultimos_180">Últimos 180 días</option>
              <option value="ultimos_90">Últimos 90 días</option>
              <option value="ultimos_60">Últimos 60 días</option>
              <option value="ultimos_30">Últimos 30 días</option>
              <option value="2026">Año 2026</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {votacionesFiltradas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No se encontraron votaciones con los filtros seleccionados.
            </div>
          ) : (
            <VotosPartidoChart
              filas={votacionesFiltradas}
              onSelectVotacion={(v) => setSelectedVotacion(v)}
              selectedVotacionId={selectedVotacion?.id}
            />
          )}
        </div>
      </div>

      {/* ─── ASISTENCIA A VOTACIONES ───────────────────────────────────── */}
      <div className="card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
        <div className="card-title">Asistencia de la bancada a votaciones (Cámara)</div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginBottom: "0.75rem" }}>
          % de diputados del partido presentes en cada sesión de sala (emitidos sobre apariciones; No Vota no cuenta como asistencia)
        </p>
        <AsistenciaPartidoChart serie={serieAsistencia} />
      </div>

      {/* ─── GASTOS OPERACIONALES RENDIDOS ─────────────────────────────── */}
      <div className="section-title" style={{ marginTop: "2.5rem" }}>💰 Gastos operacionales rendidos</div>

      <div className="card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
        <div className="card-title">Gastos por mes (bancada completa)</div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginBottom: "0.75rem" }}>
          Suma de las rendiciones oficiales de Cámara y Senado publicadas. Los meses aún no publicados figuran en $0 como pendientes.
        </p>
        <GastosPartidoChart porMes={gastos.porMes} color={partido.color_hex} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {/* Principales ítems de gasto en Title Case */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="card-title">Principales ítems de gasto</div>
          {(!gastos.porItem || gastos.porItem.length === 0) ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sin gastos publicados para este partido.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {gastos.porItem?.map((it) => {
                const titleCaseItem = (it.item ?? "")
                  .toLowerCase()
                  .split(" ")
                  .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
                  .join(" ");
                return (
                  <div
                    key={it.item}
                    title={`Glosa oficial: ${it.item}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      fontSize: "0.78rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{titleCaseItem}</span>
                    <strong style={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{formatCLP(it.total)}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gasto acumulado por parlamentario */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="card-title">Gasto acumulado por parlamentario</div>
          {(!filasGasto || filasGasto.length === 0) ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sin gastos publicados para este partido.</p>
          ) : (
            <div style={{ marginTop: "0.5rem" }}>
              <GastosParlamentarioChart filas={filasGasto} color={partido.color_hex} />
            </div>
          )}
        </div>
      </div>

      {/* ─── PARLAMENTARIOS DE LA BANCADA ──────────────────────────────── */}
      <div className="section-title" style={{ marginTop: "2.5rem" }}>
        👥 Parlamentarios de {partido.sigla} ({politicosFiltrados.length})
      </div>

      {/* Filtros de la grilla de parlamentarios */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          margin: "1rem 0 1.25rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {(["Todas", "Diputado", "Senador"] as const).map((cam) => (
            <button
              key={cam}
              type="button"
              onClick={() => handleCamaraChange(cam)}
              className="capsule"
              style={{
                cursor: "pointer",
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                background: filtroCamara === cam ? "var(--accent)" : "var(--surface-2)",
                color: filtroCamara === cam ? "var(--surface)" : "var(--text-2)",
                fontWeight: filtroCamara === cam ? 700 : 500,
                border: filtroCamara === cam ? "1px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: "6px",
              }}
            >
              {cam === "Todas" ? "Todos los escaños" : cam === "Diputado" ? "Diputados" : "Senadores"}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Buscar por nombre o distrito…"
          value={busquedaParlamentario}
          onChange={(e) => handleBusquedaChange(e.target.value)}
          style={{
            fontSize: "0.8rem",
            padding: "0.4rem 0.8rem",
            borderRadius: "8px",
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            minWidth: 220,
          }}
        />
      </div>

      <div className="politician-card-grid">
        {politicosFiltrados.map((pol) => {
          const score = scores.find((s) => s.politico_id === pol.id);
          const gM = gastos.porPolitico.find((g) => g.politico_id === pol.id);

          return (
            <Link prefetch={false}
              key={pol.id}
              href={`/politico/${getPoliticoSlug(pol)}`}
              className="politician-card"
            >
              <div
                className="politician-card__photo"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `2px solid ${partido.color_hex || "var(--border)"}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pol.foto_url}
                  alt={pol.nombre_completo}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    background: "var(--bg-surface-2)",
                  }}
                />
              </div>
              <div
                className="politician-card__content"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minWidth: 0,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.92rem",
                      color: "var(--text-primary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {pol.nombre_completo}
                  </div>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "var(--text-muted)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {pol.cargo} · {pol.distrito_region}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginTop: "0.55rem",
                    fontSize: "0.72rem",
                    color: "var(--text-subtle)",
                    flexWrap: "wrap",
                  }}
                >
                  {score?.porcentaje_asistencia !== null && score?.porcentaje_asistencia !== undefined && (
                    <span>
                      Asistencia:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {score.porcentaje_asistencia}%
                      </strong>
                    </span>
                  )}
                  {gM && (
                    <span>
                      Gasto:{" "}
                      <strong style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                        {formatCLP(gM.total)}
                      </strong>
                    </span>
                  )}
                  {score && typeof score.total_alertas_criticas === "number" && typeof score.total_alertas_altas === "number" && (
                    <span>
                      Alertas:{" "}
                      <strong
                        style={{
                          color:
                            score.total_alertas_criticas > 0
                              ? "var(--bad)"
                              : "var(--text-primary)",
                        }}
                      >
                        {score.total_alertas_criticas + score.total_alertas_altas}
                      </strong>
                    </span>
                  )}
                </div>

                <span
                  className="politician-card__action"
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--accent)",
                    fontWeight: 700,
                    marginTop: "0.4rem",
                  }}
                >
                  Ver ficha completa →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── MODAL DETALLE DE VOTACIÓN NOMINAL ──────────────────────────── */}
      {selectedVotacion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-vote-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "var(--overlay)",
            backdropFilter: "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedVotacion(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-lg)",
              padding: "1.5rem",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                <span className="badge" style={{ fontSize: "0.72rem", marginBottom: "0.5rem" }}>
                  Sesión de Sala · {selectedVotacion.fecha ? formatFechaCorta(selectedVotacion.fecha) : "Fecha oficial no publicada"}
                </span>
                <h3 id="modal-vote-title" style={{ fontSize: "1.1rem", margin: "0.25rem 0 0.5rem", lineHeight: 1.4 }}>
                  {selectedVotacion.descripcion || "Descripción oficial no publicada"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVotacion(null)}
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                ✕
              </button>
            </div>

            {/* Resumen de votos de la bancada */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "0.5rem",
                marginTop: "1.25rem",
                padding: "0.75rem",
                background: "var(--surface-2)",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ color: tokens.ok, fontWeight: 800, fontSize: "1.2rem", fontFamily: "monospace" }}>
                  {selectedVotacion.si || 0}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-2)" }}>A favor (Sí)</div>
              </div>
              <div>
                <div style={{ color: tokens.bad, fontWeight: 800, fontSize: "1.2rem", fontFamily: "monospace" }}>
                  {selectedVotacion.no || 0}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-2)" }}>En contra (No)</div>
              </div>
              <div>
                <div style={{ color: tokens.warn, fontWeight: 800, fontSize: "1.2rem", fontFamily: "monospace" }}>
                  {selectedVotacion.abst || 0}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-2)" }}>Abstención</div>
              </div>
              <div>
                <div style={{ color: tokens.text3, fontWeight: 800, fontSize: "1.2rem", fontFamily: "monospace" }}>
                  {selectedVotacion.noVota || 0}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-2)" }}>Ausente / No vota</div>
              </div>
            </div>

            {/* Lista nominal de parlamentarios de la bancada */}
            {selectedVotacion.votosNominales && selectedVotacion.votosNominales.length > 0 && (
              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-1)", marginBottom: "0.5rem" }}>
                  Desglose Nominal de la Bancada ({selectedVotacion.votosNominales.length} parlamentarios)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "0.4rem",
                    maxHeight: "320px",
                    overflowY: "auto",
                    padding: "0.4rem",
                    background: "var(--surface-2)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  {selectedVotacion.votosNominales.map((v) => {
                    const normOpc = v.opcion.toLowerCase();
                    const isSi = normOpc.includes("afirmativo") || normOpc.includes("sí") || normOpc.includes("a favor");
                    const isNo = normOpc.includes("en contra") || normOpc.includes("no");
                    const isAbst = normOpc.includes("abstención") || normOpc.includes("abstencion");
                    const badgeColor = isSi ? tokens.ok : isNo ? tokens.bad : isAbst ? tokens.warn : tokens.text3;
                    const badgeText = isSi ? "A favor (Sí)" : isNo ? "En contra (No)" : isAbst ? "Abstención" : "Ausente / No Vota";

                    return (
                      <Link prefetch={false}
                        key={v.politico_id}
                        href={`/politico/${getPoliticoSlug(v.politico_id)}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.4rem 0.6rem",
                          background: "var(--surface)",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          textDecoration: "none",
                          color: "inherit",
                          fontSize: "0.75rem",
                        }}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text-1)" }}>{v.nombre}</span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            border: `1px solid ${badgeColor}33`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {badgeText}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setSelectedVotacion(null)}
                className="btn-secondary"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}
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
