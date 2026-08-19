import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sostenibilidad y Apoyo — El Cambiómetro",
  description: "Cómo colaborar y apoyar la continuidad de El Cambiómetro, plataforma ciudadana de datos públicos.",
};

export default function DonarPage() {
  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <span className="eyebrow">Sostenibilidad Ciudadana</span>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.25rem 0 0.5rem 0" }}>
              Apoya la fiscalización ciudadana
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
              El Cambiómetro es una iniciativa ciudadana e independiente sin fines de lucro. Buscamos democratizar el acceso a la información pública consolidando fuentes oficiales en una sola plataforma.
            </p>
          </div>
          <dl className="page-fact-sheet">
            <div><dt>Independencia</dt><dd>100%</dd></div>
            <div><dt>Publicidad</dt><dd>Sin anuncios</dd></div>
            <div><dt>Organización</dt><dd>ImpulsaCV</dd></div>
          </dl>
        </div>
      </header>

      <div className="container-main" style={{ padding: "2.5rem 1.5rem 4rem" }}>
        <div className="card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 680 }}>
          <span className="eyebrow">Colaboración</span>
          <h2 style={{ fontSize: "1.35rem", margin: 0 }}>¿Cómo colaborar con El Cambiómetro?</h2>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
            Actualmente nos encontramos habilitando canales formales de donación y membresías de apoyo. Si representas a una organización de la sociedad civil, medio de comunicación o deseas colaborar con capacidad de cómputo e infraestructura, escríbenos directamente.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            <a href="mailto:contacto@impulsacv.cl" className="btn btn-primary" style={{ padding: "0.6rem 1.25rem" }}>
              Contactar ImpulsaCV
            </a>
            <a href="https://x.com/cambiometro" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: "0.6rem 1.25rem" }}>
              Síguenos en 𝕏
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
