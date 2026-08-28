import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedSourceManifests } from "@/lib/published-sources";
import Icono, { type IconoNombre } from "@/components/ui/Icono";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

export const metadata: Metadata = {
  title: "Cómo usamos los datos públicos — El Cambiómetro",
  description:
    "Conoce cómo El Cambiómetro compila, consolida y presenta la información de fuentes oficiales para facilitar la fiscalización y transparencia ciudadana.",
  alternates: { canonical: "/como-funciona" },
};

const PILARES: { icon: IconoNombre; title: string; text: string }[] = [
  {
    icon: "organismo",
    title: "Fuentes Primarias Oficiales",
    text: "Compilamos información exclusivamente desde portales públicos del Estado (Cámara de Diputadas y Diputados, Senado, ChileCompra, DIPRES, Contraloría General y CPLT). No usamos notas de prensa ni datos no verificados.",
  },
  {
    icon: "etl",
    title: "Consolidación Inteligente",
    text: "Cruzamos nóminas, votaciones de sala, asistencias, gastos operacionales y personal de apoyo en dashboards visuales, interactivos y listos para entender sin tecnicismos.",
  },
  {
    icon: "datos",
    title: "Actualización Permanente",
    text: "Monitoreamos las publicaciones periódicas oficiales de cada organismo para mantener los datos de parlamentarios, partidos y municipios siempre al día.",
  },
  {
    icon: "principios",
    title: "Rigor y Neutralidad",
    text: "Presentamos los hechos y registros tal como son publicados por las entidades públicas, sin juicios de valor arbitrarios ni inferencias no sustentadas.",
  },
];

export default async function HowItWorksPage() {
  const sources = await listPublishedSourceManifests();
  const operationalSources = sources.filter((s) => s.recordCount > 0);

  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <span className="eyebrow">Plataforma de Datos Públicos</span>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.25rem 0 0.5rem 0" }}>
              Cómo usamos los datos públicos
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
              El Cambiómetro es una plataforma ciudadana independiente diseñada para transformar miles de registros públicos dispersos en dashboards claros, accesibles y accionables para la fiscalización democrática.
            </p>
          </div>

          <dl className="page-fact-sheet">
            <div>
              <dt>Registros Oficiales</dt>
              <dd>{GLOBAL_KPIS.registros_canonicos.toLocaleString("es-CL")}</dd>
            </div>
            <div>
              <dt>Fuentes Públicas</dt>
              <dd>{GLOBAL_KPIS.total_fuentes} ({GLOBAL_KPIS.fuentes_oficiales} oficiales + {GLOBAL_KPIS.fuentes_derivadas} derivada)</dd>
            </div>
            <div>
              <dt>Cobertura</dt>
              <dd>Nacional</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="container-main" style={{ padding: "2.5rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        
        {/* Pilares de la plataforma */}
        <section>
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
              Nuestros Principios de Transparencia
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Información clara, verídica y directamente contrastable con los registros oficiales.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {PILARES.map((p) => (
              <div
                key={p.title}
                className="card"
                style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}
              >
                <div style={{ color: "var(--accent)" }}>
                  <Icono nombre={p.icon} size={28} />
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Fuentes integradas */}
        <section className="card" style={{ padding: "1.75rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <span className="eyebrow">Orígenes de la Información</span>
            <h2 style={{ fontSize: "1.25rem", margin: "0.2rem 0 0.4rem 0" }}>
              Fuentes Oficiales del Estado de Chile
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Todos los datos presentados provienen de portales de transparencia y datos abiertos de organismos autónomos y gubernamentales.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {sources.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--bg-surface-2)",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", display: "block" }}>
                    {s.label}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>{s.organization}</span>
                </div>
                <span className="badge badge-ok" style={{ fontSize: "0.68rem" }}>
                  Oficial
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA de exploración */}
        <section className="card" style={{ padding: "1.5rem" }} aria-labelledby="cohesion-method-title">
          <span className="eyebrow">Metodología reproducible</span>
          <h2 id="cohesion-method-title" style={{ fontSize: "1.25rem", margin: "0.25rem 0 0.5rem" }}>Cohesión de bancadas y votaciones destacadas</h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>La cohesión es el promedio, por bancada y cámara, de la cuota de la opción mayoritaria sobre votos efectivos (Afirmativo, En Contra y Abstención). Se excluyen ausencias, “No Vota”, dispensados y pareos; una bancada unitaria queda como “Sin muestra”. La selección destacada prioriza impacto institucional, quórum calificado, iniciativas presidenciales de alto perfil y seguimiento público; excluye votaciones procedimentales o sin quórum.</p>
        </section>

        <section
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.35rem", margin: "0 0 0.3rem 0", color: "var(--text-primary)" }}>
              Comienza a explorar los datos
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0, maxWidth: 500 }}>
              Revisa cómo votan tus representantes, cuánto rinden en gastos operacionales y cómo se distribuye el presupuesto.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link prefetch={false} href="/politico" className="btn btn-primary" style={{ padding: "0.65rem 1.25rem" }}>
              Ver Parlamentarios
            </Link>
            <Link prefetch={false} href="/partidos" className="btn btn-secondary" style={{ padding: "0.65rem 1.25rem" }}>
              Ranking de Partidos
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
