import { describe, expect, it } from "vitest";
import {
  acceptsCpltScope,
  assertCentralOrganizations,
  CPLT_SCOPES,
  isMunicipalOrganization,
} from "./cplt-scope.mjs";

describe("alcance de nóminas CPLT", () => {
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

  it("bloquea una promoción central que contiene IDs municipales", () => {
    expect(() => assertCentralOrganizations([
      { organismoId: "org-presidencia", organismoNombre: "Presidencia" },
      { organismoId: "muni-macul", organismoNombre: "I. Municipalidad de Macul" },
    ])).toThrow("CPLT_CENTRAL_MUNICIPAL_SCOPE_LEAK");
  });

  it("permite la cobertura central cuando no contiene organizaciones municipales", () => {
    expect(assertCentralOrganizations([
      { organismoId: "org-presidencia", organismoNombre: "Presidencia" },
      { organismoId: "org-mineduc", organismoNombre: "Ministerio de Educación" },
    ])).toEqual({ checked: 2, municipal: [] });
  });
});
