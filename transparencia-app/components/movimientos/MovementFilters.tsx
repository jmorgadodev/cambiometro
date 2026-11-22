"use client";
import { useState } from 'react';
import { MOVEMENT_DATE_LABEL, type MovementQuery } from '@/lib/movement-register';
import styles from './Movements.module.css';
export type MovementFilterOption = {
    value: string;
    label: string;
};
export function MovementFilter({ title, options, selected, onChange }: {
    title: string;
    options: MovementFilterOption[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    const [search, setSearch] = useState('');
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL');
    const visible = options.filter(o => normalize(o.label).includes(normalize(search)));
    return <details className={styles.filter}>
<summary>{title}{selected.length > 0 && <span>{selected.length}</span>}<span aria-hidden="true">⌄</span>
</summary>
<div className={styles.popover}>{options.length > 7 && <label>Buscar {title.toLocaleLowerCase('es-CL')}<input type="search" value={search} onChange={e => setSearch(e.target.value)}/>
</label>}<fieldset>
<legend className={styles.srOnly}>{title}</legend>{visible.map(o => <label className={styles.checkbox} key={o.value}>
<input type="checkbox" checked={selected.includes(o.value)} onChange={e => onChange(e.target.checked ? [...selected, o.value] : selected.filter(v => v !== o.value))}/>
<span>{o.label}</span>
</label>)}{!visible.length && <p>Sin coincidencias.</p>}</fieldset>{selected.length > 0 && <button className={styles.linkButton} onClick={() => onChange([])}>Quitar selección</button>}</div>
</details>;
}
export function MovementPeriod({ query, onChange }: {
    query: MovementQuery;
    onChange: (values: Record<string, string | null>) => void;
}) {
    return <details className={styles.filter}>
<summary>Período{(query.month || query.from || query.to) && <span>1</span>}<span aria-hidden="true">⌄</span>
</summary>
<div className={styles.popover}>
<label>Fecha consultada<select value={query.basis} onChange={e => onChange({ fecha: e.target.value })}>{Object.entries(MOVEMENT_DATE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
</label>
<label>Mes<input type="month" value={query.month} onChange={e => onChange({ mes: e.target.value, desde: null, hasta: null })}/>
</label>
<div className={styles.dateRange}>
<label>Desde<input type="date" value={query.from} onChange={e => onChange({ desde: e.target.value, mes: null })}/>
</label>
<label>Hasta<input type="date" value={query.to} onChange={e => onChange({ hasta: e.target.value, mes: null })}/>
</label>
</div>
<button className={styles.linkButton} onClick={() => onChange({ mes: null, desde: null, hasta: null })}>Todos los períodos</button>
</div>
</details>;
}
