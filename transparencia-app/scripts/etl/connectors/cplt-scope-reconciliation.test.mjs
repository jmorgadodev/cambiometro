import { describe, expect, it } from "vitest";
import { reconcileCpltScopes } from "./cplt-scope-reconciliation.mjs";

describe("reconcileCpltScopes", () => {
  it("separa un candidato central complementario del release municipal", () => {
    const result = reconcileCpltScopes({
      publicManifest: {
        recordCount: 120,
        coverage: [
          { communeId: "muni-a", status: "available", categories: { planta: { recordCount: 100 } } },
          { communeId: "muni-b", status: "available", categories: { planta: { recordCount: 20 } } },
        ],
      },
      candidateCategories: [{
        category: "Planta",
        recordCount: 80,
        organizations: [
          { organismoId: "muni-a", recordCount: 10 },
          { organismoId: "org-ministerio", recordCount: 70 },
        ],
      }],
    });

    expect(result.replacementEligible).toBe(false);
    expect(result.role).toBe("complementary_candidate");
    expect(result.categories[0]).toMatchObject({
      candidateMunicipalities: 1,
      publicMunicipalities: 2,
      candidateCentralOrganizations: 1,
      overlappingMunicipalities: 1,
      municipalitiesAlreadyPublished: 1,
    });
  });

  it("distingue una municipalidad candidata que falta en producción", () => {
    const result = reconcileCpltScopes({
      publicManifest: {
        coverage: [{ communeId: "muni-a", status: "unavailable", categories: { planta: { status: "unavailable", recordCount: 0 } } }],
      },
      candidateCategories: [{ category: "Planta", recordCount: 4, organizations: [{ organismoId: "muni-a", recordCount: 4 }] }],
    });

    expect(result.categories[0]).toMatchObject({
      overlappingMunicipalities: 1,
      municipalitiesAlreadyPublished: 0,
      municipalitiesFillingUnavailable: 1,
    });
    expect(result.reasons).not.toContain("municipal_overlap_requires_deduplication");
  });

  it("no afirma cobertura municipal cuando el candidato no trae municipios", () => {
    const result = reconcileCpltScopes({
      publicManifest: { recordCount: 10, coverage: [{ communeId: "muni-a", status: "available", categories: { contrata: { recordCount: 10 } } }] },
      candidateCategories: [{ category: "Contrata", recordCount: 4, organizations: [{ organismoId: "org-servicio", recordCount: 4 }] }],
    });

    expect(result.categories[0].candidateMunicipalities).toBe(0);
    expect(result.categories[0].publicMunicipalities).toBe(1);
    expect(result.replacementEligible).toBe(false);
  });
});
