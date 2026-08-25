import type { Metadata } from "next";
import Link from "next/link";
import { getLey19862Summary } from "@/lib/transferencias-data";
import { queryTransferencias } from "@/lib/transferencias-d1";
import TransferenciasExplorerClient from "@/components/transferencias/TransferenciasExplorerClient";

export const metadata: Metadata = {
  title: "Transferencias Ley 19.862 — El Cambiómetro",
  description:
    "Explora las transferencias de fondos públicos del Estado de Chile registradas bajo la Ley 19.862, con cobertura y trazabilidad a la fuente oficial registros19862.gob.cl.",
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

export default async function TransferenciasPage() {
  const summary = getLey19862Summary();
  const initialRowsPerPage = 10;

  const queryResult = await queryTransferencias({
    page: 1,
    limit: initialRowsPerPage,
    search: "",
    year: "",
    emisor: "",
    sortBy: "monto",
    sortOrder: "desc",
  });

  return (
    <TransferenciasExplorerClient
      kpis={queryResult.kpis}
      topReceptores={summary.top_receptores.slice(0, 10)}
      topEmisores={summary.top_emisores.slice(0, 10)}
      byYear={queryResult.by_year}
      initialTransfers={queryResult.data}
      initialTotal={queryResult.total}
      initialTotalPages={queryResult.totalPages}
      initialPage={queryResult.page}
      initialPageSize={initialRowsPerPage}
      initialQuery=""
      initialYear="Todos"
      initialEmisor="Todos"
      generatedAt={summary.generatedAt}
    />
  );
}
