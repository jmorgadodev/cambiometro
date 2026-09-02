import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("automatizacion CPLT nacional", () => {
  const workflow = readFileSync(resolve(process.cwd(), "../.github/workflows/etl-cplt.yml"), "utf8");

  it("procesa las cuatro categorias masivas en paralelo", () => {
    expect(workflow).toContain("matrix:");
    expect(workflow).toContain("category: [Planta, Contrata, Honorarios, CodigoTrabajo]");
    expect(workflow).toContain("npm run data:publish:cplt-category");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain('"ingest:cplt-personal": "node --max-old-space-size=6144');
  });

  it("solo activa el manifiesto global despues de completar todas las categorias", () => {
    expect(workflow).toContain("needs: [cplt-source-check, cplt-categories]");
    expect(workflow).toContain("npm run data:finalize:cplt");
    expect(workflow).not.toContain("npm run ingest:cplt-personal -- Planta\n          npm run ingest:cplt-personal -- Contrata");
    expect(workflow).toContain("ETL_RUN_ID: cplt-${{ github.run_id }}-${{ github.run_attempt }}");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain("record-cplt-source-state.mjs --remote");
  });

  it("no bloquea R2 ni Pages cuando falla el archivo secundario de GitHub Releases", () => {
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain('"data:finalize:cplt": "node scripts/merge-cplt-category-artifacts.mjs && node scripts/publish-cplt-projections.mjs --r2 && node scripts/record-cplt-source-state.mjs --remote"');
    expect(packageJson).toContain('"data:archive:cplt": "node scripts/publish-data-lake.mjs --output data/lake-cplt --releases --release-manifests-only"');
    expect(readFileSync(resolve(process.cwd(), "scripts/publish-data-lake.mjs"), "utf8")).toContain("releaseManifestsOnly ? assets.filter");
    expect(workflow).toContain("npm run data:archive:cplt");
    expect(workflow).toContain("continue-on-error: true");
    expect(workflow).toContain("Archivo GitHub Releases no crítico");
  });

  it("limita la proyeccion a administraciones municipales", () => {
    const etl = readFileSync(resolve(process.cwd(), "scripts/etl/stream-remote-personal.mjs"), "utf8");
    expect(etl).toContain("municipalidad\\b|^municipio");
  });

  it("usa el host oficial canónico y conserva fallback ante cambios del host legado", () => {
    const etl = readFileSync(resolve(process.cwd(), "scripts/etl/stream-remote-personal.mjs"), "utf8");
    const rangedSource = readFileSync(resolve(process.cwd(), "scripts/etl/ranged-csv-source.mjs"), "utf8");
    expect(etl).toContain("https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos");
    expect(etl).toContain("https://www.cplt.cl/transparencia_activa/datoabierto/archivos");
    expect(etl).toContain("readRangedTextLines");
    expect(rangedSource).toContain("RETRYABLE_STATUSES");
    expect(rangedSource).toContain('Accept: "text/csv,*/*"');
    expect(rangedSource).toContain('Range: `bytes=${start}-${end}`');
    expect(rangedSource).toContain("CPLT_RANGE_DOWNLOAD_FAILED");
  });

  it("usa releases mensuales para no superar 1.000 assets", () => {
    const publisher = readFileSync(resolve(process.cwd(), "scripts/publish-cplt-projections.mjs"), "utf8");
    expect(publisher).toContain("latest.slice(0, 7)");
    expect(publisher).not.toContain("latest.slice(0, 4)");
  });

  it("activa todos los manifiestos R2 solamente despues de sus assets", () => {
    const publisher = readFileSync(resolve(process.cwd(), "scripts/publish-data-lake.mjs"), "utf8");
    expect(publisher).toContain('asset.key.endsWith("/manifest.json")');
    expect(publisher).toContain("for (const manifest of activationManifests)");
  });

  it("hidrata el respaldo estático CPLT desde el manifiesto R2 antes de Pages", () => {
    const pagesWorkflow = readFileSync(resolve(process.cwd(), "../.github/workflows/pages-static-refresh.yml"), "utf8");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain('"data:hydrate:cplt-static": "node scripts/hydrate-cplt-static-fallback.mjs"');
    expect(pagesWorkflow).toContain("npm run data:hydrate:cplt-static -- --required");
  });

  it("no genera un indice nacional que exceda el limite de objeto R2", () => {
    const etl = readFileSync(resolve(process.cwd(), "scripts/etl/stream-remote-personal.mjs"), "utf8");
    const projectionPublisher = readFileSync(resolve(process.cwd(), "scripts/publish-cplt-projections.mjs"), "utf8");
    const lakePublisher = readFileSync(resolve(process.cwd(), "scripts/publish-data-lake.mjs"), "utf8");
    expect(etl).not.toContain("search_index.json");
    expect(projectionPublisher).not.toContain("CPLT_MISSING_SEARCH_INDEX");
    expect(lakePublisher).toContain("R2_OBJECT_EXCEEDS_WRANGLER_LIMIT");
  });

  it("permite materializar el lake CPLT local sin publicar", () => {
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    const publisher = readFileSync(resolve(process.cwd(), "scripts/publish-cplt-projections.mjs"), "utf8");
    expect(packageJson).toContain('"data:local:cplt": "node scripts/publish-cplt-projections.mjs --local-only"');
    expect(publisher).toContain('process.argv.includes("--local-only")');
  });

  it("solo permite registrar el estado CPLT en la D1 autorizada", () => {
    const recorder = readFileSync(resolve(process.cwd(), "scripts/record-cplt-source-state.mjs"), "utf8");
    expect(recorder).toContain('database !== "transparencia-db"');
    expect(recorder).toContain('source_id,etl_run_id,status');
  });
});
