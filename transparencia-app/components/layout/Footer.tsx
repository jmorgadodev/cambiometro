import Image from "next/image";
import Link from "next/link";
import { CookiePreferencesButton } from "@/components/CookieConsent";
import { SupportProjectLink } from "@/components/SupportProjectLink";

const FOOTER_GROUPS = [
  {
    title: "Herramientas",
    links: [
      ["Cruces de datos", "/cruces"],
      ["Transferencias Ley 19.862", "/transferencias"],
      ["Gastos Operacionales Rendidos", "/gastos-operacionales"],
      ["Rankings", "/rankings"],
      ["Comparador", "/comparar"],
      ["Remuneraciones públicas", "/remuneraciones-publicas"],
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

function TikTokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.7 3c.3 2.1 1.5 3.4 3.3 3.5v3.1c-1.7.2-3.1-.4-4.2-1.3v6.2c0 4.2-3.1 6.5-6.4 6.5A5.2 5.2 0 0 1 4 15.8c0-3.1 2.5-5.5 5.6-5.5.3 0 .7 0 1 .1v3.2a2.7 2.7 0 0 0-1-.2 2.4 2.4 0 1 0 2.5 2.4V3h4.6Z" />
    </svg>
  );
}

function FacebookIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-8h2.75l.4-3h-3.15V8.08c0-.87.24-1.46 1.5-1.46h1.76V3.94c-.3-.04-1.34-.14-2.55-.14-2.52 0-4.25 1.54-4.25 4.37V10H7.1v3h2.86v8h3.54Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-main site-footer__grid">
        <div className="site-footer__about">
          <Link href="/" prefetch={false} className="site-brand site-brand--footer" aria-label="El Cambiómetro, inicio">
            <Image src="/brand/el-cambiometro-mark.svg" alt="Símbolo dial El Cambiómetro" width={28} height={28} className="site-brand__dial" />
            <div className="site-brand__text">
              <strong>EL CAMBIÓMETRO</strong>
              <small>PLATAFORMA DE DATOS PÚBLICOS</small>
            </div>
          </Link>
          <p className="site-footer__mission">
            Plataforma ciudadana independiente que compila, consolida y visualiza información de fuentes públicas oficiales del Estado de Chile para facilitar la fiscalización y transparencia.
          </p>
          <div className="provenance-stamp">
            <div className="provenance-stamp__header">
              <span className="snapshot-stamp__status" aria-hidden="true" />
              <span>Estado del catálogo</span>
            </div>
            <strong>Catálogo actualizado por fuente</strong>
            <small>Las fuentes se actualizan por separado y conservan su propio corte</small>
          </div>
          <aside className="site-footer__support">
            <h2>Sostenibilidad Ciudadana</h2>
            <p>
              El Cambiómetro es una plataforma ciudadana 100% independiente que procesa y audita más de 1,7 millones de registros públicos de Chile sin financiamiento de partidos ni de empresas. Ayúdanos a costear los servidores y la infraestructura de datos con un aporte voluntario desde cualquier monto.
            </p>
            <SupportProjectLink className="btn btn-primary site-footer__support-link">
              Realizar un aporte en Mercado Pago ↗
            </SupportProjectLink>
          </aside>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="site-footer__nav">
            <h2 className="site-footer__title">{group.title}</h2>
            <ul className="site-footer__list">
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} prefetch={false} className="site-footer__link">{label}</Link>
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
              Creado por <a href="https://www.linkedin.com/in/jorge-morgado/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de Jorge Morgado" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>Jorge Morgado<LinkedInIcon size={14} /></a>
            </span>
            <span className="site-footer__dot" aria-hidden="true">·</span>
            <span>Impulsado por <a href="https://impulsacv.cl" target="_blank" rel="noopener noreferrer">ImpulsaCV ↗</a></span>
            <span className="site-footer__dot" aria-hidden="true">·</span>
            <span aria-label="Redes sociales de El Cambiómetro" style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
              <a href="https://www.instagram.com/cambiometro/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @cambiometro" title="Instagram @cambiometro" style={{ display: "inline-flex", alignItems: "center" }}><InstagramIcon size={14} /></a>
              <a href="https://x.com/cambiometro" target="_blank" rel="noopener noreferrer" aria-label="X @cambiometro" title="X @cambiometro" style={{ display: "inline-flex", alignItems: "center" }}><XIcon size={13} /></a>
              <a href="https://www.tiktok.com/@cambiometro" target="_blank" rel="noopener noreferrer" aria-label="TikTok @cambiometro" title="TikTok @cambiometro" style={{ display: "inline-flex", alignItems: "center" }}><TikTokIcon size={13} /></a>
              <a href="https://www.facebook.com/profile.php?id=61593925561451" target="_blank" rel="noopener noreferrer" aria-label="Facebook Cambiometro" title="Facebook Cambiometro" style={{ display: "inline-flex", alignItems: "center" }}><FacebookIcon size={14} /></a>
              <span className="sr-only">@cambiometro</span>
            </span>
            <span className="site-footer__dot" aria-hidden="true">·</span>
            <CookiePreferencesButton className="site-footer__link" />
          </span>
        </div>
      </div>
    </footer>
  );
}
