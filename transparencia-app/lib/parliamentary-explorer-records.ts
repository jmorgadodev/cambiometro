import type { DashboardComponent } from "./parliamentary-dashboard";
import { normalizeExplorerText, type ExplorerData, type ExplorerRecord } from "./parliamentary-explorer";
export const publishedRecordText = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value : undefined;
/** Published table labels are explicit; Diputado identifies the reporter, never the provider. */
export function advisoryRecordFields(values: Record<string, string>) {
    return {
        providerName: publishedRecordText(values.Asesor),
        sourceRecordId: publishedRecordText(values.Folio),
        serviceDescription: publishedRecordText(values.Servicio ?? values.Descripción ?? values.Descripcion),
        originalConcept: publishedRecordText(values["Ítem"] ?? values.Item ?? values.Concepto),
        sourceFields: { ...values },
    };
}
export function recordSearchText(row: ExplorerRecord, memberName = "") {
    return normalizeExplorerText([
        memberName, row.providerName, row.serviceDescription, row.originalConcept,
        row.originalDescription, row.personName, row.originalRole, row.role, row.item,
        row.category, row.sourceRecordId, row.id, ...Object.values(row.sourceFields ?? {}),
    ].join(" "));
}
export interface DetailRecordFilters {
    search?: string;
    chamber?: string;
    period?: string;
    memberId?: string;
    component?: string;
    category?: string;
    item?: string;
    order?: "amount-desc" | "amount-asc" | "period-desc" | "period-asc";
}
/** All matching observations remain available. Pagination is a presentation concern. */
export function selectRecordDetails(data: ExplorerData, rows: readonly ExplorerRecord[], filters: DetailRecordFilters) {
    const members = new Map(data.members.map(m => [m.id, m]));
    const search = normalizeExplorerText(filters.search ?? "");
    const selected = rows.filter(r => {
        const m = members.get(r.memberId);
        return (!filters.chamber || m?.chamber === filters.chamber) &&
            (!filters.period || r.period === filters.period) &&
            (!filters.memberId || r.memberId === filters.memberId) &&
            (!filters.component || r.component === filters.component) &&
            (!filters.category || r.category === filters.category) &&
            (!filters.item || r.item === filters.item) &&
            (!search || recordSearchText(r, m?.name).includes(search));
    });
    return selected.sort((a, b) => {
        if (filters.order?.startsWith("period"))
            return (filters.order === "period-asc" ? 1 : -1) * a.period.localeCompare(b.period) || a.id.localeCompare(b.id);
        if (a.amount === null || b.amount === null)
            return a.amount === b.amount ? a.id.localeCompare(b.id) : a.amount === null ? 1 : -1;
        return (filters.order === "amount-asc" ? a.amount - b.amount : b.amount - a.amount) || a.id.localeCompare(b.id);
    });
}
/** Separate totals: support and expenses may overlap and must never become a combined subtotal. */
export function recordComponentTotals(rows: readonly Pick<ExplorerRecord, "component" | "amount" | "recordCount">[]) {
    const totals: Partial<Record<DashboardComponent, {
        amount: number | null;
        records: number;
        observations: number;
    }>> = {};
    for (const row of rows) {
        const group = totals[row.component] ??= { amount: null, records: 0, observations: 0 };
        if (row.amount !== null)
            group.amount = (group.amount ?? 0) + row.amount;
        group.records += row.recordCount;
        group.observations++;
    }
    return totals;
}
