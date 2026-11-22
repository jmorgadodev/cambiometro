import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  normativeConceptIds,
  normativeDefinitions,
  normativeVersions,
  NORMATIVE_CATALOG,
} from "./parliamentary-normative";
describe("central normative catalog", () => {
  it("maps exact original items, never a visual category to communication", () => {
    expect(
      normativeConceptIds({ items: ["Actividad y comunicación"] }),
    ).toEqual([]);
    expect(
      normativeConceptIds({
        items: ["RELATIVO A COMUNICACIÓN", "ARRIENDO OFICINAS"],
      }),
    ).toEqual(["comunicacion", "oficinas"]);
  });
  it("does not guess suspicious or unknown source labels", () =>
    expect(normativeConceptIds({ items: ["TRASLACION VEHICULO9"] })).toEqual(
      [],
    ));
  it("keeps diet outside assignment regulations", () =>
    expect(normativeDefinitions({ component: "dieta" })).toEqual([]));
  it("selects the actual start date and does not assign one regulation to March's mixed month", () => {
    expect(normativeVersions("2026-03", "2026-03").map((v) => v.id)).toEqual([
      "crap-res-11",
      "crap-res-12",
    ]);
    expect(normativeVersions("2026-04", "2026-06").map((v) => v.id)).toEqual([
      "crap-res-12",
    ]);
    expect(normativeVersions("2026-03-10").map((v) => v.id)).toEqual([
      "crap-res-11",
    ]);
  });
  it("does not apply the latest regulation to unsupported older dates", () =>
    expect(normativeVersions("2024-01")).toEqual([]));
  it("every approved definition has official references and versioned validity", () => {
    for (const d of NORMATIVE_CATALOG.definitions) {
      expect(d.references.some((r) => r.versionId === d.versionId)).toBe(true);
      expect(d.validFrom).toMatch(/^20/);
      expect(d.institutions).toContain("senado");
    }
  });
});

it("retains original official document bytes for each approved snapshot", () => {
  for (const v of NORMATIVE_CATALOG.versions) {
    const bytes = fs.readFileSync(path.resolve("..", v.originalPath));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(v.sha256);
  }
});
it("does not invent applicability for malformed calendar periods", () => {
  expect(normativeVersions("2026-13")).toEqual([]);
  expect(normativeVersions("2026-02-30")).toEqual([]);
});
