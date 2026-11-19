export function isValidVoteDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

/** La afiliación actual no acredita la de una votación anterior. */
export function partyAtVoteDate(person, date) {
  if (!isValidVoteDate(date)) return null;
  const matches = new Set((person?.militancias ?? [])
    .filter(entry => isValidVoteDate(entry.desde) && entry.desde <= date
      && (!entry.hasta || (isValidVoteDate(entry.hasta) && date <= entry.hasta))
      && typeof entry.partido_id === "string" && entry.partido_id.trim())
    .map(entry => entry.partido_id));
  return matches.size === 1 ? [...matches][0] : null;
}
