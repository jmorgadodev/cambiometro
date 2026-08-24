import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import PageEntrance from "@/components/PageEntrance";
import RouteTransitionOrb from "@/components/RouteTransitionOrb";
import NavigationProgressBar from "@/components/NavigationProgressBar";
import CookieConsent, { CookiePreferencesButton } from "@/components/CookieConsent";
import { getDataPlatformSummary } from "@/lib/data-platform-d1";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cambiometro.impulsacv.cl"),
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
    title: "Herramientas",
    links: [
      ["Cruces de datos", "/cruces"],
      ["Transferencias Ley 19.862", "/transferencias"],
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
      ["Dashboard de Calidad", "/datos/calidad"],
      ["Fuentes y versiones", "/fuentes"],
      ["Cómo usamos los datos", "/como-funciona"],
      ["Política de Privacidad", "/privacidad"],
      ["Donar y apoyar", "/donar"],
    ],
  },
] as const;

function InstagramIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v7.6H9.2v-7.6H6.46M7.83 6.64a1.66 1.66 0 0 0-1.66 1.66 1.66 1.66 0 0 0 1.66 1.66 1.66 1.66 0 0 0 1.66-1.66z" />
    </svg>
  );
}

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
        <div id="initial-splash-orb" className="initial-splash-orb" role="status" aria-label="Cargando El Cambiómetro...">
          <div className="loading-orb" style={{ width: "56px", height: "56px" }}>
            <div className="loading-orb__glow" aria-hidden="true" />
            <div className="loading-orb__ring" aria-hidden="true" />
            <div className="loading-orb__core" aria-hidden="true" />
          </div>
        </div>
        <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
        <Suspense fallback={null}>
          <RouteTransitionOrb />
          <NavigationProgressBar />
        </Suspense>
        <Suspense fallback={<div className="site-header site-header--fallback" aria-hidden="true" />}>
          <SiteHeader updatedAt={updatedAt} totalRecords={totalRecords} />
        </Suspense>
        <PageEntrance>
          <Suspense fallback={<div className="container-main" aria-hidden="true" />}>
            <main id="contenido-principal">{children}</main>
          </Suspense>
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
                  <Link href={href} className="site-footer__link">
                    {label}
                  </Link>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Creado por{" "}
              <a
                href="https://www.linkedin.com/in/jorge-morgado/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn de Jorge Morgado"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
              >
                Jorge Morgado
                <LinkedInIcon size={14} />
              </a>
            </span>
            <span className="site-footer__dot" aria-hidden="true">
              ·
            </span>
            <span>
              Impulsado por{" "}
              <a href="https://impulsacv.cl" target="_blank" rel="noopener noreferrer">
                ImpulsaCV ↗
              </a>
            </span>
            <span className="site-footer__dot" aria-hidden="true">
              ·
            </span>
            <a
              href="https://www.instagram.com/cambiometro/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram @cambiometro"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
            >
              <InstagramIcon size={14} />
              Instagram
            </a>
            <span className="site-footer__dot" aria-hidden="true">
              ·
            </span>
            <a
              href="https://x.com/cambiometro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="𝕏 Twitter / X @cambiometro"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
            >
              <XIcon size={13} />
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
