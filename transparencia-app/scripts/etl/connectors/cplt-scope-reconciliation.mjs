const MUNICIPAL_PREFIX = "muni-";

function integer(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function categoryKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, "");
}

function publicCategoryRows(publicManifest, category) {
  const key = categoryKey(category);
  return (Array.isArray(publicManifest?.coverage) ? publicManifest.coverage : [])
    .map((row) => ({
      id: String(row?.communeId ?? row?.administrationId ?? "").trim(),
      count: integer(row?.categories?.[key]?.recordCount),
      status: String(row?.categories?.[key]?.status ?? row?.status ?? "").trim(),
    }))
    .filter((row) => row.id.startsWith(MUNICIPAL_PREFIX));
}

/**
 * Compares scope metadata only. It deliberately does not compare total rows
 * across municipal and central releases, because they are different universes.
 */
export function reconcileCpltScopes({ publicManifest, candidateCategories }) {
  const publicRows = Array.isArray(publicManifest?.coverage) ? publicManifest.coverage : [];
  const categories = (candidateCategories ?? []).map((candidate) => {
    const category = String(candidate?.category ?? "").trim();
    const organizations = Array.isArray(candidate?.organizations) ? candidate.organizations : [];
    const municipal = organizations.filter((row) => String(row?.organismoId ?? "").startsWith(MUNICIPAL_PREFIX));
    const central = organizations.filter((row) => !String(row?.organismoId ?? "").startsWith(MUNICIPAL_PREFIX));
    const publicCategory = publicCategoryRows(publicManifest, category);
    const publicById = new Map(publicCategory.map((row) => [row.id, row]));
    const overlap = municipal.filter((row) => publicById.has(String(row.organismoId)));
    const countMismatches = overlap.filter((row) => integer(row.recordCount) !== publicById.get(String(row.organismoId)).count);
    return {
      category,
      candidateRows: integer(candidate?.recordCount),
      candidateOrganizations: organizations.length,
      candidateMunicipalities: municipal.length,
      candidateCentralOrganizations: central.length,
      publicMunicipalities: publicCategory.filter((row) => row.count > 0).length,
      publicMunicipalRows: publicCategory.reduce((total, row) => total + row.count, 0),
      overlappingMunicipalities: overlap.length,
      municipalCountMismatches: countMismatches.length,
      overlapSample: countMismatches.slice(0, 10).map((row) => ({
        organismId: String(row.organismoId),
        candidateRows: integer(row.recordCount),
        publicRows: publicById.get(String(row.organismoId)).count,
      })),
    };
  });

  const reasons = new Set();
  if (categories.some((row) => row.candidateCentralOrganizations > 0)) reasons.add("central_scope_present");
  if (categories.some((row) => row.candidateMunicipalities < row.publicMunicipalities)) reasons.add("municipal_coverage_incomplete");
  if (categories.some((row) => row.overlappingMunicipalities > 0)) reasons.add("municipal_overlap_requires_deduplication");

  const replacementEligible = reasons.size === 0 && categories.length > 0;
  return {
    schemaVersion: 1,
    role: replacementEligible ? "replacement_candidate" : "complementary_candidate",
    replacementEligible,
    publicRows: integer(publicManifest?.recordCount),
    publicCoverageEntities: publicRows.length,
    candidateRows: categories.reduce((total, row) => total + row.candidateRows, 0),
    categories,
    reasons: [...reasons],
  };
}
