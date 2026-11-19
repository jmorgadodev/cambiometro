"use client";

import { useMemo, useState } from "react";
import { DASHBOARD_COMPONENTS, compareDashboardMembers, dashboardSurname, filterDashboardRows, type DashboardData, type DashboardFilters, type DashboardComponent } from "@/lib/parliamentary-dashboard";
import styles from "./ParliamentaryDashboard.module.css";

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function DashboardSelectionList({ title, options, selected, onChange }: {
  title: string; options: { id: string; label: string; detail?: string }[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const visible = options.filter(option => terms.every(term => normalize(option.label + " " + (option.detail ?? "")).includes(term)));
  return <details className={styles.filterGroup} open>
    <summary>{title}<span>{selected.length ? `${selected.length} elegidos` : "Todos"}</span></summary>
    <div className={styles.listHeader}><label>Buscar {title.toLowerCase()}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Escribe para buscar…" /></label><button type="button" onClick={() => onChange([])}>Todos</button></div>
    <div className={styles.selectionList} role="group" aria-label={title}>{visible.map(option => <label key={option.id} className={styles.checkOption}>
      <input type="checkbox" value={option.id} checked={selected.includes(option.id)} onChange={() => onChange(selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id])} />
      <span>{option.label}{option.detail && <small>{option.detail}</small>}</span>
    </label>)}{!visible.length && <p>No hay coincidencias.</p>}</div>
    <p className={styles.filterHint}>Puedes elegir varios. Sin selección se incluyen todos.</p>
  </details>;
}

export default function DashboardFilterPanel({ data, filters, onChange, onClose }: {
  data: DashboardData; filters: DashboardFilters; onChange: (patch: Partial<DashboardFilters>) => void; onClose: () => void;
}) {
  const scopedMembers = data.members.filter(m => filters.chamber === "ambas" || m.chamber === filters.chamber);
  const parties = [...new Map(scopedMembers.map(m => [m.partyId ?? "sin-partido", { id: m.partyId ?? "sin-partido", label: m.partyLabel ?? "Sin partido incorporado" }])).values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
  const people = scopedMembers.filter(m => !filters.partyIds?.length || filters.partyIds.includes(m.partyId ?? "sin-partido")).sort(compareDashboardMembers).map(m => ({ id: m.id, label: dashboardSurname(m.name).label, detail: `${m.chamber === "camara" ? "Diputados" : "Senado"} · ${m.partyLabel ?? "Sin partido incorporado"}` }));
  const scopedRows = useMemo(() => filterDashboardRows(data, { ...filters, category: "todas", item: "todos" }), [data, filters]);
  const categories = [...new Set(scopedRows.map(r => r.category))].sort();
  const items = [...new Set(scopedRows.filter(r => filters.category === "todas" || r.category === filters.category).map(r => r.item))].sort();
  const components = Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
  const periodField = (label: string, value: string, change: (value: string) => void, bounds: { min: string; max?: string }) => <label>{label}<span className={styles.monthControl}><span aria-hidden="true">{new Date(Number(value.slice(0, 4)), Number(value.slice(5)) - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "numeric" })}</span><span aria-hidden="true">▦</span><input type="month" aria-label={label} min={bounds.min} max={bounds.max} value={value} onChange={event => change(event.target.value)} /></span></label>;
  return <>
    <div className={styles.filterTitle}><h2 id="dashboard-filters-heading" tabIndex={-1}>Filtros</h2><button type="button" onClick={onClose} aria-label="Ocultar filtros">← Ocultar</button></div>
    <fieldset className={styles.filterGroup}><legend>Cámara</legend><div className={styles.buttonChoices}>{[["ambas", "Ambas"], ["camara", "Diputados"], ["senado", "Senado"]].map(([id, label]) => <button type="button" key={id} aria-pressed={filters.chamber === id} onClick={() => onChange({ chamber: id })}>{label}</button>)}</div></fieldset>
    <fieldset className={styles.filterGroup}><legend>Período</legend><div className={styles.dateRange}>
      {periodField("Desde", filters.from, from => onChange({ from }), { min: "2026-01", max: filters.to })}
      {periodField("Hasta", filters.to, to => onChange({ to }), { min: filters.from })}
    </div></fieldset>
    <fieldset className={styles.filterGroup}><legend>Componentes</legend><div className={styles.componentChoices}><button type="button" aria-pressed={!filters.componentIds?.length} onClick={() => onChange({ componentIds: [], component: "todos" })}>Todos, por separado</button>{components.map(component => <button type="button" key={component} aria-pressed={filters.componentIds?.includes(component) ?? false} onClick={() => { const current = filters.componentIds ?? []; onChange({ component: "todos", componentIds: current.includes(component) ? current.filter(c => c !== component) : [...current, component] }); }}>{DASHBOARD_COMPONENTS[component]}</button>)}</div></fieldset>
    <DashboardSelectionList title="Partidos políticos" options={parties} selected={filters.partyIds ?? []} onChange={partyIds => onChange({ partyIds })} />
    <DashboardSelectionList title="Parlamentarios" options={people} selected={filters.memberIds ?? []} onChange={memberIds => onChange({ memberIds, member: "todos" })} />
    <details className={styles.filterGroup}><summary>Categoría e ítem</summary><label>Categoría de lectura<select value={filters.category} onChange={event => onChange({ category: event.target.value })}><option value="todas">Todas las categorías</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label>Ítem<select value={filters.item} onChange={event => onChange({ item: event.target.value })}><option value="todos">Todos los ítems</option>{items.map(item => <option key={item}>{item}</option>)}</select></label></details>
  </>;
}
