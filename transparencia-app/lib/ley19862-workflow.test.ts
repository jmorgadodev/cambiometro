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
});
