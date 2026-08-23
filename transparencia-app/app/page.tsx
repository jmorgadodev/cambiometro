import type { Metadata } from "next";
import Link from "next/link";
import StatCounter from "@/components/StatCounter";
import Reveal from "@/components/Reveal";
import Icono from "@/components/ui/Icono";
import { GLOBAL_KPIS, KPI_SCOPES } from "@/lib/global-kpis";

export const metadata: Metadata = {
  title: "El Cambiómetro — Plataforma de Datos Públicos y Transparencia",
  description: "Consulta y fiscaliza votaciones parlamentarias, gastos operacionales, personal de apoyo y autoridades con datos oficiales consolidados.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "El Cambiómetro — Plataforma de Datos Públicos",
    description: "Votaciones de sala, asistencia, gastos operacionales y personal de apoyo del Congreso Nacional de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "El Cambiómetro — Plataforma de Datos Públicos",
    description: "Votaciones de sala, asistencia, gastos operacionales y personal de apoyo del Congreso Nacional de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

const HOME_KPIS = [
  {
    key: "registros_canonicos",
    value: GLOBAL_KPIS.registros_canonicos,
    label: KPI_SCOPES.registros_canonicos.label,
    tooltip: KPI_SCOPES.registros_canonicos.tooltip,
    href: KPI_SCOPES.registros_canonicos.href,
  },
  {
    key: "entidades",
    value: GLOBAL_KPIS.entidades,
    label: KPI_SCOPES.entidades.label,
    tooltip: KPI_SCOPES.entidades.tooltip,
    href: KPI_SCOPES.entidades.href,
  },
  {
    key: "relaciones",
    value: GLOBAL_KPIS.relaciones,
    label: KPI_SCOPES.relaciones.label,
    tooltip: KPI_SCOPES.relaciones.tooltip,
    href: KPI_SCOPES.relaciones.href,
  },
  {
    key: "votaciones",
    value: GLOBAL_KPIS.votaciones,
    label: KPI_SCOPES.votaciones.label,
    tooltip: KPI_SCOPES.votaciones.tooltip,
    href: KPI_SCOPES.votaciones.href,
  },
  {
    key: "gastos",
    value: GLOBAL_KPIS.gastos,
    label: KPI_SCOPES.gastos.label,
    tooltip: KPI_SCOPES.gastos.tooltip,
    href: KPI_SCOPES.gastos.href,
  },
];

const HOME_SOURCES_LIST = [
  {
    id: "cplt",
    name: "Transparencia Activa CPLT",
    organization: "Consejo para la Transparencia (CPLT)",
    href: "/funcionarios",
    isDerived: false,
  },
  {
    id: "dipres",
    name: "Ley de Presupuestos de la Nación",
    organization: "Dirección de Presupuestos (DIPRES)",
    href: "/servicios-publicos",
    isDerived: false,
  },
  {
    id: "ley19862",
    name: "Registro Central de Colaboradores (Ley 19.862)",
    organization: "Ministerio de Hacienda",
    href: "/transferencias",
    isDerived: false,
  },
  {
    id: "chilecompra",
    name: "ChileCompra / MercadoPúblico OCDS",
    organization: "Dirección ChileCompra",
    href: "/cruces",
    isDerived: false,
  },
  {
    id: "infolobby",
    name: "Plataforma InfoLobby",
    organization: "Consejo para la Transparencia",
    href: "/cruces#lobby-publico",
    isDerived: false,
  },
  {
    id: "infoprobidad",
    name: "Declaraciones de Intereses y Patrimonio",
    organization: "Contraloría General de la República · CPLT",
    href: "/personas",
    isDerived: false,
  },
  {
    id: "sinim",
    name: "Sistema Nacional de Información Municipal (SINIM)",
    organization: "SUBDERE",
    href: "/municipalidades",
    isDerived: false,
  },
  {
    id: "ine",
    name: "INE Censo 2024 (Población y Demografía)",
    organization: "Instituto Nacional de Estadísticas (INE)",
    href: "/municipalidades",
    isDerived: false,
  },
  {
    id: "contraloria",
    name: "Informes de Auditoría CGR",
    organization: "Contraloría General de la República",
    href: "/cruces#fiscalizacion",
    isDerived: false,
  },
  {
    id: "camara",
    name: "Cámara de Diputadas y Diputados",
    organization: "Congreso Nacional",
    href: "/politico",
    isDerived: false,
  },
  {
    id: "senado",
    name: "Senado de la República",
    organization: "Congreso Nacional",
    href: "/politico",
    isDerived: false,
  },
  {
    id: "servel",
    name: "SERVEL (Resultados Electorales)",
    organization: "Servicio Electoral de Chile",
    href: "/partidos",
    isDerived: false,
  },
  {
    id: "personal_apoyo",
    name: "Personal de Apoyo Parlamentario",
    organization: "Congreso Nacional",
    href: "/politico",
    isDerived: true,
  },
];

export default async function HomePage() {
  const consolidationDate = new Date(GLOBAL_KPIS.generatedAt);
  const formattedConsolidationDate = Number.isNaN(consolidationDate.getTime())
    ? GLOBAL_KPIS.corte
    : new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeZone: "America/Santiago",
      }).format(consolidationDate);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "El Cambiómetro",
    url: "https://cambiometro.impulsacv.cl",
    description: "Plataforma ciudadana de datos públicos y transparencia de Chile.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://cambiometro.impulsacv.cl/cruces?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "El Cambiómetro",
    url: "https://cambiometro.impulsacv.cl",
    logo: "https://cambiometro.impulsacv.cl/api/og/site",
    sameAs: [
      "https://github.com/jmorgadodev/cambiometro",
    ],
  };

  return (
    <main className="home-desk">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="home-lead container-main" aria-labelledby="home-title">
        <div className="home-lead__copy">
          <p className="home-kicker"><span aria-hidden="true" /> Plataforma de Datos Públicos</p>
          <h1 id="home-title">Transparencia, votaciones y gastos públicos al alcance de todos.</h1>
          <p>
            El Cambiómetro compila, consolida y visualiza información de fuentes públicas oficiales
            del Estado de Chile para facilitar la fiscalización y la rendición de cuentas ciudadana.
          </p>
          <div className="home-actions">
            <Link className="btn btn-primary" href="/politico">Explorar parlamentarios</Link>
            <Link className="btn btn-ghost" href="/transferencias">Transferencias Ley 19.862</Link>
          </div>
        </div>

        <form className="home-query" action="/cruces" role="search">
          <label htmlFor="home-search">Buscar en los registros</label>
          <div>
            <input id="home-search" name="q" type="search" minLength={2} maxLength={80} placeholder="Nombre, institución o concepto" autoComplete="off" />
            <button type="submit">Buscar</button>
          </div>
          <small>Prueba con una autoridad, fundación, partido, organismo o proveedor.</small>
        </form>
      </section>

      {/* Banda de KPIs Globales con Tooltip de Ámbito */}
      <section className="home-ledger" aria-label="Cobertura actual consolidada">
        <div className="container-main home-ledger__grid">
          {HOME_KPIS.map((item, index) => (
            <Link
              href={item.href}
              className="home-stat"
              key={item.key}
              title={item.tooltip}
              aria-label={`${item.label}: ${item.value.toLocaleString("es-CL")}. ${item.tooltip}`}
            >
              <StatCounter value={item.value} delay={index * 100} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4 Entradas Narrativas de la Plataforma (Grid 12 cols: 4 header + 8 cards 2x2) */}
      <Reveal delay={100}>
        <section className="container-main home-paths" aria-label="Líneas principales de consulta">
          <div className="home-paths__layout">
            <div className="home-paths__header">
              <p className="eyebrow">Rutas de exploración</p>
              <h2>Cuatro formas de fiscalizar la información</h2>
              <p className="home-paths__desc">
                Accede a módulos diseñados para auditar votaciones, compras públicas, transferencias y redes institucionales.
              </p>
            </div>
            <div className="home-paths__grid">
              <Link href="/politico" className="home-path">
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icono nombre="votaciones" size={15} />
                  01 / Votaciones
                </span>
                <h3>¿Cómo votan tus representantes?</h3>
                <p>Revisa la asistencia, alineamiento con sus bancadas y posturas en proyectos de ley clave.</p>
                <b>Ver parlamentarios →</b>
              </Link>

              <Link href="/partidos" className="home-path">
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icono nombre="organismo" size={15} />
                  02 / Bancadas
                </span>
                <h3>¿Qué partidos concentran el gasto?</h3>
                <p>Compara el presupuesto operacional, asesores contratados y cohesión de cada colectividad.</p>
                <b>Comparar partidos →</b>
              </Link>

              <Link href="/transferencias" className="home-path">
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icono nombre="dinero" size={15} />
                  03 / Recursos
                </span>
                <h3>¿A dónde van las transferencias?</h3>
                <p>Explora fondos asignados a fundaciones y corporaciones bajo la Ley 19.862.</p>
                <b>Ver transferencias →</b>
              </Link>

              <Link href="/cruces" className="home-path">
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Icono nombre="cruces" size={15} />
                  04 / Relaciones
                </span>
                <h3>¿Qué entidades están conectadas?</h3>
                <p>Filtra relaciones y abre la evidencia que respalda cada vínculo publicado.</p>
                <b>Abrir explorador →</b>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Estado de datos simplificado: 13 fuentes compactas sin tablas de conteo */}
      <Reveal delay={150}>
        <section className="container-main home-sources" aria-labelledby="sources-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Estado de datos</p>
              <h2 id="sources-title">12 fuentes oficiales + 1 derivada</h2>
              <p className="home-sources__sync">Última consolidación: {formattedConsolidationDate}</p>
            </div>
            <Link href="/fuentes">Revisar catálogo de fuentes →</Link>
          </div>

          <div className="home-source-list--compact">
            {HOME_SOURCES_LIST.map((source) => (
              <Link href={source.href} key={source.id} className="home-source-item">
                <span className="source-signal source-signal--connected" aria-hidden="true" />
                <div className="home-source-item__info">
                  <div className="home-source-item__name">
                    <strong>{source.name}</strong>
                    {source.isDerived && <span className="badge badge-derived">derivada</span>}
                  </div>
                  <span className="home-source-item__org">{source.organization}</span>
                </div>
                <span className="home-source-item__arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>

          <p className="home-coverage-note">
            Conteos y cobertura por fuente en <Link href="/fuentes" className="data-link">/fuentes</Link> y <Link href="/datos/calidad" className="data-link">/datos/calidad</Link>. Los pipelines operan de forma automatizada y periódica con trazabilidad al portal de origen.
          </p>
        </section>
      </Reveal>
    </main>
  );
}

export const dynamic = "force-static";
