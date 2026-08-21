import { Suspense } from "react";
import type { Metadata } from "next";
import { getMunicipalidadesList, getMunicipalidadesStats } from "@/lib/municipalidades-list";
import MunicipalidadesExplorerClient from "@/components/municipalidades/MunicipalidadesExplorerClient";
import { ListadoSkeleton } from "@/components/ui/Skeleton";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Directorio de Municipalidades de Chile — Presupuestos SINIM, Dotación CPLT y Alcaldes | El Cambiómetro",
  description: "Explorador oficial de las 346 municipalidades de Chile: presupuestos vigentes SINIM, gasto en personal, sueldos de alcaldes, dependencia FCM, concejos municipales SERVEL 2024 y compras públicas OCDS.",
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

  return (
    <Suspense fallback={<ListadoSkeleton title="Cargando directorio de 346 municipalidades..." cardsCount={8} />}>
      <MunicipalidadesExplorerClient initialData={allData} stats={stats} />
    </Suspense>
  );
}
