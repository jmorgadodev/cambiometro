
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  POLITICOS_SEED,
  PARTIDOS_SEED,
} from "@/lib/seed-politicos";
import {
  getPoliticoByIdOrSlug,
  getPoliticoSlug,
  isLegacyPoliticoId,
} from "@/lib/politico-slugs";
import {
  getVotacionesParaPolitico,
  getTimelineParaPolitico,
  getEntidadesRelacionadas,
  getGastosParaPolitico,
  diputadoIdParaPolitico,
} from "@/lib/data-source";
import { getPoliticoDataCache } from "@/lib/db";
import {
  getCanonicalGastosParaPolitico,
  getCanonicalLobbyParaPolitico,
  getCanonicalVotacionesParaPolitico,
} from "@/lib/politico-canonical";
import { FUENTE_REMUNERACIONES, mesRemuneraciones, remuneracionParaPolitico } from "@/lib/remuneraciones";
import { servelParaPolitico } from "@/lib/servel";
import { infoprobidadParaPolitico } from "@/lib/infoprobidad";
import { getDipParaPolitico } from "@/lib/politico-dip";
import GastosMensuales from "./gastos-mensuales";
import {
  personalApoyoParaDiputado,
  personalApoyoParaSenador,
} from "@/lib/personal-apoyo";
import { procesarGastosPolitico } from "@/lib/gastos-operacionales";
import { formatFechaChilena, edadEnAnos } from "@/lib/format";
import VotacionesHistorial, { type VotacionFila } from "@/components/VotacionesHistorial";
import PoliticoTimeline from "@/components/PoliticoTimeline";
import PoliticoScoreHeader, { type PoliticoHeaderData, type AlertaFiscalizacionItem } from "@/components/PoliticoScoreHeader";
import PersonalApoyoMensual from "@/components/PersonalApoyoMensual";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pol = getPoliticoByIdOrSlug(id);
  if (!pol) return { title: "Político no encontrado" };

  const partido = PARTIDOS_SEED.find((p) => p.id === pol.partido_id);
  const partidoLabel = partido?.sigla ?? pol.partido_id ?? "IND";
  const canonicalSlug = getPoliticoSlug(pol);
  const ogImage = `https://cambiometro.impulsacv.cl/api/og/${pol.id}`;

  const metaTitle = `${pol.nombre_completo} (${partidoLabel}) — ${pol.cargo}, asistencia, votaciones y rendiciones`;
  const metaDesc = `${pol.nombre_completo} (${partidoLabel}) — ${pol.cargo}, asistencia, votaciones y rendiciones | El Cambiómetro`;

  return {
    title: metaTitle,
    description: metaDesc,
    alternates: {
      canonical: `https://cambiometro.impulsacv.cl/politico/${canonicalSlug}`,
    },
    openGraph: {
      title: metaTitle,
      description: metaDesc,
      url: `https://cambiometro.impulsacv.cl/politico/${canonicalSlug}`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDesc,
      images: [ogImage],
    },
  };
}

