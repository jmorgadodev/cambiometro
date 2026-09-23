import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("verificación de temas en navegador", () => {
  it("espera la hidratación real de la cabecera antes de comprobar tokens", () => {
    const script = fs.readFileSync(path.resolve(process.cwd(), "scripts/verify-themes.mjs"), "utf8");

    expect(script).toMatch(/page\.waitForFunction\(\(expectedTheme\) => \{\s*const header = document\.querySelector\("\.site-header"\);\s*return header\?\.getAttribute\("data-hydrated"\) === "true"/);
    expect(script).not.toContain("page.waitForTimeout(250)");
    expect(script.indexOf("await page.waitForFunction((expectedTheme)"))
      .toBeLessThan(script.indexOf("document.getAnimations()"));
    expect(script.indexOf("document.getAnimations()"))
      .toBeLessThan(script.indexOf("new AxeBuilder({ page })"));
  });
});
