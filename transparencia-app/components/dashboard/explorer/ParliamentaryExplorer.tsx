"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DASHBOARD_COMPONENTS,
  type DashboardComponent,
} from "@/lib/parliamentary-dashboard";
import {
  DIMENSIONS,
  EXPLORER_VIEWS,
  MEASURES,
  explorerCsv,
  explorerComponentAvailability,
  explorerGroupCsv,
  explorerDefaults,
  explorerMembers,
  explorerMetrics,
  explorerMoney,
  explorerParams,
  explorerQueryFromParams,
  filterExplorerFacts,
  filterExplorerRecords,
  groupExplorer,
  institutionLabel,
  unpackExplorer,
  type Dimension,
  type ExplorerBootstrap,
  type ExplorerQuery,
} from "@/lib/parliamentary-explorer";
import { ExplorerBars, ExplorerTimeline } from "./ExplorerCharts";
import ExplorerFilters from "./ExplorerFilters";
import ExplorerComparison from "./ExplorerComparison";
import ExplorerRecords from "./ExplorerRecords";
import ExplorerDetail, {
  detailQuery,
  type ExplorerContext,
} from "./ExplorerDetail";
import {
  DataState,
  ExplorerDrawer,
  MemberName,
  downloadExplorerBlob,
} from "./ExplorerPrimitives";
import { useExplorerRecords } from "./useExplorerRecords";
import {
  useExplorerQueryString,
  commitExplorerQuery,
} from "./useExplorerQuery";
import styles from "./Explorer.module.css";
const componentKeys = Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
export default function ParliamentaryExplorer({
  bootstrap,
}: {
  bootstrap: ExplorerBootstrap;
}) {
  const data = useMemo(() => unpackExplorer(bootstrap), [bootstrap]),
    pathname = usePathname();
  const serialized = useExplorerQueryString(),
    q = useMemo(
      () => explorerQueryFromParams(new URLSearchParams(serialized), data),
      [serialized, data],
    );
  const [rankingPage, setRankingPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false),
    [context, setContext] = useState<ExplorerContext | null>(null),
    [notice, setNotice] = useState("");
  const facts = useMemo(() => filterExplorerFacts(data, q), [data, q]),
    metrics = useMemo(() => explorerMetrics(data, q), [data, q]),
    members = useMemo(() => explorerMembers(data, q), [data, q]);
  const scoped = useMemo(() => detailQuery(q, context), [q, context]);
  const personalAllowed =
    !q.componentIds?.length || q.componentIds.includes("personal");
  const recordQuery = useMemo(
    () =>
      q.view === "personal"
        ? {
            ...q,
            component: "personal",
            componentIds: personalAllowed
              ? ["personal" as const]
              : q.componentIds,
          }
        : q,
    [q, personalAllowed],
  );
  const detail = useExplorerRecords(
    data,
    recordQuery,
    q.view === "registros" || (q.view === "personal" && personalAllowed),
  );
  const panelDetail = useExplorerRecords(
    data,
    scoped,
    !!context && context.kind !== "methodology" && context.kind !== "record",
  );
  const records = useMemo(
    () => filterExplorerRecords(data, recordQuery, detail.rows),
    [data, recordQuery, detail.rows],
  );
  const contextLabel = `${institutionLabel(q.chamber)} · ${q.from} — ${q.to}`;
  function update(patch: Partial<ExplorerQuery>, close = false) {
    setRankingPage(1);
    const current = explorerQueryFromParams(
      new URLSearchParams(window.location.search),
      data,
    );
    const next = { ...current, ...patch };
    for (const key of [
      "memberIds",
      "partyIds",
      "componentIds",
      "regionIds",
      "districts",
      "roles",
      "compareIds",
    ] as const) {
      const values = patch[key];
      if (
        !values ||
        !values.length ||
        (key === "compareIds" &&
          patch.compareBy &&
          patch.compareBy !== current.compareBy)
      )
        continue;
      const before = q[key] ?? [],
        actual = current[key] ?? [];
      const added = values.filter(
          (v) => !(before as readonly string[]).includes(v),
        ),
        removed = before.filter(
          (v) => !(values as readonly string[]).includes(v),
        );
      (next[key] as string[]) = [
        ...new Set([
          ...actual.filter((v) => !removed.includes(v as never)),
          ...added,
        ]),
      ];
    }
    if (patch.memberIds) next.member = "todos";
    if (patch.componentIds) next.component = "todos";
    if (patch.category !== undefined && patch.item === undefined)
      next.item = "todos";
    if (
      patch.componentIds ||
      patch.chamber ||
      patch.regionIds ||
      patch.partyIds
    ) {
      if (patch.category === undefined) next.category = "todas";
      if (patch.item === undefined) next.item = "todos";
    }
    const valid = explorerQueryFromParams(explorerParams(next), data);
    commitExplorerQuery(`${pathname}?${explorerParams(valid)}`);
    if (close) {
      setContext(null);
      setFiltersOpen(false);
    }
  }
  function open(
    kind: ExplorerContext["kind"],
    id: string,
    component?: DashboardComponent,
  ) {
    setContext({ kind, id, component });
  }
  function compare(kind: "member" | "party" | "region", id: string) {
    const compareIds =
      q.compareBy === kind ? [...new Set([...q.compareIds, id])] : [id];
    update({ compareBy: kind, compareIds });
    setNotice("Añadido a comparación. La selección se conserva entre vistas.");
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Enlace de consulta copiado.");
    } catch {
      setNotice(
        "Copia la dirección del navegador para compartir esta consulta.",
      );
    }
  }
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (q.chamber !== "ambas")
    chips.push({
      key: "institution",
      label: institutionLabel(q.chamber),
      remove: () => update({ chamber: "ambas" }),
    });
  chips.push({
    key: "period",
    label: `${q.from} → ${q.to}`,
    remove: () => {
      const defaults = explorerDefaults(data);
      update({ from: defaults.from, to: defaults.to });
    },
  });
  for (const id of q.regionIds)
    chips.push({
      key: "region" + id,
      label: data.members.find((m) => m.regionId === id)?.regionLabel ?? id,
      remove: () => update({ regionIds: q.regionIds.filter((x) => x !== id) }),
    });
  for (const id of q.districts)
    chips.push({
      key: "district" + id,
      label: `Distrito ${id}`,
      remove: () => update({ districts: q.districts.filter((x) => x !== id) }),
    });
  for (const id of q.partyIds ?? [])
    chips.push({
      key: "party" + id,
      label: data.members.find((m) => m.partyId === id)?.partyLabel ?? id,
      remove: () => update({ partyIds: q.partyIds?.filter((x) => x !== id) }),
    });
  for (const id of q.memberIds ?? [])
    chips.push({
      key: "member" + id,
      label: data.members.find((m) => m.id === id)?.name ?? id,
      remove: () => update({ memberIds: q.memberIds?.filter((x) => x !== id) }),
    });
  for (const id of q.componentIds ?? [])
    chips.push({
      key: "component" + id,
      label: DASHBOARD_COMPONENTS[id],
      remove: () =>
        update({
          componentIds: q.componentIds?.filter((x) => x !== id),
          component: "todos",
        }),
    });
  if (q.category !== "todas")
    chips.push({
      key: "category",
      label: q.category,
      remove: () => update({ category: "todas", item: "todos" }),
    });
  if (q.item !== "todos")
    chips.push({
      key: "item",
      label: q.item,
      remove: () => update({ item: "todos" }),
    });
  for (const id of q.roles)
    chips.push({
      key: "role" + id,
      label: id,
      remove: () => update({ roles: q.roles.filter((x) => x !== id) }),
    });
  const groups = useMemo(() => groupExplorer(data, q), [data, q]);
  const rankingPages = Math.max(1, Math.ceil(groups.length / 25)),
    activeRankingPage = Math.min(rankingPage, rankingPages);
  const chosenRecord = context?.kind === "record";
  return (
    <article className={styles.root} id="dashboard-workspace">
      <header className={styles.masthead}>
        <div>
          <p className="eyebrow">Datos públicos · 2026 en adelante</p>
          <h1>Explorador parlamentario</h1>
          <p>{contextLabel}</p>
        </div>
        <Link href="/politico/" prefetch={false}>
          ← Cámara y Senado
        </Link>
      </header>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.filterTrigger}
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
        >
          ☰ Filtros <span>{chips.length}</span>
        </button>
        <nav className={styles.views} aria-label="Vistas del dashboard">
          {Object.entries(EXPLORER_VIEWS).map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-current={q.view === id ? "page" : undefined}
              onClick={() => update({ view: id as ExplorerQuery["view"] })}
            >
              {label}
              {id === "comparar" && q.compareIds.length > 0 && (
                <span>{q.compareIds.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className={styles.toolbarActions}>
          <button type="button" onClick={share}>
            Compartir ↗
          </button>
          <button type="button" onClick={() => open("methodology", "sources")}>
            Fuentes y alcance
          </button>
        </div>
      </div>
      <div className={styles.activeFilters} aria-label="Filtros activos">
        {chips.map((c) => (
          <button
            type="button"
            key={c.key}
            onClick={c.remove}
            aria-label={`Quitar filtro ${c.label}`}
          >
            {c.label}
            <span>×</span>
          </button>
        ))}
        <button
          type="button"
          className={styles.reset}
          onClick={() =>
            update({
              ...explorerDefaults(data),
              view: q.view,
              compareBy: q.compareBy,
              compareIds: q.compareIds,
            })
          }
        >
          Restablecer filtros
        </button>
      </div>
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      <div className={styles.viewStack} key={q.view}>
        {q.view !== "comparar" && q.view !== "registros" && (
          <div
            className={styles.metrics}
            role="group"
            aria-label="Indicadores de la selección"
          >
            <section className={styles.cohortCard}>
              <span>Representación seleccionada</span>
              <strong>{metrics.members}</strong>
              <small>
                {metrics.deputies} diputados · {metrics.senators} senadores
              </small>
            </section>
            {componentKeys
              .filter((c) => q.view !== "personal" || c === "personal")
              .map((c) => {
                const availability = explorerComponentAvailability(
                  data,
                  q,
                  c,
                  metrics.components[c].amount,
                );
                return (
                  <button
                    type="button"
                    key={c}
                    className={styles.metricCard}
                    onClick={() => open("component", c)}
                  >
                    <span>
                      {c === "dieta"
                        ? "Dietas · estimación del rango"
                        : DASHBOARD_COMPONENTS[c]}
                    </span>
                    <strong>
                      {availability === "filtered"
                        ? "Fuera del filtro"
                        : availability === "not-applicable"
                          ? "No aplicable"
                          : explorerMoney(metrics.components[c].amount)}
                    </strong>
                    <small>
                      {availability === "filtered" ||
                      availability === "not-applicable" ? (
                        "No interviene en esta selección"
                      ) : (
                        <>
                          {metrics.components[c].members}/{metrics.members} con
                          importe · {metrics.components[c].months}{" "}
                          {metrics.components[c].months === 1 ? "mes" : "meses"}
                          {c === "dieta" ? " · referencia fija" : ""}
                        </>
                      )}
                    </small>
                  </button>
                );
              })}
            {q.view === "personal" && (
              <section className={styles.cohortCard}>
                <span>Registros de apoyo</span>
                <strong>
                  {metrics.components.personal.records.toLocaleString("es-CL")}
                </strong>
                <small>
                  {metrics.teams} equipos · personas únicas no acreditables
                </small>
              </section>
            )}
          </div>
        )}
        {q.view === "panorama" && (
          <>
            <div className={styles.summaryLine}>
              <p>
                Componentes separados. Todos los indicadores de importes
                responden a los filtros activos.
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadExplorerBlob(
                    new Blob([explorerCsv(data, facts)], {
                      type: "text/csv;charset=utf-8",
                    }),
                    `cambiometro-resumen-${q.from}-${q.to}.csv`,
                  )
                }
              >
                Exportar resumen CSV
              </button>
            </div>
            <div className={styles.twoColumns}>
              <ExplorerBars
                title={`Composición · ${DASHBOARD_COMPONENTS[q.metricComponent]}`}
                entries={groupExplorer(
                  data,
                  { ...q, measure: "amount" },
                  "category",
                )}
                context={contextLabel}
                onSelect={(id) => open("category", id, q.metricComponent)}
              />
              <ExplorerBars
                title={`Instituciones · ${DASHBOARD_COMPONENTS[q.metricComponent]}`}
                entries={groupExplorer(
                  data,
                  { ...q, measure: "amount" },
                  "institution",
                )}
                context={contextLabel}
                onSelect={(id) => open("institution", id, q.metricComponent)}
              />
            </div>
            <ExplorerTimeline
              data={data}
              q={q}
              facts={facts}
              onSelect={(period, c) => open("period", period, c)}
            />
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>Parlamentarios de la selección</h2>
                <span>{members.length} representantes</span>
              </div>
              <div className={styles.quickMembers}>
                {members.slice(0, 6).map((m) => (
                  <div key={m.id}>
                    <MemberName
                      member={m}
                      onClick={() => open("member", m.id)}
                    />
                    <button
                      type="button"
                      onClick={() => compare("member", m.id)}
                    >
                      + Comparar
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => update({ view: "explorar", groupBy: "member" })}
              >
                Explorar todos los parlamentarios →
              </button>
            </section>
          </>
        )}
        {q.view === "explorar" && (
          <>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <p className="eyebrow">Construye una consulta</p>
                  <h2>Explorar y ordenar</h2>
                </div>
              </div>
              <div className={styles.queryControls}>
                <label>
                  Agrupar por
                  <select
                    value={q.groupBy}
                    onChange={(e) =>
                      update({ groupBy: e.target.value as Dimension })
                    }
                  >
                    {Object.entries(DIMENSIONS).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Medida
                  <select
                    value={q.measure}
                    onChange={(e) =>
                      update({
                        measure: e.target.value as ExplorerQuery["measure"],
                        ...(e.target.value === "teams"
                          ? {
                              metricComponent: "personal",
                              componentIds: ["personal"],
                              component: "personal",
                            }
                          : {}),
                      })
                    }
                  >
                    {Object.entries(MEASURES).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Componente analizado
                  <select
                    value={q.metricComponent}
                    onChange={(e) =>
                      update({
                        metricComponent: e.target.value as DashboardComponent,
                      })
                    }
                  >
                    {componentKeys
                      .filter(
                        (c) =>
                          !q.componentIds?.length || q.componentIds.includes(c),
                      )
                      .map((c) => (
                        <option key={c} value={c}>
                          {DASHBOARD_COMPONENTS[c]}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Orden
                  <select
                    value={q.order}
                    onChange={(e) =>
                      update({
                        order: e.target.value as ExplorerQuery["order"],
                      })
                    }
                  >
                    <option value="desc">Mayor a menor</option>
                    <option value="asc">Menor a mayor</option>
                  </select>
                </label>
              </div>
              <p className={styles.hint}>
                Agrupar por región atribuye la representación parlamentaria, no
                el lugar físico del gasto. Cargos: comparación de denominaciones
                originales, sin homologar funciones.
              </p>
            </section>
            <ExplorerBars
              title={`${DIMENSIONS[q.groupBy]} · ${MEASURES[q.measure]}`}
              entries={groups}
              context={contextLabel}
              counts={q.measure !== "amount"}
              onSelect={(id) =>
                open(
                  q.groupBy,
                  id,
                  q.measure === "amount" && q.groupBy !== "component"
                    ? q.metricComponent
                    : undefined,
                )
              }
            />
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>Resultado completo</h2>
                <button
                  type="button"
                  onClick={() =>
                    downloadExplorerBlob(
                      new Blob([explorerGroupCsv(data, q)], {
                        type: "text/csv;charset=utf-8",
                      }),
                      "cambiometro-consulta.csv",
                    )
                  }
                >
                  Exportar resultado CSV
                </button>
              </div>
              <div
                className={styles.tableScroll}
                role="region"
                tabIndex={0}
                aria-label="Ranking configurable"
              >
                <table>
                  <caption>
                    {groups.length} grupos. Los extremos sólo corresponden a
                    observaciones válidas de la selección; no califican
                    desempeño.
                  </caption>
                  <thead>
                    <tr>
                      <th>{DIMENSIONS[q.groupBy]}</th>
                      <th>{MEASURES[q.measure]}</th>
                      <th>Parlamentarios</th>
                      <th>Registros</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups
                      .slice(
                        (activeRankingPage - 1) * 25,
                        activeRankingPage * 25,
                      )
                      .map((g) => (
                        <tr key={g.id}>
                          <th>
                            {q.groupBy === "member" || q.groupBy === "team" ? (
                              <MemberName
                                member={data.members.find(
                                  (m) => m.id === g.id,
                                )!}
                                onClick={() => open("member", g.id)}
                              />
                            ) : (
                              g.label
                            )}
                          </th>
                          <td className={styles.number}>
                            {q.measure === "amount"
                              ? explorerMoney(g.value)
                              : (g.value?.toLocaleString("es-CL") ??
                                "Sin información")}
                          </td>
                          <td>
                            {g.members}
                            <small>
                              {g.deputies} D · {g.senators} S
                            </small>
                          </td>
                          <td>
                            {g.records}
                            <small>
                              {g.missing > 0
                                ? `${g.missing} observaciones sin importe`
                                : ""}
                            </small>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => open(q.groupBy, g.id)}
                            >
                              Abrir detalle →
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <nav
                className={styles.pagination}
                aria-label="Páginas del ranking"
              >
                <button
                  type="button"
                  disabled={activeRankingPage === 1}
                  onClick={() => setRankingPage(activeRankingPage - 1)}
                >
                  ← Anterior
                </button>
                <span>
                  Página {activeRankingPage} de {rankingPages}
                </span>
                <button
                  type="button"
                  disabled={activeRankingPage === rankingPages}
                  onClick={() => setRankingPage(activeRankingPage + 1)}
                >
                  Siguiente →
                </button>
              </nav>
              {groups.length === 0 && <DataState empty />}
            </section>
            <section className={styles.panel}>
              <h2>Exploración territorial</h2>
              <p className={styles.hint}>
                Selecciona una o varias regiones desde la lista; no se utilizan
                servicios de mapas por visita.
              </p>
              <div className={styles.regionGrid}>
                {[
                  ...new Map(
                    data.members.map((m) => [m.regionId, m.regionLabel]),
                  ).entries(),
                ].map(([id, label]) => (
                  <div key={id}>
                    <button
                      type="button"
                      aria-pressed={q.regionIds.includes(id)}
                      onClick={() =>
                        update({
                          regionIds: q.regionIds.includes(id)
                            ? q.regionIds.filter((x) => x !== id)
                            : [...q.regionIds, id],
                        })
                      }
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      aria-label={`Detalle de ${label}`}
                      onClick={() => open("region", id)}
                    >
                      ↗
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {q.view === "comparar" && (
          <ExplorerComparison
            data={data}
            q={q}
            onChange={update}
            onOpen={(kind, id) => open(kind, id)}
          />
        )}
        {q.view === "personal" && (
          <>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <h2>Composición de los equipos</h2>
                <button
                  type="button"
                  onClick={() => open("methodology", "people")}
                >
                  Cómo se cuentan los registros
                </button>
              </div>
              <p>
                Parlamentarios: {metrics.members}. Equipos con registros de
                apoyo: {metrics.teams}. Personas únicas de apoyo y total
                combinado: <strong>no acreditables</strong>.
              </p>
              <p className={styles.hint}>
                Se conservan las observaciones de cada mes, incluso si repiten
                nombre, cargo e importe. «Monto informado» no equivale
                automáticamente a sueldo individual.
              </p>
              {!personalAllowed && (
                <button
                  type="button"
                  onClick={() =>
                    update({
                      componentIds: ["personal"],
                      component: "personal",
                      category: "todas",
                      item: "todos",
                    })
                  }
                >
                  Cambiar el filtro a Personal de apoyo
                </button>
              )}
            </section>
            <div className={styles.twoColumns}>
              <ExplorerBars
                title="Montos informados por cargo"
                entries={groupExplorer(
                  data,
                  { ...q, measure: "amount", metricComponent: "personal" },
                  "role",
                  facts.filter((r) => r.component === "personal"),
                )}
                context={contextLabel}
                onSelect={(id) => open("role", id, "personal")}
              />
              <ExplorerBars
                title="Registros por equipo"
                entries={groupExplorer(
                  data,
                  { ...q, measure: "records" },
                  "team",
                  facts.filter((r) => r.component === "personal"),
                )}
                context={contextLabel}
                counts
                onSelect={(id) => open("team", id, "personal")}
              />
            </div>
            <ExplorerRecords
              data={data}
              q={q}
              rows={
                personalAllowed
                  ? records.filter((r) => r.component === "personal")
                  : []
              }
              loading={personalAllowed && detail.loading}
              error={detail.error}
              onRetry={detail.retry}
              onOpen={(record) =>
                setContext({ kind: "record", id: record.id, record })
              }
            />
          </>
        )}
        {q.view === "registros" && (
          <>
            <p className={styles.hint}>
              Detalle descargado bajo demanda para {q.from} — {q.to}. Dietas
              estimadas se exportan desde Panorama; no se muestran como pagos
              acreditados.
            </p>
            <ExplorerRecords
              data={data}
              q={q}
              rows={records}
              loading={detail.loading}
              error={detail.error}
              onRetry={detail.retry}
              onOpen={(record) =>
                setContext({ kind: "record", id: record.id, record })
              }
            />
          </>
        )}
      </div>
      <footer className={styles.moduleFooter}>
        <span>Datos publicados · importes CLP nominales</span>
        <button type="button" onClick={() => open("methodology", "sources")}>
          Metodología, fuentes y cobertura →
        </button>
      </footer>
      <ExplorerDrawer
        open={filtersOpen}
        title="Filtros de la consulta"
        side="left"
        onClose={() => setFiltersOpen(false)}
      >
        <ExplorerFilters data={data} q={q} onChange={update} />
        <button
          type="button"
          className={styles.primary}
          onClick={() => setFiltersOpen(false)}
        >
          Ver resultados
        </button>
      </ExplorerDrawer>
      <ExplorerDrawer
        open={!!context}
        title={
          context?.kind === "methodology"
            ? "Fuentes y alcance"
            : chosenRecord
              ? "Respaldo del registro"
              : "Detalle contextual"
        }
        onClose={() => setContext(null)}
      >
        {context && (
          <ExplorerDetail
            data={data}
            q={q}
            context={context}
            records={panelDetail.rows}
            loading={panelDetail.loading}
            error={panelDetail.error}
            retry={panelDetail.retry}
            onChange={(next) => update(next, true)}
            onCompare={compare}
            onShare={share}
          />
        )}
      </ExplorerDrawer>
    </article>
  );
}
