import { normativeDefinitions, normativeVersions, type NormativeQuery } from "./parliamentary-normative";
/** Presentation only: the source catalog and the legal applicability selector remain unchanged. */
export function normativePanelPresentation(query: NormativeQuery) {
    const versions = normativeVersions(query.from, query.to ?? query.from);
    const displayedVersion = [...versions].sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
    const applicable = normativeDefinitions(query).filter(d => d.versionId === displayedVersion?.id);
    return {
        displayedVersion,
        transition: !!query.from && versions.length > 1,
        general: applicable.find(d => d.id === "general"),
        definitions: applicable.filter(d => d.id !== "general"),
    };
}
