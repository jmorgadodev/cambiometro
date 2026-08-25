"use client";

import Image from "next/image";
import Link from "@/components/SiteLink";
import ShareButton from "@/components/ShareButton";
import AccessibleTooltip from "@/components/ui/AccessibleTooltip";
import type { PoliticoDipInfo } from "@/lib/politico-dip";
import PoliticoCostoMensual, { type MesCostoData } from "@/components/PoliticoCostoMensual";

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
  // Metricas reales
  pctAsistencia: number | null;
  pctEmitioVoto: number | null;
  presenteSinVotar: number;
  sesionesPresentes: number;
  totalSesiones: number;
  // Costo mensual
  costoData?: {
    meses: MesCostoData[];
    ultimoPeriodoConDatos: string;
    fuenteSueldoUrl?: string;
  };
}

export default function PoliticoScoreHeader({ data }: { data: PoliticoHeaderData }) {
  const partidoTxt = data.partido?.sigla ? ` (${data.partido.sigla})` : "";
  const regionTxt = data.distrito_region ? ` por ${data.distrito_region}` : "";
  const shareTitle = `${data.nombre_completo}${partidoTxt}`;
  const asistenciaTxt = data.pctAsistencia === null ? "asistencia sin cobertura" : `asistencia ${data.pctAsistencia}%`;
  const shareText = `${data.nombre_completo}${partidoTxt} · ${data.cargo}${regionTxt} — ${asistenciaTxt}, votaciones y rendiciones en El Cambiómetro`;

  const dip = data.dipInfo;
  const dipProfesion = dip?.profesion_oficio_display || "No declarado en DIP";
  const dipFormacion = dip?.formacion_titulos_display || "No declarado en DIP";
  const dipUrl = dip?.declaracion_url || `https://www.infoprobidad.cl/Resultados?busqueda=${encodeURIComponent(data.nombre_completo)}`;

  return (
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
          {/* Columna 1: Avatar con foto oficial o fallback */}
          <div className="politico-header-top">
            <div className="politico-header-avatar-wrap">
              {data.foto_url ? (
                <Image
                  src={data.foto_url}
                  alt={data.nombre_completo}
                  width={176}
                  height={176}
                  className="politico-header-avatar-img"
                  priority
                />
              ) : (
                <div className="politico-header-avatar-fallback">
                  {data.partido?.logo_url ? (
                    <Image
                      src={data.partido.logo_url}
                      alt={data.partido.sigla}
                      width={64}
                      height={64}
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-1)" }}>
                      {data.partido?.sigla ?? "IND"}
                    </span>
                  )}
                </div>
              )}
              <span style={{ fontSize: "0.65rem", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                Foto oficial
              </span>
            </div>

            {/* Boton de Compartir movil < 480px */}
            <div className="politico-header-actions-mobile">
              <ShareButton
                title={shareTitle}
                text={shareText}
                variant="primary"
              />
            </div>
          </div>

          {/* Columna 2: Informacion principal */}
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

              {/* Boton de Compartir compacto en desktop/tablet */}
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
                  <strong>Profesión BCN: {data.profesion || data.estudios?.[0]}</strong>
                </span>
              )}
              {data.edad !== null && data.edad !== undefined && (
                <span>
                  <strong>{data.edad} años</strong>
                  {data.lugar_nacimiento ? ` · ${data.lugar_nacimiento}` : ""}
                </span>
              )}
              <span>Período 2026–2030</span>
              <a
                href="https://www.bcn.cl/historiapolitica/resenas_parlamentarias/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
              >
                Biografía oficial BCN ↗
              </a>
            </div>
          </div>

          {/* Columna 3: Bloque DIP (A la derecha en desktop >=1024px) */}
          <div className="politico-header-dip-col">
            <div
              id="bloque-formacion-dip"
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "8px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
                fontSize: "0.78rem",
                lineHeight: 1.45,
                width: "100%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "var(--text-1)" }}>
                  <span>Declaración de Intereses y Patrimonio</span>
                </div>
                <a
                  href={dipUrl}
                  id="enlace-infoprobidad-oficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--accent)",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.2rem",
                  }}
                >
                  <span>InfoProbidad</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.1rem" }}>
                <div>
                  <span style={{ color: "var(--text-3)", fontSize: "0.7rem", display: "block" }}>
                    Profesión / oficio declarado (DIP):
                  </span>
                  <strong style={{ color: "var(--text-1)", fontSize: "0.76rem" }}>
                    {dipProfesion}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "var(--text-3)", fontSize: "0.7rem", display: "block" }}>
                    Formación / títulos (DIP):
                  </span>
                  <strong style={{ color: "var(--text-1)", fontSize: "0.76rem" }}>
                    {dipFormacion}
                  </strong>
                </div>
              </div>

              {data.profesion && dipProfesion !== "No declarado en DIP" && (
                <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: "0.2rem", borderTop: "1px dashed var(--border)", paddingTop: "0.3rem" }}>
                  BCN: &quot;{data.profesion}&quot; · DIP: &quot;{dipProfesion}{dipFormacion === "No registra títulos de educación superior" ? " · sin títulos superiores" : ""}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Fila Inferior Full-Width: KPIs de Asistencia + Costo Mensual */}
          <div className="politico-header-bottom-full">
            {/* KPIs de Asistencia y Voto en fila */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.65rem",
                width: "100%",
              }}
            >
              {/* 1. Asistio a sesiones */}
              <div
                className="stat-tile"
                style={{
                  textAlign: "center",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  padding: "0.75rem 0.6rem",
                  borderRadius: "8px",
                }}
                title="Sesiones en las que el parlamentario estuvo presente en sala respecto al total de convocadas."
              >
                <div
                  className="stat-tile__value"
                  style={{ fontSize: "clamp(14px, 4vw, 1.35rem)", fontWeight: 800, color: data.pctAsistencia !== null && data.pctAsistencia >= 90 ? "var(--ok)" : "var(--warn)" }}
                >
                  {data.pctAsistencia === null ? "—" : `${data.pctAsistencia}%`}
                </div>
                <div className="stat-tile__label" style={{ color: "var(--text-2)", fontSize: "0.7rem", marginTop: "0.2rem" }}>
                  Asistió a sesiones ({data.sesionesPresentes}/{data.totalSesiones})
                </div>
              </div>

              {/* 2. Emitio voto */}
              <div
                className="stat-tile"
                style={{
                  textAlign: "center",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  padding: "0.75rem 0.6rem",
                  borderRadius: "8px",
                }}
                title="Porcentaje de votaciones en las que emitió opción sustantiva (A favor, En contra, Abstención) estando presente."
              >
                <div className="stat-tile__value" style={{ fontSize: "clamp(14px, 4vw, 1.35rem)", fontWeight: 800, color: "var(--accent)" }}>
                  {data.pctEmitioVoto === null ? "—" : `${data.pctEmitioVoto}%`}
                </div>
                <div className="stat-tile__label" style={{ color: "var(--text-2)", fontSize: "0.7rem", marginTop: "0.2rem" }}>
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
                  padding: "0.75rem 0.6rem",
                  borderRadius: "8px",
                }}
              >
                <div
                  className="stat-tile__value"
                  style={{ fontSize: "clamp(14px, 4vw, 1.35rem)", fontWeight: 800, color: data.presenteSinVotar > 10 ? "var(--warn)" : "var(--text-1)" }}
                >
                  {data.presenteSinVotar}
                </div>
                <div className="stat-tile__label" style={{ color: "var(--text-2)", fontSize: "0.7rem", marginTop: "0.2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                  <span>Presente sin votar</span>
                  <AccessibleTooltip
                    ariaLabel="Definición reglamentaria de presente sin votar"
                    content={
                      <div>
                        <strong style={{ display: "block", marginBottom: "0.25rem", color: "var(--accent)" }}>
                          Definición Oficial (Cámara y Senado)
                        </strong>
                        <span>
                          Sesiones donde constó presencia o asistencia formal al inicio pero no se emitió voto efectivo debido a acuerdos de pareo reglamentario entre bancadas, dispensa médica justificada o retiro de sala al momento de la votación nominal.
                        </span>
                      </div>
                    }
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--accent)",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                      }}
                      title="Ver definición oficial"
                    >
                      ℹ️
                    </span>
                  </AccessibleTooltip>
                </div>
              </div>
            </div>

            {/* Nota metodologica de asistencia */}
            <p style={{ fontSize: "0.7rem", color: "var(--text-3)", margin: "0.6rem 0 0 0", lineHeight: 1.45 }}>
              *Metodología oficial: La asistencia registra la presencia formal al inicio de sesión. Un 100% de asistencia con bajo voto efectivo o &apos;Presente sin votar&apos; responde habitualmente a licencias médicas o maternales justificadas, acuerdos de pareo reglamentario o retiro de sala al momento de la votación.
            </p>

            {/* Panel Costo Mensual Full-Width */}
            {data.costoData && data.costoData.meses.length > 0 && (
              <PoliticoCostoMensual
                cargo={data.cargo}
                meses={data.costoData.meses}
                ultimoPeriodoConDatos={data.costoData.ultimoPeriodoConDatos}
                fuenteSueldoUrl={data.costoData.fuenteSueldoUrl}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
