export const SENATE_SOURCE_IDS = Object.freeze({
  diet: "senado",
  operational_expenses: "gastos_senado",
  domestic_tickets: "senado_pasajes",
  foreign_missions: "senado_misiones",
});

export function senateSourceId(dataset) {
  const sourceId = SENATE_SOURCE_IDS[dataset];
  if (!sourceId) throw new Error(`SENADO_SOURCE_DATASET_UNSUPPORTED: ${dataset}`);
  return sourceId;
}

export function buildSenateSources(results) {
  const sources = {};
  for (const result of results ?? []) {
    const sourceId = senateSourceId(result.dataset ?? "operational_expenses");
    sources[sourceId] = [...(sources[sourceId] ?? []), ...(result.records ?? [])];
  }
  return sources;
}
