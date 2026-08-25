import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function chunkRows(rows, pageSize = 50) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("pageSize debe ser un entero positivo");
  }
  if (!Array.isArray(rows)) throw new TypeError("rows debe ser un arreglo");
  const chunks = [];
  for (let offset = 0; offset < rows.length; offset += pageSize) {
    chunks.push(rows.slice(offset, offset + pageSize));
  }
  return chunks;
}

export function buildChunkManifest(dataset, totalRows, pageSize, checksumSha256) {
  if (!dataset || !Number.isInteger(totalRows) || totalRows < 0) {
    throw new Error("dataset y totalRows son obligatorios");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("pageSize debe ser un entero positivo");
  }
  const totalPages = Math.ceil(totalRows / pageSize);
  return {
    schemaVersion: 1,
    dataset,
    totalRows,
    pageSize,
    totalPages,
    pages: Array.from({ length: totalPages }, (_, index) => `p-${String(index + 1).padStart(4, "0")}.json`),
    checksumSha256: checksumSha256 ?? null,
  };
}

export function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function writeChunkedJson({ outputDir, dataset, rows, pageSize = 50 }) {
  const chunks = chunkRows(rows, pageSize);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [index, chunk] of chunks.entries()) {
    const filename = `p-${String(index + 1).padStart(4, "0")}.json`;
    fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(chunk)}\n`, "utf8");
  }
  const manifest = buildChunkManifest(dataset, rows.length, pageSize, sha256Json(rows));
  if (dataset === "ley-19862-transferencias") {
    const searchRows = rows.map((row, index) => ({
      i: index,
      p: Math.floor(index / pageSize) + 1,
      y: row.period ?? row.periodo ?? null,
      d: row.fecha ?? null,
      e: row.emitter_name ?? row.emisor_nombre ?? null,
      r: row.receiver_name ?? row.receptor_nombre ?? null,
      t: row.title ?? row.materia ?? null,
      m: Number(row.monto_clp ?? 0),
    }));
    const searchPath = path.join(outputDir, "search-index.json");
    fs.writeFileSync(searchPath, `${JSON.stringify(searchRows)}\n`, "utf8");
    manifest.searchIndex = {
      path: "/data/transferencias/search-index.json",
      count: searchRows.length,
      sha256: sha256Json(searchRows),
    };
  }
  fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}
