import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Proyecto Cívico y Apoyo — El Cambiómetro",
  description:
    "Iniciativa ciudadana independiente de datos públicos y código abierto para la transparencia en Chile. Creado por Jorge Morgado.",
  alternates: { canonical: "/donar" },
};

export default function DonarPage() {
  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <span className="eyebrow">Proyecto Cívico Abierto</span>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.25rem 0 0.5rem 0" }}>
              Transparencia e Independencia
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
              El Cambiómetro es una plataforma ciudadana independiente, sin fines de lucro ni financiamiento partidario.
              Consolidamos y procesamos datos públicos oficiales del Estado de Chile para ponerlos al servicio de la
              ciudadanía, la investigación periodística y la rendición de cuentas.
            </p>
          </div>
          <dl className="page-fact-sheet">
            <div>
              <dt>Independencia</dt>
              <dd>100% Ciudadana</dd>
            </div>
            <div>
              <dt>Publicidad</dt>
              <dd>Sin Anuncios</dd>
            </div>
            <div>
              <dt>Modelo</dt>
              <dd>Datos Abiertos</dd>
            </div>
          </dl>
        </div>
      </header>

      <div
        className="container-main"
        style={{
          padding: "2.5rem 1.5rem 4rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
          width: "100%",
        }}
      >
        {/* ── FILA 1: MANIFIESTO CÍVICO (8 cols) + POR QUÉ DONAR (4 cols) ──────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: "1.5rem",
            alignItems: "stretch",
            width: "100%",
          }}
        >
          {/* Card 1: Manifiesto Cívico (Flexible / 2fr en desktop amplio) */}
          <div
            className="card"
            style={{
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              flex: "2 1 480px",
            }}
          >
            <span className="eyebrow">Manifiesto Cívico</span>
            <h2 style={{ fontSize: "1.3rem", margin: 0, color: "var(--text-primary)" }}>
              Datos públicos abiertos, neutralidad y rigor metodológico
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
              Creemos que la información pública debe ser verdaderamente accesible, auditable y trazable a sus fuentes
              primarias. Todo el código de ingesta, normalización y los modelos de datos son abiertos y reproducibles.
              No vendemos datos, no mostramos publicidad ni dependemos de fondos gubernamentales o corporativos.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.85rem",
                marginTop: "0.25rem",
              }}
            >
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.9rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  🔍 Trazabilidad Total
                </div>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                  Cada número, sueldo o licitación enlaza directamente al portal oficial de origen (CPLT, CGR, ChileCompra, registros19862.gob.cl).
                </p>
              </div>

              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.9rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  🛡️ Sin Sesgo
                </div>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                  Mismas reglas analíticas y de auditoría para todas las instituciones, partidos y autoridades del Estado.
                </p>
              </div>

              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.9rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  ⚡ Código Abierto
                </div>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                  Arquitectura moderna orientada a la eficiencia y preservación de memoria comunitaria.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Por qué donar (1fr en desktop) */}
          <div
            className="card"
            style={{
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.15rem",
              flex: "1 1 280px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="eyebrow">Sostenibilidad</span>
            <h2 style={{ fontSize: "1.2rem", margin: 0, color: "var(--text-primary)" }}>
              ¿Por qué apoyar?
            </h2>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              El mantenimiento del lago de datos y la infraestructura analítica se financia con aportes ciudadanos libres de compromisos:
            </p>

            <ul style={{ margin: 0, paddingLeft: "1.15rem", display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>Independencia de infraestructura:</strong> Servidores, bases de datos D1 y almacenamiento R2 financiados sin compromisos comerciales ni gubernamentales.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>Nuevas fuentes oficiales:</strong> Ingesta, normalización y versionamiento continuo de nuevos organismos del Estado y compras públicas.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>Tiempo de auditoría ciudadana:</strong> Mantención y desarrollo de algoritmos de detección de sobreprecios, nepotismo y cruces documentales.
              </li>
            </ul>
          </div>
        </div>

        {/* ── FILA 2: CRÉDITOS Y AUTORÍA (6 cols) + APOYA SIN DINERO (6 cols) ──── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: "1.5rem",
            alignItems: "stretch",
            width: "100%",
          }}
        >
          {/* Card 3: Créditos y Autoría */}
          <div
            className="card"
            style={{
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.15rem",
              flex: "1 1 320px",
            }}
          >
            <span className="eyebrow">Créditos del Proyecto</span>
            <h2 style={{ fontSize: "1.2rem", margin: 0, color: "var(--text-primary)" }}>
              Autoría y Desarrollo
            </h2>
            <p style={{ fontSize: "0.86rem", color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
              El Cambiómetro fue diseñado, desarrollado y coordinado por{" "}
              <a
                href="https://www.linkedin.com/in/jorge-morgado/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "underline" }}
              >
                Jorge Morgado
              </a>
              , como una contribución al fortalecimiento democrático y el acceso a la información en Chile.
            </p>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "auto", paddingTop: "0.5rem" }}>
              <a
                href="https://www.linkedin.com/in/jorge-morgado/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ padding: "0.6rem 1.15rem", fontSize: "0.82rem" }}
              >
                LinkedIn de Jorge Morgado ↗
              </a>
              <Link
                href="/datos/calidad"
                className="btn btn-secondary"
                style={{ padding: "0.6rem 1.15rem", fontSize: "0.82rem" }}
              >
                Dashboard de Calidad →
              </Link>
              <Link
                href="/como-funciona"
                className="btn btn-secondary"
                style={{ padding: "0.6rem 1.15rem", fontSize: "0.82rem" }}
              >
                Metodología →
              </Link>
            </div>
          </div>

          {/* Card 4: Apoya sin dinero */}
          <div
            className="card"
            style={{
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.15rem",
              flex: "1 1 320px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="eyebrow">Participación Ciudadana</span>
            <h2 style={{ fontSize: "1.2rem", margin: 0, color: "var(--text-primary)" }}>
              ¿Cómo apoyar sin dinero?
            </h2>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
              La fiscalización ciudadana se fortalece cuando la comunidad participa activamente:
            </p>

            <ul style={{ margin: 0, paddingLeft: "1.15rem", display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>Difundir el sitio:</strong> Comparte investigaciones, fichas parlamentarias y cruces documentales en redes sociales (@cambiometro).
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>Reportar errores de datos:</strong> Identifica discrepancias de datos o inconsistencias para perfeccionar los clasificadores abiertos.
              </li>
              <li>
                <strong style={{ color: "var(--text-primary)" }}>Proponer fuentes públicas:</strong> Sugiere nuevas bases de datos, APIs y registros oficiales del Estado para incorporar al lago de datos.
              </li>
            </ul>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "auto", paddingTop: "0.5rem" }}>
              <a
                href="https://x.com/cambiometro"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}
              >
                𝕏 @cambiometro ↗
              </a>
              <a
                href="https://www.instagram.com/cambiometro/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}
              >
                Instagram @cambiometro ↗
              </a>
              <Link
                href="/datos"
                className="btn btn-secondary"
                style={{ padding: "0.55rem 1rem", fontSize: "0.8rem" }}
              >
                Explorar Datos →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
