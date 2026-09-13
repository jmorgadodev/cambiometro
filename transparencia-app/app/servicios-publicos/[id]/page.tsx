import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SERVICIOS_PUBLICOS_SEED } from "@/lib/servicios-publicos";
import { getServicioPublicoEnriquecido } from "@/lib/servicios-publicos-data";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import ShareButton from "@/components/ShareButton";
import Breadcrumbs from "@/components/Breadcrumbs";
import ServicioPublicoDashboardClient from "@/components/servicios/ServicioPublicoDashboardClient";
import {
  getServicioBySlugOrId,
  getServicioCanonicalSlug,
  isServicioLegacyId,
  getAllServicioSlugs,
} from "@/lib/slug-utils";

export function generateStaticParams() {
  return getAllServicioSlugs().map(({ slug }) => ({ id: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const servicio = getServicioBySlugOrId(id);
  if (!servicio) return { title: "Servicio No Encontrado — El Cambiómetro" };
  const canonicalSlug = getServicioCanonicalSlug(id) ?? id;

  const ogImage = `https://cambiometro.impulsacv.cl/api/og/site`;

  return {
    title: `${servicio.nombre} (${servicio.sigla || servicio.tipo_organo}) — Presupuesto DIPRES, Personal & Compras | El Cambiómetro`,
    description: `Dashboard institucional de ${servicio.nombre}: presupuesto DIPRES 2026, dotación de personal CPLT, compras públicas en MercadoPúblico, audiencias de lobby y auditorías CGR.`,
    alternates: {
      canonical: `/servicios-publicos/${canonicalSlug}`,
    },
    openGraph: {
      title: `${servicio.nombre} — El Cambiómetro`,
      description: `Presupuesto Ley DIPRES, compras públicas, lobby y dotación oficial de ${servicio.nombre}.`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${servicio.nombre} — El Cambiómetro`,
      description: `Presupuesto Ley DIPRES, compras públicas, lobby y dotación oficial de ${servicio.nombre}.`,
      images: [ogImage],
    },
  };
}

export default async function ServicioPublicoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const servicio = getServicioBySlugOrId(id);
  if (!servicio) notFound();

  const canonicalSlug = getServicioCanonicalSlug(id) ?? id;
  void isServicioLegacyId;

  const enriquecido = getServicioPublicoEnriquecido(servicio.id);
  if (!enriquecido) notFound();

  const politicoMatch = servicio.director_jefe_actual
    ? POLITICOS_SEED.find(
        (p) =>
          p.nombre_completo.toLowerCase() ===
          servicio.director_jefe_actual!.toLowerCase()
      )
    : null;

  const transparenciaUrl = `https://www.portaltransparencia.cl/PortalPdT/directorio-de-organismos-regulados/?org=${encodeURIComponent(servicio.nombre)}`;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem" }}>
      {/* ═══ 1. HEADER INSTITUCIONAL ═══════════════════════════════════════════ */}
      <section className="page-masthead">
        <div className="container-main" id="servicio-capture-zone">
          {/* Breadcrumbs y Compartir */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <Breadcrumbs
              items={[
                { label: "Servicios Públicos", href: "/servicios-publicos" },
                ...(enriquecido.ministerio_dependiente ? [{ label: enriquecido.ministerio_dependiente, href: `/servicios-publicos?search=${encodeURIComponent(enriquecido.ministerio_dependiente)}` }] : []),
                { label: enriquecido.sigla || enriquecido.nombre },
              ]}
            />

            <ShareButton
              title={`${enriquecido.nombre} (${enriquecido.sigla || enriquecido.tipo_organo})`}
              text={`Revisa el presupuesto DIPRES, personal y compras públicas de ${enriquecido.nombre} en El Cambiómetro.`}
              captureTargetId="servicio-capture-zone"
              variant="primary"
            />
          </div>

          <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Icono / Avatar del servicio */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "20px",
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
                border: "2px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {enriquecido.tipo_organo === "Gobierno Regional" ? "🗺️" : enriquecido.tipo_organo === "Superintendencia" ? "⚖️" : enriquecido.tipo_organo === "Empresa Pública" ? "⛏️" : "🏛️"}
            </div>

            {/* Datos Principales */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                  marginBottom: "0.4rem",
                }}
              >
                <span className="badge badge-info">{enriquecido.tipo_organo}</span>
                <span className="badge badge-ok">Dependencia: {enriquecido.ministerio_dependiente}</span>
                {enriquecido.presupuesto && (
                  <span className="badge badge-ok">Presupuesto DIPRES 2026</span>
                )}
              </div>

              <h1
                style={{
                  fontSize: "clamp(1.5rem, 3.2vw, 2.25rem)",
                  fontWeight: 900,
                  color: "var(--text-1)",
                  margin: "0 0 0.4rem",
                  letterSpacing: "-0.02em",
                }}
              >
                {enriquecido.nombre} {enriquecido.sigla ? `(${enriquecido.sigla})` : ""}
              </h1>

              {/* Autoridad Titular */}
              <div style={{ fontSize: "0.95rem", color: "var(--text-2)", marginBottom: "1rem" }}>
                {enriquecido.director_jefe_actual ? (
                  <>
                    Autoridad Titular / Directiva:{" "}
                    <strong style={{ color: "var(--text-1)" }}>{enriquecido.director_jefe_actual}</strong>
                    {politicoMatch && (
                      <Link prefetch={false}
                        href={`/politico/${politicoMatch.id}`}
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.78rem",
                          color: "var(--accent)",
                          textDecoration: "underline",
                        }}
                      >
                        Ver perfil de autoridad →
                      </Link>
                    )}
                  </>
                ) : (
                  <span>Titular en proceso de confirmación oficial / Subrogante</span>
                )}
              </div>

              {/* Enlaces Oficiales */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {enriquecido.sitio_web_oficial && (
                  <a
                    href={enriquecido.sitio_web_oficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}
                  >
                    🌐 Portal Institucional ↗
                  </a>
                )}
                <a
                  href={transparenciaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem", background: "var(--surface-2)", border: "1px solid var(--ok)" }}
                >
                  ⚖️ Transparencia Activa CPLT
                </a>
                <a
                  href={`https://x.com/search?q=${encodeURIComponent(enriquecido.nombre)}&f=live`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}
                >
                  𝕏 Enlaces en 𝕏
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. DASHBOARD Y PESTAÑAS INTERACTIVAS (DIPRES, PERSONAL, COMPRAS, LOBBY) ═══ */}
      <div className="container-main" style={{ marginTop: "2rem" }}>
        <ServicioPublicoDashboardClient servicio={enriquecido} politicoId={politicoMatch?.id ?? null} />
      </div>
    </div>
  );
}
