import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllPartidosSummary } from "@/lib/partido-estadisticas";
import { PARTY_AGGREGATES_REVIEWED } from "@/lib/publication-scope";
import { formatCLP, formatPct } from "@/lib/format";
import RankingVotosChart from "@/components/partidos/RankingVotosChart";
import PartidosRankingTable from "@/components/partidos/PartidosRankingTable";
import TopGastosBancadas, { type TopEquipoDiputado } from "@/components/partidos/TopGastosBancadas";
import ShareButton from "@/components/ShareButton";
import { readPublishedCohesion } from "@/lib/cohesion-bancadas";
import { readGeneratedDataQualitySummary } from "@/lib/data-quality-summary";
import ReleaseMetaCard from "@/components/data/ReleaseMetaCard";

export const metadata: Metadata = {
  title: "Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro",
  description:
    "Catálogo de bancadas y fichas parlamentarias. Las comparaciones de votos, gastos y personal de apoyo están en revisión; consulta el alcance publicado.",
  alternates: { canonical: "/partidos" },
  openGraph: {
    title: "Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro",
    description: "Catálogo de bancadas y fichas individuales. Agregados de votos y rendiciones en revisión.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro",
    description: "Catálogo de bancadas y fichas individuales. Agregados de votos y rendiciones en revisión.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default async function PartidosListPage() {
  const partidos = await getAllPartidosSummary();
  const cohesion = readPublishedCohesion();
  const dataSummary = readGeneratedDataQualitySummary();
  const camaraRelease = dataSummary.sources.find((source) => source.id === "camara");
  const senadoRelease = dataSummary.sources.find((source) => source.id === "senado");
  const partyRelease = {
    source: "Cámara de Diputadas y Diputados + Senado",
    period: [camaraRelease?.period, senadoRelease?.period].filter(Boolean).join(" · ") || "Corte publicado",
    lastSuccessAt: dataSummary.generatedAt,
    status: camaraRelease?.status === "completo" && senadoRelease?.status === "completo" ? "completo" as const : "parcial" as const,
    published: camaraRelease?.metrics.published ?? dataSummary.metrics.published,
    queryable: camaraRelease?.metrics.queryable ?? dataSummary.metrics.queryable,
    related: camaraRelease?.metrics.related,
    checksumSha256: dataSummary.manifestChecksumSha256 ?? null,
    officialUrl: camaraRelease?.officialUrl ?? senadoRelease?.officialUrl,
  };

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

  const topEquiposDiputados: TopEquipoDiputado[] = [];

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
                Senado) y rendiciones publicadas. Voto emitido no equivale a asistencia a sala.
              </p>
            </div>

            <ShareButton
              title="Partidos Políticos y Bancadas 2026-2030 — El Cambiómetro"
              text="Revisa votos y rendiciones publicados por bancada, con sus períodos y limitaciones."
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
              <Link prefetch={false}
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
            {PARTY_AGGREGATES_REVIEWED && partidoMasGasto && (
              <Link prefetch={false}
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
                  <strong style={{ fontFamily: "monospace", color: "var(--warn)" }}>{formatCLP(partidoMasGasto.gastosTotal)}</strong> en los períodos publicados
                </div>
              </Link>
            )}

            {/* KPI 3: Mayor Promedio por Parlamentario */}
            {PARTY_AGGREGATES_REVIEWED && partidoMasGastoPromedio && (
              <Link prefetch={false}
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
            {PARTY_AGGREGATES_REVIEWED && partidoMasAsistencia && (
              <Link prefetch={false}
                href={`/partidos/${partidoMasAsistencia.slug}`}
                className="card-flat hover-row"
                style={{ padding: "1rem", textDecoration: "none", color: "inherit", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
                  Mayor proporción de voto emitido
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--ok)", marginTop: "0.2rem" }}>
                  {partidoMasAsistencia.sigla}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
                  <strong style={{ color: "var(--ok)" }}>{formatPct(partidoMasAsistencia.asistencia)}</strong> de apariciones con voto emitido
                </div>
              </Link>
            )}

            {/* KPI 5: Mayor Personal de Apoyo */}
            {(
              <Link prefetch={false}
                href="/politico?vista=personal"
                className="card-flat hover-row"
                style={{ padding: "1rem", textDecoration: "none", color: "inherit", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
                  Agregado mensual de personal de apoyo
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--accent)", marginTop: "0.2rem" }}>
                  En revisión
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
                  Los históricos no se suman como una mensualidad. Consulta las nóminas por autoridad y período.
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="container-main" style={{ marginTop: "1rem" }}>
        <ReleaseMetaCard
          title="Datos parlamentarios y de gastos"
          source={partyRelease.source}
          period={partyRelease.period}
          lastSuccessAt={partyRelease.lastSuccessAt}
          status={partyRelease.status}
          published={partyRelease.published}
          queryable={partyRelease.queryable}
          related={partyRelease.related}
          checksumSha256={partyRelease.checksumSha256}
          href="/partidos"
          officialUrl={partyRelease.officialUrl}
          note="El catálogo de bancadas permanece consultable. Sus agregados de votos, cohesión, gastos y apoyo están en revisión hasta acreditar entradas, períodos y afiliación temporal. Las fichas individuales conservan sus registros publicados. Sin registros no equivale a cero."
        />
      </div>

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="container-main" style={{ padding: "2.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        
        {/* Gráficos Comparativos y Top Gastos */}
        {PARTY_AGGREGATES_REVIEWED ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem", alignItems: "start" }}>
          
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
        </div> : <section className="card" style={{ padding: "1.5rem" }}><h2>Agregados por bancada: En revisión</h2><p>Se retiraron las comparaciones de votos, cohesión, gastos y apoyo hasta acreditar sus entradas y períodos. Consulta los registros en las fichas individuales; esto no elimina sus datos.</p></section>}

        {PARTY_AGGREGATES_REVIEWED && <section className="card" aria-labelledby="cohesion-title" style={{ padding: "1.5rem" }}>
          <h2 id="cohesion-title" style={{ fontSize: "1.25rem", margin: "0 0 0.35rem", color: "var(--text-primary)" }}>Bancadas más unidas</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "0 0 1rem" }}>Cuota promedio de la opción mayoritaria por votación, sobre votos efectivos. Ausencias y “No Vota” quedan fuera.</p>
          {cohesion.length > 0 ? <div style={{ display: "grid", gap: "0.65rem" }}>{cohesion.slice(0, 10).map((row) => <div key={`${row.sigla}-${row.camara}`} style={{ display: "grid", gridTemplateColumns: "110px 1fr 70px", gap: "0.75rem", alignItems: "center" }}><span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{row.sigla} <small style={{ color: "var(--text-muted)", fontWeight: 400 }}>{row.camara}</small></span><span role="img" aria-label={`${row.cohesion_pct}% de cohesión`} style={{ height: 8, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}><span aria-hidden="true" style={{ display: "block", width: `${row.cohesion_pct}%`, height: "100%", background: "var(--accent)", borderRadius: 999 }} /></span><strong style={{ color: "var(--accent)", textAlign: "right" }}>{row.cohesion_pct}%</strong></div>)}</div> : <p style={{ color: "var(--text-muted)" }}>La cohesión se publica al ejecutar el build estático.</p>}
        </section>}

        {/* ─── TABLA RANKING GENERAL DE PARTIDOS ────────────────────────────────────────── */}
        <div>
          <div style={{ marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
              {PARTY_AGGREGATES_REVIEWED ? "Ranking y comparativa de partidos políticos" : "Catálogo de bancadas"}
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              {PARTY_AGGREGATES_REVIEWED ? "Tabla interactiva con ordenamiento multicriterio y filtro dinámico por mes de rendición." : "Integrantes del catálogo publicado y enlaces a sus fichas. Los agregados no acreditados están en revisión."}
            </p>
          </div>

          {PARTY_AGGREGATES_REVIEWED ? <Suspense fallback={<div style={{ minHeight: 200, display: "grid", placeContent: "center", color: "var(--text-3)" }}>Cargando tabla de partidos...</div>}>
            <PartidosRankingTable partidos={partidos} />
          </Suspense> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>{partidos.map((partido) => <Link key={partido.id} prefetch={false} href={`/partidos/${partido.slug}`} className="card" style={{ padding: "1rem", color: "var(--text-1)" }}><strong>{partido.sigla}</strong><p>{partido.diputados} diputados · {partido.senadores} senadores en el catálogo</p><span>Ver bancada y fichas →</span></Link>)}</div>}
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
              <strong>Voto emitido</strong>: Se calcula como el porcentaje de votos emitidos (Afirmativo, En Contra o
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
              <strong>Personal de Apoyo</strong>: El agregado por bancada está en revisión: no se deben sumar varios meses como una asignación mensual ni identificar una oficina por coincidencias parciales de nombre. Las fichas individuales conservan las nóminas publicadas.
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
