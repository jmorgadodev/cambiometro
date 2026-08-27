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
  });
});
