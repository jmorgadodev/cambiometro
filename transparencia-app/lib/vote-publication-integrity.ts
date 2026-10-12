/** Guarda de presentación; nunca corrige ni publica los registros de origen. */
interface NominalSource {
  sessions: Record<string, { total_si?: string | number | null; total_no?: string | number | null; total_abstencion?: string | number | null }>;
  votes: Record<string, [string, string][]>;
}

export function unreconciledNominalSessions(source: NominalSource): Set<string> {
  const review = new Set<string>();
  const tallies = new Map<string, Record<string, number>>();
  for (const rows of Object.values(source.votes)) {
    const seen = new Set<string>();
    for (const [id, option] of rows) {
      if (seen.has(id)) { review.add(id); continue; }
      seen.add(id);
      const tally = tallies.get(id) ?? {};
      tally[option] = (tally[option] ?? 0) + 1;
      tallies.set(id, tally);
      if (!source.sessions[id]) review.add(id);
    }
  }
  for (const [id, session] of Object.entries(source.sessions)) {
    const tally = tallies.get(id);
    for (const [field, option] of [["total_si", "Afirmativo"], ["total_no", "En Contra"], ["total_abstencion", "Abstención"]] as const) {
      const value = session[field];
      const count = Number(value);
      if (!tally || value === null || value === undefined || value === "" || !Number.isSafeInteger(count) || count < 0 || count !== (tally[option] ?? 0)) review.add(id);
    }
  }
  return review;
}

export function summarizeVerifiedNominalVotes(options: readonly (string | null | undefined)[]) {
  const excludedRecords = options.filter((option) => option?.trim().toLowerCase() === "en revisión").length;
  const verifiedOptions = options.filter((option) => option?.trim().toLowerCase() !== "en revisión");
  const presentOptions = verifiedOptions.filter((option) => {
    const normalized = option?.trim().toLowerCase() ?? "";
    return !["dispensado", "pareo", "ausente", "sin registro"].includes(normalized);
  });
  const emitted = presentOptions.filter((option) => {
    const normalized = option?.trim().toLowerCase() ?? "";
    return normalized.includes("favor") || normalized.includes("contra") || normalized.includes("afirmativo") || normalized.includes("absten");
  }).length;
  const noVote = presentOptions.filter((option) => ["no vota", "sin emitir", "no emite"].includes(option?.trim().toLowerCase() ?? "")).length;

  return {
    verifiedRecords: verifiedOptions.length,
    excludedRecords,
    present: presentOptions.length,
    emitted,
    noVote,
    pctEmitted: presentOptions.length > 0 ? Math.min(100, Math.round((emitted / presentOptions.length) * 100)) : null,
  };
}
