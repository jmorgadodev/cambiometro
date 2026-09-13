import { describe, expect, it } from "vitest";
import { parseR2ListPage } from "./r2-list.mjs";

describe("respuesta REST de listado R2", () => {
  it("acepta el formato actual, donde result es un arreglo", () => {
    expect(parseR2ListPage({
      result: [{ key: "partitions/camara/2026/08/manifest.json" }],
      result_info: { cursor: "next-cursor", is_truncated: true },
    })).toEqual({
      objects: [{ key: "partitions/camara/2026/08/manifest.json" }],
      cursor: "next-cursor",
    });
  });

  it("mantiene compatibilidad con el formato envuelto", () => {
    expect(parseR2ListPage({ result: { objects: [{ key: "catalog/v1/manifest.json" }], cursor: "legacy" } })).toEqual({
      objects: [{ key: "catalog/v1/manifest.json" }],
      cursor: "legacy",
    });
  });
});
