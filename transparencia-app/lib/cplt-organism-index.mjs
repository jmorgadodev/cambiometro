export function appendOrganismPositions(groups, page, rows, pageSize) {
  if (!Number.isSafeInteger(page.page) || page.page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1
    || !Array.isArray(rows) || rows.length !== page.count || rows.length > pageSize) throw new Error("ORGANISM_PAGE_COUNT");
  for (const [offset,row] of rows.entries()) {
    if (typeof row.oid !== "string" || !/^[a-z0-9][a-z0-9_-]{0,159}$/.test(row.oid)) throw new Error("ORGANISM_ID_REQUIRED");
    const positions = groups.get(row.oid) ?? [];
    const position = (page.page-1)*pageSize+offset;
    if (positions.length && positions.at(-1)>=position) throw new Error("ORGANISM_POSITION_ORDER");
    positions.push(position);
    groups.set(row.oid,positions);
  }
}
