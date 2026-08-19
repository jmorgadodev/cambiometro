"use client";

import Image from "next/image";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import type { PoliticoDipInfo } from "@/lib/politico-dip";

export interface AlertaFiscalizacionItem {
  id: string;
  titulo: string;
  estado: string;
  estadoTipo: "ok" | "warn" | "bad";
  dato: string;
  fuente: string;
  fecha?: string;
  esCritica: boolean;
  icono: string;
}

export interface PoliticoHeaderData {
  id: string;
  nombre_completo: string;
  cargo: "Diputado" | "Senador";
  distrito_region: string;
  numero_distrito?: number;
  foto_url?: string;
  twitter_handle?: string;
  partido: {
    sigla: string;
    nombre: string;
    color_hex: string;
    logo_url?: string;
  } | null;
  profesion?: string;
  estudios?: string[];
  fecha_nacimiento?: string;
  lugar_nacimiento?: string;
  edad?: number | null;
  dipInfo?: PoliticoDipInfo;
  // Métricas reales
  pctAsistencia: number;
  pctEmitioVoto: number;
  presenteSinVotar: number;
  sesionesPresentes: number;
  totalSesiones: number;
  // Alertas
  alertasCriticas: AlertaFiscalizacionItem[];
}

export default function PoliticoScoreHeader({ data }: { data: PoliticoHeaderData }) {
  const partidoTxt = data.partido?.sigla ? ` (${data.partido.sigla})` : "";
  const regionTxt = data.distrito_region ? ` por ${data.distrito_region}` : "";
  const shareTitle = `${data.nombre_completo}${partidoTxt}`;
  const shareText = `${data.nombre_completo}${partidoTxt} · ${data.cargo}${regionTxt} — asistencia ${data.pctAsistencia}%, votaciones y rendiciones en El Cambiómetro`;

  const dip = data.dipInfo;
  const dipProfesion = dip?.profesion_oficio_display || "No declarado en DIP";
  const dipFormacion = dip?.formacion_titulos_display || "No declarado en DIP";
  const dipUrl = dip?.declaracion_url || `https://www.infoprobidad.cl/Resultados?busqueda=${encodeURIComponent(data.nombre_completo)}`;

  return (
    <>
      <section
        style={{
          background: "var(--surface)",
          padding: "2rem 0",
          borderBottom: "1px solid var(--border)",
          color: "var(--text-1)",
        }}
      >
        <div className="container-main" id="politico-capture-zone">
          <div className="politico-header-flex">
            {/* Avatar grande con foto oficial o fallback */}
            <div className="politico-header-top">
              {data.foto_url ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.3rem",
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={data.foto_url}
                    alt={data.nombre_completo}
                    width={96}
                    height={96}
                    style={{
                      borderRadius: "50%",
                      border: "3px solid var(--border)",
                      objectFit: "cover",
                    }}
                  />
                  <span style={{ fontSize: "0.6rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    Foto oficial
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    border: "3px solid var(--border)",
                    background: "var(--surface-2)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {data.partido?.logo_url ? (
                    <Image
                      src={data.partido.logo_url}
                      alt={data.partido.sigla}
                      width={56}
                      height={56}
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-1)" }}>
                      {data.partido?.sigla ?? "IND"}
                    </span>
                  )}
                </div>
              )}

              {/* Botón de Compartir móvil < 480px */}
              <div className="politico-header-actions-mobile">
                <ShareButton
                  title={shareTitle}
                  text={shareText}
                  variant="primary"
                />
              </div>
            </div>

            {/* Información principal */}
            <div className="politico-header-main">
              <div className="politico-header-heading-row">
                <div className="politico-header-name-wrap">
                  <h1 className="politico-header-title">
                    {data.nombre_completo}
                  </h1>
                  {data.twitter_handle && (
                    <a
                      href={`https://x.com/${data.twitter_handle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none" }}
                    >
                      {data.twitter_handle}
                    </a>
                  )}
                </div>

                {/* Botón de Compartir compacto alineado a la derecha en desktop/tablet */}
                <div className="politico-header-actions-desktop">
                  <ShareButton
                    title={shareTitle}
                    text={shareText}
                    variant="primary"
                  />
                </div>
              </div>

              {/* Insignia de partido & Territorio */}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                <Link
                  href={`/partidos/${data.partido?.sigla?.toLowerCase() ?? "ind"}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.25rem 0.7rem",
                    borderRadius: 99,
                    background: "var(--surface-2)",
                    color: "var(--text-1)",
                    border: `1.5px solid ${data.partido?.color_hex ?? "var(--border)"}`,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {data.partido?.logo_url && (
                    <Image
                      src={data.partido.logo_url}
                      alt={data.partido.sigla}
                      width={16}
                      height={16}
                      style={{ objectFit: "contain" }}
                    />
                  )}
                  <span>{data.partido?.sigla ?? "IND"} · {data.partido?.nombre}</span>
                </Link>
                <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>
                  {data.cargo} · {data.distrito_region}
                  {data.numero_distrito ? ` · Distrito ${data.numero_distrito}` : ""}
                </span>
              </div>

              {/* Metadatos de identidad */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginTop: "0.6rem",
                  fontSize: "0.76rem",
                  color: "var(--text-2)",
                }}
              >
                {(data.profesion || (data.estudios && data.estudios.length > 0)) && (
                  <span id="chip-profesion-bcn">
                    🎓 <strong>Profesión BCN: {data.profesion || data.estudios?.[0]}</strong>
                  </span>
                )}
                {data.edad !== null && data.edad !== undefined && (
                  <span>
                    🎂 <strong>{data.edad} años</strong>
                    {data.lugar_nacimiento ? ` · ${data.lugar_nacimiento}` : ""}
                  </span>
                )}
                <span>🏛️ Período 2026–2030</span>
                <a
                  href="https://www.bcn.cl/historiapolitica/resenas_parlamentarias/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                >
                  Biografía oficial BCN ↗
                </a>
              </div>

              {/* ── BLOQUE NUEVO DIP (Formación y Profesión Declarada) ── */}
              <div
                id="bloque-formacion-dip"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: 8,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  fontSize: "0.78rem",
                  lineHeight: 1.45,
                  maxWidth: 640,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "var(--text-1)" }}>
                    <span>📜</span>
                    <span>Declaración de Intereses y Patrimonio (DIP)</span>
                  </div>
                  <a
                    href={dipUrl}
                    id="enlace-infoprobidad-oficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--accent)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.2rem",
                    }}
                  >
                    <span>Declaración InfoProbidad</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.4rem", marginTop: "0.1rem" }}>
                  <div>
                    <span style={{ color: "var(--text-3)", fontSize: "0.72rem", display: "block" }}>
                      Profesión / oficio declarado (DIP):
                    </span>
                    <strong style={{ color: "var(--text-1)" }}>
                      {dipProfesion}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: "var(--text-3)", fontSize: "0.72rem", display: "block" }}>
                      Formación / títulos (DIP):
                    </span>
                    <strong style={{ color: "var(--text-1)" }}>
                      {dipFormacion}
                    </strong>
                  </div>
                </div>

                {/* Si BCN y DIP difieren o se muestran ambas fuentes */}
                {data.profesion && dipProfesion !== "No declarado en DIP" && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-3)", marginTop: "0.2rem", borderTop: "1px dashed var(--border)", paddingTop: "0.3rem" }}>
                    Fuentes oficiales: BCN registra &quot;{data.profesion}&quot; · DIP registra &quot;{dipProfesion}{dipFormacion === "No registra títulos de educación superior" ? " · sin títulos de educación superior" : ""}&quot;
                  </div>
                )}
              </div>

              {/* ── BLOQUE DE 3 NÚMEROS DE ASISTENCIA Y VOTO ── */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
                  gap: "0.5rem",
                  marginTop: "1.2rem",
                  maxWidth: 560,
                  width: "100%",
                }}
              >
                {/* 1. Asistió a sesiones */}
                <div
                  className="stat-tile"
                  style={{
                    textAlign: "center",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    padding: "0.65rem 0.5rem",
                    borderRadius: 8,
                  }}
                  title="Sesiones en las que el parlamentario estuvo presente en sala respecto al total de convocadas."
                >
                  <div
                    className="stat-tile__value"
                    style={{ fontSize: "clamp(14px, 4vw, 1.25rem)", fontWeight: 800, color: data.pctAsistencia >= 90 ? "var(--ok)" : "var(--warn)" }}
                  >
                    {data.pctAsistencia}%
                  </div>
                  <div className="stat-tile__label" style={{ color: "var(--text-2)", fontSize: "0.68rem" }}>
                    Asistió a sesiones ({data.sesionesPresentes}/{data.totalSesiones})
                  </div>
                </div>

                {/* 2. Emitió voto */}
                <div
                  className="stat-tile"
                  style={{
                    textAlign: "center",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    padding: "0.65rem 0.5rem",
                    borderRadius: 8,
                  }}
                  title="Porcentaje de votaciones en las que emitió opción sustantiva (A favor, En contra, Abstención) estando presente."
                >
                  <div className="stat-tile__value" style={{ fontSize: "clamp(14px, 4vw, 1.25rem)", fontWeight: 800, color: "var(--accent)" }}>
                    {data.pctEmitioVoto}%
                  </div>
                  <div className="stat-tile__label" style={{ color: "var(--text-2)", fontSize: "0.68rem" }}>
                    Emitió voto efectivo
                  </div>
                </div>

                {/* 3. Presente sin votar */}
                <div
                  className="stat-tile"
                  style={{
                    textAlign: "center",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    padding: "0.65rem 0.5rem",
                    borderRadius: 8,
                  }}
                  title="Sesiones donde constó presencia en sala pero no se registró emisión de voto."
                >
                  <div
                    className="stat-tile__value"
                    style={{ fontSize: "clamp(14px, 4vw, 1.25rem)", fontWeight: 800, color: data.presenteSinVotar > 10 ? "var(--warn)" : "var(--text-1)" }}
                  >
                    {data.presenteSinVotar}
                  </div>
                  <div className="stat-tile__label" style={{ color: "var(--text-2)", fontSize: "0.68rem" }}>
                    Presente sin votar
                  </div>
                </div>
              </div>

              {/* Nota metodológica de asistencia */}
              <p style={{ fontSize: "0.72rem", color: "var(--text-3)", margin: "0.6rem 0 0 0", lineHeight: 1.45, maxWidth: 640 }}>
                *Metodología oficial: La asistencia registra la presencia formal al inicio de sesión. Un 100% de asistencia con bajo voto efectivo o &apos;Presente sin votar&apos; responde habitualmente a licencias médicas o maternales justificadas, acuerdos de pareo reglamentario o retiro de sala al momento de la votación.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
