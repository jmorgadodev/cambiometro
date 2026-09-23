import type { Metadata } from "next";
import "./home-editorial.css";
import { GLOBAL_KPIS } from "@/lib/global-kpis";
import { ETL_SOURCES_DATA } from "@/lib/etl-sources-data";
import { getStaticEntityCatalog } from "@/lib/static-entity-catalog";
import { getHomeFeaturedVotes, getVotingFreshness, getVotacionesAnuales } from "@/lib/votaciones-destacadas";
import { MOVIMIENTOS, MOVIMIENTOS_HOME_SUMMARY, MOVIMIENTOS_PIPELINE_METADATA } from "@/lib/movimientos";
import { formatFechaCorta } from "@/lib/format";
import { getLandingSummary, sourceKeyForHomeSource } from "@/lib/landing-summary-runtime";
import { buildEditorialChapters, buildEditorialMovements, buildEditorialVotes } from "@/lib/home-editorial-adapter";

import { Hero } from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";
import { MetricsBar } from "@/components/home/MetricsBar";
import { QuestionsGrid } from "@/components/home/QuestionsGrid";
import { MovementsTimeline } from "@/components/home/MovementsTimeline";
import { FeaturedVotes } from "@/components/home/FeaturedVotes";
import { TerritorialBlock } from "@/components/home/TerritorialBlock";
import { SourcesCatalog } from "@/components/home/SourcesCatalog";
import { IndependenceCallout } from "@/components/home/IndependenceCallout";

export const dynamic = "force-static";

const VOTING_FRESHNESS = getVotingFreshness();
const HOME_FEATURED_VOTE_IDS = [
  "senado-vot-11264",
  "camara-vot-89844",
  "senado-vot-11274",
  "camara-vot-89749",
  "camara-vot-89750",
] as const;

function formatVotingDate(value: string | null) {
  if (!value) return "Sin fecha publicada";
  const date = value.slice(0, 10);
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function formatLandingDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(value));
}

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

export default async function HomePage() {
  const landingSummary = getLandingSummary();
  const sourceSnapshots = new Map(landingSummary.sources.map((source) => [source.id, source]));
  const homeSources = ETL_SOURCES_DATA.map((source) => {
    const sourceKey = sourceKeyForHomeSource(source.id);
    const snapshot = sourceKey ? sourceSnapshots.get(sourceKey) : undefined;
    if (!snapshot || snapshot.recordCount <= 0) return source;
    return {
      ...source,
      recordCount: snapshot.recordCount,
      lastUpdated: snapshot.generatedAt ?? source.lastUpdated,
      lastUpdatedRelative: snapshot.generatedAt
        ? `Corte ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(snapshot.generatedAt))}`
        : source.lastUpdatedRelative,
      status: snapshot.status === "complete" ? "operational" : source.status,
      statusText: snapshot.status === "complete" ? "Cobertura completa" : source.statusText,
    };
  }).filter((source) => source.recordCount > 0);

  const operationalSources = homeSources;
  const entityCount = getStaticEntityCatalog().total || GLOBAL_KPIS.entidades;
  const editorialVotes = buildEditorialVotes(getHomeFeaturedVotes(HOME_FEATURED_VOTE_IDS), getVotacionesAnuales());
  const editorialMovements = buildEditorialMovements(MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA.signals);
  const eventDates = [...new Set(MOVIMIENTOS.filter((movement) => movement.fecha >= MOVIMIENTOS_HOME_SUMMARY.desde).map((movement) => movement.fecha))].sort();
  const daysBetweenChanges = eventDates.length > 1
    ? Math.round((Date.parse(`${eventDates.at(-1)}T12:00:00Z`) - Date.parse(`${eventDates[0]}T12:00:00Z`)) / 86_400_000 / (eventDates.length - 1) * 10) / 10
    : 0;

  return (
    <div className="home-desk min-h-screen bg-background text-text-1 transition-colors duration-200">
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

      {/* 1. Hero Asimétrico con Slider Arquitectónico y Nota Editorial Adhesiva */}
      <Hero />

      {/* 2. Buscador Cívico Flotante con Autocompletado Inteligente */}
      <SearchBar />

      {/* 3. Barra de Métricas Globales con Odómetro / Contador Analógico */}
      <MetricsBar
        metrics={{
          registros: GLOBAL_KPIS.registros_canonicos,
          fuentes: operationalSources.length,
          entidades: entityCount,
          votaciones: GLOBAL_KPIS.votaciones,
          relaciones: GLOBAL_KPIS.relaciones,
        }}
      />

      {/* 4. Mesa de Análisis Cívico: Empieza por una Pregunta */}
      <QuestionsGrid availableSourceCount={operationalSources.length} />

      {/* 5. Lo Último que Cambió en el Estado: Monolito Cívico y Timeline */}
      <MovementsTimeline
        total={MOVIMIENTOS_HOME_SUMMARY.total}
        renuncias={MOVIMIENTOS_HOME_SUMMARY.renuncias}
        diasSinCambios={MOVIMIENTOS_HOME_SUMMARY.diasSinCambios}
        ultimoCambioEfectivo={MOVIMIENTOS_HOME_SUMMARY.ultimoCambioEfectivo}
        diasEntreCambios={daysBetweenChanges}
        desde={formatFechaCorta(MOVIMIENTOS_HOME_SUMMARY.desde)}
        ultimoEvento={formatFechaCorta(MOVIMIENTOS_HOME_SUMMARY.ultimoEvento)}
        ultimaRevision={formatFechaCorta(MOVIMIENTOS_PIPELINE_METADATA.last_success_at ?? MOVIMIENTOS_HOME_SUMMARY.ultimoCorte)}
        movements={editorialMovements}
      />

      {/* 6. Votaciones Destacadas en el Congreso: Fichas de Hemiciclo y Spotlight */}
      <FeaturedVotes
        votes={editorialVotes}
        reviewedAt={formatVotingDate(VOTING_FRESHNESS.reviewedAt)}
        latestVoteDate={formatVotingDate(VOTING_FRESHNESS.latestVoteDate)}
      />

      {/* 7. Cobertura Territorial Nacional: 346 Municipios y GOREs */}
      <TerritorialBlock
        municipios={346}
        gobReg={16}
        renuncias={MOVIMIENTOS_HOME_SUMMARY.renuncias}
        verificados={MOVIMIENTOS_HOME_SUMMARY.verificados}
        enConfirmacion={MOVIMIENTOS_HOME_SUMMARY.enConfirmacion}
      />

      {/* 8. Gran Libro Mayor de Fuentes Oficiales (Ledger de Auditoría) */}
      <SourcesCatalog
        chapters={buildEditorialChapters(operationalSources)}
        totalSources={operationalSources.length}
        totalRecords={GLOBAL_KPIS.registros_canonicos}
        dataUpdatedAt={formatLandingDate(landingSummary.dataUpdatedAt)}
      />

      {/* 9. Llamado de Independencia Técnica y Transparencia Ética */}
      <IndependenceCallout />
    </div>
  );
}
