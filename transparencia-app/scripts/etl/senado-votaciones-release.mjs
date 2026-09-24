import { fetchVotacionesSenado } from "./connectors/senado-votaciones.mjs";

const LEGISLATURE_WINDOWS = [
  { legislatura: 373, from: "2026-01-01", to: "2026-03-10" },
  { legislatura: 374, from: "2026-03-11", to: "9999-12-31" },
];

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function senateVoteRangesByLegislature(from, to) {
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) throw new Error("SENADO_VOTES_INVALID_DATE_RANGE");
  if (from < "2026-01-01") throw new Error("SENADO_VOTES_RANGE_BEFORE_2026");

  return LEGISLATURE_WINDOWS.flatMap((window) => {
    const start = from > window.from ? from : window.from;
    const end = to < window.to ? to : window.to;
    return start <= end ? [{ legislatura: window.legislatura, from: start, to: end }] : [];
  });
}

export function existingSenateVoteIdsFromProjection(projection) {
  const votesByPerson = projection?.votes;
  if (!votesByPerson || typeof votesByPerson !== "object" || Array.isArray(votesByPerson)) return [];

  const ids = new Set();
  for (const [personId, personVotes] of Object.entries(votesByPerson)) {
    if (!String(personId).startsWith("sen-")) continue;
    if (!Array.isArray(personVotes)) continue;
    for (const entry of personVotes) {
      const rawId = Array.isArray(entry) ? entry[0] : entry?.id;
      const match = String(rawId ?? "").match(/^(?:senado-vot-)?(\d+)$/);
      if (match) ids.add(match[1]);
    }
  }
  return [...ids];
}

export async function fetchSenateVotesByDateRange({ from, to, existingVoteIds = [], fetcher = fetchVotacionesSenado }) {
  const ranges = senateVoteRangesByLegislature(from, to);
  const batches = await Promise.all(ranges.map(({ legislatura, from: desde, to: through }) =>
    fetcher({ legislatura, desde, to: through, existingVoteIds }),
  ));
  const byId = new Map();
  for (const row of batches.flat()) {
    const id = String(row?.votacion_id ?? "");
    if (!/^\d+$/.test(id) || !row.fecha || row.fecha < from || row.fecha > to) {
      throw new Error("SENADO_VOTES_INVALID_RANGE_RESULT");
    }
    if (byId.has(id)) throw new Error(`SENADO_VOTES_DUPLICATE_ID:${id}`);
    byId.set(id, row);
  }
  return [...byId.values()].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || Number(a.votacion_id) - Number(b.votacion_id),
  );
}

export function assertSenateVotePeriodPreserved({ period, catalog, stagedIds, currentMeta, currentIds }) {
  const wasPublished = (catalog?.partitions ?? []).some((partition) =>
    partition.sourceId === "votaciones_senado" && partition.period === period,
  );
  const ids = new Set((stagedIds ?? []).map(String));
  const current = (currentIds ?? []).map(String);
  const total = Number(currentMeta?.total ?? 0);

  if (!wasPublished) {
    if (total !== 0 || current.length !== 0 || currentMeta?.sourceBackend !== "none"
      || currentMeta?.sourceStatus !== "temporarily-unavailable") {
      throw new Error(`SENADO_REPAIR_NEW_PERIOD_UNEXPECTED_API_STATE:${period}`);
    }
    return { period, previouslyPublished: false, existingRecords: 0, stagedRecords: ids.size, preserved: true };
  }

  if (currentMeta?.sourceBackend !== "r2-lake" || currentMeta?.sourceStatus !== "complete"
    || Number(currentMeta?.missingPartitions ?? 0) !== 0 || total !== current.length) {
    throw new Error(`SENADO_REPAIR_EXISTING_NOT_COMPLETE:${period}`);
  }
  const missing = current.filter((id) => !ids.has(id));
  if (missing.length) throw new Error(`SENADO_REPAIR_EXISTING_VOTE_DROPPED:${period}:${missing.join(",")}`);
  return { period, previouslyPublished: true, existingRecords: current.length, stagedRecords: ids.size, preserved: true };
}
