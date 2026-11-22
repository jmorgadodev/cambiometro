"use client";
import NormativeInfo from "@/components/financial/NormativeInfo";

import { useMemo, useState } from "react";
import { DASHBOARD_COMPONENTS } from "@/lib/parliamentary-dashboard";
import {
  explorerCsv,
  explorerGroupKey,
  explorerMoney,
  institutionLabel,
  normalizeExplorerText,
  type Dimension,
  type ExplorerData,
  type ExplorerQuery,
  type ExplorerRecord,
} from "@/lib/parliamentary-explorer";
import {
  DataState,
  downloadExplorerBlob,
  MemberName,
} from "./ExplorerPrimitives";
import styles from "./Explorer.module.css";
import {recordSearchText} from "@/lib/parliamentary-explorer-records";
import {RecordEvidence} from "./ExplorerRecordEvidence";
const columns = {
  period: "Período",
  institution: "Institución",
  member: "Parlamentario",
  party: "Partido vigente",
  region: "Región",
  component: "Componente",
  item: "Ítem / integrante / prestador",
  role: "Cargo",
  amount: "Monto informado",
  source: "Fuente",
};
type Column = keyof typeof columns;
export default function ExplorerRecords({
  data,
  q,
  rows,
  loading,
  error,
  onRetry,
  onOpen,
}: {
  data: ExplorerData;
  q: ExplorerQuery;
  rows: ExplorerRecord[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpen: (record: ExplorerRecord) => void;
}) {
  const [search, setSearch] = useState(""),
    [order, setOrder] = useState<{
      key: "amount" | "period" | "name";
      asc: boolean;
    }>({ key: "amount", asc: false }),
    [page, setPage] = useState(1),
    [visible, setVisible] = useState<Column[]>([
      "period",
      "member",
      "component",
      "item",
      "amount",
      "source",
    ]),
    [group, setGroup] = useState<Dimension | "none">("none"),
    [expanded, setExpanded] = useState<string | null>(null);
  const members = useMemo(
    () => new Map(data.members.map((m) => [m.id, m])),
    [data],
  );
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          !search ||
          recordSearchText(r, members.get(r.memberId)?.name).includes(normalizeExplorerText(search)),
      ),
    [rows, search, members],
  );
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (group !== "none") {
          const x = explorerGroupKey(a, members.get(a.memberId)!, group)[1],
            y = explorerGroupKey(b, members.get(b.memberId)!, group)[1];
          const diff = x.localeCompare(y, "es");
          if (diff) return diff;
        }
        if (order.key === "amount" && (a.amount === null || b.amount === null))
          return a.amount === b.amount ? 0 : a.amount === null ? 1 : -1;
        const diff =
          order.key === "amount"
            ? a.amount! - b.amount!
            : order.key === "period"
              ? a.period.localeCompare(b.period)
              : members
                  .get(a.memberId)!
                  .name.localeCompare(members.get(b.memberId)!.name, "es");
        return order.asc ? diff : -diff;
      }),
    [filtered, group, members, order],
  );
  const pages = Math.max(1, Math.ceil(sorted.length / 50)),
    active = Math.min(page, pages),
    shown = sorted.slice((active - 1) * 50, active * 50);
  function sort(key: typeof order.key) {
    setOrder({ key, asc: order.key === key ? !order.asc : true });
    setPage(1);
  }
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>
            Registros y respaldo
            <NormativeInfo
              component={
                q.componentIds?.length === 1 ? q.componentIds[0] : undefined
              }
              items={[...new Set(rows.map((r) => r.item))]}
              from={q.from}
              to={q.to}
              chamber={q.chamber}
            />
          </h2>
        </div>
        <button
          type="button"
          disabled={loading || !!error || !sorted.length}
          onClick={() =>
            downloadExplorerBlob(
              new Blob([explorerCsv(data, sorted)], {
                type: "text/csv;charset=utf-8",
              }),
              `cambiometro-registros-${q.from}-${q.to}.csv`,
            )
          }
        >
          Exportar CSV ({sorted.length.toLocaleString("es-CL")})
        </button>
      </div>
      <div className={styles.tableTools}>
        <label>
          Buscar en los registros
          <input
            type="search"
            placeholder="Integrante, cargo, parlamentario o ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Agrupar tabla
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value as Dimension | "none");
              setPage(1);
            }}
          >
            <option value="none">Sin agrupación</option>
            {[
              ["member", "Parlamentario"],
              ["party", "Partido vigente"],
              ["region", "Región"],
              ["period", "Mes"],
              ["component", "Componente"],
              ["category", "Categoría"],
              ["role", "Cargo"],
            ].map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <details className={styles.columns}>
          <summary>Columnas</summary>
          {(Object.keys(columns) as Column[]).map((c) => (
            <label key={c}>
              <input
                type="checkbox"
                checked={visible.includes(c)}
                onChange={() =>
                  setVisible((v) =>
                    v.includes(c)
                      ? v.length > 1
                        ? v.filter((x) => x !== c)
                        : v
                      : [...v, c],
                  )
                }
              />
              {columns[c]}
            </label>
          ))}
        </details>
      </div>
      <DataState
        loading={loading}
        error={error}
        onRetry={onRetry}
        empty={!loading && !error && !sorted.length}
      />
      {!loading && !error && sorted.length > 0 && (
        <>
          <p className={styles.hint} role="status">
            {filtered.length.toLocaleString("es-CL")} registros · CLP
          </p>
          <div
            className={styles.tableScroll}
            role="region"
            aria-label="Tabla de registros"
            tabIndex={0}
          >
            <table>
              <caption>
                CLP nominales. Sin información conserva importe vacío en CSV. El
                buscador de esta tabla sólo restringe registros y su
                exportación.
              </caption>
              <thead>
                <tr>
                  {visible.map((c) => (
                    <th key={c}>
                      {["amount", "period", "member"].includes(c) ? (
                        <button
                          type="button"
                          onClick={() =>
                            sort(
                              c === "member"
                                ? "name"
                                : (c as "amount" | "period"),
                            )
                          }
                        >
                          {columns[c]} ↕
                        </button>
                      ) : (
                        columns[c]
                      )}
                    </th>
                  ))}
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const m = members.get(r.memberId)!;
                  const label =
                    group !== "none" ? explorerGroupKey(r, m, group)[1] : null;
                  const previous =
                    group !== "none" && i
                      ? explorerGroupKey(
                          shown[i - 1],
                          members.get(shown[i - 1].memberId)!,
                          group as Dimension,
                        )[1]
                      : null;
                  return (
                    <RecordRow
                      key={r.id}
                      record={r}
                      member={m}
                      visible={visible}
                      groupLabel={label && label !== previous ? label : null}
                      expanded={expanded === r.id}
                      onExpand={() =>
                        setExpanded(expanded === r.id ? null : r.id)
                      }
                      onOpen={() => onOpen(r)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label="Páginas de registros">
            <button
              type="button"
              disabled={active === 1}
              onClick={() => setPage(active - 1)}
            >
              ← Anterior
            </button>
            <span>
              Página {active} de {pages}
            </span>
            <button
              type="button"
              disabled={active === pages}
              onClick={() => setPage(active + 1)}
            >
              Siguiente →
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
function RecordRow({
  record: r,
  member: m,
  visible,
  groupLabel,
  expanded,
  onExpand,
  onOpen,
}: {
  record: ExplorerRecord;
  member: ExplorerData["members"][number];
  visible: Column[];
  groupLabel: string | null;
  expanded: boolean;
  onExpand: () => void;
  onOpen: () => void;
}) {
  const value = (c: Column) => {
    switch (c) {
      case "period":
        return r.period;
      case "institution":
        return institutionLabel(m.chamber);
      case "member":
        return <MemberName member={m} onClick={onOpen} detail={false} />;
      case "party":
        return m.partyLabel;
      case "region":
        return m.regionLabel;
      case "component":
        return DASHBOARD_COMPONENTS[r.component];
      case "item":
        return (
          <>
            {r.providerName ?? r.personName ?? r.originalConcept ?? r.item}
            <NormativeInfo
              label={r.item}
              items={[r.item]}
              component={r.component}
              chamber={m.chamber}
              from={r.period}
              to={r.period}
            />
            <small>{r.serviceDescription ?? r.originalDescription ?? (r.personName || r.providerName ? r.item : r.category)}</small>
          </>
        );
      case "role":
        return r.originalRole ?? "No aplicable";
      case "amount":
        return (
          <span className={styles.number}>
            {explorerMoney(r.amount)}
            {r.amount === 0 && <small>Cero informado</small>}
          </span>
        );
      case "source":
        return (
          <button type="button" onClick={onOpen}>
            {r.sourceScope === "individual"
              ? "Documento disponible"
              : r.sourceScope === "unavailable"
                ? "Sin respaldo individual"
                : "Fuente institucional"}
          </button>
        );
    }
  };
  return (
    <>
      {groupLabel && (
        <tr className={styles.groupRow}>
          <th colSpan={visible.length + 1} scope="rowgroup">
            {groupLabel}
          </th>
        </tr>
      )}
      <tr>
        {visible.map((c) => (
          <td key={c}>{value(c)}</td>
        ))}
        <td>
          <button type="button" aria-expanded={expanded} onClick={onExpand}>
            Detalle {expanded ? "−" : "+"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={visible.length + 1}>
            <RecordEvidence row={r} member={m}/>
            <button type="button" onClick={onOpen}>Abrir respaldo y contexto →</button>
          </td>
        </tr>
      )}
    </>
  );
}
