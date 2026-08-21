import { describe, expect, it } from "vitest";
import {
  getEvidenceForPolitico,
  getSnapshotSummary,
  normalizeSearchText,
} from "./data-source";

describe("capa común de datos ETL", () => {
  it("normaliza acentos y separadores para comparar fuentes", () => {
    expect(normalizeSearchText("  René Manuel García  ")).toBe("rene manuel garcia");
  });

  it("ignora campos oficiales no textuales al construir evidencia", () => {
    expect(normalizeSearchText(["René Manuel García"])).toBe("");
    expect(normalizeSearchText({ nombre: "René Manuel García" })).toBe("");
    expect(normalizeSearchText(null)).toBe("");
  });

  it("expone frescura y conteos del snapshot publicado", () => {
    const summary = getSnapshotSummary();
    expect(summary.generatedAt).toBeTruthy();
    expect(summary.totalRecords).toBe(
      summary.sources.reduce((total, source) => total + source.count, 0),
    );
    expect(summary.sources.find((source) => source.key === "congreso_opendata")?.count).toBe(155);
  });

  it("asocia evidencia solo cuando el nombre completo aparece en el registro", async () => {
    const evidence = await getEvidenceForPolitico({ nombre_completo: "René Manuel García García" });
    const congress = evidence.find((source) => source.source.key === "congreso_opendata");

    expect(congress?.records[0].nombre).toBe("René Manuel García García");
    expect(await getEvidenceForPolitico({ nombre_completo: "Persona Sin Registro Público" })).toEqual([]);
  });
});
