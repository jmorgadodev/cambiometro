import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "..");
const publicRoots = ["app", "components"];
const forbiddenPublicPhrases = [
  "El navegador carga sólo la página solicitada",
  "no descarga el universo completo",
  "Consultables en R2",
  "Consolidación en Lake D1 / R2",
  "Checksum:",
];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

describe("texto público", () => {
  it("no expone detalles técnicos internos en las tarjetas de fuentes", () => {
    const releaseMetaCard = readFileSync(resolve(projectRoot, "components/data/ReleaseMetaCard.tsx"), "utf8");
    const remuneracionesPage = readFileSync(resolve(projectRoot, "components/remuneraciones/Remuneraciones38BisClient.tsx"), "utf8");
    const publicMethodology = readFileSync(resolve(projectRoot, "app/como-funciona/page.tsx"), "utf8");
    const publicCrosses = readFileSync(resolve(projectRoot, "app/cruces/page.tsx"), "utf8");
    const publicSources = readFileSync(resolve(projectRoot, "app/fuentes/page.tsx"), "utf8");
    const publicQuality = readFileSync(resolve(projectRoot, "app/datos/calidad/page.tsx"), "utf8");

    expect(releaseMetaCard).not.toContain("Checksum:");
    expect(releaseMetaCard).not.toContain("shortReleaseChecksum");
    expect(remuneracionesPage).not.toContain("El navegador carga sólo la página solicitada");
    expect(remuneracionesPage).not.toContain("no descarga el universo completo");
    for (const source of [publicMethodology, publicCrosses, publicSources, publicQuality]) {
      expect(source).not.toContain("no descarga el universo completo");
      expect(source).not.toContain("Consultables en R2");
      expect(source).not.toContain("Consolidación en Lake D1 / R2");
    }

    for (const path of publicRoots.flatMap((root) => collectSourceFiles(resolve(projectRoot, root)))) {
      const source = readFileSync(path, "utf8");
      for (const phrase of forbiddenPublicPhrases) expect(source).not.toContain(phrase);
    }
  });
});
