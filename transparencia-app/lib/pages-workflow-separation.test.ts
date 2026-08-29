import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("separación de workflows Pages", () => {
  it("envía cambios de código a UI y reserva el refresco estático push para datos", () => {
    const staticRefresh = readFileSync(resolve(process.cwd(), "../.github/workflows/pages-static-refresh.yml"), "utf8");
    const uiRefresh = readFileSync(resolve(process.cwd(), "../.github/workflows/pages-ui-refresh.yml"), "utf8");

    expect(staticRefresh).not.toContain('      - "transparencia-app/lib/**"');
    expect(staticRefresh).not.toContain('      - "transparencia-app/scripts/**"');
    expect(uiRefresh).toContain('      - "transparencia-app/lib/**"');
    expect(uiRefresh).toContain('      - "transparencia-app/scripts/**"');
    expect(staticRefresh).toContain("workflow_run:");
    expect(staticRefresh).toContain("name: Regenerar salud de fuentes desde el snapshot publicado");
    expect(staticRefresh).toContain("run: npm run data:health");
    expect(uiRefresh).toContain("name: Regenerar salud de fuentes desde el snapshot publicado");
    expect(uiRefresh).toContain("run: npm run data:health");
  });

  it("fija cada build de interfaz al release canónico vigente de transferencias", () => {
    const uiRefresh = readFileSync(resolve(process.cwd(), "../.github/workflows/pages-ui-refresh.yml"), "utf8");

    expect(uiRefresh).toContain("projections/transferencias-v1/manifest.json");
    expect(uiRefresh).toContain('".ci-data-version/transfer-api-manifest.json"');
    expect(uiRefresh).toContain("name: Hidratar release API canónico de transferencias para Pages");
    expect(uiRefresh).toContain("scripts/hydrate-transfer-api-release.mjs");
    expect(uiRefresh).toContain("TRANSFER_STATIC_CANONICAL_MANIFEST_FILE=");
    expect(uiRefresh).toContain("id: transfer-release-cache");
    expect(uiRefresh).toContain("pages-ui-transfer-release-v1-");
    expect(uiRefresh).toContain("transparencia-app/public/data/transferencias");
    expect(uiRefresh).toContain("if: steps.transfer-release-cache.outputs.cache-hit != 'true'");
    expect(uiRefresh).toContain("name: Verificar coherencia con el release API de R2");
    expect(uiRefresh).toContain("scripts/verify-transfer-r2-consistency.mjs");
  });
});
