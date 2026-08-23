import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { MUNICIPALIDADES_SEED } from "@/lib/seed-politicos";
import { getMunicipalidadData } from "@/lib/municipalidades-data";
import { getVerifiedMuniRRSS } from "@/lib/municipalidades-rrss";
import { getPartidoConfig } from "@/lib/partidos.config";
import ShareButton from "@/components/ShareButton";
import Breadcrumbs from "@/components/Breadcrumbs";
import MunicipalidadDetailDashboardClient from "@/components/municipalidades/MunicipalidadDetailDashboardClient";
import {
  getMuniBySlugOrId,
  getMuniCanonicalSlug,
  isMuniLegacyId,
  getAllMuniSlugs,
} from "@/lib/slug-utils";

export function generateStaticParams() {
  return getAllMuniSlugs().map(({ slug }) => ({ id: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const muni = getMuniBySlugOrId(id);
  if (!muni) return { title: "Municipalidad No Encontrada — El Cambiómetro" };
  const canonicalSlug = getMuniCanonicalSlug(id) ?? muni.id;
  const muniData = getMunicipalidadData(muni.id);
  const alcalde = muniData?.alcalde?.nombre ?? muni.alcalde_actual ?? "Alcaldía";
  const ogImage = `https://cambiometro.impulsacv.cl/api/og/site`;

  return {
    title: `Municipalidad de ${muni.nombre_comuna} — Alcalde ${alcalde}, Sueldos, Censo & Presupuesto | El Cambiómetro`,
    description: `Ficha municipal oficial de ${muni.nombre_comuna}: población Censo 2024, presupuesto per cápita, dependencia FCM, nóminas CPLT, concejo municipal SERVEL 2024 y compras públicas ChileCompra OCDS.`,
    alternates: {
      canonical: `/municipalidades/${canonicalSlug}`,
    },
    openGraph: {
      title: `Municipalidad de ${muni.nombre_comuna} — El Cambiómetro`,
      description: `Sueldos, demografía Censo 2024, presupuesto SINIM y dotación municipal de ${muni.nombre_comuna}.`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `Municipalidad de ${muni.nombre_comuna} — El Cambiómetro`,
      description: `Sueldos, demografía Censo 2024, presupuesto SINIM y dotación municipal de ${muni.nombre_comuna}.`,
      images: [ogImage],
    },
  };
}

export default async function MunicipalidadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const muni = getMuniBySlugOrId(id);
  if (!muni) notFound();

  // 301 permanente si la URL usa el ID legado (muni-*) en vez del slug canónico
  const canonicalSlug = getMuniCanonicalSlug(id) ?? muni.id;
  if (isMuniLegacyId(id) || id !== canonicalSlug) {
    permanentRedirect(`/municipalidades/${canonicalSlug}`);
  }

  const muniData = getMunicipalidadData(muni.id);
  if (!muniData) notFound();

  const alcalde = muniData.alcalde;
  const partidoAlcalde =
    alcalde?.partido_alcalde ||
    muniData.partido_alcalde ||
    "Independiente";
  const brandingAlcalde = getPartidoConfig(partidoAlcalde);

  // Enlaces oficiales verificados (nunca inventar dominios ni URLs heurísticas)
  const webOficial =
    muniData.sitio_web_oficial ??
    muni.sitio_web_oficial ??
    null;
  const transparenciaActivaUrl =
    muniData.sitio_transparencia_activa ??
    null;
  const sinimUrl = `https://datos.sinim.gov.cl/datos_municipales/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name: `Municipalidad de ${muni.nombre_comuna}`,
    url: `https://cambiometro.impulsacv.cl/municipalidades/${id}`,
    address: {
      "@type": "PostalAddress",
      addressRegion: muni.region,
      addressCountry: "CL",
    },
  };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "6rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* ═══ 1. HERO HEADER ════════════════════════════════════════════════════ */}
      <section className="page-masthead">
        <div className="container-main" id="muni-capture-zone">
          {/* Breadcrumbs y Share */}
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
                { label: "Municipalidades", href: "/municipalidades" },
                ...(muni.region
                  ? [
                      {
                        label: muni.region,
                        href: `/municipalidades?region=${encodeURIComponent(
                          muni.region
                        )}`,
                      },
                    ]
                  : []),
                { label: muni.nombre_comuna },
              ]}
            />
            <ShareButton
              title={`Municipalidad de ${muni.nombre_comuna}`}
              text={`Revisa sueldos, presupuesto SINIM y demografía Censo 2024 de ${muni.nombre_comuna} en El Cambiómetro.`}
              captureTargetId="muni-capture-zone"
              variant="primary"
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Emblema Municipal */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: "var(--surface-2)",
                border: "2px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                fontSize: "2rem",
                flexShrink: 0,
              }}
            >
              🏛️
            </div>

            {/* Identificación de la Comuna */}
            <div style={{ flex: "1 1 300px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "0.5rem",
                }}
              >
                <span className="badge badge-info">{muni.region}</span>
                <span className="badge">CUT {muni.cut}</span>
                <span className="badge badge-ok">SINIM SUBDERE</span>
              </div>

              <h1
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                  fontWeight: 900,
                  color: "var(--text-1)",
                  margin: "0 0 0.5rem",
                  letterSpacing: "-0.02em",
                }}
              >
                Municipalidad de {muni.nombre_comuna}
              </h1>

              <div
                style={{
                  fontSize: "0.95rem",
                  color: "var(--text-2)",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                {alcalde ? (
                  <>
                    <span>Alcaldía:</span>
                    <strong style={{ color: "var(--text-1)" }}>{alcalde.nombre}</strong>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 99,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "var(--surface)",
                        backgroundColor: brandingAlcalde.color_oficial,
                      }}
                    >
                      {brandingAlcalde.logo_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={brandingAlcalde.logo_url}
                          alt={brandingAlcalde.sigla}
                          style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }}
                        />
                      )}
                      {brandingAlcalde.sigla || brandingAlcalde.nombre}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                      (Grado EUS {alcalde.grado_eus || "1"})
                    </span>
                  </>
                ) : getVerifiedMuniRRSS(muni.id)?.alcalde_oficial ? (
                  <>
                    <span>Alcaldía:</span>
                    <strong style={{ color: "var(--text-1)" }}>
                      {getVerifiedMuniRRSS(muni.id)!.alcalde_oficial!.nombre}
                    </strong>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 99,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "var(--surface)",
                        backgroundColor: brandingAlcalde.color_oficial,
                      }}
                    >
                      {brandingAlcalde.logo_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={brandingAlcalde.logo_url}
                          alt={brandingAlcalde.sigla}
                          style={{ width: 14, height: 14, borderRadius: 2, objectFit: "contain" }}
                        />
                      )}
                      {brandingAlcalde.sigla || brandingAlcalde.nombre}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                      (Servel 2024 / BCN)
                    </span>
                  </>
                ) : (
                  <>
                    <span>Autoridad comunal:</span>
                    <strong style={{ color: "var(--text-1)" }}>
                      {muni.alcalde_actual ?? (muni.tiene_municipalidad_propia ? "En actualización" : "— (Comuna administrada por Cabo de Hornos)")}
                    </strong>
                  </>
                )}
              </div>

              {/* Botones de Enlace Oficial */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.6rem",
                  paddingTop: "0.5rem",
                }}
              >
                {webOficial && (
                  <a
                    href={webOficial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      borderColor: "var(--border)",
                      color: "var(--accent)",
                    }}
                  >
                    🌐 Web oficial ↗
                  </a>
                )}

                {transparenciaActivaUrl && (
                  <a
                    href={transparenciaActivaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      borderColor: "var(--border)",
                      color: "var(--ok)",
                    }}
                  >
                    🔍 Transparencia Activa CPLT ↗
                  </a>
                )}

                <a
                  href={sinimUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{
                    fontSize: "0.78rem",
                    padding: "0.35rem 0.75rem",
                    borderColor: "var(--border)",
                    color: "var(--accent)",
                  }}
                >
                  📊 Ficha SINIM SUBDERE ↗
                </a>

                {/* Redes Sociales Oficiales Verificadas (Regla R10: Cero inventadas) */}
                {muniData.redes_sociales?.twitter && (
                  <a
                    href={muniData.redes_sociales.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      borderColor: "var(--border)",
                      color: "var(--text-1)",
                    }}
                    title="Cuenta Oficial de X / Twitter"
                  >
                    𝕏 Twitter ↗
                  </a>
                )}

                {muniData.redes_sociales?.instagram && (
                  <a
                    href={muniData.redes_sociales.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      borderColor: "var(--border)",
                      color: "var(--text-1)",
                    }}
                    title="Cuenta Oficial de Instagram"
                  >
                    📷 Instagram ↗
                  </a>
                )}

                {muniData.redes_sociales?.facebook && (
                  <a
                    href={muniData.redes_sociales.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      borderColor: "var(--border)",
                      color: "var(--text-1)",
                    }}
                    title="Página Oficial de Facebook"
                  >
                    📘 Facebook ↗
                  </a>
                )}

                {muniData.redes_sociales?.youtube && (
                  <a
                    href={muniData.redes_sociales.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.75rem",
                      borderColor: "var(--border)",
                      color: "var(--text-1)",
                    }}
                    title="Canal Oficial de YouTube"
                  >
                    📺 YouTube ↗
                  </a>
                )}

                {!muni.tiene_municipalidad_propia && (
                  <span
                    className="badge"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.35rem 0.65rem",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-2)",
                    }}
                  >
                    📍 Comuna sin municipalidad propia (administrada por Cabo de Hornos)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 2. MAIN DASHBOARD CONTENT CON TABS ════════════════════════════════ */}
      <main className="container-main" style={{ marginTop: "2rem" }}>
        <MunicipalidadDetailDashboardClient
          muniData={muniData}
          nombreComuna={muni.nombre_comuna}
          region={muni.region}
          cut={muni.cut}
        />
      </main>
    </div>
  );
}
