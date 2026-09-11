import { describe, expect, it } from "vitest";
import { catalogComponentCount, catalogPartitionCount, catalogSourceCount, transferReleaseCount } from "./source-health.mjs";

describe("conteos canónicos de salud de fuentes", () => {
  const catalog = {
    sources: [
      { id: "camara", recordCount: 100 },
      { id: "dipres", recordCount: 200 },
      { id: "gastos_camara", recordCount: 30 },
    ],
    partitions: [
      { sourceId: "camara", variant: "asistencia_camara", recordCount: 40 },
      { sourceId: "camara", variant: "votaciones_camara", recordCount: 20 },
    ],
  };
  const sourceMap = new Map(catalog.sources.map((source) => [source.id, source]));

  it("no hereda el total del padre al contar una variante", () => {
    expect(catalogPartitionCount(catalog, "camara", "asistencia_camara")).toBe(40);
    expect(catalogComponentCount(catalog, sourceMap, "camara", "asistencia_camara")).toBe(40);
    expect(catalogComponentCount(catalog, sourceMap, "gastos_camara")).toBe(30);
  });

  it("prefiere el catálogo para DIPRES y el release público para transferencias", () => {
    expect(catalogSourceCount(sourceMap, "dipres", 476)).toBe(200);
    expect(transferReleaseCount({ totalRows: 62_172 }, 59_912)).toBe(62_172);
    expect(transferReleaseCount(null, 59_912)).toBe(59_912);
  });
});
