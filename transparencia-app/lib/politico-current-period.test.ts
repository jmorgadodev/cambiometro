import { describe, expect, it } from "vitest";
import { currentParliamentaryPeriod } from "./politico-current-period";

describe("currentParliamentaryPeriod", () => {
  it("mantiene el periodo vigente 2022–2030 de un senador que no fue electo en 2025", () => {
    expect(
      currentParliamentaryPeriod(
        [{ desde: "2022", hasta: "2030" }],
        new Date("2026-09-26T12:00:00-03:00"),
      ),
    ).toBe("2022–2030");
  });

  it("reconoce periodos expresados con fechas completas", () => {
    expect(
      currentParliamentaryPeriod(
        [{ desde: "2026-03-11", hasta: "2030-03-10" }],
        new Date("2026-09-26T12:00:00-03:00"),
      ),
    ).toBe("2026–2030");
  });

  it("no inventa un periodo cuando ninguna evidencia cubre la fecha actual", () => {
    expect(
      currentParliamentaryPeriod(
        [{ desde: "2018", hasta: "2022" }],
        new Date("2026-09-26T12:00:00-03:00"),
      ),
    ).toBeNull();
  });
});
