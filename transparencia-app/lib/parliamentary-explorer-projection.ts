import type { ExplorerFact, ExplorerRecord } from "./parliamentary-explorer";
import { normalizeExplorerText } from "./parliamentary-explorer";
export function normalizeExplorerRole(value: string) {
  return normalizeExplorerText(value || "Sin cargo informado");
}
export function normalizeExplorerRegion(value: string) {
  const regions = [
    ["arica", "Arica y Parinacota"],
    ["tarapaca", "Tarapacá"],
    ["antofagasta", "Antofagasta"],
    ["atacama", "Atacama"],
    ["coquimbo", "Coquimbo"],
    ["valparaiso", "Valparaíso"],
    ["metropolitana", "Metropolitana"],
    ["higgins", "O’Higgins"],
    ["maule", "Maule"],
    ["nuble", "Ñuble"],
    ["biobio", "Biobío"],
    ["araucania", "La Araucanía"],
    ["los rios", "Los Ríos"],
    ["los lagos", "Los Lagos"],
    ["aysen", "Aysén"],
    ["magallanes", "Magallanes"],
  ];
  const found = regions.find(([key]) =>
    normalizeExplorerText(value)
      .replace(/[ -]/g, "")
      .includes(key.replace(/[ -]/g, "")),
  );
  return {
    regionId: found ? found[0].replaceAll(" ", "-") : "sin-territorio",
    regionLabel: found?.[1] ?? "Sin territorio acreditado",
  };
}
/** Observations are never deduplicated by name: two contracts can legitimately look identical. */
export function aggregateExplorerRecords(
  records: readonly ExplorerRecord[],
): ExplorerFact[] {
  const groups = new Map<string, ExplorerFact>();
  for (const row of records) {
    const key = JSON.stringify([
      row.memberId,
      row.period,
      row.component,
      row.category,
      row.item,
      row.role,
    ]);
    let fact = groups.get(key);
    if (!fact) {
      fact = {
        memberId: row.memberId,
        period: row.period,
        component: row.component,
        category: row.category,
        item: row.item,
        amount: null,
        recordCount: 0,
        ...(row.role ? { role: row.role } : {}),
      };
      groups.set(key, fact);
    }
    if (row.amount !== null) fact.amount = (fact.amount ?? 0) + row.amount;
    fact.recordCount += row.recordCount;
  }
  return [...groups.values()];
}
