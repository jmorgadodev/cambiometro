"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { groupPersonSearchEvidence, personSearchPage, type PersonSearchEvidence } from "@/lib/person-search-results";
import { publicApiUrl } from "@/lib/public-api-origin";

type Category = "all" | "people" | "payments" | "municipalities" | "organizations";
type ApiResult = {
  id: string;
  type: string;
  nombre: string;
  url?: string;
  cargo?: string;
  organo?: string;
  periodo?: string | null;
  monto?: number | null;
  fuente?: string;
  fuente_url?: string;
  region?: string;
};
type SearchPayload = { data?: { autoridades?: ApiResult[]; municipalidades?: ApiResult[]; funcionarios?: ApiResult[]; remuneraciones?: ApiResult[]; entidades?: ApiResult[] } };
type OfficialsPayload = { data?: Array<Record<string, unknown>>; meta?: { total?: number; page?: number; totalPages?: number } };
type EntitiesPayload = { data?: Array<{ id: string; kind: string; name: string; attributes?: Record<string, unknown> }>; meta?: { page?: number; total?: number; totalPages?: number } };
type UnifiedManifest = { searchIndexKey: string; pages: Array<{ page: number; key: string }> };

const PAGE_SIZE = 15;
const nf = new Intl.NumberFormat("es-CL");
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

let unifiedManifestPromise: Promise<UnifiedManifest> | null = null;
let unifiedIndexPromise: Promise<Record<string, number[]>> | null = null;

function publishedAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
}

function tokens(value: string) {
  return normalize(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 2);
}

async function loadUnifiedManifest() {
  unifiedManifestPromise ??= fetch("/data/remuneraciones-unified/manifest.json", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("REMUNERATION_MANIFEST_UNAVAILABLE");
      return response.json() as Promise<UnifiedManifest>;
    })
    .catch((error) => {
      unifiedManifestPromise = null;
      throw error;
    });
  return unifiedManifestPromise;
}

async function loadUnifiedIndex(manifest: UnifiedManifest) {
  unifiedIndexPromise ??= fetch(`/data/remuneraciones-unified/${manifest.searchIndexKey}`, { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("REMUNERATION_INDEX_UNAVAILABLE");
      return response.json() as Promise<Record<string, number[]>>;
    })
    .catch((error) => {
      unifiedIndexPromise = null;
      throw error;
    });
  return unifiedIndexPromise;
}

async function searchPublishedPaymentPages(query: string, signal: AbortSignal) {
  try {
    const manifest = await loadUnifiedManifest();
    const index = await loadUnifiedIndex(manifest);
    const queryTokens = tokens(query);
    const candidatePages = queryTokens.reduce<number[] | null>((selected, token) => {
      const matches = index[token] ?? [];
      return selected === null ? matches : selected.filter((page) => matches.includes(page));
    }, null) ?? [];
    const boundedPages = candidatePages.slice(0, 24);
    const byPage = new Map(manifest.pages.map((page) => [page.page, page.key]));
    const rows = (await Promise.all(boundedPages.map(async (page) => {
      const key = byPage.get(page);
      if (!key) return [];
      const response = await fetch(`/data/remuneraciones-unified/${key}`, { cache: "force-cache", signal });
      return response.ok ? await response.json() as Array<Record<string, unknown>> : [];
    }))).flat().filter((row) => {
      const text = normalize(`${row.nombreOriginal ?? ""} ${row.organismoOriginal ?? ""} ${row.cargoOriginal ?? ""} ${row.periodo ?? ""}`);
      return queryTokens.every((token) => text.includes(token));
    });
    return {
      rows: rows.map((row) => {
        const name = String(row.nombreOriginal ?? "").trim();
        const sourceId = String(row.sourceId ?? "remuneraciones");
        return {
          id: String(row.recordId ?? `${sourceId}-${name}-${row.periodo ?? ""}`),
          name,
          kind: "remuneracion",
          sourceId,
          url: `/remuneraciones-publicas/?q=${encodeURIComponent(name || query)}`,
          organization: String(row.organismoOriginal ?? "") || undefined,
          role: String(row.cargoOriginal ?? "") || undefined,
          period: row.periodo ? String(row.periodo) : null,
          amount: publishedAmount(row.montoBruto),
          sourceLabel: String(row.sourceLabel ?? sourceId),
        } satisfies PersonSearchEvidence;
      }).filter((row) => row.name),
      partial: candidatePages.length > boundedPages.length,
    };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return { rows: [] as PersonSearchEvidence[], partial: true };
  }
}

