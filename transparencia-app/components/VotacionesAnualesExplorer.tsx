"use client";

import { useMemo, useState } from "react";
import type { VotacionAnual, VotacionDestacada } from "@/lib/votaciones-destacadas";

const VOTING_PAGE_SIZE = 12;

function formatNumber(value: number) {
  return value.toLocaleString("es-CL");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function ResultBadge({ result }: { result: VotacionDestacada["resultado"] }) {
  return (
    <span className="featured-vote__result" data-result={result}>
      {result}
    </span>
  );
}

export default function VotacionesAnualesExplorer({
  entries,
  onOpenDetail,
}: {
  entries: VotacionAnual[];
  onOpenDetail: (id: string) => void;
}) {
  const [camera, setCamera] = useState<"Cámara" | "Senado">("Senado");
  const [result, setResult] = useState("Todos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const totals = useMemo(
    () => ({
      Senado: entries.filter((entry) => entry.camara === "Senado").length,
      Cámara: entries.filter((entry) => entry.camara === "Cámara").length,
    }),
    [entries],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return entries.filter((entry) => {
      const matchesQuery =
        !needle ||
        `${entry.titulo} ${entry.resumen} ${entry.boletin ?? ""}`
          .toLocaleLowerCase("es")
          .includes(needle);
      return (
        entry.camara === camera &&
        (result === "Todos" || entry.resultado === result) &&
        matchesQuery
      );
    });
  }, [camera, entries, query, result]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / VOTING_PAGE_SIZE));
  const visible = filtered.slice(
    (page - 1) * VOTING_PAGE_SIZE,
    page * VOTING_PAGE_SIZE,
  );

  return (
    <section className="annual-votes" aria-labelledby="annual-votes-title">
      <div className="featured-votes-page__intro">
        <div>
          <span className="eyebrow">Registro nominal completo</span>
          <h2 id="annual-votes-title">Todas las votaciones de 2026</h2>
        </div>
        <p>
          {formatNumber(filtered.length)} resultados · {formatNumber(entries.length)} en el año
        </p>
      </div>
      <p className="annual-votes__intro">
        Consulta el registro anual completo. Las votaciones destacadas incluyen análisis interno; las demás conservan acceso directo al registro oficial.
      </p>
      <div className="annual-votes__filters">
        <div className="featured-vote-camera-filter">
          <span className="featured-vote-camera-filter__label">Corporación</span>
          <div role="group" aria-label="Filtrar registro anual por cámara">
            {(["Senado", "Cámara"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={camera === value}
                className={camera === value ? "is-active" : ""}
                onClick={() => {
                  setCamera(value);
                  setPage(1);
                }}
              >
                {value} ({formatNumber(totals[value])})
              </button>
            ))}
          </div>
        </div>
        <label>
          Buscar por materia o boletín
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Ej.: agua potable, 17324-33"
          />
        </label>
        <label>
          Resultado
          <select
            value={result}
            onChange={(event) => {
              setResult(event.target.value);
              setPage(1);
            }}
          >
            <option>Todos</option>
            <option>Aprobado</option>
            <option>Rechazado</option>
            <option>En trámite</option>
          </select>
        </label>
      </div>
      <div className="annual-votes__list">
        {visible.map((entry) => (
          <article className="annual-vote-row" key={entry.votacion_id}>
            <div className="annual-vote-row__date">
              <time dateTime={entry.fecha}>{formatDate(entry.fecha)}</time>
              <span>{entry.camara}</span>
            </div>
            <div className="annual-vote-row__body">
              <div className="annual-vote-row__heading">
                <h3>{entry.titulo}</h3>
                <ResultBadge result={entry.resultado} />
              </div>
              <p>{entry.resumen}</p>
              <div className="annual-vote-row__meta">
                <span>{entry.boletin ? `Boletín ${entry.boletin}` : (entry.tipo ?? "Votación de Sala")}</span>
                <span>{entry.quorum ?? "Quórum no publicado"}</span>
                <span>{entry.votos.favor} a favor · {entry.votos.contra} en contra · {entry.votos.abstencion} abstenciones</span>
              </div>
              <div className="annual-vote-row__actions">
                {entry.destacada ? (
                  <button type="button" className="btn btn-primary" onClick={() => onOpenDetail(entry.votacion_id)}>
                    Abrir análisis
                  </button>
                ) : null}
                <a className="btn btn-secondary" href={entry.tramite_url ?? entry.fuente_url} target="_blank" rel="noreferrer">
                  Ver registro oficial ↗
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {visible.length === 0 && <p className="featured-vote__empty" role="status">No hay votaciones que coincidan con estos filtros.</p>}
      {totalPages > 1 && (
        <nav className="annual-votes__pagination" aria-label="Páginas de votaciones">
          <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>← Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Siguiente →</button>
        </nav>
      )}
    </section>
  );
}
