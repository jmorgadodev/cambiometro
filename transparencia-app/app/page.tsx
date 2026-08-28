import type { Metadata } from "next";
import Link from "next/link";
import StatCounter from "@/components/StatCounter";
import Reveal from "@/components/Reveal";
import Icono from "@/components/ui/Icono";
import { GLOBAL_KPIS, KPI_SCOPES } from "@/lib/global-kpis";
import { ETL_SOURCES_DATA } from "@/lib/etl-sources-data";
import { getStaticEntityCatalog } from "@/lib/static-entity-catalog";
import { VOTACIONES_DESTACADAS } from "@/lib/votaciones-destacadas";
import { tituloVotacionLegible } from "@/lib/votaciones-format";
import { MOVIMIENTOS_HOME_SUMMARY } from "@/lib/movimientos";
import { formatFechaCorta } from "@/lib/format";

export const dynamic = "force-static";

const HOME_SOURCES_LIST = ETL_SOURCES_DATA.filter((source) => source.recordCount > 0);

// Selección editorial para la Home: impacto público, quórum y diversidad de
// materias. El listado completo y sus filtros viven en /votaciones-destacadas.
const HOME_FEATURED_VOTE_IDS = [
  "senado-vot-11264",
  "camara-vot-89844",
  "senado-vot-11274",
  "camara-vot-89749",
  "camara-vot-89750",
] as const;

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
  const entityCount = getStaticEntityCatalog().total;
  const operationalSources = HOME_SOURCES_LIST;
  const resolvedHomeKpis = HOME_KPIS.map((item) => item.key === "entidades"
    ? { ...item, value: entityCount || item.value }
    : item);
  const votesById = new Map(VOTACIONES_DESTACADAS.map((vote) => [vote.votacion_id, vote]));
  const highlightedVotes = HOME_FEATURED_VOTE_IDS.flatMap((id) => {
    const vote = votesById.get(id);
    return vote ? [vote] : [];
  });

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
      <section className="home-hero" aria-labelledby="home-title">
        <div className="container-main home-lead">
          <div className="home-lead__copy">
            <div className="home-kicker"><span aria-hidden="true" /> Plataforma de datos públicos <span className="home-kicker__cut">Corte {GLOBAL_KPIS.corte}</span></div>
            <h1 id="home-title">La información pública <em>no debería perderse.</em></h1>
            <p className="home-lead__intro">
              El Cambiómetro convierte fuentes dispersas del Estado de Chile en evidencia que puedes
              buscar, comparar y revisar desde el documento original.
            </p>
            <div className="home-actions">
              <Link prefetch={false} className="btn btn-primary" href="/politico">Explorar parlamentarios <span aria-hidden="true">→</span></Link>
              <Link prefetch={false} className="btn btn-ghost" href="/datos">Ver las fuentes <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="home-hero__proof">
              <span className="home-hero__proof-dot" aria-hidden="true" />
              <span><strong>{operationalSources.length} fuentes oficiales</strong> con registros disponibles</span>
              <Link prefetch={false} href="/como-funciona#fuentes">Cómo se valida →</Link>
            </div>
          </div>

          <div className="home-hero__aside">
            <div className="home-evidence-card">
              <div className="home-evidence-card__topline">
                <span>Ficha de trazabilidad <b>0001</b></span>
                <span className="home-evidence-card__status"><span aria-hidden="true" /> Activo</span>
              </div>
              <div className="home-evidence-card__headline">
                <span>Un punto de entrada para fiscalizar</span>
                <strong>Pregunta → fuente → evidencia</strong>
              </div>
              <dl className="home-evidence-card__facts">
                <div><dt>Registros indexados</dt><dd>{GLOBAL_KPIS.registros_canonicos.toLocaleString("es-CL")}</dd></div>
                <div><dt>Entidades identificadas</dt><dd>{entityCount.toLocaleString("es-CL")}</dd></div>
                <div><dt>Fuentes conectadas</dt><dd>{operationalSources.length}</dd></div>
              </dl>
              <div className="home-evidence-card__rule" aria-hidden="true" />
              <form className="home-query" action="/politico" role="search">
                <label htmlFor="home-search">Buscar en los registros</label>
                <div className="home-query__control">
                  <input id="home-search" name="q" type="search" minLength={2} maxLength={80} placeholder="Nombre, partido, distrito o región" autoComplete="off" />
                  <button type="submit">Buscar</button>
                </div>
                <small>Busca diputados y senadores por nombre, partido, distrito o región.</small>
              </form>
            </div>
          </div>
        </div>
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
              <span className="home-stat__index" aria-hidden="true">0{index + 1}</span>
              <StatCounter value={item.value} delay={index * 100} />
              <span className="home-stat__label">{item.key === "votaciones" ? "Votaciones de sala históricas" : item.label}</span>
              {item.key === "votaciones" && <small className="home-stat__scope">Cámara + Senado · 2022–2026</small>}
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
            <Link prefetch={false} href="/politico" className="home-path home-path--lead">
              <span className="home-path__icon"><Icono nombre="votaciones" size={18} /></span>
              <span className="home-path__eyebrow">Decisiones públicas</span>
              <h3>¿Cómo votó una autoridad?</h3>
              <p>Consulta votaciones, asistencia, dietas y declaraciones con la fuente oficial a la vista.</p>
              <b>Ver análisis parlamentario <span aria-hidden="true">→</span></b>
            </Link>
            <div className="home-paths__stack">
              <Link prefetch={false} href="/transferencias" className="home-path">
                <span className="home-path__icon"><Icono nombre="dinero" size={16} /></span>
                <span className="home-path__eyebrow">Dinero y fundaciones</span>
                <h3>¿A quién transfiere el Estado?</h3>
                <p>Explora Transferencias Ley 19.862, emisor, receptor y monto.</p>
                <b>Explorar transferencias <span aria-hidden="true">→</span></b>
              </Link>
              <Link prefetch={false} href="/municipalidades" className="home-path">
                <span className="home-path__icon"><Icono nombre="territorio" size={16} /></span>
                <span className="home-path__eyebrow">Territorio comunal</span>
                <h3>¿Cómo se gobiernan 346 comunas?</h3>
                <p>Compara demografía, finanzas, alcaldías y compras públicas.</p>
                <b>Ver municipalidades <span aria-hidden="true">→</span></b>
              </Link>
              <Link prefetch={false} href="/cruces" className="home-path">
                <span className="home-path__icon"><Icono nombre="cruces" size={16} /></span>
                <span className="home-path__eyebrow">Relaciones documentales</span>
                <h3>¿Qué entidades están conectadas?</h3>
                <p>Filtra vínculos y abre la evidencia que respalda cada relación.</p>
                <b>Abrir explorador <span aria-hidden="true">→</span></b>
              </Link>
              <Link prefetch={false} href="/movimientos" className="home-path home-path--movement">
                <span className="home-path__icon"><Icono nombre="etl" size={16} /></span>
                <span className="home-path__eyebrow">Seguimiento de autoridades</span>
                <h3>¿Qué cambió desde el 11 de marzo?</h3>
                <p>Una lectura rápida del gobierno actual, antes de entrar al historial completo y sus fuentes.</p>
                <div className="home-movement-timeline" aria-label="Línea de tiempo de movimientos desde el 11 de marzo de 2026">
                  <div className="home-movement-timeline__track" aria-hidden="true" />
                  <div className="home-movement-timeline__step"><span>{formatFechaCorta(MOVIMIENTOS_HOME_SUMMARY.desde)}</span><strong>Inicio del periodo</strong></div>
                  <div className="home-movement-timeline__step"><span>{formatFechaCorta(MOVIMIENTOS_HOME_SUMMARY.ultimoEvento)}</span><strong>Último cambio</strong></div>
                  <div className="home-movement-timeline__step"><span>{MOVIMIENTOS_HOME_SUMMARY.diasSinCambios} días</span><strong>sin cambios al corte</strong></div>
                </div>
                <span className="home-path__meta">{MOVIMIENTOS_HOME_SUMMARY.total} movimientos · {MOVIMIENTOS_HOME_SUMMARY.renuncias} renuncias · {MOVIMIENTOS_HOME_SUMMARY.verificados} verificados · {MOVIMIENTOS_HOME_SUMMARY.enConfirmacion} en confirmación</span>
                <b>Ver historial y fuentes <span aria-hidden="true">→</span></b>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal delay={75}>
        <section className="container-main home-discovery" aria-labelledby="discovery-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Territorio y actualidad</p>
              <h2 id="discovery-title">También puedes seguir lo que cambia</h2>
            </div>
            <Link prefetch={false} href="/datos">Ver el catálogo de datos →</Link>
          </div>
          <div className="home-discovery-grid">
            <Link prefetch={false} href="/municipalidades" className="home-discovery-card">
              <span className="home-discovery-card__icon"><Icono nombre="territorio" size={20} /></span>
              <span className="home-discovery-card__label">Municipios</span>
              <strong>346 comunas con ficha territorial</strong>
              <span>Demografía Censo 2024, alcaldías, finanzas y compras públicas.</span>
            </Link>
            <Link prefetch={false} href="/movimientos" className="home-discovery-card">
              <span className="home-discovery-card__icon"><Icono nombre="etl" size={20} /></span>
              <span className="home-discovery-card__label">Actualidad</span>
              <strong>{MOVIMIENTOS_HOME_SUMMARY.renuncias} renuncias desde el 11 de marzo</strong>
              <span>{MOVIMIENTOS_HOME_SUMMARY.verificados} hechos verificados y {MOVIMIENTOS_HOME_SUMMARY.enConfirmacion} en confirmación.</span>
            </Link>
            <Link prefetch={false} href="/municipalidades" className="home-discovery-card">
              <span className="home-discovery-card__icon"><Icono nombre="datos" size={20} /></span>
              <span className="home-discovery-card__label">Datos censales</span>
              <strong>INE Censo 2024 en el territorio</strong>
              <span>Compara población, viviendas y hogares desde la fuente oficial.</span>
            </Link>
          </div>
        </section>
      </Reveal>

      <Reveal delay={100}>
        <section className="container-main home-sources home-featured-votes" aria-labelledby="highlighted-votes-title">
          <div className="home-section-heading">
            <div><p className="eyebrow">Seguimiento legislativo</p><h2 id="highlighted-votes-title">Votaciones destacadas</h2></div>
            <Link prefetch={false} href="/votaciones-destacadas/">Ver selección completa →</Link>
          </div>
          <p className="home-featured-votes__intro">Una selección de proyectos con impacto público, quórum relevante o materias que conviene entender en contexto.</p>
          <div className="home-vote-list">
            {highlightedVotes.map((vote) => (
              <article className="home-vote-row" key={vote.votacion_id}>
                <time dateTime={vote.fecha}>{vote.fecha}</time>
                <div className="home-vote-row__content"><strong>{vote.boletin}</strong><h3>{tituloVotacionLegible(vote)}</h3><p>{vote.resumen}</p><span>{vote.camara}</span></div>
                <span className="home-vote-row__result" data-result={vote.resultado}>{vote.resultado}</span>
              </article>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={150}>
        <section className="container-main home-sources" aria-labelledby="sources-title">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">Estado de datos / catálogo vivo</p>
              <h2 id="sources-title">{operationalSources.length} fuentes con registros disponibles</h2>
            </div>
            <Link prefetch={false} href="/datos">Revisar todas las fuentes →</Link>
          </div>
          <p className="home-sources__intro">Cada tarjeta indica qué fuente está conectada, cuántos registros tiene disponibles y dónde continuar la revisión.</p>
          <div className="home-source-grid">
            {operationalSources.map((source, sourceIndex) => (
              <Link prefetch={false} className="home-source-card" href={source.viewLink} key={source.id}>
                <div className="home-source-card__top"><span className="home-source-card__number">{String(sourceIndex + 1).padStart(2, "0")}</span><span className="home-source-card__status" data-status={source.status}><span aria-hidden="true" />{source.statusText || "Disponible"}</span></div>
                <h3>{source.name}</h3>
                <p>{source.organization}</p>
                <div className="home-source-card__metric"><strong>{source.recordCount.toLocaleString("es-CL")}</strong><span>registros disponibles</span></div>
                <div className="home-source-card__footer"><span>{source.frequency}</span><b>Explorar <span aria-hidden="true">↗</span></b></div>
              </Link>
            ))}
          </div>
          <p className="home-coverage-note">
            <strong>Cómo leer este catálogo.</strong> Son 12 fuentes oficiales con registros disponibles; sus cortes pueden tener cobertura parcial declarada por el organismo. Los pipelines operan de forma automatizada y cada ficha conserva la trazabilidad al portal de origen. <Link prefetch={false} href="/fuentes">Ver metodología y fuentes →</Link>
          </p>
        </section>
      </Reveal>
    </div>
  );
}

