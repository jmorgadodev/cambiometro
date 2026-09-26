import { describe, expect, it } from "vitest";
import { groupPersonSearchEvidence, personSearchPage, type PersonSearchEvidence } from "./person-search-results";

const evidence = (overrides: Partial<PersonSearchEvidence> = {}): PersonSearchEvidence => ({
  id: "row-1",
  name: "Vanessa Kaiser Barents-Von Hohenhagen",
  kind: "remuneracion",
  url: "/remuneraciones-publicas/?q=Kaiser",
  organization: "Senado",
  sourceId: "senado",
  ...overrides,
});

describe("búsqueda agrupada de personas", () => {
  it("agrupa por identificador oficial, no sólo por nombre", () => {
    const groups = groupPersonSearchEvidence([
      evidence({ id: "a", officialPersonId: "person-1", organization: "Senado" }),
      evidence({ id: "b", officialPersonId: "person-1", organization: "Cámara" }),
      evidence({ id: "c", officialPersonId: "person-2" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((group) => group.key === "official:person-1")?.evidence).toHaveLength(2);
  });

  it("mantiene separados los homónimos de fuentes u organismos distintos", () => {
    const groups = groupPersonSearchEvidence([
      evidence({ id: "municipal", sourceId: "cplt-municipal", organization: "Municipalidad A" }),
      evidence({ id: "central", sourceId: "cplt-central", organization: "Ministerio B" }),
      evidence({ id: "variant", name: "Kaiser Vanessa Hohenhagen Barents Von", sourceId: "cplt-municipal", organization: "Municipalidad A" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.identityConfidence === "source-scoped")).toBe(true);
  });

  it("pagina fichas agrupadas en bloques de hasta quince", () => {
    const groups = Array.from({ length: 31 }, (_, index) => ({ id: index }));
    expect(personSearchPage(groups, 2)).toMatchObject({ page: 2, start: 15, end: 30, total: 31, totalPages: 3 });
    expect(personSearchPage(groups, 2).items).toHaveLength(15);
  });
});
