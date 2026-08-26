import type { Metadata } from "next";
import Link from "next/link";
import StatCounter from "@/components/StatCounter";
import Reveal from "@/components/Reveal";
import Icono from "@/components/ui/Icono";
import { GLOBAL_KPIS, KPI_SCOPES } from "@/lib/global-kpis";
import { ETL_SOURCES_DATA } from "@/lib/etl-sources-data";
import { listEntities, listRecords, listRelations } from "@/lib/data-platform-d1";
import { listPublishedSourceManifests } from "@/lib/published-sources";

export const dynamic = "force-static";

const HOME_SOURCES_LIST = ETL_SOURCES_DATA.filter((source) => source.recordCount > 0);

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

export default async function HomePage() {
  const [sources, entities, records, relations, votes, expenses] = await Promise.all([
    listPublishedSourceManifests(),
    listEntities({ limit: 1 }),
    listRecords({ limit: 1 }),
    listRelations({ limit: 1 }),
    listRecords({ kind: "vote", limit: 1 }),
    listRecords({ kind: "expense", limit: 1 }),
  ]);
  const totalCatalogRecords = Math.max(records.total, GLOBAL_KPIS.registros_canonicos);
  const operationalSources = HOME_SOURCES_LIST;
  const resolvedHomeKpis = HOME_KPIS.map((item) => item.key === "entidades"
    ? { ...item, value: entities.total || item.value }
    : item);

  return (
    <div className="home-desk">
      <script
        type="application/ld+json"
      >{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "El Cambiómetro",
        url: "https://cambiometro.impulsacv.cl",
        publisher: {
          "@type": "Organization",
          name: "ImpulsaCV",
          url: "https://impulsacv.cl",
        },
      })}</script>
      <section className="home-lead container-main" aria-labelledby="home-title">
        <div className="home-lead__copy">
          <p className="home-kicker"><span aria-hidden="true" /> Plataforma de Datos Públicos</p>
          <h1 id="home-title">Transparencia, votaciones y gastos públicos al alcance de todos.</h1>
          <p>
            El Cambiómetro compila, consolida y visualiza información de fuentes públicas oficiales
            del Estado de Chile para facilitar la fiscalización y la rendición de cuentas ciudadana.
          </p>
          <div className="home-actions">
            <Link prefetch={false} className="btn btn-primary" href="/politico">Explorar parlamentarios</Link>
            <Link prefetch={false} className="btn btn-ghost" href="/transferencias">Transferencias Ley 19.862</Link>
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
          {resolvedHomeKpis.map((item, index) => (
            <Link
              prefetch={false}
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

      <Reveal>
        <section className="container-main home-workbench" aria-labelledby="workbench-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Mesa de análisis</p>
              <h2 id="workbench-title">Empieza por una pregunta</h2>
            </div>
            <Link prefetch={false} href="/como-funciona">Cómo usamos los datos públicos →</Link>
          </div>

          <div className="home-paths">
            <Link prefetch={false} href="/politico" className="home-path">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icono nombre="votaciones" size={15} />
                01 / Decisiones
              </span>
              <h3>¿Cómo votó una autoridad?</h3>
              <p>Consulta fichas parlamentarias, opciones registradas, asistencia, dietas y probidad.</p>
              <b>Ver votaciones →</b>
            </Link>
            <Link prefetch={false} href="/transferencias" className="home-path">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icono nombre="dinero" size={15} />
                02 / Dinero & Fundaciones
              </span>
              <h3>¿A quién transfiere el Estado?</h3>
              <p>Explora más de $17 billones en 361.000 transferencias a fundaciones y privados (Ley 19.862).</p>
              <b>Explorar transferencias →</b>
            </Link>
            <Link prefetch={false} href="/municipalidades" className="home-path">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icono nombre="territorio" size={15} />
                03 / Territorio Comunal
              </span>
              <h3>¿Cómo gastan las 346 comunas?</h3>
              <p>Fichas comunales con demografía Censo 2024, finanzas SINIM, alcaldías y compras públicas.</p>
              <b>Ver municipalidades →</b>
            </Link>
            <Link prefetch={false} href="/cruces" className="home-path">
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Icono nombre="cruces" size={15} />
                04 / Relaciones
              </span>
              <h3>¿Qué entidades están conectadas?</h3>
              <p>Filtra relaciones y abre la evidencia que respalda cada vínculo publicado.</p>
              <b>Abrir explorador →</b>
            </Link>
          </div>
        </section>
      </Reveal>

      <Reveal delay={150}>
        <section className="container-main home-sources" aria-labelledby="sources-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Estado de datos</p>
              <h2 id="sources-title">{operationalSources.length} fuentes con registros disponibles</h2>
            </div>
            <Link prefetch={false} href="/datos">Revisar todas las fuentes →</Link>
          </div>
          <div className="home-source-list">
            {operationalSources.map((source) => (
              <div className="home-source-row" key={source.id}>
                <span className="source-signal source-signal--partial" aria-hidden="true" />
                <strong>{source.name}</strong>
                <span>{source.recordCount.toLocaleString("es-CL")} registros</span>
                <em>{source.statusText || "Al día (Vigente)"}</em>
              </div>
            ))}
          </div>
          <p className="home-coverage-note">
            12 fuentes oficiales + 1 derivada. Nóminas oficiales: cada organismo informa con su partición oficial validada. Los pipelines operan de forma automatizada y periódica con trazabilidad al portal de origen. <Link prefetch={false} href="/fuentes">Ver catálogo de fuentes →</Link>
          </p>
        </section>
      </Reveal>
    </div>
  );
}

