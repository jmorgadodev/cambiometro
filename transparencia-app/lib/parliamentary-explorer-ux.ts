import type { DashboardComponent } from "./parliamentary-dashboard";
import {
  normalizeExplorerText,
  type ExplorerQuery,
  type ExplorerRecord,
} from "./parliamentary-explorer";
export type FilterContext = {
  kind: string;
  id: string;
  component?: DashboardComponent;
};
export function addComparisonPatch(
  q: ExplorerQuery,
  kind: ExplorerQuery["compareBy"],
  id: string,
): Partial<ExplorerQuery> {
  return {
    compareBy: kind,
    compareIds: [
      ...new Set([...(q.compareBy === kind ? q.compareIds : []), id]),
    ],
  };
}
/** A contextual multi-select adds to that dimension; comparison state is never part of this patch. */
export function contextFilterPatch(
  q: ExplorerQuery,
  c: FilterContext,
): Partial<ExplorerQuery> {
  const add = (values: string[] | undefined) => [
    ...new Set([...(values ?? []), c.id]),
  ];
  const patch: Partial<ExplorerQuery> = {};
  switch (c.kind) {
    case "member":
    case "team":
      patch.memberIds = add(
        q.memberIds?.length
          ? q.memberIds
          : q.member !== "todos"
            ? [q.member]
            : [],
      );
      patch.member = "todos";
      break;
    case "party":
      patch.partyIds = add(q.partyIds);
      break;
    case "region":
      patch.regionIds = add(q.regionIds);
      break;
    case "district":
      patch.districts = add(q.districts);
      break;
    case "role":
      patch.roles = add(q.roles);
      break;
    case "period":
      patch.from = c.id;
      patch.to = c.id;
      break;
    case "category":
      patch.category = c.id;
      patch.item = "todos";
      break;
    case "item":
      patch.item = c.id;
      break;
    case "institution":
      patch.chamber = c.id;
      break;
    case "component":
      patch.componentIds = [c.id as DashboardComponent];
      patch.component = "todos";
      break;
  }
  if (c.component) {
    patch.componentIds = [c.component];
    patch.component = "todos";
  }
  return patch;
}
export function sortAmountDesc<T extends { amount: number | null }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((a, b) =>
    a.amount === null
      ? b.amount === null
        ? 0
        : 1
      : b.amount === null
        ? -1
        : b.amount - a.amount,
  );
}
/** Nominal roster only: one team/month, complete names, one source observation per name.
 * Repeated names may be duplicates or different contracts; unresolved cases omit the count.
 * This is not a cross-month unique-person identity and never uses contracts as people.
 */
export function monthlyRosterCount(
  rows: readonly ExplorerRecord[],
  from: string,
  to: string,
): number | null {
  const staff = rows.filter((r) => r.component === "personal");
  if (
    from !== to ||
    !staff.length ||
    new Set(staff.map((r) => r.memberId)).size !== 1 ||
    staff.some((r) => r.period !== from || r.recordCount !== 1)
  )
    return null;
  const names = staff.map((r) => normalizeExplorerText(r.personName ?? ""));
  if (
    names.some((n) => n.split(/\s+/).length < 2) ||
    new Set(names).size !== names.length
  )
    return null;
  return names.length;
}
