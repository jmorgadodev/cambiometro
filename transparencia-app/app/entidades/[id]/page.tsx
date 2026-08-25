import type { EvidenceKind, EvidenceRecord, CursorPage } from "@/lib/data-contracts";
import Link from "@/components/SiteLink";
import { notFound, redirect } from "next/navigation";
import { getEntitiesByIds, getEntity, listEntities, listRecords, listRelations } from "@/lib/data-platform-d1";
import { presupuestoParaPrograma } from "@/lib/presupuesto";
import { chilecompraParaComprador } from "@/lib/chilecompra";
import { sinimParaMunicipio } from "@/lib/sinim";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readR2Entity, readR2EntityIndex } from "@/lib/r2-entities";
import { readR2EvidenceRecords } from "@/lib/r2-records";
import { personalApoyoEvidenceParaEntidad } from "@/lib/personal-apoyo";
import { politicoIdFromEntityId } from "@/lib/politico-canonical";
import PersonEntityProfile from "@/components/PersonEntityProfile";
import Breadcrumbs from "@/components/Breadcrumbs";
import EntityEvidenceAccordionExplorer from "@/components/records/EntityEvidenceAccordionExplorer";
import { traducirPredicado, traducirTipoEntidad, formatNombreInstitucional } from "@/lib/diccionario-cruces";
import { evaluateBudgetSourceAnomaly } from "@/lib/budget-integrity";
import type { Metadata } from "next";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { SERVICIOS_PUBLICOS_SEED } from "@/lib/servicios-publicos";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// La ficha se pre-renderiza con la vista por defecto. Los filtros y pestañas
// se mantienen como navegación del cliente; no se permite que query params
// conviertan esta ruta en SSR durante el export de Pages.
export const dynamic = "force-static";

async function getBuildCanonicalEntityIds() {
  const indexPath = path.join(process.cwd(), "data", "entidades-canonica.json");
  if (!existsSync(indexPath)) {
    // El índice canónico puede vivir sólo en D1/R2 durante el ETL. En ese
    // caso, el fallback compacto de build se pagina completo para que una
    // entidad enlazada desde /entidades nunca quede fuera de Pages.
    const ids: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 200; page += 1) {
      const result = await listEntities({ limit: 100, cursor });
      ids.push(...result.data.map((entity) => entity.id));
      if (!result.nextCursor || result.data.length === 0) break;
      cursor = result.nextCursor;
    }
    return ids.length > 0 ? ids : ["public-body-camara"];
  }

  const payload = JSON.parse(readFileSync(indexPath, "utf8")) as {
    entities?: Array<{ id?: string }>;
  };
  return (payload.entities ?? []).map((entity) => entity.id).filter((id): id is string => Boolean(id));
}

export async function generateStaticParams() {
  const ids: Array<{ id: string }> = [];
  for (const pol of POLITICOS_SEED) {
    ids.push({ id: pol.id });
    ids.push({ id: `pol-${pol.id}` });
  }
  for (const serv of SERVICIOS_PUBLICOS_SEED) {
    ids.push({ id: serv.id });
  }
  for (const muni of MUNICIPALIDADES_SEED) {
    ids.push({ id: muni.id });
  }
  for (const id of await getBuildCanonicalEntityIds()) {
    ids.push({ id });
  }
  return ids;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    alternates: {
      canonical: `/entidades/${id}`,
    },
  };
}

const TABS: Array<{ id: string; label: string; kinds?: EvidenceKind[] }> = [
  { id: "resumen", label: "Resumen" },
  { id: "dinero", label: "Dinero público", kinds: ["purchase", "expense", "budget_execution", "transfer", "remuneration"] },
  { id: "contratos", label: "Contratos", kinds: ["contract"] },
  { id: "probidad", label: "Probidad", kinds: ["declaration"] },
  { id: "lobby", label: "Lobby", kinds: ["lobby"] },
  { id: "fiscalizaciones", label: "Fiscalizaciones", kinds: ["audit"] },
  { id: "actividad", label: "Actividad", kinds: ["vote", "attendance", "authority"] },
  { id: "relaciones", label: "Relaciones" },
  { id: "fuentes", label: "Fuentes" },
];

async function loadAllRecords(id: string) {
  const all: EvidenceRecord[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const res = await listRecords({ entityId: id, limit: 100, cursor });
    all.push(...res.data);
    if (!res.nextCursor || res.data.length === 0) break;
    cursor = res.nextCursor;
  }
  return all;
}

