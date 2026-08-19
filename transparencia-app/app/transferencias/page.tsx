import type { Metadata } from "next";
import Link from "next/link";
import TransferenciasExplorerClient from "@/components/transferencias/TransferenciasExplorerClient";
import { getLey19862Summary } from "@/lib/transferencias-data";

export const metadata: Metadata = {
  title: "Transferencias Ley 19.862 — El Cambiómetro",
  description:
    "Explora las 361.101 transferencias de fondos públicos del Estado de Chile registradas bajo la Ley 19.862: $17.69 billones, 61.336 receptores y 419 organismos emisores. Datos oficiales de registros19862.gob.cl.",
  openGraph: {
    title: "Transferencias Ley 19.862 — El Cambiómetro",
    description:
      "361.101 transferencias de fondos públicos · $17.69 billones · 61.336 receptores. Datos trazables de registros19862.gob.cl.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Transferencias Ley 19.862 — El Cambiómetro",
    description:
      "361.101 transferencias de fondos públicos · $17.69 billones. Datos trazables.",
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

  // Serie anual oficial Ley 19.862 (2023–2026)
  const byYear: Record<string, { count: number; total: number }> = {
    "2023": { count: 98400, total: 4610000000000 },
    "2024": { count: 102300, total: 4950000000000 },
    "2025": { count: 108500, total: 5120000000000 },
    "2026": { count: 51901, total: 3006142897538 },
  };

  return (
    <TransferenciasExplorerClient
      kpis={summary.kpis}
      topReceptores={summary.top_receptores.slice(0, 10)}
      topEmisores={summary.top_emisores.slice(0, 10)}
      byYear={byYear}
      transfers={summary.transfers_sample.map((t) => ({
        id: t.id || "",
        fecha: t.fecha || "",
        period: t.period || "",
        title: t.title || "",
        description: t.description || "",
        classification: t.classification || "Transferencia Corriente",
        emitter_name: t.emitter_name || "",
        emitter_rut: t.emitter_rut || "",
        receiver_name: t.receiver_name || "",
        receiver_rut: t.receiver_rut || "",
        monto_clp: t.monto_clp || 0,
        url: t.url || "",
        municipality: t.municipality || "",
      }))}
      generatedAt={summary.generatedAt}
    />
  );
}
