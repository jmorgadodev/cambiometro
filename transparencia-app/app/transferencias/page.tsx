import type { Metadata } from "next";
import { getStaticTransferencias } from "@/lib/transferencias-static";
import TransferenciasExplorerClient from "@/components/transferencias/TransferenciasExplorerClient";

export const metadata: Metadata = {
  title: "Transferencias Ley 19.862 — El Cambiómetro",
  description:
    "Explora transferencias de fondos públicos del Estado de Chile registradas bajo la Ley 19.862, con cobertura y trazabilidad a la fuente oficial registros19862.gob.cl.",
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

export const dynamic = "force-static";

export default async function TransferenciasPage() {
  const staticData = getStaticTransferencias();
  const summary = staticData.summary;
  const initialRowsPerPage = 10;
  const initialTransfers = staticData.initialTransfers.slice(0, initialRowsPerPage);
  const initialTotal = staticData.manifest?.totalRows ?? summary.kpis.total_transfers;
  const initialTotalPages = staticData.manifest?.totalPages ?? Math.max(1, Math.ceil(initialTotal / initialRowsPerPage));

  return (
    <TransferenciasExplorerClient
      kpis={summary.kpis}
      topReceptores={summary.top_receptores.slice(0, 10)}
      topEmisores={summary.top_emisores.slice(0, 10)}
      byYear={summary.by_year}
      initialTransfers={initialTransfers}
      initialTotal={initialTotal}
      initialTotalPages={initialTotalPages}
      initialPage={1}
      initialPageSize={initialRowsPerPage}
      initialQuery=""
      initialYear="Todos"
      initialEmisor="Todos"
      generatedAt={summary.generatedAt}
    />
  );
}
