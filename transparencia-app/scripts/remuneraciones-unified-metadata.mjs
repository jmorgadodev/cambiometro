import fs from "node:fs";
import path from "node:path";

const COUNT_SCOPE_BY_SOURCE = Object.freeze({
  "transparencia-activa": "external-index",
  "remuneraciones-38bis": "static-pages",
  camara: "static-pages",
  senado: "static-pages",
  dipres: "aggregate",
});

export function countScopeForRemunerationSource(sourceId) {
  const scope = COUNT_SCOPE_BY_SOURCE[sourceId];
  if (!scope) throw new Error(`UNIFIED_SOURCE_COUNT_SCOPE_UNKNOWN: ${sourceId}`);
  return scope;
}

export function validateUnifiedStaticManifest(manifest) {
  const totalRows = manifest?.totalRows;
  if (!Number.isSafeInteger(totalRows) || totalRows < 0) {
    throw new Error("UNIFIED_TOTAL_ROW_COUNT_INVALID");
  }
  if (manifest.staticRows !== totalRows) {
    throw new Error(`UNIFIED_STATIC_ROW_COUNT_MISMATCH: ${manifest.staticRows} != ${totalRows}`);
  }
  if (!Array.isArray(manifest.pages) || manifest.pages.some((page) => !Number.isSafeInteger(page?.count) || page.count < 0)) {
    throw new Error("UNIFIED_PAGE_ROW_COUNTS_INVALID");
  }
  const pageRows = manifest.pages.reduce((sum, page) => sum + page.count, 0);
  if (pageRows !== totalRows) {
    throw new Error(`UNIFIED_PAGE_ROW_COUNT_MISMATCH: ${pageRows} != ${totalRows}`);
  }
  if (!Array.isArray(manifest.sources)) throw new Error("UNIFIED_SOURCE_COUNT_SCOPES_MISSING");
  for (const source of manifest.sources) {
    const expectedScope = countScopeForRemunerationSource(source?.id);
    if (source.countScope !== expectedScope) {
      throw new Error(`UNIFIED_SOURCE_COUNT_SCOPE_MISMATCH: ${source?.id}`);
    }
  }
  return true;
}

export function readCpltPublishedCount(root, fallback = 1203287) {
  const candidates = [
    path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1", "manifest.json"),
    path.join(root, "data", "lake", "projections", "funcionarios-v1", "manifest.json"),
  ];

  for (const candidate of candidates) {
    try {
      const manifest = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (manifest?.sourceId !== "transparencia-activa") continue;
      if (Number.isSafeInteger(manifest.recordCount) && manifest.recordCount > 0) {
        return manifest.recordCount;
      }
    } catch {
      // El build local puede no tener el snapshot R2 hidratado todavía.
    }
  }

  return fallback;
}
