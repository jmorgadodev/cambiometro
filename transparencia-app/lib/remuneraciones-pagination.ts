export function remunerationResultWindow(staticCount: number, remoteCount: number, page: number, size: number) {
  const totalRecords = staticCount + remoteCount;
  const totalPages = Math.max(1, Math.ceil(totalRecords / size));
  const start = (Math.min(Math.max(1, page), totalPages) - 1) * size;
  const end = Math.min(start + size, totalRecords);
  return { start, end, totalRecords, totalPages, remoteEnd: Math.max(0, end - staticCount) };
}