function kindCategory(kind: string): Exclude<Category, "all"> {
  if (kind === "funcionario" || kind === "remuneracion") return "payments";
  if (kind === "municipalidad") return "municipalities";
  if (["entidad", "organismo", "proveedor", "legal_entity"].includes(kind)) return "organizations";
  return "people";
}

function mapApiResult(row: ApiResult): PersonSearchEvidence {
  const category = kindCategory(row.type);
  return {
    id: row.id,
    name: row.nombre,
    kind: row.type,
    url: row.url || (category === "payments" ? `/remuneraciones-publicas/?q=${encodeURIComponent(row.nombre)}` : `/entidades/${encodeURIComponent(row.id)}`),
    organization: row.organo,
    role: row.cargo,
    period: row.periodo,
    amount: publishedAmount(row.monto),
    sourceLabel: row.fuente ?? null,
    sourceUrl: row.fuente_url ?? null,
    sourceId: row.type === "funcionario" ? "transparencia-activa" : row.type,
    officialPersonId: row.type === "persona" || row.type === "politico" ? row.id : null,
  };
}

function mapOfficial(row: Record<string, unknown>): PersonSearchEvidence | null {
  const name = String(row.nombre_completo ?? row.nombre ?? "").trim();
  if (!name) return null;
  const scope = String(row.sourceScope ?? "municipal");
  return {
    id: String(row.id ?? `${scope}-${name}`),
    name,
    kind: "funcionario",
    url: `/remuneraciones-publicas/?q=${encodeURIComponent(name)}`,
    organization: String(row.organo_nombre ?? row.organo_id ?? "") || undefined,
    role: String(row.cargo ?? "") || undefined,
    period: String(row.periodo ?? "") || null,
    amount: publishedAmount(row.remuneracion_bruta_mensual ?? row.bruto_mensual),
    sourceLabel: String(row.fuente ?? row.sourceLabel ?? "Transparencia Activa"),
    sourceUrl: String(row.fuente_url ?? row.url_fuente ?? "") || null,
    sourceId: scope === "central" ? "funcionarios-central" : "funcionarios-municipal",
  };
}

function mapEntity(row: { id: string; kind: string; name: string; attributes?: Record<string, unknown> }): PersonSearchEvidence {
  const kind = row.kind === "person" ? "persona" : row.kind === "municipality" ? "municipalidad" : row.kind === "supplier" ? "proveedor" : "organismo";
  return {
    id: row.id,
    name: row.name,
    kind,
    url: kind === "municipalidad" ? `/municipalidades/?search=${encodeURIComponent(row.name)}` : `/entidades/${encodeURIComponent(row.id)}`,
    organization: String(row.attributes?.parentName ?? "") || undefined,
    sourceId: kind,
    officialPersonId: kind === "persona" ? row.id : null,
  };
}

