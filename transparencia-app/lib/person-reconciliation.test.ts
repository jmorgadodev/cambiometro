import { describe, expect, it } from "vitest";
import { reconcilePersonAliases } from "../scripts/etl/person-reconciliation.mjs";

describe("conciliacion segura de personas entre fuentes oficiales", () => {
  it("vincula un nombre parlamentario con la misma persona que incluye segundo nombre", () => {
    const aliases = reconcilePersonAliases([
      { id: "person-camara-1002", kind: "person", name: "Leonardo Soto Ferrada", sourceIds: ["camara"] },
      { id: "person-infoprobidad-854b", kind: "person", name: "LEONARDO ENRIQUE SOTO FERRADA", sourceIds: ["infoprobidad"] },
    ]);

    expect(aliases).toEqual([expect.objectContaining({
      canonicalId: "person-camara-1002",
      aliasId: "person-infoprobidad-854b",
      sourceId: "infoprobidad",
      method: "unique_first_name_and_two_surnames",
      confidence: 0.99,
    })]);
  });

  it("no vincula nombres incompletos que pueden corresponder a otra persona", () => {
    const aliases = reconcilePersonAliases([
      { id: "person-camara-1002", kind: "person", name: "Leonardo Soto Ferrada", sourceIds: ["camara"] },
      { id: "person-infolobby-b82c", kind: "person", name: "LEONARDO SOTO", sourceIds: ["infolobby"] },
    ]);

    expect(aliases).toEqual([]);
  });

  it("rechaza coincidencias ambiguas aunque la firma de nombre coincida", () => {
    const aliases = reconcilePersonAliases([
      { id: "person-camara-1002", kind: "person", name: "Leonardo Soto Ferrada", sourceIds: ["camara"] },
      { id: "person-senado-999", kind: "person", name: "Leonardo Andres Soto Ferrada", sourceIds: ["senado"] },
      { id: "person-infoprobidad-854b", kind: "person", name: "LEONARDO ENRIQUE SOTO FERRADA", sourceIds: ["infoprobidad"] },
    ]);

    expect(aliases).toEqual([]);
  });
});
