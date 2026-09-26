export interface PersonSearchEvidence {
  id: string;
  name: string;
  kind: string;
  url: string;
  organization?: string;
  role?: string;
  period?: string | null;
  amount?: number | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  officialPersonId?: string | null;
  sourceId?: string | null;
}

export interface PersonSearchGroup {
  key: string;
  name: string;
  kind: string;
  url: string;
  evidence: PersonSearchEvidence[];
  identityConfidence: "official" | "source-scoped";
}

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
}

function normalizedNameTokens(value: string) {
  return normalizeName(value).split(/[^a-z0-9]+/).filter(Boolean).sort().join(" ");
}

/**
 * Only canonical IDs may join evidence across sources. Name-only rows remain
 * scoped to source and organization so a homonym is never presented as one
 * verified person.
 */
export function groupPersonSearchEvidence(rows: PersonSearchEvidence[]): PersonSearchGroup[] {
  const groups = new Map<string, PersonSearchGroup>();
  for (const row of rows) {
    const officialId = row.officialPersonId?.trim();
    const key = officialId
      ? `official:${officialId}`
      : `source:${row.sourceId ?? row.kind}:${normalizedNameTokens(row.name)}:${normalizeName(row.organization ?? "")}`;
    const current = groups.get(key);
    if (current) {
      current.evidence.push(row);
      continue;
    }
    groups.set(key, {
      key,
      name: row.name,
      kind: row.kind,
      url: row.url,
      evidence: [row],
      identityConfidence: officialId ? "official" : "source-scoped",
    });
  }
  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, "es-CL"));
}

export function personSearchPage<T>(rows: T[], page: number, pageSize = 15) {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(rows.length / safeSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    items: rows.slice(start, start + safeSize),
    page: safePage,
    start,
    end: Math.min(start + safeSize, rows.length),
    total: rows.length,
    totalPages,
  };
}
