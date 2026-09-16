import { describe, expect, it } from "vitest";
import { getCpltSearchPageSize } from "../scripts/cplt-search-config.mjs";

describe("configuración del índice de búsqueda CPLT", () => {
  it("usa páginas pequeñas para la nómina central", () => {
    expect(getCpltSearchPageSize({ central: true })).toBe(1_000);
  });

  it("conserva páginas de 10.000 para la nómina municipal", () => {
    expect(getCpltSearchPageSize({ central: false })).toBe(10_000);
  });

  it("permite ajustar el tamaño antes de generar un release", () => {
    expect(getCpltSearchPageSize({ central: true, override: "2500" })).toBe(2_500);
  });

  it("rechaza tamaños que volverían a crear objetos inseguros", () => {
    expect(() => getCpltSearchPageSize({ central: true, override: "10001" })).toThrow("CPLT_SEARCH_PAGE_SIZE_INVALID");
  });
});
