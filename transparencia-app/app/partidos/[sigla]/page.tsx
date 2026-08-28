import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PARTIDOS_SEED, SCORES_SEED } from "@/lib/seed-politicos";
import {
  escañosDelPartido,
  gastosDelPartido,
  resumenVotosPartido,
  votacionesDelPartido,
  asistenciaPorSesion,
  disciplinaDelPartido,
  politicosDelPartido,
  personalApoyoDelPartido,
  normalizePartidoId,
} from "@/lib/partido-estadisticas";
import { getRadiografiaElectoral } from "@/lib/partido-electoral-data";
import { getPartidoTransparencia, evaluarFrescuraDirectiva } from "@/lib/partidos-transparencia";
import { formatCLP, formatPct, comparePorApellido } from "@/lib/format";
import ShareButton from "@/components/ShareButton";
import PartidoDashboardClient from "@/components/partidos/PartidoDashboardClient";
import Breadcrumbs from "@/components/Breadcrumbs";

interface Props {
  params: Promise<{ sigla: string }>;
}

export function generateStaticParams() {
  return PARTIDOS_SEED.map((partido) => ({ sigla: partido.sigla.toLowerCase() }));
}

function findPartido(siglaParam: string) {
  const norm = normalizePartidoId(siglaParam);
  return (
    PARTIDOS_SEED.find(
      (p) =>
        p.id.toLowerCase() === norm ||
        p.sigla.toLowerCase() === siglaParam.toLowerCase() ||
        (p.id === "ind" && (norm === "ind" || siglaParam.toLowerCase() === "independientes"))
    ) ?? null
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sigla } = await params;
  const partido = findPartido(sigla);
  if (!partido) return { title: "Partido no encontrado" };

  const esInd = partido.id === "ind";
  const nombre = esInd ? "Independientes / Sin partido" : partido.nombre;
  const ogImage = `https://cambiometro.impulsacv.cl/api/og/site`;

  return {
    title: `Bancada ${partido.sigla} (${nombre}) — El Cambiómetro`,
    description: `Ficha de fiscalización de la bancada ${partido.sigla}: escaños, votaciones en sala, asistencia, gastos operacionales y personal de apoyo compilados por El Cambiómetro.`,
    alternates: {
      canonical: `/partidos/${partido.sigla.toLowerCase()}`,
    },
    openGraph: {
      title: `Bancada ${partido.sigla}: Votaciones y Gastos`,
      description: `Revisa la evidencia oficial de ${partido.sigla} en El Cambiómetro.`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `Bancada ${partido.sigla} (${nombre}) — El Cambiómetro`,
      description: `Escaños, votaciones en sala, asistencia y gastos operacionales de ${partido.sigla}.`,
      images: [ogImage],
    },
  };
}

