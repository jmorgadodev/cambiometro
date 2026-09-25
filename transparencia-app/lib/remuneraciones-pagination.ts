export function remunerationResultWindow(staticCount: number, remoteCount: number, page: number, size: number) {
  const totalRecords = staticCount + remoteCount;
  const totalPages = Math.max(1, Math.ceil(totalRecords / size));
  const start = (Math.min(Math.max(1, page), totalPages) - 1) * size;
  const end = Math.min(start + size, totalRecords);
  return { start, end, totalRecords, totalPages, remoteEnd: Math.max(0, end - staticCount) };
}

export function remunerationPersonKey(row: {
  sourceId?: string | null;
  nombreOriginal?: string | null;
  organismoOriginal?: string | null;
  // Se acepta aunque deliberadamente no forma parte de la clave: cargos
  // distintos de una misma persona en el mismo organismo no crean identidad.
  cargoOriginal?: string | null;
  personKey?: string | null;
}) {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
  const name = normalize(row.nombreOriginal ?? "").split(/[^a-z0-9]+/).filter(Boolean).sort().join(" ");
  if (!name) return `${row.sourceId ?? "unknown"}:${row.personKey ?? "unknown"}`;
  // Sin un identificador personal oficial, no se unen nombres iguales entre
  // fuentes u organismos: eso evita presentar homónimos como una identidad.
  return [row.sourceId ?? "unknown", normalize(row.organismoOriginal ?? ""), name].join("|");
}

export function remunerationPersonWindow<T>(groups: T[], page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(groups.length / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  const end = Math.min(start + size, groups.length);
  return { items: groups.slice(start, end), start, end, totalProfiles: groups.length, totalPages, page: safePage };
}
