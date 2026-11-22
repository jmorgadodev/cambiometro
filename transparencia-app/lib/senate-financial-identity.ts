/** Financial source-office identity only. No fuzzy matching or personal identifiers are created. */
export interface SenateFinancialMember {
  id: string;
  name: string;
  officialSenatorId?: string | number | null;
}
export const senateFinancialNameKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join("|");
export const VERIFIED_SENATE_FINANCIAL_ALIASES = [
  {
    canonicalId: "sen-030",
    canonicalName: "Paulina Vodanovic Rojas",
    officialSenatorId: "1450",
    publishedName: "VODANOVIC PAULINA",
    verifiedAt: "2026-11-21",
    sources: [
      "https://tramitacion.senado.cl/appsenado/index.php?ac=fichasenador&id=1450&mo=senadores",
      "https://tramitacion.senado.cl/appsenado/index.php?ac=informeTransparencia&mo=transparencia&tipo=16",
      "https://tramitacion.senado.cl/appsenado/index.php?ac=doctoInformeAsesoria&id=23587&mo=transparencia",
    ],
  },
] as const;
function candidate(member: SenateFinancialMember, office: string) {
  const key = senateFinancialNameKey(office),
    name = senateFinancialNameKey(member.name);
  const alias = VERIFIED_SENATE_FINANCIAL_ALIASES.find(
    (a) =>
      (a.canonicalId === member.id ||
        (member.officialSenatorId != null &&
          String(member.officialSenatorId) === a.officialSenatorId)) &&
      senateFinancialNameKey(a.canonicalName) === name,
  );
  if (
    alias &&
    member.officialSenatorId != null &&
    String(member.officialSenatorId) !== alias.officialSenatorId
  )
    return false;
  const officialId=member.officialSenatorId??alias?.officialSenatorId;
  if (officialId != null && /^\d+$/.test(office.trim()))
    return office.trim() === String(officialId);
  return (
    (!!name &&
      name.split("|").length >= 3 &&
      name.split("|").every((t) => key.split("|").includes(t))) ||
    (!!alias && key === senateFinancialNameKey(alias.publishedName))
  );
}
/** Returns original source key, only when both office and claimant are unique. */
export function resolveSenateFinancialOffice(
  member: SenateFinancialMember,
  offices: readonly string[],
  roster: readonly SenateFinancialMember[],
): string | null {
  const matches = offices.filter((o) => candidate(member, o));
  if (matches.length !== 1) return null;
  const claimants = roster.filter((m) => candidate(m, matches[0]));
  const canonical = (m: SenateFinancialMember) =>
    VERIFIED_SENATE_FINANCIAL_ALIASES.find(
      (a) => String(m.officialSenatorId ?? "") === a.officialSenatorId,
    )?.canonicalId ?? m.id;
  return claimants.length === 1 && canonical(claimants[0]) === canonical(member)
    ? matches[0]
    : null;
}
export function buildSenateFinancialOfficeIndex(
  roster: readonly SenateFinancialMember[],
  offices: readonly string[],
) {
  return new Map(
    roster.map((m) => [m.id, resolveSenateFinancialOffice(m, offices, roster)]),
  );
}

export function senateFinancialRecordOwner(
  name: string,
  roster: readonly SenateFinancialMember[],
): string | null {
  const offices = [name];
  const matches = roster.filter(
    (m) => resolveSenateFinancialOffice(m, offices, roster) !== null,
  );
  return matches.length === 1 ? matches[0].id : null;
}

export function buildSenateFinancialOwnerIndex(
  roster: readonly SenateFinancialMember[],
  sourceNames: readonly string[],
) {
  return new Map(
    [...new Set(sourceNames)].map((name) => [
      name,
      senateFinancialRecordOwner(name, roster),
    ]),
  );
}
