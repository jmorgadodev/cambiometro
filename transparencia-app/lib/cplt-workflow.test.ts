import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { decodeCpltStaticAsset } from "../scripts/cplt-static-assets.mjs";
import { describe, expect, it } from "vitest";
import { shouldVerifyCpltPublication, validateCpltResume, validateCpltResumeBaseline } from "../scripts/etl/cplt-source-freshness.mjs";

describe("CPLT artifact-only recovery", () => {
  const repository = "jmorgadodev/cambiometro";
  const categories = ["Planta", "Contrata", "Honorarios", "CodigoTrabajo"];
  const run = { id: 123, status: "completed", conclusion: "failure", path: ".github/workflows/etl-cplt.yml", head_branch: "main", event: "workflow_dispatch", head_repository: { full_name: repository } };
  const jobs = categories.map(category => ({ name: `Ingesta Nóminas CPLT (${category})`, conclusion: "success" }));
  const artifacts = categories.map(category => ({ name: `cplt-${category}`, expired: false }));
  it("accepts all four validated category jobs from the canonical producer", () => {
    expect(validateCpltResume(run, jobs, artifacts, repository)).toBe(123);
  });
  it("rejects fork, other workflow/branch/event, running producer or an already successful run", () => {
    for (const change of [{ head_repository: { full_name: "other/repo" } }, { path: "other.yml" }, { head_branch: "feature" }, { event: "pull_request" }, { status: "in_progress" }, { conclusion: "success" }]) {
      expect(() => validateCpltResume({ ...run, ...change }, jobs, artifacts, repository)).toThrow("CPLT_RESUME_PRODUCER_INVALID");
    }
  });
  it("rejects incomplete/failed category jobs and expired or ambiguous artifacts", () => {
    expect(() => validateCpltResume(run, jobs.slice(1), artifacts, repository)).toThrow("CPLT_RESUME_CATEGORY_INVALID");
    expect(() => validateCpltResume(run, [{ ...jobs[0], conclusion: "failure" }, ...jobs.slice(1)], artifacts, repository)).toThrow("CPLT_RESUME_CATEGORY_INVALID");
    for (const candidates of [artifacts.slice(1), [...artifacts, artifacts[0]], [{ ...artifacts[0], expired: true }, ...artifacts.slice(1)]]) {
      expect(() => validateCpltResume(run, jobs, candidates, repository)).toThrow("CPLT_RESUME_ARTIFACT_INVALID");
    }
  });
  it("skips extraction when a resume run is explicitly supplied", () => {
    const workflow = readFileSync(resolve(process.cwd(), "../.github/workflows/etl-cplt.yml"), "utf8");
    expect(workflow).toContain("resume_run_id:");
    expect(workflow).toContain("validateCpltResume");
    expect(workflow).toContain("run-id: ${{ inputs.resume_run_id || github.run_id }}");
    expect(workflow).toContain("if: ${{ !inputs.resume_run_id }}");
    expect(workflow).toContain("!inputs.resume_run_id && inputs.check_sources_only");
    // github-script@v7 itself runs Node 20; Wrangler requires the setup-node 22 PATH.
    expect(workflow).toContain("spawnSync('node', [");
    expect(workflow).not.toContain("spawnSync(process.execPath, [");
  });
  it("never recovers an artifact over a newer published municipal cut", () => {
    const producer = { created_at: "2026-10-15T09:12:39Z" };
    expect(() => validateCpltResumeBaseline(producer, { sourceId: "transparencia-activa", version: "old", generatedAt: "2026-09-15T08:08:44Z" })).not.toThrow();
    for (const manifest of [{}, { sourceId: "other", version: "old", generatedAt: "2026-09-15T08:08:44Z" }, { sourceId: "transparencia-activa", version: "new", generatedAt: "2026-10-16T00:00:00Z" }]) {
      expect(() => validateCpltResumeBaseline(producer, manifest)).toThrow("CPLT_RESUME_BASELINE_INVALID");
    }
  });
});