async function runtimeEntity(id: string) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) return null;
    const [entity, index] = await Promise.all([readR2Entity(env.PUBLIC_DATA, id), readR2EntityIndex(env.PUBLIC_DATA, id)]);
    if (!entity) return null;
    const sourceIds = index?.sourceIds ?? (index ? [index.sourceId] : entity.sourceIds);
    const all: EvidenceRecord[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 20; page += 1) {
      try {
        const res: CursorPage<EvidenceRecord> | null = await readR2EvidenceRecords(env.PUBLIC_DATA, { source: sourceIds, entityId: id, limit: 100, cursor });
        if (!res) break;
        all.push(...res.data);
        if (!res.nextCursor || res.data.length === 0) break;
        cursor = res.nextCursor;
      } catch {
        break;
      }
    }
    return { entity, records: all, relations: index?.relations ?? [] };
  } catch {
    return null;
  }
}

export default async function EntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    area?: string;
    region?: string;
    from_cruce?: string;
    q?: string;
    cat?: string;
  }>;
}) {
  const { id } = await params;

  // Redirección permanente si la entidad corresponde a un parlamentario / autoridad con ficha completa en /politico
  const directPoliticoId = politicoIdFromEntityId(id);
  if (directPoliticoId) {
    redirect(`/politico/${directPoliticoId}`);
  }

  const query = await searchParams;
  const selectedId = query.tab ?? "resumen";
  const selected = TABS.find((tab) => tab.id === selectedId) ?? TABS[0];
  const d1Entity = await getEntity(id);
  const runtime = d1Entity ? null : await runtimeEntity(id);
  const entity = d1Entity ?? runtime?.entity;
  if (!entity) notFound();

  // Si la entidad es de tipo persona y corresponde a un parlamentario, redirigir a su ficha de transparencia
  if (entity.kind === "person") {
    const matchedPoliticoId = politicoIdFromEntityId(entity.id, entity.name);
    if (matchedPoliticoId) {
      redirect(`/politico/${matchedPoliticoId}`);
    }
  }

  const platformRecords = d1Entity ? await loadAllRecords(id) : (runtime?.records ?? []);
  const extraRes = await listRecords({ entityId: id, limit: 100 });
  const extraRecords = extraRes?.data ?? [];
  const supportRecords = entity.kind === "person" ? await personalApoyoEvidenceParaEntidad(entity) : [];
  let allRecords = [...new Map(
    platformRecords.concat(extraRecords).concat(supportRecords).map((record) => [record.id, record]),
  ).values()];

  if (allRecords.length === 0) {
    const platform = await import("@/lib/data-platform-v1");
    const allKnown = platform.listRecords({ limit: 1000 }).data;
    const directMatches = allKnown.filter(
      (r) =>
        r.subjectEntityIds.includes(id) ||
        r.objectEntityIds.includes(id) ||
        (r.title && r.title.toLowerCase().includes(entity.name.toLowerCase())) ||
        (entity.name && JSON.stringify(r.data || {}).toLowerCase().includes(entity.name.toLowerCase()))
    );
    if (directMatches.length > 0) {
      allRecords = directMatches;
    }
  }
  const entitySourceIds = Array.isArray(entity.sourceIds) ? entity.sourceIds : [];
  const presentedEntity = supportRecords.length > 0 && !entitySourceIds.includes("personal-apoyo")
    ? { ...entity, sourceIds: [...entitySourceIds, "personal-apoyo"] }
    : { ...entity, sourceIds: entitySourceIds };
  const filteredRecords = selected.id === "relaciones" || selected.id === "fuentes" ? []
    : selected.kinds ? allRecords.filter((record) => selected.kinds?.includes(record.kind)) : allRecords;
  const records = query.area || query.region
    ? filteredRecords.filter((record) =>
        (!query.area || record.data?.area === query.area) &&
        (!query.region || record.data?.region === query.region)
      )
    : filteredRecords;
  const alertas = filteredRecords.reduce(
    (acc, record) => {
      const area = record.data?.area;
      const region = record.data?.region;
      if (typeof area === "string") acc.areas.set(area, (acc.areas.get(area) ?? 0) + 1);
      if (typeof region === "string") acc.regiones.set(region, (acc.regiones.get(region) ?? 0) + 1);
      return acc;
    },
    { areas: new Map<string, number>(), regiones: new Map<string, number>() },
  );
  const related = await listRelations({ fromId: id, limit: 100 });
  const objectRelated = await listRelations({ toId: id, limit: 100 });
  const directRelated = await listRelations({ entityId: id, limit: 100 });
  const rawRelations = (d1Entity ? related.data.concat(objectRelated.data) : (runtime?.relations ?? [])).concat(directRelated?.data ?? []);
  const relations = [...new Map(rawRelations.map((r) => [r.id, r])).values()];
  if (entity.kind === "person") {
    if (query.tab && TABS.some((tab) => tab.id === query.tab)) {
      redirect(`/entidades/${id}#${selected.id}`);
    }
    const counterpartIds = [...new Set(relations.map((relation) =>
      relation.fromId === id ? relation.toId : relation.fromId
    ))];
    const counterparts = counterpartIds.length > 0 ? await getEntitiesByIds(counterpartIds) : [];
    const counterpartNames = Object.fromEntries(
      counterparts.map((counterpart) => [counterpart.id, counterpart.name]),
    );
    return (
      <main>
        <PersonEntityProfile
          entity={presentedEntity}
          records={allRecords}
          relations={relations}
          counterpartNames={counterpartNames}
        />
      </main>
    );
  }
  const [presupuesto, chilecompra, sinim] = await Promise.all([
    presupuestoParaPrograma(id),
    chilecompraParaComprador(id),
    sinimParaMunicipio(id),
  ]);
  const dineroPlano = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount);
  const clp = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0, notation: "compact" }).format(amount);
  const pct = (parte: number, total: number) => (total > 0 ? `${((parte / total) * 100).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%` : "—");
  const qparams = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (query.tab) sp.set("tab", query.tab);
    if (query.area) sp.set("area", query.area);
    if (query.region) sp.set("region", query.region);
    for (const [key, value] of Object.entries(extra)) sp.set(key, value);
    return sp.toString();
  };

  return (
    <main>
      <section className="page-masthead">
        <div className="container-main">
          {query.from_cruce && (
            <div
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--accent)",
                borderRadius: 8,
                padding: "0.65rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: "0.82rem", color: "var(--text-1)", fontWeight: 600 }}>
                🔗 Viene desde el explorador de cruces documentales
              </div>
              <Link
                href="/cruces"
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  color: "var(--accent)",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "0.3rem 0.7rem",
                }}
              >
                ← Volver al Cruce
              </Link>
            </div>
          )}
          <Breadcrumbs
            items={[
              { label: "Entidades", href: "/cruces" },
              ...(entity.attributes?.parentEntityId && entity.attributes?.parentName
                ? [{ label: String(entity.attributes.parentName), href: `/entidades/${entity.attributes.parentEntityId}` }]
                : []),
              { label: formatNombreInstitucional(entity.name).display },
            ]}
          />
        </div>
        <div className="container-main page-masthead__grid">
          <div>
            <p className="eyebrow">Entidad canónica · {traducirTipoEntidad(entity.kind)}</p>
            <h1>{formatNombreInstitucional(entity.name).display}</h1>
            {entity.attributes?.parentName && (
              <div style={{ marginTop: "0.35rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Institución matriz:{" "}
                <Link
                  href={`/entidades/${entity.attributes.parentEntityId}`}
                  style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                >
                  {String(entity.attributes.parentName)} ↗
                </Link>
              </div>
            )}
            <p style={{ marginTop: "0.4rem" }}>Ficha construida sólo con identificadores oficiales o conciliación editorial revisada.</p>
          </div>
          <dl className="page-fact-sheet">
            <div><dt>Evidencias</dt><dd>{allRecords.length}</dd></div>
            <div><dt>Relaciones</dt><dd>{relations.length}</dd></div>
            <div><dt>Fuentes</dt><dd>{entity.sourceIds.join(", ")}</dd></div>
          </dl>
        </div>
      </section>
      <div className="container-main entity-layout">
        <nav className="entity-tabs" aria-label="Secciones de la ficha">{TABS.map((tab) => <Link key={tab.id} className={selected.id === tab.id ? "is-active" : ""} href={`?tab=${tab.id}`}>{tab.label}</Link>)}</nav>
        <section>
          <div className="section-heading"><div><p className="eyebrow">{selected.label}</p><h2>Evidencia publicada</h2></div></div>
          {selected.id === "dinero" && presupuesto && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-surface-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>Presupuesto público · DIPRES 2026 · {presupuesto.budgetSide === "revenue" ? "Ingresos" : "Gastos"} · Partida {presupuesto.partida} · Capítulo {presupuesto.capitulo} · Programa {presupuesto.programa}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", marginTop: "0.15rem" }}>Ejecución acumulada mensual oficial · Ficha Poder Ejecutivo / dipres.gob.cl</div>
                </div>
                <a href={`https://www.dipres.gob.cl/ficha-poder-ejecutivo`} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none" }}>Fuente oficial ↗</a>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead><tr style={{ color: "var(--text-subtle)", textAlign: "left" }}><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>Mes</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Presupuesto inicial</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Presupuesto vigente</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Ejecución acumulada</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>% ejec.</th></tr></thead>
                  <tbody>{presupuesto.meses.map((mes) => (
                    <tr key={mes.period} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.35rem 0.5rem", color: "var(--text-muted)" }}>{new Date(`${mes.period}-01T00:00:00`).toLocaleDateString("es-CL", { month: "short", year: "numeric" }).replace(".", "")}</td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{clp(mes.inicial)}</td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{clp(mes.vigente)}</td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{clp(mes.ejecutado)}</td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{pct(mes.ejecutado, mes.vigente)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {presupuesto.subtitulos.length > 0 && (
                <>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>Desglose por subtítulo {presupuesto.meses.length > 0 ? `(acumulado ${presupuesto.meses[presupuesto.meses.length - 1].period})` : ""} </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                      <thead><tr style={{ color: "var(--text-subtle)", textAlign: "left" }}><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>Cód.</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>Denominación</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Vigente</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Ejecutado</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>% ejec.</th></tr></thead>
                      <tbody>{presupuesto.subtitulos.map((sub) => {
                        const integrity = evaluateBudgetSourceAnomaly({ ejecutado: sub.ejecutado, vigente: sub.vigente });
                        return (
                          <tr key={sub.subtitulo} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "0.35rem 0.5rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{sub.subtitulo}</td>
                            <td style={{ padding: "0.35rem 0.5rem" }}>
                              {sub.denominacion}
                              {integrity.status === "ALTA" && <span style={{ display: "block", color: "var(--warn)", fontWeight: 800 }}>Hallazgo de integridad ALTA (V7) · valor oficial preservado</span>}
                            </td>
                            <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{clp(sub.vigente)}</td>
                            <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{clp(sub.ejecutado)}</td>
                            <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{pct(sub.ejecutado, sub.vigente)}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          {selected.id === "dinero" && chilecompra && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-surface-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>Licitaciones y adjudicaciones · ChileCompra OCDS</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", marginTop: "0.15rem" }}>{chilecompra.procesos} procesos · {chilecompra.monto_total_clp === null ? "monto oficial no publicado" : `${clp(chilecompra.monto_total_clp)} CLP adjudicados`} · período {chilecompra.months[chilecompra.months.length - 1]?.period} al {chilecompra.months[0]?.period}</div>
                </div>
                <a href="https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds" target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none" }}>Fuente oficial ↗</a>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead><tr style={{ color: "var(--text-subtle)", textAlign: "left" }}><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>Mes</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Procesos</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Adjudicado</th></tr></thead>
                  <tbody>{chilecompra.months.map((mes) => (
                    <tr key={mes.period} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.35rem 0.5rem", color: "var(--text-muted)" }}>{new Date(`${mes.period}-01T00:00:00`).toLocaleDateString("es-CL", { month: "short", year: "numeric" }).replace(".", "")}</td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{mes.procesos}</td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{mes.monto_total_clp === null ? "—" : clp(mes.monto_total_clp)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>Mayores adjudicaciones (últimos 6 procesos con monto)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>{chilecompra.top.map((adj, index) => (
                <div key={`${adj.ocid}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline", fontSize: "0.72rem" }}>
                  <div style={{ minWidth: 0 }}>
                    <a href={adj.url ?? `https://www.mercadopublico.cl/Procesos/VerProceso?Id=${adj.ocid.split("-").at(-1)}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>{adj.title ?? "Título oficial no publicado"}</a>
                    <div style={{ color: "var(--text-subtle)", fontSize: "0.66rem" }}>{adj.proveedor ?? "Proveedor no publicado"} · {(adj.fecha ?? "").slice(0, 10)}</div>
                  </div>
                  <div style={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>{adj.monto_clp === null ? "—" : clp(adj.monto_clp)}</div>
                </div>
              ))}</div>
            </div>
          )}
          {selected.id === "dinero" && sinim && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-surface-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>Indicadores municipales · SINIM {sinim.indicators[0]?.period ?? "2025"}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", marginTop: "0.15rem" }}>Finanzas municipales oficiales · datos.sinim.gov.cl</div>
                </div>
                <a href="https://datos.sinim.gov.cl/datos_municipales.php" target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none" }}>Fuente oficial ↗</a>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead><tr style={{ color: "var(--text-subtle)", textAlign: "left" }}><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>Indicador</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Valor oficial</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>Monto CLP</th><th style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>Origen</th></tr></thead>
                  <tbody>{sinim.indicators.map((ind) => (
                    <tr key={ind.code} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.35rem 0.5rem" }}><strong>{ind.label}</strong> <span style={{ color: "var(--text-subtle)", fontSize: "0.68rem", fontFamily: "monospace" }}>· {ind.code}</span></td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{ind.value ?? "—"}</td>
                      <td style={{ padding: "0.35rem 0.5rem", textAlign: "right", fontFamily: "monospace" }}>{ind.monto_clp !== null ? dineroPlano(ind.monto_clp) : "—"}</td>
                      <td style={{ padding: "0.35rem 0.5rem" }}>{ind.url ? <a href={ind.url} target="_blank" rel="noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent)", textDecoration: "none" }}>SINIM ↗</a> : <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>—</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {selected.id === "fuentes" && <div className="evidence-list"><article><div><span className="status-label status-label--info">Identificadores oficiales</span></div><h3>Claves de conciliación</h3><dl>{entity.identifiers.map((identifier) => <div key={`${identifier.scheme}-${identifier.value}`}><dt>{identifier.scheme}</dt><dd><code>{identifier.value}</code> <a href={identifier.sourceUrl} target="_blank" rel="noreferrer">origen ↗</a></dd></div>)}</dl></article></div>}
          {selected.id === "fiscalizaciones" && alertas.areas.size > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem", padding: "0.9rem", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-surface-2)" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>Alertas por área y región · Contraloría General</div>
              {query.area || query.region ? <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><span className="status-label status-label--info">Filtro activo</span>{query.area && <span>{query.area}</span>}{query.region && <span>{query.region}</span>}<Link href={`?${qparams({ area: "", region: "" })}`} style={{ fontSize: "0.72rem" }}>Quitar filtros ✕</Link></div> : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{[...alertas.areas.entries()].sort(([, a], [, b]) => b - a).map(([area, count]) => <Link key={area} href={`?${qparams({ area, region: "" })}`} style={{ fontSize: "0.7rem", fontFamily: "monospace", padding: "0.25rem 0.55rem", borderRadius: 999, border: "1px solid", borderColor: query.area === area ? "var(--accent)" : "var(--border-subtle)", color: query.area === area ? "var(--accent)" : "var(--text-muted)", textDecoration: "none", background: query.area === area ? "var(--accent-soft, var(--bg-surface))" : "transparent" }}>{area} · {count}</Link>)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{[...alertas.regiones.entries()].sort(([, a], [, b]) => b - a).map(([region, count]) => <Link key={region} href={`?${qparams({ area: "", region })}`} style={{ fontSize: "0.7rem", fontFamily: "monospace", padding: "0.25rem 0.55rem", borderRadius: 999, border: "1px solid", borderColor: query.region === region ? "var(--accent)" : "var(--border-subtle)", color: query.region === region ? "var(--accent)" : "var(--text-muted)", textDecoration: "none", background: query.region === region ? "var(--accent-soft, var(--bg-surface))" : "transparent" }}>{region} · {count}</Link>)}</div>
            </div>
          )}
          {selected.id === "relaciones" && (relations.length === 0 ? <div className="empty-state"><strong>Sin relaciones verificadas</strong></div> : <div className="evidence-list">{relations.map((relation) => { const counterpart = relation.fromId === id ? relation.toId : relation.fromId; return <article key={relation.id}><div><span className="status-label status-label--info">{traducirPredicado(relation.predicate)}</span></div><h3><Link href={`/entidades/${counterpart}`}>{counterpart}</Link></h3><p>{relation.disclaimer}</p><small>Método: <code>{relation.reconciliation.method === "official_id" ? "Identificador oficial" : relation.reconciliation.method}</code></small></article>; })}</div>)}
          {selected.id !== "relaciones" && selected.id !== "fuentes" && (
            records.length === 0 ? (
              <div className="empty-state">
                <strong>Sin registros verificados en esta sección</strong>
                <p>El espacio queda explícitamente vacío; no se completa con estimaciones.</p>
              </div>
            ) : (
              <EntityEvidenceAccordionExplorer
                records={records}
                entityName={entity.name}
                initialQuery={query.q || ""}
                defaultOpenCategory={
                  query.cat ? query.cat :
                  selected.id === "dinero" ? "compras" :
                  selected.id === "contratos" ? "compras" :
                  selected.id === "probidad" ? "probidad" :
                  selected.id === "lobby" ? "lobby" :
                  selected.id === "fiscalizaciones" ? "auditorias" :
                  selected.id === "actividad" ? "parlamento" : undefined
                }
              />
            )
          )}
        </section>
      </div>
    </main>
  );
}
