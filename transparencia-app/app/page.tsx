import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import FeaturedVotes from "@/components/home/FeaturedVotes";
import Hero from "@/components/home/Hero";
import MetricsBar from "@/components/home/MetricsBar";
import MovementsTimeline from "@/components/home/MovementsTimeline";
import QuestionsGrid from "@/components/home/QuestionsGrid";
import SourcesCatalog from "@/components/home/SourcesCatalog";
import TerritorialBlock from "@/components/home/TerritorialBlock";
import type { HomeMetric, HomeSource, HomeVote } from "@/components/home/types";
import { GLOBAL_KPIS, KPI_SCOPES } from "@/lib/global-kpis";
import { getDataQualityDashboardData } from "@/lib/data-quality-dashboard";
import { getStaticEntityCatalog } from "@/lib/static-entity-catalog";
import { getHomeFeaturedVotes, getVotingFreshness } from "@/lib/votaciones-destacadas";
import { tituloVotacionLegible } from "@/lib/votaciones-format";
import { MOVIMIENTOS_HOME_SUMMARY } from "@/lib/movimientos";
import { formatFechaCorta } from "@/lib/format";
import { getLandingSummary } from "@/lib/landing-summary-runtime";

export const dynamic = "force-static";

const VOTING_FRESHNESS = getVotingFreshness();

function formatVotingDate(value: string | null) {
  if (!value) return "Sin fecha publicada";
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function formatLandingDate(value: string | null) {
  if (!value) return "Sin fecha publicada";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(value));
}

// Selección editorial estable: impacto público, quórum relevante y diversidad de materias.
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

const HOME_KPIS: HomeMetric[] = [
  { key: "registros_canonicos", value: GLOBAL_KPIS.registros_canonicos, label: KPI_SCOPES.registros_canonicos.label, tooltip: KPI_SCOPES.registros_canonicos.tooltip, href: KPI_SCOPES.registros_canonicos.href },
  { key: "entidades", value: GLOBAL_KPIS.entidades, label: KPI_SCOPES.entidades.label, tooltip: KPI_SCOPES.entidades.tooltip, href: KPI_SCOPES.entidades.href },
  { key: "relaciones", value: GLOBAL_KPIS.relaciones, label: KPI_SCOPES.relaciones.label, tooltip: KPI_SCOPES.relaciones.tooltip, href: KPI_SCOPES.relaciones.href },
  { key: "votaciones", value: GLOBAL_KPIS.votaciones, label: KPI_SCOPES.votaciones.label, tooltip: KPI_SCOPES.votaciones.tooltip, href: KPI_SCOPES.votaciones.href },
  { key: "gastos", value: GLOBAL_KPIS.gastos, label: KPI_SCOPES.gastos.label, tooltip: KPI_SCOPES.gastos.tooltip, href: KPI_SCOPES.gastos.href },
];

export default async function HomePage() {
  const landingSummary = getLandingSummary();
  const { sources: qualitySources } = await getDataQualityDashboardData();
  const sources: HomeSource[] = qualitySources
    .filter((source) => source.canonicalCount > 0)
    .map((source) => ({
      id: source.id,
      name: source.name,
      organization: source.organization,
      recordCount: source.canonicalCount,
      frequency: source.frequency,
      status: source.status,
      statusText: source.statusLabel,
      viewLink: source.modulePath,
    }));
  const entityCount = getStaticEntityCatalog().total;
  const metrics = HOME_KPIS.map((metric) => metric.key === "entidades" ? { ...metric, value: entityCount || metric.value } : metric);
  const votes: HomeVote[] = getHomeFeaturedVotes(HOME_FEATURED_VOTE_IDS).map((vote) => ({
    id: vote.votacion_id,
    date: vote.fecha,
    bulletin: vote.boletin,
    title: tituloVotacionLegible(vote),
    summary: vote.resumen,
    chamber: vote.camara,
    result: vote.resultado,
  }));
  const updatedAt = formatLandingDate(landingSummary.dataUpdatedAt);

  return (
    <div className="editorial-home">
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "El Cambiómetro",
        url: "https://cambiometro.impulsacv.cl",
        publisher: { "@type": "Organization", name: "ImpulsaCV", url: "https://impulsacv.cl" },
      })}</script>
      <Hero updatedAt={updatedAt} records={GLOBAL_KPIS.registros_canonicos} entities={entityCount} sourceCount={sources.length} />
      <MetricsBar metrics={metrics} />
      <Reveal><QuestionsGrid /></Reveal>
      <Reveal delay={50}>
        <MovementsTimeline summary={MOVIMIENTOS_HOME_SUMMARY} startLabel={formatFechaCorta(MOVIMIENTOS_HOME_SUMMARY.desde)} lastEventLabel={formatFechaCorta(MOVIMIENTOS_HOME_SUMMARY.ultimoEvento)} />
      </Reveal>
      <Reveal delay={75}><TerritorialBlock renuncias={MOVIMIENTOS_HOME_SUMMARY.renuncias} verificados={MOVIMIENTOS_HOME_SUMMARY.verificados} enConfirmacion={MOVIMIENTOS_HOME_SUMMARY.enConfirmacion} /></Reveal>
      <Reveal delay={100}><FeaturedVotes votes={votes} reviewedAt={formatVotingDate(VOTING_FRESHNESS.reviewedAt)} latestVoteDate={formatVotingDate(VOTING_FRESHNESS.latestVoteDate)} /></Reveal>
      <Reveal delay={150}><SourcesCatalog sources={sources} updatedAt={updatedAt} /></Reveal>
    </div>
  );
}
