import type { Metadata } from "next";
import Link from "next/link";
import { getDataQualityDashboardData } from "@/lib/data-quality-dashboard";
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
    title: "1. Recolectamos",
    text: "Consultamos portales oficiales y fuentes documentales autorizadas. En Movimientos, una fuente periodística puede generar una señal provisional, separada de la confirmación oficial.",
  },
  {
    icon: "etl",
    title: "2. Versionamos",
    text: "Conservamos corte, período, identificador, procedencia y checksum para que cada publicación pueda compararse con su release anterior.",
  },
  {
    icon: "datos",
    title: "3. Normalizamos",
    text: "Limpiamos formatos de nombres, fechas y montos sin borrar el valor original ni convertir una observación de la fuente en un dato inventado.",
  },
  {
    icon: "principios",
    title: "4. Validamos",
    text: "Revisamos duplicados, fechas, montos, identificadores, cobertura, frescura y observaciones de calidad antes de publicar.",
  },
  {
    icon: "datos",
    title: "5. Publicamos",
    text: "Entregamos chunks estáticos, R2 y consultas paginadas del Worker. El navegador nunca descarga un universo completo para mostrar una tabla.",
  },
];

export default async function HowItWorksPage() {
  const { sources, summary } = await getDataQualityDashboardData();

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
              La matriz distingue registros originales, releases normalizados, relaciones documentales y resúmenes agregados. Una señal periodística no se presenta como confirmación oficial hasta contar con respaldo suficiente.
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
                    {s.name}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>{s.organization}</span>
                </div>
                <span className={s.statusBadgeClass} style={{ fontSize: "0.68rem" }}>
                  {s.confidenceLevel === "derived" ? "Derivada" : s.confidenceLevel === "official" ? "Oficial" : s.confidenceLevel}
                </span>
              </div>
            ))}
          </div>

          <div style={{ overflowX: "auto", marginTop: "1.25rem" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead><tr><th>Fuente</th><th>Frecuencia / corte</th><th>Registros</th><th>Publicado</th><th>Consultable</th><th>Relacionado</th><th>Módulo</th></tr></thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td><strong>{source.name}</strong><br /><span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{source.organization}</span></td>
                    <td>{source.frequency}<br /><span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{source.periodoReciente}</span></td>
                    <td>{source.canonicalCount.toLocaleString("es-CL")}</td>
                    <td>{source.metrics.published.label}</td>
                    <td>{source.metrics.queryable.label}</td>
                    <td>{source.metrics.related.label}</td>
                    <td><Link prefetch={false} className="data-link" href={source.modulePath}>Explorar →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "1rem 0 0", color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.5 }}>
            La plataforma tiene {summary.totalFuentes} fuentes en el catálogo. “No calculable” significa que el release actual no publica evidencia suficiente para afirmar una cobertura, no que la fuente esté vacía.
          </p>
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
