import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("workflow de refresco de Pages", () => {
  const workflow = readFileSync(resolve(import.meta.dirname, "../../.github/workflows/pages-static-refresh.yml"), "utf8");

  it("usa el código de la rama desplegada y no el commit antiguo del ETL", () => {
    expect(workflow).toContain("ref: ${{ github.ref_name }}");
    expect(workflow).not.toContain("github.event.workflow_run.head_sha");
  });
});
