"use client";

import { useState, useMemo } from "react";
import { formatFechaChilena } from "@/lib/format";
import type { TimelineEvento } from "@/lib/data-source";

interface PoliticoTimelineProps {
  eventos: TimelineEvento[];
  nombrePolitico: string;
}

const TIPO_ICONO: Record<string, string> = {
  vida: "👶",
  estudios: "🎓",
  eleccion: "🗳️",
  periodo: "🏛️",
  votacion: "⚖️",
};

const TIPO_BADGE: Record<string, { label: string; style: string }> = {
  vida: { label: "Biografía", style: "badge badge-info" },
  estudios: { label: "Formación", style: "badge badge-ok" },
  eleccion: { label: "Elección Popular", style: "badge badge-ok" },
  periodo: { label: "Hito Legislativo", style: "badge badge-info" },
  votacion: { label: "Votación de Sala", style: "badge badge-warn" },
};

export default function PoliticoTimeline({ eventos, nombrePolitico }: PoliticoTimelineProps) {
  const [expandido, setExpandido] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cambiometro-timeline-expanded");
        if (saved !== null) return saved === "true";
      } catch {}
    }
    return true;
  });

  const toggleExpandido = () => {
    const next = !expandido;
    setExpandido(next);
    try {
      localStorage.setItem("cambiometro-timeline-expanded", String(next));
    } catch {}
  };

  // Curación del timeline: filtrar procedimentales ("1-Otros") y proyectos de resolución sin título
  const eventosCurados = useMemo(() => {
    if (!eventos || eventos.length === 0) return [];
    return eventos
      .filter((e) => {
        const t = (e.titulo ?? "").toLowerCase();
        const d = (e.detalle ?? "").toLowerCase();
        if (
          /^\d+-/i.test(t) ||
          t.includes("1-otros") ||
          t.includes("materia no catalogada") ||
          t.includes("sin título") ||
          t.includes("sin titulo") ||
          t.includes("no catalogad") ||
          /^proyecto de resolución\s*n[°º]?\s*\d+$/i.test(t) ||
          d.includes("materia no catalogada")
        ) {
          return false;
        }
        return true;
      })
      .map((e) => {
        let titulo = e.titulo;
        if (titulo.includes("Votó No Vota") || titulo.includes("Votó no vota")) {
          titulo = titulo.replace(/Votó No Vota/i, "Presente, no votó");
        }
        return { ...e, titulo };
      });
  }, [eventos]);


  if (eventosCurados.length === 0) {
    return (
      <div className="card-flat">
        <div className="section-title">Timeline del Político</div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          Sin datos verificados: el timeline se poblará con eventos verificables con fuente oficial.
        </p>
      </div>
    );
  }

  const ultimoEvento = eventosCurados[0];

  return (
    <div className="card-flat">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: expandido ? "1rem" : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div className="section-title" style={{ marginBottom: 0, fontSize: "1rem" }}>
            📅 Timeline y Trayectoria de {nombrePolitico}
          </div>
          <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
            {eventosCurados.length} hitos
          </span>
        </div>

        <button
          type="button"
          onClick={toggleExpandido}
          className="btn btn-ghost"
          style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
          aria-expanded={expandido}
        >
          {expandido ? "▲ Contraer Timeline" : "▼ Expandir Timeline"}
        </button>
      </div>

      {!expandido ? (
        <div
          style={{
            padding: "0.85rem 1rem",
            background: "var(--bg-surface-2)",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            📌 <strong>{eventosCurados.length} hitos registrados</strong> · Último evento:{" "}
            {formatFechaChilena(ultimoEvento.fecha)} ({ultimoEvento.titulo})
          </span>
          <button
            type="button"
            onClick={toggleExpandido}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            Ver trayectoria completa →
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              marginTop: "0.5rem",
              borderLeft: "2px solid var(--border)",
              paddingLeft: "1.25rem",
              marginLeft: "0.5rem",
            }}
          >
            {eventosCurados.map((evento, index) => {
              const icono = TIPO_ICONO[evento.tipo] ?? "📌";
              const badge = TIPO_BADGE[evento.tipo] ?? { label: "Hito", style: "badge badge-info" };

              return (
                <div key={index} style={{ position: "relative", paddingBottom: "1.25rem" }}>
                  {/* Nodo visual en la línea */}
                  <span
                    style={{
                      position: "absolute",
                      left: "-1.85rem",
                      top: "0.2rem",
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--bg-surface)",
                      border: "2px solid var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                    }}
                  >
                    {icono}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontFamily: "monospace", fontWeight: 700 }}>
                      {formatFechaChilena(evento.fecha)}
                    </span>
                    <span className={badge.style} style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                      {badge.label}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: "0.2rem", color: "var(--text-primary)" }}>
                    {evento.titulo}
                  </div>

                  {evento.detalle && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem", lineHeight: 1.5 }}>
                      {evento.detalle}
                    </div>
                  )}

                  {evento.url && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <a
                        href={evento.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.74rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                      >
                        Ver tramitación oficial ↗
                      </a>
                    </div>
                  )}

                  {evento.fuente && (
                    <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", marginTop: "0.2rem" }}>
                      Fuente: {evento.fuente}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: "0.5rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
              El timeline consolida los hitos curriculares y las votaciones de leyes sustantivas.
            </span>
            <a
              href="#historial-votaciones"
              style={{
                fontSize: "0.78rem",
                color: "var(--accent)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Ir al Historial Completo de Votaciones de Sala ↓
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
