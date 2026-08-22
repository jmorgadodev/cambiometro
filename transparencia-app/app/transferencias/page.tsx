import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import LoadingOrb from "@/components/LoadingOrb";
import { getLey19862Summary } from "@/lib/transferencias-data";

const TransferenciasExplorerClient = dynamic(
  () => import("@/components/transferencias/TransferenciasExplorerClient"),
  {
    loading: () => <LoadingOrb size={52} label="Cargando transferencias..." />,
  }
);

export const metadata: Metadata = {
  title: "Transferencias Ley 19.862 — El Cambiómetro",
  description:
    "Explora las transferencias de fondos públicos del Estado de Chile registradas bajo la Ley 19.862, con cobertura y trazabilidad a la fuente oficial.",
  openGraph: {
    title: "Transferencias Ley 19.862 — El Cambiómetro",
    description:
      "Transferencias de fondos públicos con cobertura declarada y trazabilidad a registros19862.gob.cl.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Transferencias Ley 19.862 — El Cambiómetro",
    description:
      "Transferencias de fondos públicos con datos oficiales trazables.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  alternates: { canonical: "/transferencias" },
};

export default function TransferenciasPage() {
  const summary = getLey19862Summary();

  if (!summary || !summary.kpis) {
    return (
      <main style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1>Datos de transferencias no disponibles</h1>
        <p>
          El archivo de resumen de la Ley 19.862 no está disponible en este entorno.
        </p>
        <Link href="/" style={{ color: "var(--accent)" }}>
          ← Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <TransferenciasExplorerClient
      kpis={summary.kpis}
      topReceptores={summary.top_receptores.slice(0, 10)}
      topEmisores={summary.top_emisores.slice(0, 10)}
      byYear={summary.by_year}
      transfers={summary.transfers_sample.map((t) => ({
        ...t,
      }))}
      generatedAt={summary.generatedAt}
    />
  );
}
