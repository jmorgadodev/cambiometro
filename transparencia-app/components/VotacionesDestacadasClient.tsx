"use client";

import { useMemo, useState } from "react";
import type { VotacionDestacada } from "@/lib/votaciones-destacadas";

export default function VotacionesDestacadasClient({ entries }: { entries: VotacionDestacada[] }) {
  const [tag, setTag] = useState("Todas");
  const [camara, setCamara] = useState("Todas");
  const [resultado, setResultado] = useState("Todos");
  const tags = ["Todas", ...new Set(entries.flatMap((entry) => entry.tags))];
  const filtered = useMemo(() => entries.filter((entry) => (tag === "Todas" || entry.tags.includes(tag)) && (camara === "Todas" || entry.camara === camara) && (resultado === "Todos" || entry.resultado === resultado)).sort((a, b) => b.fecha.localeCompare(a.fecha)), [entries, tag, camara, resultado]);
  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead"><div className="container-main"><span className="eyebrow">Congreso Nacional · padrón nominal</span><h1>Votaciones destacadas</h1><p style={{ color: "var(--text-muted)", maxWidth: 760 }}>Selección editorial de eventos con impacto institucional, quórum relevante o seguimiento público. Cada registro conserva su boletín, resultado recalculado y fuente oficial.</p></div></header>
      <main className="container-main" style={{ padding: "2.5rem 1.5rem 4rem" }}>
        <div role="group" aria-label="Filtros de votaciones destacadas" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <label>Etiqueta <select value={tag} onChange={(event) => setTag(event.target.value)}>{tags.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Cámara <select value={camara} onChange={(event) => setCamara(event.target.value)}><option>Todas</option><option>Cámara</option><option>Senado</option></select></label>
          <label>Resultado <select value={resultado} onChange={(event) => setResultado(event.target.value)}><option>Todos</option><option>Aprobado</option><option>Rechazado</option><option>En trámite</option><option>Retirado</option></select></label>
        </div>
        <div style={{ display: "grid", gap: "1rem" }}>{filtered.map((entry) => <article key={entry.votacion_id} className="card" style={{ padding: "1.25rem" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}><div><span className="eyebrow">Destacada · {entry.camara}</span><h2 style={{ fontSize: "1.1rem", margin: "0.25rem 0" }}>{entry.titulo}</h2><p style={{ margin: 0, color: "var(--text-muted)" }}>{entry.boletin} · {entry.fecha}</p></div><span className={`badge ${entry.resultado === "Aprobado" ? "badge-ok" : entry.resultado === "Rechazado" ? "badge-danger" : "badge-warn"}`}>{entry.resultado}</span></div><p style={{ margin: "0.8rem 0", color: "var(--text-primary)" }}>{entry.resumen}</p><a href={entry.fuente_url} target="_blank" rel="noreferrer">Ver detalle ↗</a></article>)}</div>
        {filtered.length === 0 && <p role="status">No hay votaciones para estos filtros.</p>}
      </main>
    </div>
  );
}
