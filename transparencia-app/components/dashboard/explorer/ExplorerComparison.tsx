"use client";
import { useMemo } from "react";
import {
  DASHBOARD_COMPONENTS,
  type DashboardComponent,
} from "@/lib/parliamentary-dashboard";
import {
  explorerMembers,
  explorerMetrics,
  explorerMoney,
  filterExplorerFacts,
  groupExplorer,
  institutionLabel,
  memberLabel,
  type ExplorerData,
  type ExplorerQuery,
} from "@/lib/parliamentary-explorer";
import { SelectionList } from "./ExplorerFilters";
import { ExplorerBars, ExplorerTimeline } from "./ExplorerCharts";
import { MemberAvatar, downloadExplorerBlob } from "./ExplorerPrimitives";
import { explorerCsv } from "@/lib/parliamentary-explorer";
import styles from "./Explorer.module.css";
export default function ExplorerComparison({
  data,
  q,
  onChange,
  onOpen,
}: {
  data: ExplorerData;
  q: ExplorerQuery;
  onChange: (p: Partial<ExplorerQuery>) => void;
  onOpen: (kind: "member" | "party" | "region", id: string) => void;
}) {
  const facts = useMemo(() => filterExplorerFacts(data, q), [data, q]);
  const participants = useMemo(() => {
    const eligible = explorerMembers(data, {
      ...q,
      member: "todos",
      memberIds: [],
    });
    return [
      ...new Map(
        eligible.map((m) => {
          const id =
            q.compareBy === "member"
              ? m.id
              : q.compareBy === "party"
                ? (m.partyId ?? "sin-partido")
                : m.regionId;
          return [
            id,
            {
              id,
              label:
                q.compareBy === "member"
                  ? memberLabel(m)
                  : q.compareBy === "party"
                    ? (m.partyLabel ?? "Sin partido")
                    : m.regionLabel,
              member: q.compareBy === "member" ? m : undefined,
              detail:
                q.compareBy === "member"
                  ? `${institutionLabel(m.chamber)} · ${m.regionLabel}`
                  : undefined,
            },
          ];
        }),
      ).values(),
    ];
  }, [data, q]);
  const groups = q.compareIds.map((id) => {
    const members = data.members.filter(
      (m) =>
        (q.compareBy === "member"
          ? m.id
          : q.compareBy === "party"
            ? (m.partyId ?? "sin-partido")
            : m.regionId) === id,
    );
    const ids = new Set(members.map((m) => m.id)),
      rows = facts.filter((r) => ids.has(r.memberId));
    const scoped = { ...data, members, facts: data.facts };
    return {
      id,
      label:
        participants.find((p) => p.id === id)?.label ??
        (q.compareBy === "member"
          ? members[0]?.name
          : q.compareBy === "party"
            ? members[0]?.partyLabel
            : members[0]?.regionLabel) ??
        id,
      members,
      rows,
      metrics: explorerMetrics(scoped, q),
    };
  });
  const focus: DashboardComponent =
    q.comparisonSection === "gastos" || q.comparisonSection === "categorias"
      ? "gastos"
      : q.comparisonSection === "personal"
        ? "personal"
        : q.metricComponent;
  const validGroups = groups.filter((g) =>
    g.rows.some((r) => r.component === focus && r.amount !== null),
  );
  const component = Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
  return (
    <div className={styles.viewStack}>
      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <div>
            <p className="eyebrow">Selecciones en paralelo</p>
            <h2>Construye tu comparación</h2>
          </div>
          <span>{q.compareIds.length} participantes</span>
        </div>
        <div className={styles.choices}>
          {[
            ["member", "Parlamentarios"],
            ["party", "Partidos"],
            ["region", "Regiones"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={q.compareBy === id}
              onClick={() =>
                onChange({
                  compareBy: id as ExplorerQuery["compareBy"],
                  compareIds: [],
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <SelectionList
          title="Participantes de comparación"
          options={participants}
          selected={q.compareIds}
          onChange={(compareIds) => onChange({ compareIds })}
        />
        <p className={styles.hint}>
          Los filtros globales siguen vigentes. Los totales de partidos y
          regiones corresponden a grupos de distinto tamaño; no miden eficiencia
          ni desempeño.
        </p>
      </section>
      {q.compareIds.length > 0 && (
        <>
          <div className={styles.comparisonCards}>
            {groups.slice(0, 5).map((g) => (
              <article className={styles.participant} key={g.id}>
                {q.compareBy === "member" && g.members[0] && (
                  <MemberAvatar member={g.members[0]} size={52} />
                )}
                <button type="button" onClick={() => onOpen(q.compareBy, g.id)}>
                  <strong>{g.label}</strong>
                </button>
                <small>
                  {g.metrics.members} parlamentarios seleccionados ·{" "}
                  {g.metrics.deputies} D / {g.metrics.senators} S
                </small>
                <button
                  type="button"
                  aria-label={`Quitar ${g.label} de comparación`}
                  onClick={() =>
                    onChange({
                      compareIds: q.compareIds.filter((id) => id !== g.id),
                    })
                  }
                >
                  Quitar ×
                </button>
              </article>
            ))}
          </div>
          {groups.length > 5 && (
            <p className={styles.hint}>
              La vista rápida muestra cinco participantes; la tabla conserva los{" "}
              {groups.length} seleccionados.
            </p>
          )}
          <div
            className={styles.choices}
            role="group"
            aria-label="Desglose de comparación"
          >
            {[
              ["resumen", "Resumen"],
              ["gastos", "Gastos operacionales"],
              ["categorias", "Categorías e ítems"],
              ["personal", "Personal de apoyo"],
              ["periodos", "Períodos"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={q.comparisonSection === id}
                onClick={() =>
                  onChange({
                    comparisonSection: id as ExplorerQuery["comparisonSection"],
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <label className={styles.inlineLabel}>
            Medida de comparación
            <select
              value={q.measure}
              onChange={(e) =>
                onChange({
                  measure: e.target.value as ExplorerQuery["measure"],
                })
              }
            >
              <option value="amount">Monto informado (CLP)</option>
              <option value="records">Registros administrativos</option>
              <option value="members">Parlamentarios</option>
              <option value="teams">Equipos de apoyo</option>
            </select>
          </label>
          {validGroups.length >= 2 &&
            q.comparisonSection !== "categorias" &&
            q.comparisonSection !== "periodos" && (
              <ExplorerBars
                title={
                  q.measure === "amount"
                    ? DASHBOARD_COMPONENTS[focus]
                    : "Comparación de " +
                      q.measure
                        .replace("records", "registros")
                        .replace("members", "parlamentarios")
                        .replace("teams", "equipos")
                }
                context={`${q.from} a ${q.to}`}
                counts={q.measure !== "amount"}
                entries={groups.map((g) => ({
                  id: g.id,
                  label: g.label,
                  value:
                    q.measure === "amount"
                      ? g.metrics.components[focus].amount
                      : q.measure === "records"
                        ? g.rows
                            .filter((r) => r.component === focus)
                            .reduce((s, r) => s + r.recordCount, 0)
                        : q.measure === "teams"
                          ? g.metrics.teams
                          : new Set(g.rows.map((r) => r.memberId)).size,
                }))}
                onSelect={(id) => onOpen(q.compareBy, id)}
              />
            )}
          {validGroups.length >= 2 &&
            q.comparisonSection === "categorias" &&
            groups.slice(0, 5).map((g) => (
              <div key={g.id}>
                {["camara", "senado"]
                  .filter((chamber) =>
                    g.rows.some(
                      (r) =>
                        data.members.find((m) => m.id === r.memberId)
                          ?.chamber === chamber && r.component === "gastos",
                    ),
                  )
                  .map((chamber) => (
                    <ExplorerBars
                      key={chamber}
                      title={`${g.label} · ${institutionLabel(chamber)}`}
                      context={`${q.from} a ${q.to} · categorías de lectura`}
                      entries={groupExplorer(
                        data,
                        { ...q, measure: "amount", metricComponent: "gastos" },
                        q.item !== "todos" ? "item" : "category",
                        g.rows.filter(
                          (r) =>
                            data.members.find((m) => m.id === r.memberId)
                              ?.chamber === chamber,
                        ),
                      )}
                      onSelect={() => onOpen(q.compareBy, g.id)}
                    />
                  ))}
              </div>
            ))}
          {validGroups.length >= 2 &&
            q.comparisonSection === "periodos" &&
            groups.slice(0, 5).map((g) => (
              <div key={g.id}>
                <h2 className={styles.sectionTitle}>{g.label}</h2>
                <ExplorerTimeline
                  data={data}
                  q={q}
                  facts={g.rows}
                  onSelect={() => onOpen(q.compareBy, g.id)}
                />
              </div>
            ))}
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <h2>Todos los participantes</h2>
              <button
                type="button"
                onClick={() =>
                  downloadExplorerBlob(
                    new Blob(
                      [
                        explorerCsv(
                          data,
                          groups.flatMap((g) => g.rows),
                        ),
                      ],
                      { type: "text/csv;charset=utf-8" },
                    ),
                    "cambiometro-comparacion.csv",
                  )
                }
              >
                Exportar registros agregados CSV
              </button>
            </div>
            <div
              className={styles.tableScroll}
              role="region"
              tabIndex={0}
              aria-label="Tabla de comparación"
            >
              <table>
                <caption>
                  Componentes separados, CLP nominales. Dieta estimada; no se
                  suma al gasto. Las cifras de registros no acreditan personas
                  únicas.
                </caption>
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Parlamentarios</th>
                    {component.map((c) => (
                      <th key={c}>{DASHBOARD_COMPONENTS[c]}</th>
                    ))}
                    <th>Registros / equipos</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <th>
                        <button
                          type="button"
                          onClick={() => onOpen(q.compareBy, g.id)}
                        >
                          {g.label}
                        </button>
                      </th>
                      <td>
                        {g.metrics.members}
                        <small>
                          {g.metrics.deputies} D · {g.metrics.senators} S
                        </small>
                      </td>
                      {component.map((c) => (
                        <td key={c}>
                          {explorerMoney(g.metrics.components[c].amount)}
                          <small>
                            {g.metrics.components[c].members}/
                            {g.metrics.members} con importe
                          </small>
                        </td>
                      ))}
                      <td>
                        {g.metrics.records} registros
                        <small>{g.metrics.teams} equipos</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {validGroups.length < 2 && (
        <p className={styles.empty}>
          Se necesitan al menos dos participantes con datos de este componente
          para una comparación. Puedes guardar la selección mientras exploras
          otras vistas.
        </p>
      )}
    </div>
  );
}
