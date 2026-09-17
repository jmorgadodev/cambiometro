import { describe, expect, it } from "vitest";
import { intersectSortedPositions, subtractSortedPositions, positionsWithoutExcluded } from "./search-postings";

describe("paginación y búsqueda sobre posiciones R2", () => {
  it("intersecta sin recorrer una lista masiva para tres candidatos", () => {
    let reads = 0;
    const large = new Proxy(Array.from({ length: 1_000_000 }, (_, i) => i * 2), {
      get(target, key, receiver) { if (/^\d+$/.test(String(key))) reads++; return Reflect.get(target, key, receiver); },
    });
    expect(intersectSortedPositions([[3, 42, 1_999_998], large])).toEqual([42, 1_999_998]);
    expect(reads).toBeLessThan(100);
  });
  it("conserva únicamente candidatos centrales sin alterar sus posiciones", () => {
    expect(subtractSortedPositions([0, 2, 5, 8], [2, 7])).toEqual([0, 5, 8]);
  });
  it("pagina un universo excluyendo municipales sin generar el universo entero", () => {
    expect(positionsWithoutExcluded(10, [0, 2, 5, 9], 0, 3)).toEqual([1, 3, 4]);
    expect(positionsWithoutExcluded(10, [0, 2, 5, 9], 3, 3)).toEqual([6, 7, 8]);
    expect(positionsWithoutExcluded(10, [0, 2, 5, 9], 6, 3)).toEqual([]);
  });
});
