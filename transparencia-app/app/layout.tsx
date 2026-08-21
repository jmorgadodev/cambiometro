export const revalidate = 300;
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import PageEntrance from "@/components/PageEntrance";
import CookieConsent, { CookiePreferencesButton } from "@/components/CookieConsent";
import NavigationProgressBar from "@/components/NavigationProgressBar";
import { getDataPlatformSummary } from "@/lib/data-platform-d1";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cambiometro.impulsacv.cl"),
  applicationName: "El Cambiómetro",
  category: "government data",
  title: {
    default: "El Cambiómetro — Datos públicos con trazabilidad",
    template: "%s | El Cambiómetro",
  },
  description:
    "Explora autoridades, instituciones y nóminas públicas de Chile con fecha de corte, procedencia y enlaces a sus fuentes.",
  keywords: [
    "transparencia",
    "Chile",
    "datos públicos",
    "autoridades",
    "diputados",
    "senadores",
    "municipalidades",
    "funcionarios públicos",
  ],
  authors: [{ name: "ImpulsaCV", url: "https://impulsacv.cl" }],
  creator: "ImpulsaCV",
  publisher: "ImpulsaCV",
  formatDetection: { address: false, email: false, telephone: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "El Cambiómetro",
    title: "El Cambiómetro — Datos públicos con trazabilidad",
    description:
      "Autoridades, instituciones y nóminas públicas de Chile conectadas con su fecha de corte y fuente.",
    images: [{ url: "/api/og/site", width: 1200, height: 630, alt: "El Cambiómetro" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@cambiometro",
    creator: "@cambiometro",
    title: "El Cambiómetro — Datos públicos con trazabilidad",
    description: "Datos públicos de Chile con fecha de corte, procedencia y cruce documental.",
    images: ["/api/og/site"],
  },
  robots: { index: true, follow: true },
};

const FOOTER_GROUPS = [
  {
    title: "Explorar",
    links: [
      ["Análisis Parlamentario", "/politico"],
      ["Partidos Políticos", "/partidos"],
      ["Directorio de Personas", "/autoridades"],
      ["Municipalidades", "/municipalidades"],
      ["Funcionarios", "/funcionarios"],
      ["Servicios públicos", "/servicios-publicos"],
    ],
  },
  {
    title: "Herramientas",
    links: [
      ["Cruces de datos", "/cruces"],
      ["Rankings", "/rankings"],
      ["Comparador", "/comparar"],
      ["Movimientos", "/movimientos"],
      ["Cambios de autoridades", "/cambios"],
    ],
  },
  {
    title: "Plataforma",
    links: [
      ["Fuentes oficiales", "/datos"],
      ["Cómo usamos los datos", "/como-funciona"],
      ["Fuentes y versiones", "/fuentes"],
      ["Política de Privacidad", "/privacidad"],
      ["Donar y apoyar", "/donar"],
      ["Instagram @cambiometro", "https://www.instagram.com/cambiometro/"],
      ["𝕏 Twitter / X @cambiometro", "https://x.com/cambiometro"],
      ["ImpulsaCV", "https://impulsacv.cl"],
    ],
  },
] as const;

import { GLOBAL_KPIS } from "@/lib/global-kpis";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const platform = await getDataPlatformSummary();
  const totalRecords = Math.max(platform.totalRecords || 0, GLOBAL_KPIS.registros_canonicos);
  const updatedAt = platform.updatedAt
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(platform.updatedAt))
    : GLOBAL_KPIS.corte;

  return (
    <html lang="es" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body className="font-sans">
        <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <Suspense fallback={<div className="site-header site-header--fallback" aria-hidden="true" />}>
          <SiteHeader updatedAt={updatedAt} totalRecords={totalRecords} />
        </Suspense>
        <PageEntrance>
          <main id="contenido-principal">{children}</main>
        </PageEntrance>
        <Footer updatedAt={updatedAt} totalRecords={totalRecords} />
        <CookieConsent />
      </body>
    </html>
  );
}

function Footer({ updatedAt, totalRecords }: { updatedAt: string | null; totalRecords: number }) {
  return (
    <footer className="site-footer">
      <div className="container-main site-footer__grid">
        <div className="site-footer__about">
          <Link href="/" className="site-brand site-brand--footer" aria-label="El Cambiómetro, inicio">
            <Image
              src="/brand/el-cambiometro-mark.svg"
              alt="Símbolo dial El Cambiómetro"
              width={28}
              height={28}
              className="site-brand__dial"
            />
            <div className="site-brand__text">
              <strong>EL CAMBIÓMETRO</strong>
              <small>PLATAFORMA DE DATOS PÚBLICOS</small>
            </div>
          </Link>
          <p className="site-footer__mission">
            Plataforma ciudadana independiente que compila, consolida y visualiza información de fuentes públicas
            oficiales del Estado de Chile para facilitar la fiscalización y transparencia.
          </p>
          <div className="provenance-stamp">
            <div className="provenance-stamp__header">
              <span className="snapshot-stamp__status" aria-hidden="true" />
              <span>Última consolidación</span>
            </div>
            <strong>{updatedAt ? `Corte ${updatedAt}` : "Corte oficial"}</strong>
            <small>{totalRecords.toLocaleString("es-CL")} registros oficiales compilados</small>
          </div>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="site-footer__nav">
            <h2 className="site-footer__title">{group.title}</h2>
            <ul className="site-footer__list">
              {group.links.map(([label, href]) => (
                <li key={href}>
                  {href.startsWith("http") ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="site-footer__link"
                    >
                      <span>{label}</span>
                      <span aria-hidden="true" style={{ fontSize: "0.75rem", opacity: 0.7 }}>↗</span>
                    </a>
                  ) : (
                    <Link href={href} className="site-footer__link">
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="site-footer__legal-wrap">
        <div className="container-main site-footer__legal">
          <span>© 2026 El Cambiómetro · Información pública verificada</span>
          <span className="site-footer__legal-links">
            <span>
              Desarrollado por{" "}
              <a href="https://impulsacv.cl" target="_blank" rel="noopener noreferrer">
                ImpulsaCV ↗
              </a>
            </span>
            <span className="site-footer__dot" aria-hidden="true">
              ·
            </span>
            <a href="https://www.instagram.com/cambiometro/" target="_blank" rel="noopener noreferrer">
              Instagram @cambiometro
            </a>
            <span className="site-footer__dot" aria-hidden="true">
              ·
            </span>
            <a href="https://x.com/cambiometro" target="_blank" rel="noopener noreferrer">
              𝕏 @cambiometro
            </a>
            <span className="site-footer__dot" aria-hidden="true">
              ·
            </span>
            <CookiePreferencesButton className="site-footer__link" />
          </span>
        </div>
      </div>
    </footer>
  );
}
