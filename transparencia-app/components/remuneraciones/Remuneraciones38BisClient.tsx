"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Remuneracion38BisRecord } from "@/lib/remuneraciones-38bis";

interface PageEntry {
  page: number;
  key: string;
  count: number;
}

interface ReleaseManifest {
  source_url: string;
  mes: string;
  extraido_en: string;
  total: number;
  page_size: number;
  page_count: number;
  checksum_sha256: string;
  pages: PageEntry[];
  audit: {
    estado: string;
    periodo_anterior: string | null;
    entradas: number;
    salidas_observadas: number;
    cambios: number;
    d1_rows_read: number;
    d1_rows_written: number;
  };
}

type SearchIndex = Record<string, number[]>;

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-CL");

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(value));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rowText(row: Remuneracion38BisRecord) {
  return normalize(`${row.nombre} ${row.organismo} ${row.cargo} ${row.partida}`);
}

export default function Remuneraciones38BisClient({
  manifest,
  initialRows,
}: {
  manifest: ReleaseManifest;
  initialRows: Remuneracion38BisRecord[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"todos" | "congreso" | "gobierno">("todos");
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Remuneracion38BisRecord | null>(null);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/data/remuneraciones-38bis/search-index.json")
      .then((response) => response.json() as Promise<SearchIndex>)
      .then((value) => { if (active) setSearchIndex(value); })
      .catch(() => { if (active) setSearchIndex({}); });
    return () => { active = false; };
  }, []);

  const fetchPage = useCallback(async (pageNumber: number) => {
    const entry = manifest.pages.find((item) => item.page === pageNumber);
    if (!entry) return [];
    const response = await fetch(`/data/remuneraciones-38bis/${entry.key}`);
    if (!response.ok) throw new Error("No se pudo cargar esta página del registro.");
    return response.json() as Promise<Remuneracion38BisRecord[]>;
  }, [manifest.pages]);

  useEffect(() => {
    if (page === 1 || query.trim()) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      fetchPage(page)
        .then((value) => { if (active) setRows(value); })
        .catch((reason: Error) => { if (active) setError(reason.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [fetchPage, page, query]);

  useEffect(() => {
    if (!query.trim() || !searchIndex) return;
    let active = true;
    const terms = normalize(query).split(/\s+/).filter((term) => term.length >= 2);
    const candidatePages = new Set<number>();
    for (const term of terms) for (const pageNumber of searchIndex[term] ?? []) candidatePages.add(pageNumber);
    const timer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      Promise.all([...candidatePages].sort((a, b) => a - b).map(fetchPage))
        .then((groups) => {
          if (!active) return;
          const matches = groups.flat().filter((row) => rowText(row).includes(normalize(query)));
          setRows(matches);
          setResultCount(matches.length);
          setPage(1);
        })
        .catch((reason: Error) => { if (active) setError(reason.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [fetchPage, query, searchIndex]);

  const sourceRows = !query.trim() && page === 1 ? initialRows : rows;
  const filteredRows = useMemo(() => sourceRows.filter((row) => {
    if (scope === "todos") return true;
    return scope === "congreso" ? row.partida === "Congreso Nacional" : row.partida !== "Congreso Nacional";
  }), [sourceRows, scope]);

  const showingLabel = query.trim()
    ? `${number.format(resultCount ?? filteredRows.length)} coincidencias`
    : `Página ${page} de ${manifest.page_count}`;

  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <span className="eyebrow">Personas · Registro público 38 bis</span>
            <h1>Remuneraciones públicas</h1>
            <p>
              Consulta las remuneraciones brutas publicadas para autoridades y asesores directos sujetos al artículo 38 bis.
              Cada corte conserva su período, organismo, cargo y fuente original.
            </p>
          </div>
          <dl className="page-fact-sheet">
            <div><dt>Último corte</dt><dd>{manifest.mes}</dd></div>
            <div><dt>Registros publicados</dt><dd>{number.format(manifest.total)}</dd></div>
            <div><dt>Actualizado aquí</dt><dd>{formatDate(manifest.extraido_en)}</dd></div>
          </dl>
        </div>
      </header>

      <main className="container-main" style={{ padding: "2.25rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section className="card" aria-labelledby="release-title">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <span className="eyebrow">Trazabilidad del release</span>
              <h2 id="release-title" style={{ margin: "0.25rem 0 0.35rem", fontSize: "1.35rem" }}>Un corte mensual, una versión verificable</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem", lineHeight: 1.6 }}>
                La Comisión mantiene este registro mensualmente; la fecha del corte puede tener desfase respecto de la fecha de publicación.
                La información es reportada por las instituciones responsables.
              </p>
            </div>
            <span className="badge badge-ok">R2 · D1 no utilizado</span>
          </div>

          <div className="stat-grid" style={{ marginTop: "1.25rem" }}>
            <div className="stat-tile stat-tile--accent"><div className="stat-tile__value">{number.format(manifest.total)}</div><div className="stat-tile__label">Registros del corte</div><div className="stat-tile__hint">{manifest.mes}</div></div>
            <div className="stat-tile stat-tile--ok"><div className="stat-tile__value">{number.format(manifest.audit.entradas)}</div><div className="stat-tile__label">Entradas observadas</div><div className="stat-tile__hint">{manifest.audit.estado === "linea_base" ? "Línea base inicial" : "Frente al corte anterior"}</div></div>
            <div className="stat-tile stat-tile--warn"><div className="stat-tile__value">{number.format(manifest.audit.salidas_observadas)}</div><div className="stat-tile__label">Salidas observadas</div><div className="stat-tile__hint">No prueba término jurídico</div></div>
            <div className="stat-tile stat-tile--info"><div className="stat-tile__value">{number.format(manifest.audit.cambios)}</div><div className="stat-tile__label">Cambios de monto</div><div className="stat-tile__hint">Comparación mensual</div></div>
          </div>

          <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "1rem", flexWrap: "wrap", color: "var(--text-subtle)", fontSize: "0.74rem" }}>
            <span>Checksum: <code>{manifest.checksum_sha256.slice(0, 16)}…</code></span>
            <span>Filas leídas desde D1: <strong style={{ color: "var(--ok)" }}>{manifest.audit.d1_rows_read}</strong></span>
            <a href={manifest.source_url} target="_blank" rel="noopener noreferrer" className="data-link">Fuente oficial ↗</a>
          </div>
        </section>

        <section className="card" aria-labelledby="explore-title">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <span className="eyebrow">Explorador paginado</span>
              <h2 id="explore-title" style={{ margin: "0.25rem 0 0.25rem", fontSize: "1.25rem" }}>Busca una persona, organismo o cargo</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>El navegador carga sólo la página solicitada; no descarga el universo completo.</p>
            </div>
            <span style={{ color: "var(--text-subtle)", fontSize: "0.78rem" }}>{showingLabel}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 220px", gap: "0.75rem", marginTop: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.74rem", fontWeight: 700 }}>
              Buscar
              <input className="form-input" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Ej. Ministerio del Interior" aria-label="Buscar remuneraciones públicas" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.74rem", fontWeight: 700 }}>
              Ámbito
              <select className="form-input" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)} aria-label="Filtrar por ámbito">
                <option value="todos">Todos los registros</option>
                <option value="gobierno">Gobierno y otros organismos</option>
                <option value="congreso">Congreso Nacional</option>
              </select>
            </label>
          </div>

          {error && <p role="alert" className="badge badge-danger" style={{ marginTop: "1rem", textTransform: "none", letterSpacing: 0 }}>{error}</p>}
          {loading && <p role="status" style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "1rem 0 0" }}>Cargando registros…</p>}

          <div className="table-shell" style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <caption className="sr-only">Registros de remuneraciones públicas del corte {manifest.mes}</caption>
              <thead><tr><th>Persona</th><th>Organismo</th><th>Cargo</th><th>Bruto del mes</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.nombre}-${row.organismo}-${row.cargo}`}>
                    <td><strong>{row.nombre}</strong><small>{row.partida}</small></td>
                    <td>{row.organismo}</td>
                    <td>{row.cargo}</td>
                    <td style={{ whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{row.bruto_mensual === null ? "No reportado" : money.format(row.bruto_mensual)}</td>
                    <td><button type="button" className="btn btn-ghost" style={{ padding: "0.35rem 0.55rem", fontSize: "0.74rem" }} onClick={() => setSelected(row)}>Ver ficha</button></td>
                  </tr>
                ))}
                {!loading && filteredRows.length === 0 && <tr><td colSpan={5}><div role="status" style={{ padding: "2rem 0", textAlign: "center", color: "var(--text-muted)" }}>No encontramos registros con esos filtros.</div></td></tr>}
              </tbody>
            </table>
          </div>

          {!query.trim() && <nav aria-label="Paginación de remuneraciones" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="button" className="btn btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Anterior</button>
            <span style={{ color: "var(--text-subtle)", fontSize: "0.75rem" }}>Página {page} / {manifest.page_count}</span>
            <button type="button" className="btn btn-ghost" disabled={page >= manifest.page_count || loading} onClick={() => setPage((value) => Math.min(manifest.page_count, value + 1))}>Siguiente →</button>
          </nav>}
        </section>

        <section className="card" aria-labelledby="method-title">
          <span className="eyebrow">Cómo leer estos cambios</span>
          <h2 id="method-title" style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.15rem" }}>Auditoría mensual, no una acusación automática</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.84rem", lineHeight: 1.7 }}>
            Una entrada significa que el registro aparece en el nuevo corte; una salida observada significa que dejó de aparecer; un cambio significa que varió el monto publicado. Estos indicadores orientan la revisión y siempre conservan el período, la fuente y el valor original.
          </p>
        </section>
      </main>

      {selected && (
        <div role="dialog" aria-modal="true" aria-labelledby="remuneracion-ficha-title" className="overlay-panel" onClick={() => setSelected(null)}>
          <div className="card" style={{ width: "min(100% - 2rem, 34rem)", margin: "auto", padding: "1.5rem" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
              <div><span className="eyebrow">Registro {manifest.mes}</span><h2 id="remuneracion-ficha-title" style={{ margin: "0.25rem 0", fontSize: "1.25rem" }}>{selected.nombre}</h2></div>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)} aria-label="Cerrar ficha">Cerrar</button>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "0.8rem", margin: "1.25rem 0 0", fontSize: "0.82rem" }}>
              <div><dt style={{ color: "var(--text-subtle)" }}>Organismo</dt><dd style={{ margin: 0, fontWeight: 700 }}>{selected.organismo}</dd></div>
              <div><dt style={{ color: "var(--text-subtle)" }}>Partida</dt><dd style={{ margin: 0, fontWeight: 700 }}>{selected.partida}</dd></div>
              <div><dt style={{ color: "var(--text-subtle)" }}>Cargo o perfil</dt><dd style={{ margin: 0, fontWeight: 700 }}>{selected.cargo}</dd></div>
              <div><dt style={{ color: "var(--text-subtle)" }}>Remuneración bruta</dt><dd style={{ margin: 0, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{selected.bruto_mensual === null ? "No reportado" : money.format(selected.bruto_mensual)}</dd></div>
            </dl>
            <p style={{ margin: "1.25rem 0 0", color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.6 }}>Este registro corresponde al corte {manifest.mes}. La ficha no interpreta por sí sola la legalidad o pertinencia del nombramiento.</p>
          </div>
        </div>
      )}
    </div>
  );
}
