import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllPartidosSummary } from "@/lib/partido-estadisticas";
import { POLITICOS_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import { diputadoIdParaPolitico } from "@/lib/data-source";
import { leerPersonalApoyo } from "@/lib/personal-apoyo";
import { formatCLP, formatPct } from "@/lib/format";
import RankingVotosChart from "@/components/partidos/RankingVotosChart";
import PartidosRankingTable from "@/components/partidos/PartidosRankingTable";
import TopGastosBancadas, { type TopEquipoDiputado } from "@/components/partidos/TopGastosBancadas";
import ShareButton from "@/components/ShareButton";

export const metadata: Metadata = {
  title: "Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro",
  description:
    "Evidencia comparativa por partido: escaños en el Congreso, votaciones de sala (Cámara y Senado), asistencia, gastos operacionales y personal de apoyo con datos públicos oficiales.",
  openGraph: {
    title: "Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro",
    description: "Comparativa de votaciones, asistencia y gastos operacionales de todas las bancadas del Congreso Nacional.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro",
    description: "Comparativa de votaciones, asistencia y gastos operacionales de todas las bancadas del Congreso Nacional.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default async function PartidosListPage() {
  const partidos = await getAllPartidosSummary();

  // Partidos no independientes para KPIs
  const partidosInstitucionales = partidos.filter((p) => !p.esIndependiente);

  // 1. Partido con más escaños
  const partidoMasEscaños = [...partidosInstitucionales].sort((a, b) => b.totalEscaños - a.totalEscaños)[0];

  // 2. Partido con mayor gasto acumulado
  const partidoMasGasto = [...partidosInstitucionales].sort((a, b) => b.gastosTotal - a.gastosTotal)[0];

  // 3. Partido con mayor gasto promedio por parlamentario
  const partidoMasGastoPromedio = [...partidosInstitucionales].sort(
    (a, b) => b.promedioGastoPorParlamentario - a.promedioGastoPorParlamentario
  )[0];

  // 4. Partido con mayor asistencia
  const partidoMasAsistencia = [...partidosInstitucionales].sort((a, b) => b.asistencia - a.asistencia)[0];

  // 5. Partido con mayor personal de apoyo
  const partidoMasPersonal = [...partidosInstitucionales].sort(
    (a, b) => b.personalApoyoTotal - a.personalApoyoTotal
  )[0];

  // Gráfico de Votaciones de Sala
  const rankingVotos = partidos
    .filter((p) => (p.votosCamara?.emitidos || 0) > 0)
    .sort((a, b) => (b.votosCamara?.emitidos || 0) - (a.votosCamara?.emitidos || 0))
    .map((p) => ({
      nombre: p.sigla,
      si: p.votosCamara?.afirmativo || 0,
      no: p.votosCamara?.enContra || 0,
      abst: p.votosCamara?.abstencion || 0,
      noVota: p.votosCamara?.noVota || 0,
    }));

  // Top 5 Equipos de Apoyo de Diputados
  const datasetApoyo = await leerPersonalApoyo();
  const topEquiposDiputadosRaw = POLITICOS_SEED.filter((p) => p.cargo === "Diputado").map((politico) => {
    const diputadoCamaraId = diputadoIdParaPolitico(politico);
    const diputado = diputadoCamaraId ? datasetApoyo?.diputados?.[String(diputadoCamaraId)] ?? null : null;
    const filas = diputado?.personal_apoyo ?? [];
    const total = filas.reduce((tot, f) => tot + (f.sueldo ?? 0), 0);
    const partido = PARTIDOS_SEED.find((pr) => pr.id === politico.partido_id);
    return {
      id: politico.id,
      nombre: politico.nombre_completo,
      partido: partido?.sigla ?? "IND",
      distrito: politico.numero_distrito ? `Distrito ${politico.numero_distrito}` : null,
      foto_url: politico.foto_url || "/default-avatar.png",
      total,
      n: filas.length,
    };
  });

  const topEquiposDiputados: TopEquipoDiputado[] = topEquiposDiputadosRaw
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ─── HERO MASTHEAD ────────────────────────────────────────── */}
      <section
        className="page-masthead"
        style={{
          background: "var(--surface)",
          padding: "2.5rem 0 2rem",
          borderBottom: "1px solid var(--border)",
          color: "var(--text-1)",
        }}
      >
        <div className="container-main" id="partidos-ranking-zone">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--accent)", fontWeight: 700 }}>
                Fiscalización Parlamentaria · Período 2026-2030
              </span>
              <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.25rem 0 0.5rem 0", color: "var(--text-1)", fontWeight: 900 }}>
                🏛️ Partidos Políticos y Bancadas en el Congreso
              </h1>
              <p style={{ color: "var(--text-2)", fontSize: "0.95rem", maxWidth: 750, lineHeight: 1.6, margin: 0 }}>
                Radiografía comparativa del Congreso Nacional: distribución de escaños, sentido de votos en sala (Cámara y
                Senado), índice de asistencia efectiva, rendición de gastos operacionales y asignación de personal de apoyo.
              </p>
            </div>

            <ShareButton
              title="Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro"
              text="Revisa la comparativa de votos, asistencia y gastos operacionales de todas las bancadas en El Cambiómetro."
              captureTargetId="partidos-ranking-zone"
              variant="primary"
            />
          </div>

          {/* ─── QUICK KPI CARDS ────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {/* KPI 1: Mayor Escaños */}
            {partidoMasEscaños && (
              <Link
                href={`/partidos/${partidoMasEscaños.slug}`}
                className="card-flat hover-row"
                style={{ padding: "1rem", textDecoration: "none", color: "inherit", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
                  Mayor Representación
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-1)", marginTop: "0.2rem" }}>
                  {partidoMasEscaños.sigla}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
                  <strong>{partidoMasEscaños.totalEscaños} escaños</strong> ({partidoMasEscaños.diputados}D · {partidoMasEscaños.senadores}S) ·{" "}
                  {formatPct(partidoMasEscaños.pctEscaños, 1)} del Congreso
                </div>
              </Link>
            )}

            {/* KPI 2: Mayor Gasto Acumulado */}
            {partidoMasGasto && (
              <Link
                href={`/partidos/${partidoMasGasto.slug}`}
                className="card-flat hover-row"
                style={{ padding: "1rem", textDecoration: "none", color: "inherit", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
                  Mayor Gasto Operacional Total
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--warn)", marginTop: "0.2rem" }}>
                  {partidoMasGasto.sigla}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
                  <strong style={{ fontFamily: "monospace", color: "var(--warn)" }}>{formatCLP(partidoMasGasto.gastosTotal)}</strong> acumulado en 5 meses
                </div>
              </Link>
            )}

            {/* KPI 3: Mayor Promedio por Parlamentario */}
            {partidoMasGastoPromedio && (
              <Link
                href={`/partidos/${partidoMasGastoPromedio.slug}`}
                className="card-flat hover-row"
                style={{ padding: "1rem", textDecoration: "none", color: "inherit", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
                  Mayor Promedio / Parl.
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-1)", marginTop: "0.2rem" }}>
                  {partidoMasGastoPromedio.sigla}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
                  <strong style={{ fontFamily: "monospace" }}>{formatCLP(partidoMasGastoPromedio.promedioGastoPorParlamentario)}</strong> por miembro
                </div>
              </Link>
            )}

            {/* KPI 4: Mayor Asistencia */}
            {partidoMasAsistencia && (
              <Link
                href={`/partidos/${partidoMasAsistencia.slug}`}
                className="card-flat hover-row"
                style={{ padding: "1rem", textDecoration: "none", color: "inherit", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
                  Mayor Asistencia a Sala
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--ok)", marginTop: "0.2rem" }}>
                  {partidoMasAsistencia.sigla}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
                  <strong style={{ color: "var(--ok)" }}>{formatPct(partidoMasAsistencia.asistencia)}</strong> de asistencia en votaciones
                </div>
              </Link>
            )}

            {/* KPI 5: Mayor Personal de Apoyo */}
            {partidoMasPersonal && (
              <Link
                href={`/partidos/${partidoMasPersonal.slug}`}
                className="card-flat hover-row"
                style={{ padding: "1rem", textDecoration: "none", color: "inherit", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
                  Personal de Apoyo (Asignación Mensual Vigente)
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent)", marginTop: "0.2rem" }}>
                  {partidoMasPersonal.sigla}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
                  <strong style={{ fontFamily: "monospace", color: "var(--money)" }}>{formatCLP(partidoMasPersonal.personalApoyoTotal)}</strong> / mes ({partidoMasPersonal.personalApoyoPersonas} asesores)
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="container-main" style={{ padding: "2.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        
        {/* Gráficos Comparativos y Top Gastos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
          
          {/* Gráfico Cómo Han Votado las Bancadas */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div className="section-title" style={{ marginBottom: "0.25rem" }}>
              🗳️ Cómo han votado las bancadas (Votos emitidos en sala)
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", margin: "0 0 1rem 0" }}>
              Distribución acumulada de votos emitidos por los parlamentarios de cada colectividad política en las votaciones de sala registradas.
            </p>
            <RankingVotosChart filas={rankingVotos} />
          </div>

          {/* Top Gastos y Asignaciones */}
          <TopGastosBancadas topEquiposDiputados={topEquiposDiputados} partidos={partidos} />
        </div>

        {/* ─── TABLA RANKING GENERAL DE PARTIDOS ────────────────────────────────────────── */}
        <div>
          <div style={{ marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
              📊 Ranking y Comparativa General de Partidos Políticos
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Tabla interactiva con ordenamiento multicriterio y filtro dinámico por mes de rendición.
            </p>
          </div>

          <Suspense fallback={<div style={{ minHeight: 200, display: "grid", placeContent: "center", color: "var(--text-3)" }}>Cargando tabla de partidos...</div>}>
            <PartidosRankingTable partidos={partidos} />
          </Suspense>
        </div>

        {/* ─── NOTA METODOLÓGICA AMPLIADA ────────────────────────────────────────── */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "var(--bg-surface-2)",
            borderRadius: 10,
            border: "1px solid var(--border-subtle)",
            fontSize: "0.75rem",
            color: "var(--text-subtle)",
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem", fontSize: "0.82rem" }}>
            ℹ️ Nota Metodológica y Fuentes de Datos
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <li>
              <strong>Asistencia a Votaciones</strong>: Se calcula como el porcentaje de votos emitidos (Afirmativo, En Contra o
              Abstención) sobre el total de apariciones en sesiones con votaciones de sala registradas. Las figuras de <em>No Vota</em>{" "}
              y <em>Dispensado / Pareo</em> se consideran ausencia de voto en la sesión respectiva. No incluye sesiones de sala sin
              votación ni comisiones de trabajo legislativo.
            </li>
            <li>
              <strong>Gastos Operacionales</strong>: Corresponde a las rendiciones mensuales oficiales publicadas por la Cámara de
              Diputadas y Diputados (vía <code>transparencia.camara.cl</code>) y el Senado (vía <code>web-back.senado.cl</code>),
              abarcando arriendos de sedes, traslados, telefonía y asesorías. El valor acumulado suma los meses publicados; los meses en
              proceso de publicación oficial figuran con advertencia de desfase.
            </li>
            <li>
              <strong>Personal de Apoyo</strong>: Corresponde a la asignación mensual para contratar asesores parlamentarios según la
              nómina oficial de Transparencia Activa CPLT y DIPRES.
            </li>
            <li>
              <strong>Categoría Especial Independientes</strong>: Los parlamentarios que no militan en ningún partido político o
              fueron electos fuera de pacto se agrupan en una categoría especial única (<em>Independientes / Sin partido</em>) con
              fines comparativos y de fiscalización, sin atribuirles personería de partido político legal.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
