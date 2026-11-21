"use client";
import { useMemo, useState } from "react";
import {
  DASHBOARD_COMPONENTS,
  type DashboardComponent,
} from "@/lib/parliamentary-dashboard";
import {
  explorerMembers,
  filterExplorerFacts,
  institutionLabel,
  memberLabel,
  normalizeExplorerText,
  type ExplorerData,
  type ExplorerQuery,
  type ExplorerMember,
} from "@/lib/parliamentary-explorer";
import { MemberAvatar } from "./ExplorerPrimitives";
import styles from "./Explorer.module.css";
export interface SelectionOption {
  id: string;
  label: string;
  detail?: string;
  member?: ExplorerMember;
}
export function SelectionList({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: SelectionOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const found = options
    .filter((o) =>
      normalizeExplorerText(o.label + " " + o.detail).includes(
        normalizeExplorerText(search),
      ),
    )
    .sort(
      (a, b) =>
        Number(selected.includes(b.id)) - Number(selected.includes(a.id)) ||
        a.label.localeCompare(b.label, "es"),
    );
  const [expanded, setExpanded] = useState(false);
  const visible = search || expanded ? found : found.slice(0, 40);
  return (
    <details className={styles.filterGroup} open>
      <summary>
        {title}
        <small>
          {selected.length ? `${selected.length} seleccionados` : "Todos"}
        </small>
      </summary>
      <label className={styles.searchLabel}>
        Buscar {title.toLowerCase()}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Escribe para buscar…"
        />
      </label>
      <div className={styles.selectionList} role="group" aria-label={title}>
        {visible.map((o) => (
          <label key={o.id} className={styles.check}>
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              value={o.id}
              onChange={() =>
                onChange(
                  selected.includes(o.id)
                    ? selected.filter((id) => id !== o.id)
                    : [...selected, o.id],
                )
              }
            />
            {o.member && <MemberAvatar member={o.member} size={30} />}
            <span>
              {o.label}
              {o.detail && <small>{o.detail}</small>}
            </span>
          </label>
        ))}
        {!visible.length && (
          <p className={styles.hint}>Sin opciones para esta selección.</p>
        )}
      </div>
      <div className={styles.listActions}>
        <button type="button" onClick={() => onChange([])}>
          Quitar selección
        </button>
        {!search && found.length > 40 && (
          <button type="button" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Mostrar menos" : `Ver ${found.length} opciones`}
          </button>
        )}
      </div>
    </details>
  );
}
export default function ExplorerFilters({
  data,
  q,
  onChange,
}: {
  data: ExplorerData;
  q: ExplorerQuery;
  onChange: (patch: Partial<ExplorerQuery>) => void;
}) {
  const options = useMemo(() => {
    const cohort = explorerMembers(data, {
      ...q,
      member: "todos",
      memberIds: [],
    });
    const byKey = (
      members: ExplorerMember[],
      key: (m: ExplorerMember) => string,
      label: (m: ExplorerMember) => string,
    ) => [
      ...new Map(
        members.map((m) => [key(m), { id: key(m), label: label(m) }]),
      ).values(),
    ];
    const rows = filterExplorerFacts(data, {
      ...q,
      category: "todas",
      item: "todos",
      roles: [],
      query: "",
    });
    return {
      regions: byKey(
        explorerMembers(data, { ...q, regionIds: [] }),
        (m) => m.regionId,
        (m) => m.regionLabel,
      ),
      districts: byKey(
        explorerMembers(data, { ...q, districts: [] }).filter(
          (m) => !!m.district,
        ),
        (m) => m.district!,
        (m) => `Distrito ${m.district}`,
      ),
      parties: byKey(
        explorerMembers(data, { ...q, partyIds: [] }),
        (m) => m.partyId ?? "sin-partido",
        (m) => m.partyLabel ?? "Sin partido",
      ),
      members: cohort.map((m) => ({
        id: m.id,
        label: memberLabel(m),
        member: m,
        detail: `${institutionLabel(m.chamber)} · ${m.regionLabel}`,
      })),
      rows,
    };
  }, [data, q]);
  const years = [
    ...new Set(data.facts.map((r) => r.period.slice(0, 4))),
  ].sort();
  const categories = [...new Set(options.rows.map((r) => r.category))].sort(),
    items = [
      ...new Set(
        options.rows
          .filter((r) => q.category === "todas" || r.category === q.category)
          .map((r) => r.item),
      ),
    ].sort(),
    roles = [
      ...new Set(options.rows.flatMap((r) => (r.role ? [r.role] : []))),
    ].sort();
  return (
    <div className={styles.filtersBody}>
      <fieldset>
        <legend>Institución</legend>
        <div className={styles.choices}>
          {[
            ["ambas", "Ambas"],
            ["camara", "Diputados"],
            ["senado", "Senado"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={q.chamber === id}
              onClick={() =>
                onChange({
                  chamber: id,
                  memberIds: [],
                  member: "todos",
                  districts: [],
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Período</legend>
        <label>
          Año
          <select
            aria-label="Año"
            value={q.from.slice(0, 4)}
            onChange={(e) =>
              onChange({
                from:
                  e.target.value + (e.target.value === "2026" ? "-03" : "-01"),
                to: e.target.value + "-12",
              })
            }
          >
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <div className={styles.dates}>
          <label>
            Desde
            <input
              aria-label="Desde"
              type="month"
              min="2026-03"
              max={q.to}
              value={q.from}
              onChange={(e) => onChange({ from: e.target.value })}
            />
          </label>
          <label>
            Hasta
            <input
              aria-label="Hasta"
              type="month"
              min={q.from}
              max={years.at(-1) + "-12"}
              value={q.to}
              onChange={(e) => onChange({ to: e.target.value })}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Componentes</legend>
        <div className={styles.componentChoices}>
          <button
            type="button"
            aria-pressed={!q.componentIds?.length}
            onClick={() =>
              onChange({ component: "todos", componentIds: [], roles: [] })
            }
          >
            Todos, por separado
          </button>
          {(Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[]).map(
            (c) => (
              <button
                key={c}
                type="button"
                aria-pressed={q.componentIds?.includes(c) ?? false}
                onClick={() => {
                  const ids = q.componentIds ?? [];
                  onChange({
                    component: "todos",
                    componentIds: ids.includes(c)
                      ? ids.filter((v) => v !== c)
                      : [...ids, c],
                  });
                }}
              >
                {DASHBOARD_COMPONENTS[c]}
              </button>
            ),
          )}
        </div>
      </fieldset>
      <SelectionList
        title="Regiones de representación"
        options={options.regions}
        selected={q.regionIds}
        onChange={(regionIds) =>
          onChange({ regionIds, districts: [], memberIds: [], member: "todos" })
        }
      />
      {options.districts.length > 0 && (
        <SelectionList
          title="Distritos"
          options={options.districts}
          selected={q.districts}
          onChange={(districts) =>
            onChange({ districts, memberIds: [], member: "todos" })
          }
        />
      )}
      <SelectionList
        title="Partidos políticos"
        options={options.parties}
        selected={q.partyIds ?? []}
        onChange={(partyIds) =>
          onChange({ partyIds, memberIds: [], member: "todos" })
        }
      />
      <SelectionList
        title="Parlamentarios"
        options={options.members}
        selected={q.memberIds ?? []}
        onChange={(memberIds) => onChange({ memberIds, member: "todos" })}
      />
      <fieldset>
        <legend>Desglose</legend>
        <label>
          Categoría de lectura
          <select
            aria-label="Categoría de lectura"
            value={q.category}
            onChange={(e) =>
              onChange({ category: e.target.value, item: "todos" })
            }
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Ítem original
          <select
            aria-label="Ítem original"
            value={q.item}
            onChange={(e) => onChange({ item: e.target.value })}
          >
            <option value="todos">Todos los ítems</option>
            {items.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
      </fieldset>
      {roles.length > 0 && (
        <SelectionList
          title="Cargos de apoyo"
          options={roles.map((r) => ({ id: r, label: r }))}
          selected={q.roles}
          onChange={(roles) =>
            onChange({
              roles,
              component: "personal",
              componentIds: ["personal"],
            })
          }
        />
      )}
      <p className={styles.hint}>
        Región de representación. Partido del catálogo vigente. Los importes de
        componentes diferentes se presentan separados.
      </p>
    </div>
  );
}