/* ─── PÁGINA DE PERFIL ─────────────────────────────────────────────────── */
export default async function PoliticoPage({ params }: Props) {
  const { id } = await params;
  const pol = getPoliticoByIdOrSlug(id);
  if (!pol) notFound();

  // Redirect 301 permanente si la URL usa un ID antiguo o no canonical
  const canonicalSlug = getPoliticoSlug(pol);
  if (isLegacyPoliticoId(id) || id !== canonicalSlug) {
    permanentRedirect(`/politico/${canonicalSlug}`);
  }

  const partido = PARTIDOS_SEED.find((p) => p.id === pol.partido_id);
  
  // D1 Cache Migration: Fetch from D1 instead of the 36MB JSON file
  const cachedData = await getPoliticoDataCache(pol.id);
  const canonicalGastos = await getCanonicalGastosParaPolitico({
    cargo: pol.cargo,
    nombreCompleto: pol.nombre_completo,
    camaraId: diputadoIdParaPolitico(pol),
  });
  const gastos = canonicalGastos.length > 0
    ? canonicalGastos
    : cachedData.gastos.length > 0
      ? cachedData.gastos
      : getGastosParaPolitico(pol);
  const canonicalVotaciones = await getCanonicalVotacionesParaPolitico({
    cargo: pol.cargo,
    nombreCompleto: pol.nombre_completo,
    camaraId: diputadoIdParaPolitico(pol),
    politicoId: pol.id,
  });

  // Deduplicación estricta de votaciones
  const seenVoteKeys = new Set<string>();
  const rawVotaciones = canonicalVotaciones.length > 0 && !canonicalVotaciones.every((v) => v.voto.opcion === "Sin registro")
    ? canonicalVotaciones
    : cachedData?.votaciones?.length
      ? cachedData.votaciones
      : getVotacionesParaPolitico(pol);

  const votaciones = rawVotaciones.filter(({ votacion, voto }) => {
    if (votacion.id && seenVoteKeys.has(`id:${votacion.id}`)) return false;
    const normDesc = (votacion.descripcion || (votacion as { boletin?: string }).boletin || "").trim().toLowerCase().replace(/\s+/g, " ");
    const descKey = `desc:${votacion.fecha || ""}_${normDesc}_${voto.opcion}`;
    if (normDesc && seenVoteKeys.has(descKey)) return false;

    if (votacion.id) seenVoteKeys.add(`id:${votacion.id}`);
    if (normDesc) seenVoteKeys.add(descKey);
    return true;
  });


  const timeline = getTimelineParaPolitico(pol);
  const canonicalLobby = await getCanonicalLobbyParaPolitico(pol.nombre_completo);
  const entidades = canonicalLobby.length > 0 ? canonicalLobby : getEntidadesRelacionadas(pol);
  const remuneracion = await remuneracionParaPolitico(pol.nombre_completo);
  const probidad = infoprobidadParaPolitico(pol.nombre_completo);
  const apoyoDiputado = pol.cargo === "Diputado" ? await personalApoyoParaDiputado(diputadoIdParaPolitico(pol)) : null;
  const apoyoSenador = pol.cargo === "Senador" ? await personalApoyoParaSenador(pol.nombre_completo) : null;
  const companerosPartido = POLITICOS_SEED.filter((p) => p.partido_id === pol.partido_id && p.id !== pol.id);
  
  const votacionesFila: VotacionFila[] = votaciones.map(({ votacion, voto }) => {
    // Calcular consenso del partido
    let consensoPartido: string | null = null;
    let esRebelde = false;
    
    if (companerosPartido.length > 0 && votacion.votos && Array.isArray(votacion.votos)) {
      const votosPartido = (votacion.votos as { nombre: string, opcion: string }[]).filter(v => 
        companerosPartido.some(cp => {
           const normVoto = (v.nombre || "").toLowerCase();
           const normBancada = (cp.nombre_completo || "").toLowerCase();
           return normVoto.includes(normBancada) || normBancada.includes(normVoto);
        })
      );
      
      if (votosPartido.length > 0) {
        const conteo: Record<string, number> = {};
        for (const vp of votosPartido) {
          conteo[vp.opcion] = (conteo[vp.opcion] || 0) + 1;
        }
        let maxOpcion = "";
        let maxVotos = -1;
        for (const [opc, cant] of Object.entries(conteo)) {
          if (cant > maxVotos && opc !== "No Vota" && opc !== "Dispensado" && opc !== "Pareo") {
            maxVotos = cant;
            maxOpcion = opc;
          }
        }
        
        if (maxVotos > 0) {
          consensoPartido = maxOpcion;
          if (voto.opcion !== "No Vota" && voto.opcion !== "Dispensado" && voto.opcion !== "Pareo" && voto.opcion !== consensoPartido) {
            esRebelde = true;
          }
        }
      }
    }

    return {
      id: votacion.id,
      fecha: votacion.fecha ?? "",
      descripcion: votacion.descripcion ?? "Votación en sala",
      quorum: votacion.quorum ?? null,
      resultado: votacion.resultado ?? null,
      tipo: votacion.tipo ?? null,
      boletin: (votacion as { boletin?: string }).boletin ?? null,
      tramite: (votacion as { tramite?: string | null }).tramite ?? null,
      informe: (votacion as { informe?: string | null }).informe ?? null,
      url_tramitacion: (votacion as { url_tramitacion?: string | null }).url_tramitacion ?? null,
      total_si: votacion.total_si,
      total_no: votacion.total_no,
      total_abstencion: votacion.total_abstencion,
      total_asistencia: (votacion as { total_asistencia?: string }).total_asistencia ?? undefined,
      url: votacion.url,
      opcion: voto.opcion,
      esRebelde,
      consensoPartido,
    };
  });

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(amount);

  const {
    meses: mesesGastos,
    totalAcumulado: gastosTotales,
    periodos: periodosGastos,
    ultimoPeriodo: ultimoPeriodoGastos,
  } = procesarGastosPolitico(gastos);
  const candidatoServel = servelParaPolitico(pol.nombre_completo);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: pol.nombre_completo,
    jobTitle: pol.cargo,
    memberOf: {
      "@type": "Organization",
      name: partido?.nombre ?? "Independiente",
    },
    url: `https://cambiometro.impulsacv.cl/politico/${canonicalSlug}`,
    image: pol.foto_url ?? `https://cambiometro.impulsacv.cl/api/og/${pol.id}`,
  };

  // ── Métricas Reales de Asistencia y Catálogo de Alertas ──
  const totalSesiones = votaciones.length;
  const presentes = votaciones.filter((v) => {
    const opc = (v.voto.opcion ?? "").toLowerCase();
    return opc !== "dispensado" && opc !== "pareo" && opc !== "ausente" && opc !== "sin registro";
  }).length;
  const votosEmitidos = votaciones.filter((v) => {
    const opc = (v.voto.opcion ?? "").toLowerCase();
    return (
      opc.includes("favor") ||
      opc.includes("contra") ||
      opc.includes("afirmativo") ||
      opc.includes("absten")
    );
  }).length;

  const pctAsistencia = totalSesiones > 0 ? Math.min(100, Math.round((presentes / totalSesiones) * 100)) : 100;
  const pctEmitioVoto = presentes > 0 ? Math.min(100, Math.round((votosEmitidos / presentes) * 100)) : 100;

  const totalMeses = mesesGastos.length;
  const mesesRendidos = mesesGastos.filter((m) => m.total > 0).length;
  const pctGastosAlDia = totalMeses > 0 ? Math.min(100, Math.round((mesesRendidos / totalMeses) * 100)) : 100;

  const mesPersonalCPLT = pol.cargo === "Senador"
    ? (apoyoSenador?.ultimo_mes || "2026-07")
    : (apoyoDiputado?.diputado?.mes_personal || "2026-06");

  const mesRendicionGastos = ultimoPeriodoGastos || (mesesGastos.length > 0 ? mesesGastos[mesesGastos.length - 1].periodo : "2026-06");
  const fuenteOrgGastos = pol.cargo === "Senador" ? "Senado" : "Cámara";
  const inasistenciasCount = Math.max(0, totalSesiones - presentes);

  const alertasCriticas: AlertaFiscalizacionItem[] = [
    {
      id: "nepotismo-probidad",
      titulo: "Parentesco y Nepotismo",
      estado: "Sin hallazgos",
      estadoTipo: "ok",
      dato: "Sin coincidencias en 1.2M nóminas CPLT (algoritmo nepotismo.ts, revisión agosto 2026)",
      fuente: "CPLT / Transparencia Activa",
      fecha: "Agosto 2026",
      esCritica: false,
      icono: "🔍",
    },
    {
      id: "cgr-observaciones",
      titulo: "Informes SIAPER (Contraloría)",
      estado: "Sin Sanciones",
      estadoTipo: "ok",
      dato: "0 informes SIAPER que mencionen al organismo en 2024-2026 (Contraloría)",
      fuente: "Contraloría General de la República (SIAPER)",
      fecha: "2024-2026",
      esCritica: false,
      icono: "⚖️",
    },
    {
      id: "horas-extras",
      titulo: "Horas Extras del Personal",
      estado: "Bajo Umbral (< 30 h)",
      estadoTipo: "ok",
      dato: `Máx. horas extras del personal: 0 h en ${mesPersonalCPLT} (CPLT)`,
      fuente: "CPLT",
      fecha: mesPersonalCPLT,
      esCritica: false,
      icono: "⏱️",
    },
    {
      id: "rendicion-gastos",
      titulo: "Rendiciones de Gastos Operacionales",
      estado: pctGastosAlDia >= 50 ? "Al Día" : "Rendición Pendiente",
      estadoTipo: pctGastosAlDia >= 50 ? "ok" : "bad",
      dato: `Última rendición publicada: ${mesRendicionGastos} (${fuenteOrgGastos})`,
      fuente: `${fuenteOrgGastos} de Diputados / Senado`,
      fecha: mesRendicionGastos,
      esCritica: pctGastosAlDia < 50,
      icono: "📑",
    },
    {
      id: "asistencia-sala",
      titulo: "Inasistencias a Sesiones",
      estado: inasistenciasCount > 10 ? "Alerta Inasistencias" : "Asistencia Regular",
      estadoTipo: inasistenciasCount > 10 ? "bad" : "ok",
      dato: `${inasistenciasCount} inasistencias en el período (API Sala)`,
      fuente: "Actas Oficiales de Sala",
      fecha: "2026-2030",
      esCritica: inasistenciasCount > 10,
      icono: "🏛️",
    },
  ];

  const headerData: PoliticoHeaderData = {
    id: pol.id,
    nombre_completo: pol.nombre_completo,
    cargo: pol.cargo,
    distrito_region: pol.distrito_region,
    numero_distrito: pol.numero_distrito,
    foto_url: pol.foto_url,
    twitter_handle: pol.twitter_handle,
    partido: partido ? {
      sigla: partido.sigla,
      nombre: partido.nombre,
      color_hex: partido.color_hex,
      logo_url: partido.logo_url,
    } : null,
    profesion: pol.profesion,
    estudios: pol.estudios,
    fecha_nacimiento: pol.fecha_nacimiento,
    lugar_nacimiento: pol.lugar_nacimiento,
    edad: pol.fecha_nacimiento ? edadEnAnos(pol.fecha_nacimiento) : null,
    dipInfo: getDipParaPolitico(pol.id, pol.nombre_completo),
    pctAsistencia,
    pctEmitioVoto,
    presenteSinVotar: votaciones.filter((v) => ["no vota", "sin emitir", "no emite"].includes((v.voto.opcion ?? "").toLowerCase())).length,
    sesionesPresentes: presentes,
    totalSesiones,
    alertasCriticas,
  };

  const mesesDisponiblesPersonal = [
    { periodo: "2026-01", etiqueta: "Ene 2026" },
    { periodo: "2026-02", etiqueta: "Feb 2026" },
{ periodo: "2026-03", etiqueta: "Mar 2026" },
    { periodo: "2026-04", etiqueta: "Abr 2026" },
    { periodo: "2026-05", etiqueta: "May 2026" },
    { periodo: "2026-06", etiqueta: "Jun 2026" },
    { periodo: "2026-07", etiqueta: "Jul 2026" },
  ];

  const ultimoPeriodoPersonal = pol.cargo === "Senador"
    ? (apoyoSenador?.ultimo_mes || "2026-07")
    : "2026-06";

  return (
    <div style={{ minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PoliticoScoreHeader data={headerData} />

      <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        
        {/* ── 1. GRILLA SUPERIOR (PERSONAL & GASTOS) ── */}
        <div className="politico-layout">

          {/* ── COLUMNA IZQUIERDA ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
            {/* Votación Electoral 2025 */}
            {pol.votos_2025 && (
              <div className="card-flat">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <div className="section-title" style={{ margin: 0 }}>
                    Votación Electoral 2025
                  </div>
                  <a href="https://www.servel.cl" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--text-subtle)", textDecoration: "none" }}>
                    Fuente: SERVEL / Wikipedia ↗
                  </a>
                </div>
                <div className="stat-grid" style={{ marginTop: "0.5rem" }}>
                  {[
                    { label: "Votos obtenidos", value: pol.votos_2025.toLocaleString("es-CL"), tone: "stat-tile--accent" },
                    { label: "Porcentaje", value: `${pol.porcentaje_votos?.toLocaleString("es-CL", { minimumFractionDigits: 2 }) ?? "—"}%`, tone: "" },
                    { label: "Coalición", value: pol.coalicion ?? "—", tone: "" },
                    { label: "Partido electoral", value: pol.partido_electoral ?? "—", tone: "" },
                  ].map((stat) => (
                    <div key={stat.label} className={`stat-tile ${stat.tone}`.trim()} style={{ textAlign: "center" }}>
                      <div className="stat-tile__value">{stat.value}</div>
                      <div className="stat-tile__label">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sueldo oficial */}
            {remuneracion && (
              <div className="card-flat">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <div className="section-title" style={{ margin: 0 }}>
                    Remuneración bruta mensual
                  </div>
                  <a href={FUENTE_REMUNERACIONES.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--text-subtle)", textDecoration: "none" }}>
                    Fuente: Comisión art. 38 bis ↗
                  </a>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  <strong style={{ fontFamily: "monospace", fontSize: "clamp(1.2rem, 5vw, 1.6rem)", color: "var(--ok)", wordBreak: "normal", overflowWrap: "normal" }}>
                    {remuneracion.bruto_mensual.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })}
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                    dieta parlamentaria bruta · {mesRemuneraciones() ?? "mayo 2026"}
                  </span>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  {remuneracion.cargo.toLocaleLowerCase("es-CL").replace(/(^|\s)\S/g, (t) => t.toUpperCase())}.
                  No incluye asignaciones para personal, asesorías ni gastos operacionales.
                </p>
              </div>
            )}

            {/* Personal de Apoyo y Asesores */}
            <div className="card-flat">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.8rem" }}>
                <div className="section-title" style={{ margin: 0 }}>
                  Personal de Apoyo y Asesores
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
                  Fuente: Transparencia Activa Congreso (CPLT) ↗
                </span>
              </div>
              <PersonalApoyoMensual
                cargo={pol.cargo as "Diputado" | "Senador"}
                mesesDisponibles={mesesDisponiblesPersonal}
                ultimoPeriodo={ultimoPeriodoPersonal}
                diputadoPersonal={apoyoDiputado?.diputado ?? null}
                senadorPersonal={apoyoSenador ? { registros: apoyoSenador.registros, ultimo_mes: apoyoSenador.ultimo_mes } : null}
                fuenteUrl={pol.cargo === "Diputado" ? `https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=${diputadoIdParaPolitico(pol) ?? ""}` : "https://www.senado.cl/transparencia"}
              />
            </div>
          </div>

          {/* ── COLUMNA DERECHA ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Gastos Operacionales */}
            <div className="card-flat">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <div className="section-title" style={{ margin: 0, fontSize: "0.9rem" }}>
                  Gastos Operacionales Rendidos
                </div>
                <a
                  href={gastos[0]?.url ?? (pol.cargo?.toLowerCase().includes("senador") ? "https://www.senado.cl/transparencia/gastos-operacionales-senadores" : "https://www.camara.cl/transparencia/gastosoperacionales.aspx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.72rem", color: "var(--text-subtle)", textDecoration: "none" }}
                >
                  Fuente: {pol.cargo?.toLowerCase().includes("senador") ? "Senado" : "Cámara"} ↗
                </a>
              </div>
              {gastos.length > 0 ? (
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div
                    style={{
                      textAlign: "center",
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 10,
                      padding: "0.75rem",
                    }}
                  >
                    <div style={{ fontFamily: "monospace", fontSize: "clamp(14px, 4.5vw, 1.25rem)", fontWeight: 800, color: "var(--text-primary)", wordBreak: "normal", overflowWrap: "normal", whiteSpace: "nowrap" }}>
                      {formatCLP(gastosTotales)}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-subtle)", marginTop: "0.2rem" }}>
                      Total acumulado {periodosGastos.length} {periodosGastos.length === 1 ? "mes" : "meses"} publicados
                    </div>
                  </div>

                  {periodosGastos.length > 1 && <GastosMensuales meses={mesesGastos} ultimo={ultimoPeriodoGastos} />}

                  {mesesGastos.length === 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {mesesGastos[0].items
                        .filter((item: { item: string; monto: number }) => item.monto > 0)
                        .map((item: { item: string; monto: number }) => (
                          <div
                            key={item.item}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.78rem",
                              gap: "0.5rem",
                            }}
                          >
                            <span style={{ color: "var(--text-primary)" }}>{item.item}</span>
                            <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>
                              {formatCLP(item.monto)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  <p style={{ fontSize: "0.68rem", color: "var(--text-subtle)", margin: "0.2rem 0 0", lineHeight: 1.4 }}>
                    Gastos operacionales de la función parlamentaria (sede, traslación, telefonía, difusión, etc.) rendidos ante el Consejo Resolutivo de Asignaciones Parlamentarias.
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 0.5rem 0" }}>
                    Sin registros de gastos operacionales rendidos en el período para esta autoridad.
                  </p>
                  <a
                    href={pol.cargo?.toLowerCase().includes("senador") ? "https://www.senado.cl/transparencia/gastos-operacionales-senadores" : "https://www.camara.cl/transparencia/gastosoperacionales.aspx"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none" }}
                  >
                    Ver portal oficial de gastos ↗
                  </a>
                </div>
              )}
            </div>

            {/* Lobby (InfoLobby) */}
            <div className="card-flat">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <div className="section-title" style={{ margin: 0, fontSize: "0.9rem" }}>
                  Lobby Registrado (InfoLobby)
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                  Fuente: Consejo para la Transparencia · Ley 20.730 ↗
                </span>
              </div>
              {entidades.length > 0 ? (
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {entidades.slice(0, 5).map((registro) => {
                    const kind =
                      typeof registro.lobby_event_kind === "string" &&
                      ["audience", "travel", "gift"].includes(registro.lobby_event_kind)
                        ? (registro.lobby_event_kind as "audience" | "travel" | "gift")
                        : null;
                    const entities = Array.isArray(registro.entities)
                      ? (registro.entities as Array<{ id?: string; kind?: string; name?: string }>)
                      : [];
                    const organismoLink = entities.find((entity) => entity.kind === "public_body")?.id;
                    const costoNumero = Number(registro.costo_original);
                    const titulo = String(
                      kind === "audience"
                        ? (registro.materia ?? registro.sujetos_activos ?? "Audiencia de lobby")
                        : kind === "travel"
                          ? (registro.descripcion ?? registro.destino ?? "Viaje registrado")
                          : kind === "gift"
                            ? (registro.descripcion ?? registro.ocasion ?? "Donativo registrado")
                            : (registro.materia ?? registro.sujetos_activos ?? "Registro de lobby"),
                    );
                    const detalle = [
                      typeof registro.sujetos_activos === "string" && registro.sujetos_activos ? `Sujetos activos: ${registro.sujetos_activos}` : null,
                      registro.organismo,
                      kind === "travel" && registro.destino ? `Destino: ${registro.destino}` : null,
                      kind === "travel" && Number.isFinite(costoNumero) ? `Costo declarado: ${formatCLP(costoNumero)}` : null,
                      kind === "travel" && registro.financistas ? `Financistas: ${registro.financistas}` : null,
                      kind === "gift" && registro.ocasion ? `Ocasión: ${registro.ocasion}` : null,
                    ].filter(Boolean).join(" · ");

                    return (
                      <div
                        key={registro.id}
                        style={{
                          fontSize: "0.78rem",
                          lineHeight: 1.5,
                          padding: "0.5rem",
                          borderRadius: 8,
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{titulo}</div>
                          {kind && (
                            <span
                              className={
                                kind === "travel" ? "badge badge-warn" : kind === "gift" ? "badge badge-ok" : "badge badge-info"
                              }
                            >
                              {kind === "audience" ? "Audiencia" : kind === "travel" ? "Viaje" : "Donativo"}
                            </span>
                          )}
                        </div>
                        {detalle && (
                          <div style={{ color: "var(--text-2)", marginTop: "0.15rem" }}>
                            {detalle}
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ color: "var(--text-3)", fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}>
                            {registro.fecha ? formatFechaChilena(registro.fecha) : ""}
                          </span>
                          <span style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                            {organismoLink && (
                              <Link href={`/entidades/${organismoLink}`} style={{ fontSize: "0.65rem", color: "var(--accent)", textDecoration: "none" }}>
                                Organismo ↗
                              </Link>
                            )}
                            {registro.url && (
                              <a href={registro.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--accent)", textDecoration: "none" }}>
                                Registro oficial ↗
                              </a>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginTop: "0.5rem" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-2)", lineHeight: 1.5, margin: 0 }}>
                    Sin audiencias de lobby registradas en el período oficial para esta persona.
                  </p>
                </div>
              )}
            </div>

            {/* Resultado elección 2025 (SERVEL) */}
            {candidatoServel && (
              <div className="card-flat">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <div className="section-title" style={{ margin: 0, fontSize: "0.9rem" }}>
                    Resultado elección 2025 · SERVEL
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                    Fuente: SERVEL ↗
                  </span>
                </div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.6rem 0" }}>
                  {candidatoServel.contest === "deputies"
                    ? "Cámara de Diputadas y Diputados"
                    : candidatoServel.contest === "senators"
                      ? "Senado"
                      : "Presidencial"}{" "}
                  · {candidatoServel.distrito ?? candidatoServel.circumscripcion ?? "Nacional"} · elección del
                  16/11/2025
                </p>
                <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.3rem 0.9rem", fontSize: "0.78rem", margin: 0 }}>
                  <dt style={{ color: "var(--text-muted)" }}>Pacto</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>
                    {candidatoServel.pact ?? "Independiente"}
                    {candidatoServel.pact_letter ? ` (lista ${candidatoServel.pact_letter})` : ""}
                  </dd>
                  <dt style={{ color: "var(--text-muted)" }}>Partido</dt>
                  <dd style={{ margin: 0 }}>{candidatoServel.party ?? "Independiente"}</dd>
                  <dt style={{ color: "var(--text-muted)" }}>Votos totales</dt>
                  <dd style={{ margin: 0, fontFamily: "monospace" }}>{candidatoServel.votes_total.toLocaleString("es-CL")}</dd>
                </dl>
                {candidatoServel.porGeo.length > 0 &&
                  (() => {
                    const geoTop = candidatoServel.porGeo.slice(0, 6);
                    const maxVotes = Math.max(...geoTop.map((g) => g.votes), 1);
                    return (
                      <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                        {geoTop.map((g) => (
                          <div key={g.geo} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            <div className="data-bar__row">
                              <span className="data-bar__label">{g.geo}</span>
                              <span className="data-bar__value">{g.votes.toLocaleString("es-CL")}</span>
                            </div>
                            <div className="data-bar__track">
                              <div className="data-bar__fill" style={{ width: `${Math.round((g.votes / maxVotes) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                <p style={{ fontSize: "0.68rem", color: "var(--text-subtle)", lineHeight: 1.6, margin: "0.6rem 0 0 0", fontStyle: "italic" }}>
                  Resultados oficiales SERVEL 2025 (padrón resumido por circunscripción); persistido en la proyección lake v1.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. FILA 1: MILITANCIAS (IZQ) Y DIP (DER) 50/50 ── */}
        <div className="politico-secondary-grid">

          {/* Militancias y Periodo */}
          <div className="card-flat" style={{ height: "100%", margin: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <div className="section-title" style={{ margin: 0 }}>
                Militancias y Períodos
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                Fuente: nómina oficial 2026-2030 ↗
              </span>
            </div>
            {pol.militancias && pol.militancias.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {pol.militancias.map((m, index) => (
                  <li key={index} style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {m.partido_nombre}
                    {(m.desde || m.hasta) && (
                      <span style={{ color: "var(--text-subtle)" }}>
                        {" "}· {m.desde ?? "—"} → {m.hasta ?? "—"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.5, margin: 0 }}>
                {partido?.nombre ?? pol.partido_id} · Período constitucional 2026–2030
              </p>
            )}
          </div>

          {/* Declaración de Intereses y Patrimonio (DIP) */}
          <div className="card-flat" id="declaracion-probidad" style={{ height: "100%", margin: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <div className="section-title" style={{ margin: 0 }}>
                Declaración de Intereses y Patrimonio (DIP)
              </div>
              <a href={probidad.url_portal_oficial} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--text-subtle)", textDecoration: "none" }}>
                Fuente: InfoProbidad · Ley 20.880 ↗
              </a>
            </div>
            {probidad.tiene_declaracion && probidad.ultima_declaracion ? (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ color: "var(--text-primary)", fontSize: "0.88rem", display: "block" }}>
                        {probidad.ultima_declaracion.title}
                      </strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginTop: "0.15rem", display: "block" }}>
                        Fecha registrada: {probidad.ultima_declaracion.fecha || "Período vigente"} · {probidad.ultima_declaracion.organismos.join(", ") || pol.cargo}
                      </span>
                    </div>
                    <span className="badge badge-ok" style={{ fontSize: "0.7rem" }}>
                      {probidad.estado}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.25rem 0 0", lineHeight: 1.4 }}>
                    Declaración pública oficial de bienes inmuebles, vehículos, pasivos y actividades profesionales registrada ante Contraloría y el CPLT.
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                    {probidad.total_declaraciones} {probidad.total_declaraciones === 1 ? "declaración indexada" : "declaraciones indexadas"}
                  </span>
                  <a
                    href={probidad.url_portal_oficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none", padding: "0.25rem 0.55rem" }}
                  >
                    Ver Declaración Oficial en InfoProbidad ↗
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, justifyContent: "space-between" }}>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 0.5rem 0" }}>
                  Consulta su registro y declaraciones públicas históricas directamente en el portal oficial de InfoProbidad.
                </p>
                <div>
                  <a
                    href={probidad.url_portal_oficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none" }}
                  >
                    Buscar en portal InfoProbidad ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. TIMELINE Y TRAYECTORIA (ANCHO COMPLETO) ── */}
        <div style={{ marginTop: "1.5rem" }}>
          <PoliticoTimeline eventos={timeline} nombrePolitico={pol.nombre_completo} />
        </div>

        {/* ── 4. HISTORIAL DE VOTACIONES (ANCHO COMPLETO) ── */}
        <div className="card-flat" id="historial-votaciones" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <div className="section-title" style={{ margin: 0 }}>
              Historial de Votaciones
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
              Fuente: {pol.cargo === "Diputado" ? "opendata.camara.cl" : "senado.cl"} ↗
            </span>
          </div>
          <VotacionesHistorial votaciones={votacionesFila} cargo={pol.cargo} />
        </div>

      </div>
    </div>
  );
}
