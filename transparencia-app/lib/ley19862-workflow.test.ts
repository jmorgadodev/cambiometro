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
});