export default async function PartidoPage({ params }: Props) {
  const { sigla } = await params;
  const partido = findPartido(sigla);

  if (!partido) notFound();

  const esIndependiente = partido.id.toLowerCase() === "ind";
  const politicosPartido = politicosDelPartido(partido.id).sort((a, b) =>
    comparePorApellido(a.nombre_completo, b.nombre_completo)
  );

  const scoresPartido = SCORES_SEED.filter((s) =>
    politicosPartido.some((p) => p.id === s.politico_id)
  );

  const escaños = escañosDelPartido(partido.id);
  const votosCamara = await resumenVotosPartido(partido.id, "votaciones_camara");
  const votosSenado = await resumenVotosPartido(partido.id, "votaciones_senado");
  const gastos = await gastosDelPartido(partido.id);
  const personalApoyo = await personalApoyoDelPartido(partido.id);
  const serieAsistencia = await asistenciaPorSesion(partido.id);
  const disciplina = await disciplinaDelPartido(partido.id);
  const radiografia = getRadiografiaElectoral(partido.id);
  const votacionesTodas = await votacionesDelPartido(partido.id, 100);

  const totalEmitidos = (votosCamara.emitidos || 0) + (votosSenado.emitidos || 0);
  const totalApariciones = (votosCamara.apariciones || 0) + (votosSenado.apariciones || 0);
  const asistenciaCombinada =
    totalApariciones > 0
      ? Math.round((totalEmitidos / totalApariciones) * 1000) / 10
      : votosCamara.asistencia || 0;

  const pctSi =
    totalEmitidos > 0
      ? Math.round(((votosCamara.afirmativo + votosSenado.afirmativo) / totalEmitidos) * 1000) / 10
      : votosCamara.pctSi || 0;

  const pctNo =
    totalEmitidos > 0
      ? Math.round(((votosCamara.enContra + votosSenado.enContra) / totalEmitidos) * 1000) / 10
      : votosCamara.pctNo || 0;

  // Consistencia de cálculo de gastos: promedio dividiendo por los parlamentarios con gastos publicados
  const polsConGasto = gastos.porPolitico.filter((p) => p.total > 0).length;
  const promedioGasto = polsConGasto > 0 ? Math.round(gastos.total / polsConGasto) : 0;
  const pctCongreso = Math.round((escaños.total / 205) * 1000) / 10;

  const transparencia = getPartidoTransparencia(partido.id);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Hero Header */}
      <section
        className="page-masthead"
        style={{
          background: "var(--surface)",
          padding: "3rem 0 2rem",
          borderBottom: "1px solid var(--border)",
          color: "var(--text-1)",
        }}
      >
        <div className="container-main" id="partido-capture-zone">
          <Breadcrumbs
            items={[
              { label: "Partidos Políticos", href: "/partidos" },
              { label: esIndependiente ? "Independientes" : partido.sigla },
            ]}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
              {/* Emblema / Logo Oficial */}
              {partido.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={partido.logo_url}
                  alt={partido.sigla}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    border: `2px solid ${partido.color_hex}`,
                    boxShadow: "var(--shadow-glow)",
                    background: "var(--surface-2)",
                    objectFit: "contain",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    border: `2px solid ${partido.color_hex}`,
                    boxShadow: "var(--shadow-glow)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    fontWeight: 900,
                    color: partido.color_hex,
                    background: "var(--surface-2)",
                    flexShrink: 0,
                  }}
                >
                  {partido.sigla}
                </span>
              )}

              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {esIndependiente ? "Categoría Especial de Representación" : "Partido Político"} · {radiografia.coalicion}
                </span>
                <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.2rem 0", color: "var(--text-1)", fontWeight: 900 }}>
                  {esIndependiente ? "Independientes / Sin Partido" : partido.nombre} ({partido.sigla})
                </h1>
                <p style={{ color: "var(--text-2)", fontSize: "0.9rem", margin: 0 }}>
                  {politicosPartido.length} parlamentarios monitoreados · {escaños.diputados} diputados y {escaños.senadores} senadores ({formatPct(pctCongreso, 1)} del Congreso) · Pacto <em>{radiografia.pacto}</em>
                </p>
              </div>
            </div>

            {/* Botón de Compartir Ficha Partido */}
            <ShareButton
              title={`Bancada ${partido.sigla} (${esIndependiente ? "Independientes" : partido.nombre})`}
              text={`Revisa cómo vota la bancada ${partido.sigla}, su asistencia (${formatPct(asistenciaCombinada)}) y gastos en El Cambiómetro.`}
              captureTargetId="partido-capture-zone"
              variant="primary"
            />
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {[
              {
                label: "Votos emitidos en sala",
                value: totalEmitidos > 0 ? totalEmitidos.toLocaleString("es-CL") : "Sin datos",
                color: "var(--accent)",
              },
              {
                label: "Sí / No emitidos",
                value: `${formatPct(pctSi)} / ${formatPct(pctNo)}`,
                color: "var(--ok)",
              },
              {
                label: "Asistencia a votaciones",
                value: totalApariciones > 0 ? formatPct(asistenciaCombinada) : "Sin datos",
                color: "var(--ok)",
              },
              {
                label: "Gastos bancada (publicados)",
                value: gastos.total > 0 ? formatCLP(gastos.total) : "$0 · Pendiente",
                color: gastos.total > 0 ? "var(--warn)" : "var(--text-3)",
              },
              {
                label: `Promedio / miembro (${polsConGasto}/${escaños.total})`,
                value: promedioGasto > 0 ? formatCLP(promedioGasto) : "—",
                color: "var(--text-1)",
              },
              {
                label: "Personal de Apoyo (Asignación Mensual Vigente)",
                value: personalApoyo.totalMensual > 0 ? formatCLP(personalApoyo.totalMensual) : "—",
                color: "var(--money)",
              },
            ].map((st) => (
              <div
                key={st.label}
                className="card-flat"
                style={{
                  textAlign: "center",
                  padding: "1rem",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: st.color,
                  }}
                >
                  {st.value}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-2)", marginTop: "0.2rem" }}>
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-main" style={{ padding: "2.5rem 1.5rem" }}>
        {/* Ficha Institucional y Transparencia Ley 19.862 / SERVEL / InfoProbidad */}
        {!esIndependiente && (
          <section
            className="card-flat"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "1rem",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.1rem" }}>🏛️</span>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-1)" }}>
                  Transparencia Institucional, Directiva y Financiamiento Público
                </h2>
              </div>
              <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                SERVEL · CGR · Ley 19.862
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              {/* 1. Directiva y Declaración de Patrimonio */}
              <div>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: "0.5rem" }}>
                  Directiva Nacional Registrada
                </h3>
                {transparencia ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem" }}>
                    <div>
                      <span style={{ color: "var(--text-2)" }}>Presidencia: </span>
                      <strong style={{ color: "var(--text-1)" }}>{transparencia.directiva.presidente}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-2)" }}>Secretaría General: </span>
                      <strong style={{ color: "var(--text-1)" }}>{transparencia.directiva.secretario_general}</strong>
                    </div>
                    {transparencia.directiva.tesorero && (
                      <div>
                        <span style={{ color: "var(--text-2)" }}>Tesorería: </span>
                        <strong style={{ color: "var(--text-1)" }}>{transparencia.directiva.tesorero}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
                      Asunción: {transparencia.directiva.fecha_asuncion_directiva} · Última verificación: {transparencia.directiva.fecha_ultima_verificacion}
                    </div>
                    {evaluarFrescuraDirectiva(transparencia.directiva).avisoFrescura && (
                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: "var(--text-2)",
                          marginTop: "0.35rem",
                          padding: "0.4rem 0.6rem",
                          background: "var(--surface-3)",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          lineHeight: 1.4,
                        }}
                      >
                        ⏱️ {evaluarFrescuraDirectiva(transparencia.directiva).avisoFrescura}
                      </div>
                    )}
                    <div style={{ marginTop: "0.5rem" }}>
                      <a
                        href={transparencia.directiva.declaracion_patrimonio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderColor: "var(--border)", color: "var(--accent)" }}
                      >
                        📋 Ver Declaración de Patrimonio e Intereses (InfoProbidad) ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
                    Directiva en proceso de actualización ante el SERVEL.
                  </div>
                )}
              </div>

              {/* 2. Financiamiento Público SERVEL */}
              <div>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: "0.5rem" }}>
                  Financiamiento Público (FCM / Aportes Trimestrales)
                </h3>
                {transparencia ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem" }}>
                    <div>
                      <span style={{ color: "var(--text-2)" }}>Régimen: </span>
                      <strong style={{ color: "var(--text-1)" }}>{transparencia.financiamiento_publico.norma_legal}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-2)" }}>Resolución: </span>
                      <span style={{ color: "var(--text-1)", fontSize: "0.85rem" }}>
                        {transparencia.financiamiento_publico.resolucion_servel}
                      </span>
                    </div>
                    {transparencia.financiamiento_publico.monto_anual_referencia_clp && (
                      <div>
                        <span style={{ color: "var(--text-2)" }}>Monto anual asignado: </span>
                        <strong style={{ color: "var(--money)" }}>
                          {formatCLP(transparencia.financiamiento_publico.monto_anual_referencia_clp)}
                        </strong>
                      </div>
                    )}
                    <div style={{ marginTop: "0.5rem" }}>
                      <a
                        href={transparencia.financiamiento_publico.fuente_resolucion_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderColor: "var(--border)", color: "var(--accent)" }}
                      >
                        🏛️ Portal Aportes Trimestrales SERVEL ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
                    Sin asignación declarada en la última resolución pública.
                  </div>
                )}
              </div>

              {/* 3. Padrón de Afiliados Activos */}
              <div>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: "0.5rem" }}>
                  Padrón de Militantes Activos (SERVEL)
                </h3>
                {transparencia ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem" }}>
                    <div>
                      <span style={{ color: "var(--text-2)" }}>Afiliados registrados: </span>
                      <strong style={{ color: "var(--text-1)", fontSize: "1.1rem" }}>
                        {transparencia.padron_afiliados.total_afiliados.toLocaleString("es-CL")}
                      </strong>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-3)", lineHeight: 1.4 }}>
                      {transparencia.padron_afiliados.nota_metodologica}
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <a
                        href={transparencia.padron_afiliados.fuente_padron_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderColor: "var(--border)", color: "var(--accent)" }}
                      >
                        📊 Estadísticas Oficiales SERVEL ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
                    Padrón en consolidación ante el Servicio Electoral.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Dashboard Cliente Interactivo */}
        <Suspense fallback={null}>
          <PartidoDashboardClient
            partido={partido}
            esIndependiente={esIndependiente}
            votosCamara={votosCamara}
            votosSenado={votosSenado}
            votacionesTodas={votacionesTodas}
            serieAsistencia={serieAsistencia}
            disciplina={disciplina}
            radiografia={radiografia}
            gastos={gastos}
            politicos={politicosPartido}
            scores={scoresPartido}
          />
        </Suspense>

        <p style={{ fontSize: "0.7rem", color: "var(--text-3)", marginTop: "2.5rem", lineHeight: 1.6 }}>
          Votos: registros oficiales de votación de sala (opendata.congreso.cl). Asistencia = votos emitidos (Sí + No +
          Abstención) sobre apariciones; No Vota y Dispensado no cuentan. Gastos: rendiciones oficiales acumuladas de
          transparencia.camara.cl y web-back.senado.cl; los meses aún no publicados por la fuente figuran en $0 como pendientes.
        </p>
      </div>
    </div>
  );
}
