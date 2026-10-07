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
