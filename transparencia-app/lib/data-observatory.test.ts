import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..");

describe("observatorio de datos", () => {
  it("calcula sus cifras desde la plataforma canónica", () => {
    const page = readFileSync(join(projectRoot, "app", "datos", "page.tsx"), "utf8");

    for (const source of [
      "chilecompra",
      "ley-19862",
      "infoprobidad",
      "infolobby",
      "dipres",
      "sinim",
      "contraloria",
      "camara",
      "senado",
    ]) {
      expect(page).toContain(`"${source}"`);
    }
    expect(page).toContain("listPublishedSourceManifests()");
    expect(page).not.toMatch(/\b(152|173|16275|74142)\b/);
  });

  it("queda enlazado desde la navegación y el sitemap", () => {
    const header = readFileSync(join(projectRoot, "components", "SiteHeader.tsx"), "utf8");
    const sitemap = readFileSync(join(projectRoot, "scripts", "generate-static-metadata.mjs"), "utf8");

    expect(header).toContain('{ href: "/datos", label: "Datos" }');
    expect(sitemap).toContain("sitemap.xml");
    expect(sitemap).toContain('entry.name === "index.html"');
  });

  it("explica límites antes de proponer nuevas líneas de análisis", () => {
    const page = readFileSync(join(projectRoot, "app", "datos", "page.tsx"), "utf8");

    expect(page).toContain("No implica irregularidad");
    expect(page).toContain("Cobertura insuficiente");
    expect(page).toContain("Identificadores oficiales");
  });
});
