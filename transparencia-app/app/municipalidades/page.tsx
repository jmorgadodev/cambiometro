import { Suspense } from "react";
import type { Metadata } from "next";
import { getMunicipalidadesList, getMunicipalidadesStats } from "@/lib/municipalidades-list";
import { coverageMetric, readGeneratedDataQualitySummary } from "@/lib/data-quality-summary";
import MunicipalidadesExplorerClient from "@/components/municipalidades/MunicipalidadesExplorerClient";

export const metadata: Metadata = {
  title: "Directorio de Municipalidades de Chile — Presupuestos SINIM, Dotación CPLT y Alcaldes | El Cambiómetro",
  description: "Explorador oficial de las 346 municipalidades de Chile: presupuestos vigentes SINIM, gasto en personal, sueldos de alcaldes, dependencia FCM, concejos municipales SERVEL 2024 y compras públicas OCDS.",
  alternates: { canonical: "/municipalidades" },
  openGraph: {
    title: "Directorio de Municipalidades de Chile — El Cambiómetro",
    description: "Presupuestos SINIM, dotaciones de personal CPLT y sueldos de autoridades de las 346 comunas de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Directorio de Municipalidades de Chile — El Cambiómetro",
    description: "Presupuestos SINIM, dotaciones de personal CPLT y sueldos de autoridades de las 346 comunas de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default function MunicipalidadesPage() {
  const allData = getMunicipalidadesList();
  const stats = getMunicipalidadesStats();
  const dataSummary = readGeneratedDataQualitySummary();
  const municipalSources = dataSummary.sources.filter((source) => ["sinim", "ine-censo-2024", "transparencia-activa", "chilecompra"].includes(source.id));
  const municipalRelease = {
    source: "SINIM, Censo 2024, CPLT y ChileCompra",
    period: municipalSources.map((source) => source.period).filter(Boolean).join(" · ") || "Corte publicado",
    lastSuccessAt: dataSummary.generatedAt,
    status: municipalSources.some((source) => source.status === "no_disponible") || (stats.nominaSinDatosCount ?? 0) > 0
      ? "parcial" as const
      : "completo" as const,
    published: coverageMetric(allData.length, 346),
    queryable: coverageMetric(allData.length, 346),
    related: coverageMetric(null, null),
    checksumSha256: dataSummary.manifestChecksumSha256 ?? null,
    officialUrl: municipalSources.find((source) => source.id === "sinim")?.officialUrl,
    payrollCoverage: {
      published: stats.nominaPublicadaCount ?? 0,
      unavailable: stats.nominaSinDatosCount ?? 0,
      notApplicable: stats.territorioNoAplicableCount ?? 0,
      totalTerritories: allData.length,
    },
  };

  return (
    <Suspense
      fallback={
        <div className="container-main" style={{ padding: "2rem 0", minHeight: "60vh" }}>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 900,
              color: "var(--text-1)",
              margin: "0 0 0.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Directorio de las 346 Municipalidades
          </h1>
          <p style={{ color: "var(--text-2)" }}>Cargando catálogo oficial de 346 comunas...</p>
        </div>
      }
    >
      <MunicipalidadesExplorerClient initialData={allData} stats={stats} release={municipalRelease} />
    </Suspense>
  );
}