describe("municipal publication representation", () => {
  it("builds a local compressed manifest from unchanged source rows without network or R2", () => {
    const root = mkdtempSync(join(tmpdir(), "cplt-publish-test-"));
    try {
      const put = (file: string, value: unknown) => {
        const target = join(root, file);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, JSON.stringify(value));
      };
      const categories = ["planta", "contrata", "honorarios", "codigotrabajo"];
      const rows = categories.map((tipo_contrato, index) => ({ id: `test-${index}`, nombre_completo: `Persona ${index}`, cargo: "Cargo", organo_nombre: "Municipalidad de Tortel", organo_tipo: "municipalidad", tipo_contrato, fuente_periodo: "2026-09", remuneracion_bruta_mensual: index ? 0 : 468212, remuneracion_liquida_mensual: index ? 0 : null }));
      put("data/raw/transparencia_activa/projections/funcionarios-v1/muni-tortel.json", rows);
      for (const category of categories) {
        put(`data/raw/transparencia_activa/validation/${category}.json`, { status: "valid", recordCount: 1, sourceId: `cplt-personal-${category}`, generatedAt: "2026-10-15T10:00:00Z" });
        put(`data/raw/transparencia_activa/coverage/${category}.json`, { coverage: Array.from({ length: 346 }, (_, index) => ({ communeId: `test-${index}`, cut: String(index).padStart(5, "0"), status: index ? "unavailable" : "available", recordCount: index ? 0 : 1 })) });
      }
      const result = spawnSync(process.execPath, [resolve("scripts/publish-cplt-projections.mjs"), "--local-only"], { cwd: root, encoding: "utf8", timeout: 30000 });
      expect(result.status, result.stderr).toBe(0);
      const manifest = JSON.parse(readFileSync(join(root, "data/lake-cplt/projections/funcionarios-v1/manifest.json"), "utf8"));
      expect(manifest.recordCount).toBe(4);
      const asset = manifest.assets.find((item: { key: string }) => item.key.endsWith("/muni-tortel.json.gz"));
      expect(asset.encoding).toBe("gzip");
      expect(JSON.parse(decodeCpltStaticAsset(asset, readFileSync(join(root, "data/lake-cplt", asset.key))).toString())).toEqual(rows);
      expect(manifest.assets.some((item: { key: string }) => item.key.endsWith("/muni-tortel.json"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

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
    expect(workflow).toContain("npm run data:finalize:cplt:r2");
    expect(workflow).not.toContain("npm run ingest:cplt-personal -- Planta\n          npm run ingest:cplt-personal -- Contrata");
    expect(workflow).toContain("ETL_RUN_ID: cplt-${{ github.run_id }}-${{ github.run_attempt }}");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain('"data:record:cplt-state": "node scripts/record-cplt-source-state.mjs"');
  });

  it("no bloquea R2 ni Pages cuando falla el archivo secundario de GitHub Releases", () => {
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain('"data:finalize:cplt": "npm run data:finalize:cplt:r2"');
    expect(packageJson).toContain('"data:finalize:cplt:r2": "node scripts/merge-cplt-category-artifacts.mjs && node scripts/publish-cplt-projections.mjs --r2"');
    expect(packageJson).toContain('"data:archive:cplt": "node scripts/publish-data-lake.mjs --output data/lake-cplt --releases --release-manifests-only"');
    const publisher = readFileSync(resolve(process.cwd(), "scripts/publish-data-lake.mjs"), "utf8");
    expect(publisher).toContain("const releaseAssets = assets.filter((asset) => asset.r2Only !== true)");
    expect(publisher).toContain("releaseManifestsOnly ? releaseAssets.filter");
    expect(workflow).toContain("npm run data:archive:cplt");
    expect(workflow).toContain("continue-on-error: true");
    expect(workflow).toContain("Archivo GitHub Releases no crítico");
  });

  it("mantiene separadas las proyecciones municipales y centrales", () => {
    const etl = readFileSync(resolve(process.cwd(), "scripts/etl/stream-remote-personal.mjs"), "utf8");
    expect(etl).toContain("--scope=");
    expect(etl).toContain("transparencia_activa_central");
    expect(readFileSync(resolve(process.cwd(), "scripts/etl/cplt-scope.mjs"), "utf8")).toContain("acceptsCpltScope");
    const centralWorkflow = readFileSync(resolve(process.cwd(), "../.github/workflows/etl-cplt-central.yml"), "utf8");
    expect(centralWorkflow).toContain("workflow_dispatch:");
    expect(centralWorkflow).toContain("--scope=central");
    expect(centralWorkflow).toContain("data:finalize:cplt-central:r2");
    expect(centralWorkflow).not.toContain("D1");
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

  it("aplica el presupuesto account-wide antes de cualquier publicación R2 directa", () => {
    for (const file of [
      "scripts/publish-data-lake.mjs",
      "scripts/publish-static-site-inputs.mjs",
      "scripts/publish-personal-apoyo.mjs",
      "scripts/publish-transferencias-api-release.mjs",
    ]) {
      const publisher = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(publisher, file).toContain("assertRemoteR2WriteBudget");
      expect(publisher, file).toContain("configuredR2BudgetBuckets");
    }
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

  it("genera un índice liviano por organismo y período", () => {
    const publisher = readFileSync(resolve(process.cwd(), "scripts/publish-cplt-projections.mjs"), "utf8");
    const indexer = readFileSync(resolve(process.cwd(), "scripts/cplt-coverage-index.mjs"), "utf8");
    expect(publisher).toContain("buildCpltCoverageIndex");
    expect(publisher).toContain('"coverage-index.json"');
    expect(publisher).toContain("coverageIndex:");
    expect(publisher).toMatch(/const manifestAssets = \[\s*transparencySummaryMetadata,\s*searchIndexMetadata,\s*coverageIndexMetadata,/);
    expect(indexer).toContain("organismId");
    expect(indexer).toContain("invalidPeriodRows");
    expect(indexer).not.toContain("nombre_completo");
  });

  it("deja la auditoría de duplicados separada de la publicación", () => {
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    const audit = readFileSync(resolve(process.cwd(), "scripts/audit-cplt-duplicates.mjs"), "utf8");
    expect(packageJson).toContain('"audit:cplt:duplicates"');
    expect(audit).toContain("metadataFiles");
    expect(audit).toContain("duplicateGroups");
    expect(audit).not.toContain("wrangler");
    expect(audit).not.toContain("D1");
    expect(audit).not.toContain("r2 object");
  });

  it("solo permite registrar el estado CPLT en la D1 autorizada", () => {
    const recorder = readFileSync(resolve(process.cwd(), "scripts/record-cplt-source-state.mjs"), "utf8");
    expect(recorder).toContain('database !== "transparencia-db"');
    expect(recorder).toContain('source_id,etl_run_id,status');
  });

  it("comprueba fuentes sin activar ingesta ni publicación, y retira D1 automático", () => {
    expect(workflow).toContain("check_sources_only:");
    expect(workflow).toContain("timeout-minutes: 5");
    expect(workflow).toContain("!inputs.resume_run_id && inputs.check_sources_only != true && needs.cplt-source-check.outputs.changed == 'true'");
    expect(workflow).not.toMatch(/d1-preflight|data:record:cplt-state|d1-preflight-cplt/i);
    const guard = readFileSync(resolve(process.cwd(), "../.github/workflows/etl-publication-guard.yml"), "utf8");
    expect(guard).toContain("return shouldVerifyCpltPublication(jobs)");
  });

  it("no espera Pages cuando la consolidación CPLT fue omitida", () => {
    expect(shouldVerifyCpltPublication([{ name: "Consolidación y Publicación R2", conclusion: "skipped", steps: [] }])).toBe(false);
  });

  it("verifica Pages sólo tras publicación CPLT completada", () => {
    expect(shouldVerifyCpltPublication([{ name: "Consolidación y Publicación R2", conclusion: "success", steps: [{ name: "Publicar agregados municipales para Pages", conclusion: "success" }] }])).toBe(true);
  });

  it("rechaza metadatos ausentes, fallidos o publicación CPLT incompleta", () => {
    for (const jobs of [
      [],
      [{ name: "Consolidación y Publicación R2", conclusion: "failure", steps: [] }],
      [{ name: "Consolidación y Publicación R2", conclusion: "success", steps: [] }],
      [{ name: "Consolidación y Publicación R2", conclusion: "success", steps: [{ name: "Publicar agregados municipales para Pages", conclusion: "skipped" }] }],
    ]) {
      expect(() => shouldVerifyCpltPublication(jobs)).toThrow("CPLT_PUBLICATION_RESULT_INVALID");
    }
  });
});
