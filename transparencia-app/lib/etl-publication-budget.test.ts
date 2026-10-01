import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ETL publication uses the shared account budget", () => {
  it.each(["publish-data-lake.mjs", "publish-static-site-inputs.mjs", "publish-personal-apoyo.mjs", "publish-transferencias-api-release.mjs"])("guards %s before uploads", (name) => {
    const source = readFileSync(resolve("scripts", name), "utf8");
    expect(source).toContain('from "./etl/r2-account-budget.mjs"');
    expect(source).toContain("await assertRemoteR2WriteBudget({");
    const firstUpload = name === "publish-transferencias-api-release.mjs"
      ? source.indexOf("await putInBatches(apiManifest.pages") : source.search(/\["r2", "object", "put"/);
    expect(firstUpload).toBeGreaterThan(source.indexOf("await assertRemoteR2WriteBudget({"));
  });
  it("keeps CPLT publication on the guarded lake publisher", () => {
    expect(readFileSync(resolve("scripts/publish-cplt-projections.mjs"), "utf8")).toContain('resolve("scripts/publish-data-lake.mjs")');
  });
  it("guards all eight 38 bis objects before the first PUT", () => {
    const workflow = readFileSync(resolve("../.github/workflows/etl-remuneraciones-38bis.yml"), "utf8");
    expect(workflow.indexOf("await assertRemoteR2WriteBudget({")).toBeGreaterThan(0);
    expect(workflow.indexOf("await assertRemoteR2WriteBudget({")).toBeLessThan(workflow.indexOf("npx wrangler r2 object put"));
    expect(workflow).toContain("statSync(file).size");
    expect(workflow).toContain("current-history.json");
    expect(workflow).toContain("current-audit.json");
    expect(workflow.match(/npx wrangler r2 object put/g)).toHaveLength(8);
  });
  it("provides a read-only remote preflight in the existing manual guard", () => {
    const workflow = readFileSync(resolve("../.github/workflows/etl-publication-guard.yml"), "utf8");
    expect(workflow).toContain("assertRemoteR2WriteBudget");
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(workflow).not.toMatch(/r2 object (put|delete)|d1 execute/);
  });
});
