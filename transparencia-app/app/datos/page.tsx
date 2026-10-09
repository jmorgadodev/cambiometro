import type { Metadata } from "next";
import Link from "next/link";
import EtlHealthDashboardClient from "@/components/datos/EtlHealthDashboardClient";
import Icono from "@/components/ui/Icono";
import { GLOBAL_KPIS } from "@/lib/global-kpis";
import { getStaticEntityCatalog } from "@/lib/static-entity-catalog";
import { getTransferReleaseMetadata } from "@/lib/transfer-release-metadata";

export const metadata: Metadata = {
  title: "Fuentes, períodos y alcance de datos — El Cambiómetro",
  description: "Consulta los conjuntos integrados, sus períodos publicados y limitaciones. Fuente oficial no implica cobertura completa ni actualización en tiempo real.",
  alternates: { canonical: "/datos" },
};

const ANALYSIS_LINES = [
  {
    id: "parlamento",
    eyebrow: "Disponible ahora",
    title: "Actividad parlamentaria",
    description: "Votaciones, asistencia, gastos y mandatos de Cámara y Senado, enlazados a fichas personales cuando existe un identificador oficial.",
    sources: ["camara", "senado"],
    href: "/politico",
    linkLabel: "Explorar parlamentarios",
    caveat: "Las fuentes diarias atrasadas se marcan como tales; un registro faltante no se interpreta como ausencia.",
  },
  {
    id: "gastos-operacionales",
    eyebrow: "Períodos incorporados",
    title: "Gastos operacionales rendidos",
    description: "Rendiciones de Cámara y Senado por período, autoridad, ítem y monto, incluyendo registros históricos que no pertenecen al directorio parlamentario vigente.",
    sources: ["gastos_camara", "gastos_senado"],
    href: "/gastos-operacionales",
    linkLabel: "Consultar todas las rendiciones",
    caveat: "Los nombres históricos se conservan como fueron publicados y no se atribuyen a autoridades actuales.",
  },
  {
    id: "dinero",
    eyebrow: "Disponible ahora",
    title: "Transferencias y compras públicas",
    description: "Consolidado de transferencias a fundaciones y privados (Ley 19.862) junto con compras ChileCompra.",
    sources: ["chilecompra", "ley-19862"],
    href: "/transferencias",
    linkLabel: "Explorar transferencias y fundaciones",
    caveat: "No implica irregularidad que una entidad aparezca en estas fuentes. Se conservan los folios oficiales.",
  },
  {
    id: "probidad",
    eyebrow: "Con límites explícitos",
    title: "Probidad y lobby",
    description: "Declaraciones de intereses y patrimonio, audiencias, viajes y donativos publicados por los portales oficiales.",
    sources: ["infoprobidad", "infolobby"],
    href: "/cruces#lobby-publico",
    linkLabel: "Ver evidencia disponible",
    caveat: "Identificadores oficiales son obligatorios para unir personas. Cobertura insuficiente impide publicar rankings o inferir conflictos.",
  },
  {
    id: "territorio",
    eyebrow: "Indicadores municipales integrados",
    title: "Presupuesto y territorio",
    description: "Ejecución presupuestaria DIPRES e indicadores SINIM para revisar organismos y municipalidades con sus unidades originales.",
    sources: ["dipres", "sinim"],
    href: "/municipalidades",
    linkLabel: "Comparar municipalidades",
    caveat: "Los períodos y unidades difieren entre fuentes; solo se comparan cifras que comparten definición y período.",
  },
  {
    id: "control",
    eyebrow: "Evidencia documental",
    title: "Fiscalización institucional",
    description: "Informes públicos de Contraloría organizados por entidad, área y región, conservando el documento de respaldo.",
    sources: ["contraloria"],
    href: "/cruces#fiscalizacion",
    linkLabel: "Explorar fiscalizaciones",
    caveat: "Una observación de auditoría no equivale por sí sola a sanción ni responsabilidad administrativa.",
  },
] as const;

