import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const layout = readFileSync(resolve(projectRoot, "app/layout.tsx"), "utf8");
const styles = readFileSync(resolve(projectRoot, "app/globals.css"), "utf8");

describe("sistema editorial compartido", () => {
  it("carga las tres familias tipograficas definidas en el traspaso", () => {
    expect(layout).toContain("Newsreader");
    expect(layout).toContain("JetBrains_Mono");
    expect(layout).toContain("Inter");
    expect(layout).toContain("--font-editorial");
    expect(layout).toContain("--font-ledger");
  });

  it("expone los tokens editoriales sin reemplazar los temas existentes", () => {
    expect(styles).toContain("--editorial-forest: #13372E");
    expect(styles).toContain("--editorial-paper: #F6F5F2");
    expect(styles).toContain("--editorial-mint: #4CC38A");
    expect(styles).toContain("--editorial-graphite: #2A2E33");
    expect(styles).toContain("--font-serif: var(--font-editorial");
    expect(styles).toContain(":root[data-theme=\"dark\"]");
    expect(styles).toContain(":root[data-theme=\"night\"]");
  });
});
