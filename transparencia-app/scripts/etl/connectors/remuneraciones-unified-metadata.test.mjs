import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  countScopeForRemunerationSource,
  readCpltPublishedCount,
  validateUnifiedStaticManifest,
} from "../../remuneraciones-unified-metadata.mjs";

describe("readCpltPublishedCount", () => {
  it("usa el conteo del manifiesto R2 hidratado", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cambiometro-r2-count-"));
    const manifestPath = path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1");
    fs.mkdirSync(manifestPath, { recursive: true });
    fs.writeFileSync(path.join(manifestPath, "manifest.json"), JSON.stringify({
      sourceId: "transparencia-activa",
      recordCount: 1243761,
    }));

    expect(readCpltPublishedCount(root)).toBe(1243761);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("usa el manifiesto R2 canónico de sólo metadatos si el lake no está hidratado", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cambiometro-cplt-count-"));
    const metadataDir = path.join(root, ".ci-data-version");
    fs.mkdirSync(metadataDir, { recursive: true });
    fs.writeFileSync(path.join(metadataDir, "cplt-current-r2-manifest.json"), JSON.stringify({
      sourceId: "transparencia-activa",
      version: "2026-09-15T08-08-44-566Z",
      coverage: [{ recordCount: 1 }, { recordCount: 2 }],
    }));

    expect(readCpltPublishedCount(root)).toBe(3);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("conserva el respaldo cuando no hay manifiesto válido", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cambiometro-r2-count-"));
    expect(readCpltPublishedCount(root, 123)).toBe(123);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("contrato de conteos del manifiesto unificado", () => {
  const manifest = {
    totalRows: 3,
    staticRows: 3,
    pages: [{ count: 2 }, { count: 1 }],
    sources: [
      { id: "transparencia-activa", countScope: "external-index" },
      { id: "remuneraciones-38bis", countScope: "static-pages" },
      { id: "camara", countScope: "static-pages" },
      { id: "senado", countScope: "static-pages" },
      { id: "dipres", countScope: "aggregate" },
    ],
  };

  it("distingue filas estáticas, índice externo y agregados", () => {
    expect(countScopeForRemunerationSource("remuneraciones-38bis")).toBe("static-pages");
    expect(countScopeForRemunerationSource("transparencia-activa")).toBe("external-index");
    expect(countScopeForRemunerationSource("dipres")).toBe("aggregate");
    expect(validateUnifiedStaticManifest(manifest)).toBe(true);
  });

  it("rechaza un total que no coincide con las filas de páginas estáticas", () => {
    expect(() => validateUnifiedStaticManifest({ ...manifest, staticRows: 4 }))
      .toThrow("UNIFIED_STATIC_ROW_COUNT_MISMATCH");
    expect(() => validateUnifiedStaticManifest({ ...manifest, pages: [{ count: 2 }] }))
      .toThrow("UNIFIED_PAGE_ROW_COUNT_MISMATCH");
  });

  it("rechaza alcances de conteo incorrectos o desconocidos", () => {
    const wrongSourceScope = manifest.sources.map((source) => source.id === "transparencia-activa"
      ? { ...source, countScope: "static-pages" }
      : source);
    expect(() => validateUnifiedStaticManifest({ ...manifest, sources: wrongSourceScope }))
      .toThrow("UNIFIED_SOURCE_COUNT_SCOPE_MISMATCH");
    expect(() => countScopeForRemunerationSource("unknown-source"))
      .toThrow("UNIFIED_SOURCE_COUNT_SCOPE_UNKNOWN");
  });
});