export default async function DataObservatoryPage() {
  const entityCount = getStaticEntityCatalog().total || GLOBAL_KPIS.entidades;
  const transferRelease = getTransferReleaseMetadata();

  return (
    <div>
      {/* ─── HERO MASTHEAD ──────────────────────────────────────────────── */}
      <section className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <p className="eyebrow">Monitor de Datos Abiertos</p>
            <h1>Fuentes, períodos y alcance de datos</h1>
            <p>
              Consulta los conjuntos integrados de {GLOBAL_KPIS.fuentes_operativas} fuentes ({GLOBAL_KPIS.fuentes_oficiales} oficiales + {GLOBAL_KPIS.fuentes_derivadas} derivada).
              Cada fuente conserva su corte. Los conteos por categoría pueden tener unidades distintas
              y no acreditan todo el universo oficial ni personas únicas.
            </p>
            <div style={{ marginTop: "1rem" }}>
              <Link prefetch={false} className="btn btn-secondary" href="/datos/calidad" style={{ fontSize: "0.85rem", padding: "0.45rem 0.9rem" }}>
                Ver calidad de datos →
              </Link>
            </div>
          </div>
          <dl className="data-observatory__summary" aria-label="Resumen del inventario">
            <div>
              <dt>Total entre fuentes</dt>
              <dd>En revisión</dd>
            </div>
            <div>
              <dt>Entidades y Sujetos</dt>
              <dd>{entityCount.toLocaleString("es-CL")}</dd>
            </div>
            <div>
              <dt>Fuentes Conectadas</dt>
              <dd>{GLOBAL_KPIS.total_fuentes} ({GLOBAL_KPIS.fuentes_oficiales} oficiales + {GLOBAL_KPIS.fuentes_derivadas} derivada)</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="container-main data-observatory" style={{ paddingTop: "2rem" }}>
        {/* ─── DASHBOARD INTERACTIVO DE SALUD DE FUENTES ────────────────── */}
        <section aria-label="Dashboard interactivo de salud de fuentes">
          <div className="section-heading" style={{ marginBottom: "1.5rem" }}>
            <div>
              <p className="eyebrow">Transparencia Operativa</p>
              <h2>Estado de cada fuente</h2>
            </div>
          </div>

          <EtlHealthDashboardClient transferRelease={transferRelease} />
        </section>

        {/* ─── LÍNEAS DE ANÁLISIS Y LÍMITES EDITORIALES ────────────────── */}
        <section aria-labelledby="analysis-lines-title" style={{ marginTop: "2rem" }}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Uso responsable</p>
              <h2 id="analysis-lines-title">Líneas de análisis sustentadas por datos</h2>
            </div>
          </div>
          <div className="data-observatory__lines">
            {ANALYSIS_LINES.map((line) => (
              <article className="data-observatory__line" key={line.id}>
                <p className="eyebrow">{line.eyebrow}</p>
                <h3>{line.title}</h3>
                <p>{line.description}</p>
                <ul aria-label={`Fuentes de ${line.title}`}>
                  {line.sources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p className="data-observatory__caveat">{line.caveat}</p>
                <Link prefetch={false} className="data-link" href={line.href}>
                  {line.linkLabel} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* ─── CRITERIO EDITORIAL Y DESFASES REGLAMENTARIOS ─────────────── */}
        <section className="evidence-policy" aria-labelledby="policy-title" style={{ marginTop: "2rem" }}>
          <div>
            <p className="eyebrow">Criterio Editorial y Desfases Normativos</p>
            <h2 id="policy-title">Cómo interpretar los períodos disponibles</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
            <div>
              <strong style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                <Icono nombre="organismo" size={16} />
                <span>Congreso Nacional: meses publicados</span>
              </strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                Las rendiciones conservan el mes informado por cada cámara. No se presume que un mes sin filas tenga gasto cero ni que ambas cámaras publiquen simultáneamente.
              </p>
            </div>

            <div>
              <strong style={{ color: "var(--ok)", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                <Icono nombre="personas" size={16} />
                <span>Transparencia Activa CPLT (Cortes mensuales)</span>
              </strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                Cada nómina conserva organismo, período y fuente. El monto informado no demuestra una mensualidad completa; ausencia de registro, cero y monto no informado son estados diferentes.
              </p>
            </div>

            <div>
              <strong style={{ color: "var(--warn)", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                <Icono nombre="compras" size={16} />
                <span>Contratación y transferencias: corte integrado</span>
              </strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                ChileCompra y Ley 19.862 conservan sus propios períodos y registros de origen. Los conjuntos incorporados no acreditan una medición anual completa; la conciliación de ChileCompra permanece pendiente.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
