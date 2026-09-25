import { describe, expect, it } from "vitest";
import { createPoliticoSeoMetadata } from "./politico-seo-metadata";

describe("metadatos SEO de fichas parlamentarias", () => {
  it("usa un título neutral y una descripción distinta que explica los registros consultables", () => {
    const metadata = createPoliticoSeoMetadata({
      name: "Javiera Morales Alvarado",
      canonicalSlug: "javiera-morales-alvarado",
      ogImage: "https://cambiometro.impulsacv.cl/api/og/dip-999",
    });

    expect(metadata.title).toBe("Javiera Morales Alvarado: ficha pública | El Cambiómetro");
    expect(metadata.description).toBe(
      "Consulta registros de asistencia, votaciones y rendiciones publicados para Javiera Morales Alvarado. Revisa períodos y fuentes oficiales en El Cambiómetro.",
    );
    expect(metadata.description).not.toBe(metadata.title);
    expect(metadata.alternates?.canonical).toBe(
      "https://cambiometro.impulsacv.cl/politico/javiera-morales-alvarado/",
    );
  });
});
