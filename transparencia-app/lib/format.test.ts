import { describe, it, expect } from "vitest";
import { getApellido, comparePorApellido, formatFechaChilena, edadEnAnos } from "./format";

describe("format y ordenamiento por apellido", () => {
  it("extrae correctamente el apellido", () => {
    expect(getApellido("Gabriel Boric Font")).toBe("Boric Font");
    expect(getApellido("Jaime Araya Guerrero")).toBe("Araya Guerrero");
    expect(getApellido("Mario Guillermo Desbordes Jiménez")).toBe("Desbordes Jiménez");
    expect(getApellido("Johannes Kaiser")).toBe("Kaiser");
    expect(getApellido("Boric")).toBe("Boric");
  });

  it("ordena listas de parlamentarios por apellido alfabéticamente A-Z", () => {
    const nombres = [
      "Gabriel Boric Font",
      "Jaime Araya Guerrero",
      "Mario Desbordes Jiménez",
      "Chiara Barchiesi Chávez",
      "Johannes Kaiser",
    ];

    const ordenados = [...nombres].sort(comparePorApellido);
    expect(ordenados).toEqual([
      "Jaime Araya Guerrero",
      "Chiara Barchiesi Chávez",
      "Gabriel Boric Font",
      "Mario Desbordes Jiménez",
      "Johannes Kaiser",
    ]);
  });

  it("formatea fechas estándar en formato chileno DD-MM-AAAA", () => {
    expect(formatFechaChilena("1986-02-11")).toBe("11-02-1986");
    expect(formatFechaChilena("2026-03-11")).toBe("11-03-2026");
  });
});
