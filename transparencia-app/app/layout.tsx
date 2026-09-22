import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PageEntrance from "@/components/PageEntrance";
import RouteTransitionOrb from "@/components/RouteTransitionOrb";
import NavigationProgressBar from "@/components/NavigationProgressBar";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600", "700"],
  variable: "--font-ledger",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cambiometro.impulsacv.cl"),
  title: {
    default: "El Cambiómetro — Datos públicos con trazabilidad",
    template: "%s",
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
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      data-theme="paper"
      className={`${inter.variable} ${jetBrainsMono.variable} ${newsreader.variable}`}
    >
      <body className="font-sans">
        <div id="initial-splash-orb" className="initial-splash-orb" role="status" aria-label="Cargando El Cambiómetro...">
          <div className="loading-orb" style={{ width: "56px", height: "56px" }}>
            <div className="loading-orb__glow" aria-hidden="true" />
            <div className="loading-orb__ring" aria-hidden="true" />
            <div className="loading-orb__core" aria-hidden="true" />
          </div>
        </div>
        <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
        <RouteTransitionOrb />
        <NavigationProgressBar />
        <Header />
        <PageEntrance>
          <main id="contenido-principal">{children}</main>
        </PageEntrance>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
