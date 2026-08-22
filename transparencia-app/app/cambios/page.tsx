import type { Metadata } from "next";
import CambiometroFeed from "@/components/CambiometroFeed";
import { getSnapshotSummary } from "@/lib/data-source";
import { CAMBIOS_VERIFICADOS } from "@/lib/public-changes";

export const metadata: Metadata = {
  title: "Cambios verificados — El Cambiómetro",
  description:
    "Registro editorial de cambios de período y alertas que cuentan con una fuente pública verificable.",
  alternates: {
    canonical: "/cambios",
  },
  openGraph: {
    title: "Cambios verificados — El Cambiómetro",
    description:
      "Registro editorial de cambios de período y alertas que cuentan con una fuente pública verificable.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cambios verificados — El Cambiómetro",
    description:
      "Registro editorial de cambios de período y alertas que cuentan con una fuente pública verificable.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default function CambiosPage() {
  const snapshot = getSnapshotSummary();

  return (
    <div className="page-shell">
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <p className="eyebrow">Registro editorial · no es un feed en vivo</p>
            <h1>El Cambiómetro</h1>
            <p>
              Cambios de período y alertas publicados solo cuando su identidad, fecha y fuente
              pueden ser verificadas.
            </p>
          </div>
          <dl className="page-fact-sheet">
            <div><dt>Actualización ETL</dt><dd>Semanal</dd></div>
            <div><dt>Último corte</dt><dd>{snapshot.generatedAtChile ?? "No disponible"}</dd></div>
            <div><dt>Estado</dt><dd>Snapshot auditable</dd></div>
          </dl>
        </div>
      </header>

      <div className="container-main page-layout-narrow">
        <CambiometroFeed cambios={CAMBIOS_VERIFICADOS} />
      </div>
    </div>
  );
}
