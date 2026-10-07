import type { Metadata } from "next";
import PublicationScopeNotice from "@/components/data/PublicationScopeNotice";

export const metadata: Metadata = {
  title: "Movimientos de Autoridades — El Cambiómetro",
  description:
    "Anuncios documentados y cambios de autoridades, con fuentes públicas y confirmación legal diferenciada por caso.",
  alternates: {
    canonical: "/movimientos",
  },
  openGraph: {
    title: "Movimientos de Autoridades — El Cambiómetro",
    description:
      "Anuncios documentados y cambios de autoridades, con fuentes públicas y confirmación legal diferenciada por caso.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Movimientos de Autoridades — El Cambiómetro",
    description:
      "Anuncios documentados y cambios de autoridades, con fuentes públicas y confirmación legal diferenciada por caso.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default function MovimientosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <><PublicationScopeNotice area="movimientos" />{children}</>;
}
