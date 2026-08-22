import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Movimientos de Autoridades — El Cambiómetro",
  description:
    "Registro y trazabilidad de cambios, renuncias, remociones y designaciones de altas autoridades del Estado de Chile con verificación oficial.",
  alternates: {
    canonical: "/movimientos",
  },
  openGraph: {
    title: "Movimientos de Autoridades — El Cambiómetro",
    description:
      "Registro y trazabilidad de cambios, renuncias, remociones y designaciones de altas autoridades del Estado de Chile con verificación oficial.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Movimientos de Autoridades — El Cambiómetro",
    description:
      "Registro y trazabilidad de cambios, renuncias, remociones y designaciones de altas autoridades del Estado de Chile con verificación oficial.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default function MovimientosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
