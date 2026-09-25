import type { Metadata } from "next";

interface PoliticoSeoInput {
  name: string;
  canonicalSlug: string;
  ogImage: string;
}

export function createPoliticoSeoMetadata({
  name,
  canonicalSlug,
  ogImage,
}: PoliticoSeoInput): Metadata {
  const title = `${name}: ficha pública | El Cambiómetro`;
  const description = `Consulta registros de asistencia, votaciones y rendiciones publicados para ${name}. Revisa períodos y fuentes oficiales en El Cambiómetro.`;
  const canonical = `https://cambiometro.impulsacv.cl/politico/${canonicalSlug}/`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
