"use client";

import { useState, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import type { Politico } from "@/lib/seed-politicos";

export interface PoliticoCardData {
  politico: Politico;
  partido: { id: string; nombre: string; sigla: string; color_hex?: string; logo_url?: string } | undefined;
  fuentes: number;
  sueldo: { bruto_mensual: number; cargo: string } | null;
  partidoConfig: { nombre: string; sigla: string; color_oficial: string; logo_url?: string };
  dietaMonto: number;
  verifiedPhoto: string | null;
  initials: string;
  gastosTotal: number;
  gastosPeriodos: number;
  gastosRegistros: number;
  gastosUltimoPeriodo: string | null;
}

interface Props {
  items: PoliticoCardData[];
  title: string;
  eyebrow?: string;
  pageSize?: number;
}

const formatCLP = (amount: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount);

function evidencesLabel(fuentes: number) {
  return fuentes > 0
    ? `${fuentes} fuente${fuentes === 1 ? "" : "s"} con registro`
    : "Nómina oficial verificada";
}

export default function PoliticosListClient({
  items,
  title,
  eyebrow,
  pageSize = 20,
}: Props) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.ceil(items.length / pageSize) || 1;
  const sectionId = useId();

  const indiceInicio = (pagina - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const itemsVisibles = items.slice(indiceInicio, indiceFin);

  const cambiarPagina = (nuevaPagina: number) => {
    setPagina(nuevaPagina);
    if (typeof window !== "undefined") {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <section aria-labelledby={sectionId} id={sectionId} style={{ marginTop: "1.5rem" }}>
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={sectionId}>
            {title} ({items.length})
          </h2>
        </div>
        {totalPaginas > 1 && (
          <span style={{ fontSize: "0.82rem", color: "var(--text-subtle)", fontWeight: 600 }}>
            Página {pagina} de {totalPaginas}
          </span>
        )}
      </div>

      <div className="politician-card-grid">
        {itemsVisibles.map((entry) => {
          const { politico, partidoConfig, fuentes, sueldo, dietaMonto, verifiedPhoto, initials, gastosTotal, gastosPeriodos, gastosRegistros, gastosUltimoPeriodo } = entry;
          const slug = getPoliticoSlug(politico);

          return (
            <Link className="politician-card" href={`/politico/${slug}`} prefetch={false} key={politico.id}>
              <div className="politician-card__photo">
                {verifiedPhoto ? (
                  <Image
                    src={verifiedPhoto}
                    alt={politico.nombre_completo}
                    width={72}
                    height={72}
                  />
                ) : (
                  <span aria-label={`Fotografía no publicada para ${politico.nombre_completo}`}>{initials}</span>
                )}
              </div>
              <div className="politician-card__content">
                <div className="politician-card__heading">
                  <div>
                    <h3>{politico.nombre_completo}</h3>
                    <p>{partidoConfig.nombre}</p>
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "999px",
                      border: `1.5px solid ${partidoConfig.color_oficial}`,
                      background: "var(--surface-2)",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "var(--text-1)",
                    }}
                  >
                    {partidoConfig.logo_url && (
                      <Image
                        src={partidoConfig.logo_url}
                        alt={partidoConfig.sigla}
                        width={16}
                        height={16}
                        style={{ objectFit: "contain" }}
                      />
                    )}
                    <span>{partidoConfig.sigla}</span>
                  </div>
                </div>
                <dl>
                  <div><dt>Cargo</dt><dd>{politico.cargo}</dd></div>
                  <div><dt>Territorio</dt><dd>{politico.distrito_region}{politico.numero_distrito ? ` · D${politico.numero_distrito}` : ""}</dd></div>
                  <div><dt>Evidencia</dt><dd>{evidencesLabel(fuentes)}</dd></div>
                  <div>
                    <dt title="Dieta bruta mensual parlamentaria — fuente oficial ↗">Dieta bruta mensual</dt>
                    <dd>
                      <span
                        title="Dieta bruta mensual parlamentaria — fuente oficial ↗"
                        style={{ color: "var(--money)", fontWeight: 700 }}
                      >
                        {formatCLP(sueldo ? sueldo.bruto_mensual : dietaMonto)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt title="Rendiciones oficiales de gastos operacionales">Gastos operacionales rendidos</dt>
                    <dd>
                      <span style={{ color: gastosRegistros > 0 ? "var(--money)" : "var(--text-muted)", fontWeight: 700 }}>
                        {gastosRegistros > 0 ? formatCLP(gastosTotal) : "Sin registros publicados"}
                      </span>
                      {gastosRegistros > 0 && (
                        <small>{gastosPeriodos} período{gastosPeriodos === 1 ? "" : "s"} · hasta {gastosUltimoPeriodo}</small>
                      )}
                    </dd>
                  </div>
                </dl>
                <span className="politician-card__action">Ver ficha completa →</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <nav
          aria-label={`Paginación de ${title}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "1.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => cambiarPagina(Math.max(1, pagina - 1))}
            disabled={pagina === 1}
            className="btn btn-ghost"
            style={{
              minHeight: "44px",
              padding: "0 0.9rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              opacity: pagina === 1 ? 0.4 : 1,
              cursor: pagina === 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Anterior
          </button>

          <span
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--text-1)",
            }}
          >
            Página {pagina} de {totalPaginas}
          </span>

          <button
            type="button"
            onClick={() => cambiarPagina(Math.min(totalPaginas, pagina + 1))}
            disabled={pagina === totalPaginas}
            className="btn btn-ghost"
            style={{
              minHeight: "44px",
              padding: "0 0.9rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              opacity: pagina === totalPaginas ? 0.4 : 1,
              cursor: pagina === totalPaginas ? "not-allowed" : "pointer",
            }}
          >
            Siguiente →
          </button>
        </nav>
      )}
    </section>
  );
}