export default function GlobalSearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q")?.trim() ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [evidence, setEvidence] = useState<PersonSearchEvidence[]>([]);
  const [page, setPage] = useState(1);
  const [officialPage, setOfficialPage] = useState(1);
  const [officialTotalPages, setOfficialTotalPages] = useState(1);
  const [entityPage, setEntityPage] = useState(1);
  const [entityTotalPages, setEntityTotalPages] = useState(1);
  const [paymentIndexPartial, setPaymentIndexPartial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialQuery.length >= 2) void runSearch(initialQuery);
    return () => activeController.current?.abort();
    // Initial URL state is intentionally read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => groupPersonSearchEvidence(evidence), [evidence]);
  const filteredGroups = useMemo(() => category === "all" ? groups : groups.filter((group) => kindCategory(group.kind) === category), [category, groups]);
  const pageWindow = personSearchPage(filteredGroups, page, PAGE_SIZE);
  const recordCount = category === "all" ? evidence.length : evidence.filter((item) => kindCategory(item.kind) === category).length;
  const canLoadEntities = category === "all" || category === "people" || category === "municipalities" || category === "organizations";
  const canLoadOfficials = category === "all" || category === "payments";
  const hasNext = page < pageWindow.totalPages || (canLoadEntities && entityPage < entityTotalPages) || (canLoadOfficials && officialPage < officialTotalPages);

  async function fetchJson<T>(path: string, signal?: AbortSignal) {
    const response = await fetch(publicApiUrl(path), { cache: "no-store", signal });
    if (!response.ok) throw new Error("SEARCH_UNAVAILABLE");
    return response.json() as Promise<T>;
  }

  function mergeEvidence(rows: PersonSearchEvidence[]) {
    const byId = new Map<string, PersonSearchEvidence>();
    for (const row of rows) {
      const key = `${row.kind}:${row.id}`;
      if (!byId.has(key)) byId.set(key, row);
    }
    return [...byId.values()];
  }

  async function runSearch(value = query) {
    const clean = value.trim();
    if (clean.length < 2) {
      setError("Escribe al menos dos caracteres.");
      return;
    }
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setLoading(true);
    setError(null);
    setPage(1);
    setOfficialPage(1);
    setEntityPage(1);
    setOfficialTotalPages(1);
    setEntityTotalPages(1);
    setPaymentIndexPartial(false);
    setEvidence([]);
    setSubmittedQuery(clean);
    globalThis.history.replaceState(null, "", `/buscar?q=${encodeURIComponent(clean)}`);

    const [catalogResult, officialsResult, entitiesResult, paymentsResult] = await Promise.allSettled([
      fetchJson<SearchPayload>(`/api/v1/search?q=${encodeURIComponent(clean)}`, controller.signal),
      fetchJson<OfficialsPayload>(`/api/v1/funcionarios?scope=all&query=${encodeURIComponent(clean)}&include_zero=true&limit=100&page=1`, controller.signal),
      fetchJson<EntitiesPayload>(`/api/v1/entities?q=${encodeURIComponent(clean)}&limit=100&page=1`, controller.signal),
      searchPublishedPaymentPages(clean, controller.signal),
    ]);
    if (controller.signal.aborted) return;

    const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : null;
    const officials = officialsResult.status === "fulfilled" ? officialsResult.value : null;
    const entities = entitiesResult.status === "fulfilled" ? entitiesResult.value : null;
    const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : { rows: [], partial: true };
    const catalogRows = [
      ...(catalog?.data?.autoridades ?? []),
      ...(catalog?.data?.municipalidades ?? []),
      ...(catalog?.data?.funcionarios ?? []),
      ...(catalog?.data?.remuneraciones ?? []),
      ...(catalog?.data?.entidades ?? []),
    ].map(mapApiResult);
    const officialRows = (officials?.data ?? []).map(mapOfficial).filter((row): row is PersonSearchEvidence => Boolean(row));
    const entityRows = (entities?.data ?? []).map(mapEntity);
    const rows = mergeEvidence([...catalogRows, ...entityRows, ...officialRows, ...payments.rows]);

    setEvidence(rows);
    setPaymentIndexPartial(payments.partial);
    setOfficialPage(Number(officials?.meta?.page ?? 1));
    setOfficialTotalPages(Math.max(1, Number(officials?.meta?.totalPages ?? 1)));
    setEntityPage(Number(entities?.meta?.page ?? 1));
    setEntityTotalPages(Math.max(1, Number(entities?.meta?.totalPages ?? (Math.ceil(Number(entities?.meta?.total ?? 0) / 100) || 1))));
    if (rows.length === 0 && [catalogResult, officialsResult, entitiesResult, paymentsResult].every((result) => result.status === "rejected")) {
      setError("No fue posible consultar los registros en este momento.");
    }
    setLoading(false);
  }

  async function nextPage() {
    const next = page + 1;
    if (next <= pageWindow.totalPages) {
      setPage(next);
      return;
    }
    if (loadingMore) return;
    const loadEntities = canLoadEntities && entityPage < entityTotalPages;
    const loadOfficials = canLoadOfficials && officialPage < officialTotalPages;
    if (!loadEntities && !loadOfficials) return;
    setLoadingMore(true);
    try {
      if (loadEntities) {
        const sourcePage = entityPage + 1;
        const payload = await fetchJson<EntitiesPayload>(`/api/v1/entities?q=${encodeURIComponent(submittedQuery)}&limit=100&page=${sourcePage}`);
        setEvidence((current) => mergeEvidence([...current, ...(payload.data ?? []).map(mapEntity)]));
        setEntityPage(Number(payload.meta?.page ?? sourcePage));
      } else {
        const sourcePage = officialPage + 1;
        const payload = await fetchJson<OfficialsPayload>(`/api/v1/funcionarios?scope=all&query=${encodeURIComponent(submittedQuery)}&include_zero=true&limit=100&page=${sourcePage}`);
        const rows = (payload.data ?? []).map(mapOfficial).filter((row): row is PersonSearchEvidence => Boolean(row));
        setEvidence((current) => mergeEvidence([...current, ...rows]));
        setOfficialPage(Number(payload.meta?.page ?? sourcePage));
      }
      setPage(next);
    } catch {
      setError("No fue posible cargar más resultados.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main>
      <section className="page-masthead">
        <div className="container-main">
          <p className="eyebrow">BUSCADOR GLOBAL</p>
          <h1>Encuentra personas y registros públicos</h1>
          <p>Revisa coincidencias de autoridades, remuneraciones, municipalidades y organismos.</p>
        </div>
      </section>
      <section className="container-main" style={{ paddingBlock: "1.5rem 3rem" }}>
        <form role="search" onSubmit={(event: FormEvent) => { event.preventDefault(); void runSearch(); }} className="remuneration-search-form">
          <label className="remuneration-search__main">
            Nombre, organismo o cargo
            <input className="form-input" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={80} autoComplete="off" placeholder="Ej.: Kaiser, Torrealba o Ministerio de Salud" />
          </label>
          <button className="btn btn-primary remuneration-search__button" type="submit" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
        </form>

        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginBlock: "1rem" }}>
          {([ ["all", "Todo"], ["people", "Personas"], ["payments", "Remuneraciones"], ["municipalities", "Municipalidades"], ["organizations", "Organismos"] ] as Array<[Category, string]>).map(([value, label]) => (
            <button key={value} type="button" className={`btn ${category === value ? "btn-primary" : "btn-secondary"}`} aria-pressed={category === value} onClick={() => { setCategory(value); setPage(1); }}>{label}</button>
          ))}
        </div>

        {error && <p role="alert" className="empty-state">{error}</p>}
        {loading && <p role="status">Buscando coincidencias…</p>}
        {!loading && submittedQuery && !error && (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">RESULTADOS</p>
                <h2>Coincidencias para “{submittedQuery}”</h2>
                <p>{nf.format(filteredGroups.length)} personas o entidades distintas · {nf.format(recordCount)} registros consultados</p>
                {paymentIndexPartial && <p>Hay más coincidencias de remuneraciones; agrega otro nombre, organismo o período para acotar la búsqueda.</p>}
              </div>
            </div>
            {pageWindow.items.length === 0 ? (
              <div className="empty-state"><strong>No encontramos coincidencias</strong><p>Prueba con otro nombre, apellido, organismo o cargo.</p></div>
            ) : (
              <div className="evidence-list">
                {pageWindow.items.map((group) => (
                  <article key={group.key}>
                    <div><span className="status-label status-label--info">{kindCategory(group.kind) === "payments" ? "Remuneración" : group.kind === "municipalidad" ? "Municipalidad" : kindCategory(group.kind) === "organizations" ? "Organismo" : "Persona / autoridad"}</span></div>
                    <h3><Link prefetch={false} href={group.url}>{group.name}</Link></h3>
                    <p>{[group.evidence[0]?.role, group.evidence[0]?.organization, group.evidence[0]?.period].filter(Boolean).join(" · ")}</p>
                    {group.identityConfidence === "source-scoped" && <small>Coincidencias conservadas por fuente y organismo; no se fusionan personas sólo por compartir nombre.</small>}
                    <small>{nf.format(group.evidence.length)} registro{group.evidence.length === 1 ? "" : "s"} en esta consulta</small>
                    <details>
                      <summary>Ver evidencia publicada</summary>
                      <div style={{ overflowX: "auto" }}>
                        <table className="data-table">
                          <thead><tr><th>Fuente</th><th>Organismo</th><th>Cargo</th><th>Período</th><th>Monto</th></tr></thead>
                          <tbody>{group.evidence.map((item) => (
                            <tr key={`${item.kind}:${item.id}`}>
                              <td>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceLabel ?? item.kind} ↗</a> : item.sourceLabel ?? item.kind}</td>
                              <td>{item.organization ?? "No informado"}</td>
                              <td>{item.role ?? "No informado"}</td>
                              <td>{item.period ?? "No informado"}</td>
                              <td>{item.amount === null || item.amount === undefined ? "No publicado" : money.format(item.amount)}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            )}
            {(pageWindow.totalPages > 1 || hasNext) && (
              <nav className="remuneration-results__pagination" aria-label="Páginas de resultados">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>← Anterior</button>
                <span>Resultados {nf.format(pageWindow.start + 1)}–{nf.format(pageWindow.end)} de {nf.format(filteredGroups.length)}</span>
                <button type="button" onClick={() => void nextPage()} disabled={!hasNext || loadingMore}>{loadingMore ? "Cargando…" : "Siguiente →"}</button>
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  );
}
