import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("automatizacion CPLT nacional", () => {
  const workflow = readFileSync(resolve(process.cwd(), "../.github/workflows/etl-cplt.yml"), "utf8");

  it("procesa las cuatro categorias masivas en paralelo", () => {
    expect(workflow).toContain("matrix:");
    expect(workflow).toContain("category: [Planta, Contrata, Honorarios, CodigoTrabajo]");
    expect(workflow).toContain("npm run data:publish:cplt-category");
  });

  it("solo activa el manifiesto global despues de completar todas las categorias", () => {
    expect(workflow).toContain("needs: cplt-categories");
    expect(workflow).toContain("npm run data:finalize:cplt");
    expect(workflow).not.toContain("npm run ingest:cplt-personal -- Planta\n          npm run ingest:cplt-personal -- Contrata");
    expect(workflow).toContain("ETL_RUN_ID: cplt-${{ github.run_id }}-${{ github.run_attempt }}");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain("record-cplt-source-state.mjs --remote");
  });

  it("limita la proyeccion a administraciones municipales", () => {
    const etl = readFileSync(resolve(process.cwd(), "scripts/etl/stream-remote-personal.mjs"), "utf8");
    expect(etl).toContain("municipalidad\\b|^municipio");
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

  it("no genera un indice nacional que exceda el limite de objeto R2", () => {
    const etl = readFileSync(resolve(process.cwd(), "scripts/etl/stream-remote-personal.mjs"), "utf8");
    const projectionPublisher = readFileSync(resolve(process.cwd(), "scripts/publish-cplt-projections.mjs"), "utf8");
    const lakePublisher = readFileSync(resolve(process.cwd(), "scripts/publish-data-lake.mjs"), "utf8");
    expect(etl).not.toContain("search_index.json");
    expect(projectionPublisher).not.toContain("CPLT_MISSING_SEARCH_INDEX");
    expect(lakePublisher).toContain("R2_OBJECT_EXCEEDS_WRANGLER_LIMIT");
  });

  it("solo permite registrar el estado CPLT en la D1 autorizada", () => {
    const recorder = readFileSync(resolve(process.cwd(), "scripts/record-cplt-source-state.mjs"), "utf8");
    expect(recorder).toContain('database !== "transparencia-db"');
    expect(recorder).toContain('source_id,etl_run_id,status');
  });
});
