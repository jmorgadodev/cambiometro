import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("workflow de reconciliación histórica de Cámara", () => {
  const workflow = readFileSync(resolve(process.cwd(), "../.github/workflows/etl-camara-reconciliation.yml"), "utf8");
  const pagesRefresh = readFileSync(resolve(process.cwd(), "../.github/workflows/pages-static-refresh.yml"), "utf8");

  it("exige confirmación explícita y reconstruye desde los endpoints oficiales", () => {
    expect(workflow).toContain("CAMBIOMETRO_CONFIRM_CAMARA_RECONCILIATION");
    expect(workflow).toContain("--full-history");
    expect(workflow).toContain("--source camara,votaciones_camara");
    expect(workflow).toContain("--replace-source camara");
  });

  it("publica R2/Releases sin materializar ni consultar D1", () => {
    expect(workflow).toContain("npm run data:publish");
    expect(workflow).not.toContain("data:materialize");
    expect(workflow).not.toContain("d1 execute");
    expect(workflow).not.toContain("--remote --database");
  });

  it("dispara el refresco de Pages sólo después de terminar el workflow", () => {
    expect(pagesRefresh).toContain('"ETL Histórico - Reconciliación Cámara"');
  });
});
