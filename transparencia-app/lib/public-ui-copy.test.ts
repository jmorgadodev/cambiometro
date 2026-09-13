import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "..");

describe("texto público", () => {
  it("no expone detalles técnicos internos en las tarjetas de fuentes", () => {
    const releaseMetaCard = readFileSync(resolve(projectRoot, "components/data/ReleaseMetaCard.tsx"), "utf8");
    const remuneracionesPage = readFileSync(resolve(projectRoot, "components/remuneraciones/Remuneraciones38BisClient.tsx"), "utf8");

    expect(releaseMetaCard).not.toContain("Checksum:");
    expect(releaseMetaCard).not.toContain("shortReleaseChecksum");
    expect(remuneracionesPage).not.toContain("El navegador carga sólo la página solicitada");
    expect(remuneracionesPage).not.toContain("no descarga el universo completo");
  });
});
