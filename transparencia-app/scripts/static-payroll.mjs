export const STATIC_PAYROLL_CHUNK_BYTES = 10 * 1024 * 1024;

export function chunkJsonRows(rows, maxBytes = STATIC_PAYROLL_CHUNK_BYTES) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 256) throw new Error("STATIC_PAYROLL_CHUNK_LIMIT_INVALID");

  const chunks = [];
  let current = [];
  let currentBytes = 2;
  for (const row of rows) {
    const rowBytes = Buffer.byteLength(JSON.stringify(row), "utf8");
    const separatorBytes = current.length > 0 ? 1 : 0;
    if (current.length > 0 && currentBytes + separatorBytes + rowBytes > maxBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(row);
    currentBytes += (current.length > 1 ? 1 : 0) + rowBytes;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
