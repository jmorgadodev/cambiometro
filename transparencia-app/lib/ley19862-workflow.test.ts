import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("workflow de publicación Ley 19.862", () => {
  it("hidrata bundles históricos de entidades antes de reconstruir el data lake", () => {
    const workflowPath = path.resolve(process.cwd(), "..", ".github", "workflows", "etl-ley-19862.yml");
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("npm run etl:prepare -- --download-projections --sources ley-19862");
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_DATA_API_TOKEN }}");
  });

  it("no intenta duplicar el universo completo en D1 y verifica el release R2", () => {
    const workflowPath = path.resolve(process.cwd(), "..", ".github", "workflows", "etl-ley-19862.yml");
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("npm run data:publish:transfer-api");
    expect(workflow).not.toContain("npm run data:materialize -- --database transparencia-db --remote --sources ley-19862");
  });

  it("exige el manifiesto estático completo antes de reconstruir Pages", () => {
    const workflowPath = path.resolve(process.cwd(), "..", ".github", "workflows", "pages-static-refresh.yml");
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("npm run data:hydrate:static -- --required --required-all");
  });

  it("verifica sólo el release vigente sin bridge, extracción, histórico ni publicaciones", () => {
    const workflow = fs.readFileSync(path.resolve(process.cwd(), "..", ".github", "workflows", "etl-ley-19862.yml"), "utf8").replace(/\r\n/g, "\n");
    expect(workflow).toContain("verify_release_only:");
    for (const step of [
      "Preparar workspace ETL sin datasets versionados",
      "Publicar bridge privado para el origen oficial",
      "Ingerir y proyectar Transferencias Ley 19.862",
      "Publicar entradas estáticas versionadas para Pages",
      "Publicar release completo para Pages y Worker",
    ]) {
      expect(workflow).toContain(`- name: ${step}\n        if: inputs.verify_release_only != true`);
    }
    expect(workflow).toContain("if: inputs.verify_release_only != true && inputs.full_backfill != true");
    expect(workflow).toContain("if: inputs.verify_release_only == true");
    expect(workflow).toContain("--required-files data/lake/projections/v1/ley19862-summary.json,data/lake-subsets/ley19862.subset.json");
    expect(workflow).toContain("--only-files data/lake/projections/v1/ley19862-summary.json,data/lake-subsets/ley19862.subset.json --force");
    const guard = fs.readFileSync(path.resolve(process.cwd(), "..", ".github", "workflows", "etl-publication-guard.yml"), "utf8");
    expect(guard).toMatch(/\[[^\]]*'ETL Mensual - Ley 19\.862 Transferencias del Estado'\]\.includes/);
    expect(guard).toContain("return steps[0].conclusion === 'success'");
  });
});
