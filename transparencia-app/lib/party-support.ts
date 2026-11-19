import type { PersonalApoyoDataset } from "./personal-apoyo";
import { parseSpanishMonthPeriod } from "./month-periods";
export interface SupportMember {
    id: string;
    cargo: string;
    nombre_completo: string;
    deputyId: string | null;
}
export interface SupportMonth {
    amount: number | null;
    contracts: number;
}
export interface PartySupportMonth {
    periodo: string | null;
    totalMensual: number | null;
    totalPersonas: number | null;
    promedioPorParlamentario: number | null;
    parlamentariosConPersonal: number;
    totalParlamentarios: number;
    cobertura: string;
}
export type MemberSupport = Record<string, Record<string, SupportMonth>>;
const tokens = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]+/g, " ").trim().split(/\s+/);
const periodOk = (period: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(period) && period >= "2026-03";
const sum = (values: unknown[]) => values.length && values.every(v => typeof v === "number" && Number.isSafeInteger(v) && v >= 0) ? values.reduce<number>((a, v) => a + Number(v), 0) : null;
/** Importes por autoridad, sin identidad aproximada de oficina ni meses implícitos. */
export function buildMemberSupport(members: readonly SupportMember[], dataset: PersonalApoyoDataset | null): MemberSupport {
    const result: MemberSupport = Object.fromEntries(members.map(m => [m.id, {}]));
    if (!dataset)
        return result;
    const offices = Object.keys(dataset.senadores ?? {});
    const candidates = new Map(members.filter(m => m.cargo === "Senador").map(m => { const name = tokens(m.nombre_completo); return [m.id, offices.filter(office => name.length >= 3 && name.every(token => tokens(office).includes(token)))]; }));
    const claims = new Map<string, number>();
    for (const matches of candidates.values())
        for (const office of matches)
            claims.set(office, (claims.get(office) ?? 0) + 1);
    for (const member of members) {
        if (member.cargo === "Diputado" && member.deputyId) {
            const deputy = dataset.diputados?.[member.deputyId];
            if (!deputy)
                continue;
            for (const [period, snapshot] of Object.entries(deputy.personal_apoyo_por_periodo ?? {})) {
                if (!periodOk(period) || !["available", "empty_confirmed"].includes(snapshot.status))
                    continue;
                const rows = snapshot.rows ?? [];
                result[member.id][period] = { amount: rows.length ? sum(rows.map(r => r.sueldo)) : snapshot.status === "empty_confirmed" ? 0 : null, contracts: rows.length };
            }
            const legacy = parseSpanishMonthPeriod(deputy.mes_personal);
            if (legacy && periodOk(legacy) && !Object.hasOwn(deputy.personal_apoyo_por_periodo ?? {}, legacy) && deputy.personal_apoyo?.length)
                result[member.id][legacy] = { amount: sum(deputy.personal_apoyo.map(r => r.sueldo)), contracts: deputy.personal_apoyo.length };
        }
        else if (member.cargo === "Senador") {
            const matches = candidates.get(member.id) ?? [];
            if (matches.length !== 1 || claims.get(matches[0]) !== 1)
                continue;
            const months = new Map<string, unknown[]>();
            for (const row of dataset.senadores[matches[0]]) {
                if (!periodOk(row.periodo))
                    continue;
                const values = months.get(row.periodo) ?? [];
                values.push(row.monto);
                months.set(row.periodo, values);
            }
            for (const [period, values] of months)
                result[member.id][period] = { amount: sum(values), contracts: values.length };
        }
    }
    return result;
}
export function summarizePartySupport(ids: readonly string[], index: MemberSupport, period: string | null): PartySupportMonth {
    const published = period ? ids.flatMap(id => { const row = index[id]?.[period]; return row && row.amount !== null ? [row] : []; }) : [];
    const amount = published.length ? published.reduce((a, row) => a + row.amount!, 0) : null;
    return { periodo: period, totalMensual: amount, totalPersonas: published.length ? published.reduce((a, row) => a + row.contracts, 0) : null, promedioPorParlamentario: amount === null ? null : Math.round(amount / published.length), parlamentariosConPersonal: published.length, totalParlamentarios: ids.length, cobertura: published.length + "/" + ids.length };
}
