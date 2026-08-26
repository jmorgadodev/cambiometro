"use client";

import Link from "next/link";
import { useState } from "react";
import {
  type CambioPublico,
  formatPublicDate,
  getPoliticoPath,
} from "@/lib/public-changes";

interface Props {
  cambios: CambioPublico[];
}

export default function CambiometroFeed({ cambios }: Props) {
  const [filter, setFilter] = useState<"todas" | "periodos" | "alertas">("todas");
  const filtered = cambios.filter((cambio) => {
    if (filter === "periodos") return cambio.tipo === "info";
    if (filter === "alertas") return cambio.tipo !== "info";
    return true;
  });

  return (
    <div>
      <div className="feed-filters" aria-label="Filtrar cambios">
        {[
          { id: "todas" as const, label: `Todos (${cambios.length})` },
          { id: "periodos" as const, label: "Cambios de período" },
          { id: "alertas" as const, label: "Alertas con evidencia" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`btn ${filter === tab.id ? "btn-primary" : "btn-ghost"}`}
            aria-pressed={filter === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="change-ledger">
        {filtered.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>Sin registros para este filtro</strong>
            <p>No se publican alertas mientras no exista evidencia verificable que las respalde.</p>
          </div>
        ) : (
          filtered.map((cambio) => (
            <article key={cambio.id} className="change-ledger__item">
              <time dateTime={cambio.fechaIso}>{formatPublicDate(cambio.fechaIso)}</time>
              <div>
                <p><span className="status-label status-label--info">Inicio de período</span> {cambio.cargo}</p>
                <h3><Link prefetch={false} href={getPoliticoPath(cambio.politicoId)}>{cambio.politico}</Link></h3>
                <p>{cambio.descripcion}</p>
              </div>
              <Link prefetch={false} href={getPoliticoPath(cambio.politicoId)} aria-label={`Ver ficha de ${cambio.politico}`}>↗</Link>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
