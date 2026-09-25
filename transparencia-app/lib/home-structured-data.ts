type SchemaReference = { "@id": string };

type HomeStructuredDataNode = {
  "@id": string;
  "@type": "WebSite" | "Organization";
  name: string;
  url: string;
  description?: string;
  logo?: string;
  sameAs?: readonly string[];
  publisher?: SchemaReference;
  about?: SchemaReference;
};

const cambiómetroProfiles = [
  "https://www.instagram.com/cambiometro/",
  "https://x.com/cambiometro",
  "https://www.tiktok.com/@cambiometro",
  "https://www.facebook.com/profile.php?id=61593925561451",
] as const;

const impulsaCvProfiles = [
  "https://www.instagram.com/impulsacv/",
  "https://www.linkedin.com/company/impulsacv/",
  "https://www.facebook.com/profile.php?id=61569823995283",
] as const;

export const HOME_STRUCTURED_DATA: {
  "@context": "https://schema.org";
  "@graph": readonly HomeStructuredDataNode[];
} = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": "https://cambiometro.impulsacv.cl/#website",
      "@type": "WebSite",
      name: "El Cambiómetro",
      url: "https://cambiometro.impulsacv.cl/",
      publisher: { "@id": "https://impulsacv.cl/#organization" },
      about: { "@id": "https://cambiometro.impulsacv.cl/#organization" },
    },
    {
      "@id": "https://cambiometro.impulsacv.cl/#organization",
      "@type": "Organization",
      name: "El Cambiómetro",
      url: "https://cambiometro.impulsacv.cl/",
      description:
        "Plataforma ciudadana independiente que compila y visualiza información de fuentes públicas oficiales de Chile para facilitar la fiscalización y la transparencia.",
      logo: "https://cambiometro.impulsacv.cl/brand/el-cambiometro-avatar.png",
      sameAs: cambiómetroProfiles,
    },
    {
      "@id": "https://impulsacv.cl/#organization",
      "@type": "Organization",
      name: "ImpulsaCV",
      url: "https://impulsacv.cl/",
      sameAs: impulsaCvProfiles,
    },
  ],
};
