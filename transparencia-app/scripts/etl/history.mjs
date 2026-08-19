/** Conserva evidencia histórica y reemplaza por id sólo la versión actualizada. */
export function mergeRecordsById(previous = [], refreshed = []) {
  const records = new Map();
  for (const record of previous) {
    if (record?.id) records.set(String(record.id), record);
  }
  for (const record of refreshed) {
    if (record?.id) records.set(String(record.id), record);
  }
  return [...records.values()];
}
