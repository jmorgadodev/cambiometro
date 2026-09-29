export function remunerationResultWindow(staticCount: number, remoteCount: number, page: number, size: number) {
  const totalRecords = staticCount + remoteCount;
  const totalPages = Math.max(1, Math.ceil(totalRecords / size));
  const start = (Math.min(Math.max(1, page), totalPages) - 1) * size;
  const end = Math.min(start + size, totalRecords);
  return { start, end, totalRecords, totalPages, remoteEnd: Math.max(0, end - staticCount) };
}

export function distinctResultWindow<T>(items: readonly T[], page: number, size: number, identity: (item: T) => string) {
  const unique = new Map<string, T>();
  for (const item of items) {
    const key = identity(item);
    if (!unique.has(key)) unique.set(key, item);
  }
  const groups = [...unique.values()];
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(size));
  const start = (safePage - 1) * safeSize;
  const end = Math.min(start + safeSize, groups.length);
  return { items: groups.slice(start, end), start, end, totalGroups: groups.length };
}

export function isPlaceholderRemunerationName(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL").replace(/[^a-z0-9]+/g, " ").trim();
  return /^0(?: 0)+$/.test(normalized);
}

export function remunerationGroupKey(row: { name: string; source: string; organization: string; fallbackId: string }) {
  const normalizeTokens = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL").split(/[^a-z0-9]+/).filter(Boolean).sort().join(" ");
  const normalizedName = isPlaceholderRemunerationName(row.name) ? "" : normalizeTokens(row.name);
  return [row.source.trim().toLocaleLowerCase("es-CL"), normalizeTokens(row.organization), normalizedName || row.fallbackId].join("::");
}
