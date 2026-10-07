import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("enlaces de votaciones a fuentes oficiales", () => {
  for (const file of ["VotacionesAnualesExplorer.tsx", "VotacionesDestacadasClient.tsx"]) {
    it(`${file} protege todos los enlaces en pestaña nueva`, () => {
      const source = readFileSync(new URL(`../components/${file}`, import.meta.url), "utf8");
      const links = source.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? [];
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        const rel = link.match(/rel="([^"]+)"/)?.[1].split(/\s+/) ?? [];
        expect(rel).toContain("noopener");
        expect(rel).toContain("noreferrer");
      }
    });
  }
});
