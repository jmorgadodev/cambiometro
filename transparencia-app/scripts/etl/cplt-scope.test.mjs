import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { acceptsCpltScope, CPLT_SCOPES, isMunicipalOrganization } from "./cplt-scope.mjs";
import { createMunicipalityRegistry } from "./municipality-registry.mjs";
import { filterCpltRowsForScope } from "./cplt-personal.mjs";

describe("alcance de nóminas CPLT", () => {
  it.each([
    ["I. Municipalidad de Macul", "muni-macul"],
    ["I. Municipalidad de Negrete", "muni-negrete"],
    ["I. Municipalidad de Penco", "muni-penco"],
  ])("mantiene %s en el alcance municipal y fuera del central", (organization, id) => {
    const { communes } = JSON.parse(readFileSync(new URL("../../data/catalog/communes.json", import.meta.url), "utf8"));
    const registry = createMunicipalityRegistry(communes);
    expect(registry.resolve(organization)).toBe(id);
    expect(acceptsCpltScope(organization, CPLT_SCOPES.MUNICIPAL)).toBe(true);
    expect(acceptsCpltScope(organization, CPLT_SCOPES.CENTRAL)).toBe(false);
    const rows = [{ organo_nombre: organization }];
    expect(filterCpltRowsForScope(rows, CPLT_SCOPES.MUNICIPAL)).toEqual(rows);
    expect(filterCpltRowsForScope(rows, CPLT_SCOPES.CENTRAL)).toEqual([]);
  });

  it("reconoce las variantes municipales sin confundir organismos centrales", () => {
    expect(isMunicipalOrganization("Municipalidad de San Fernando")).toBe(true);
    expect(isMunicipalOrganization("I. Municipalidad de Maipú")).toBe(true);
    expect(isMunicipalOrganization("Presidencia de la República")).toBe(false);
    expect(isMunicipalOrganization("Ministerio de Educación")).toBe(false);
  });

  it("mantiene la proyección municipal aislada y acepta la nómina central por separado", () => {
    expect(acceptsCpltScope("Municipalidad de San Fernando", CPLT_SCOPES.MUNICIPAL)).toBe(true);
    expect(acceptsCpltScope("Municipalidad de San Fernando", CPLT_SCOPES.CENTRAL)).toBe(false);
    expect(acceptsCpltScope("Presidencia de la República", CPLT_SCOPES.MUNICIPAL)).toBe(false);
    expect(acceptsCpltScope("Presidencia de la República", CPLT_SCOPES.CENTRAL)).toBe(true);
  });
});
