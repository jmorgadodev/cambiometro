const MINIMUM_SUPPORTED_DATE = "2026-01-01";
const DEFAULT_RECORDS_API = "https://cambiometro.impulsacv.cl/api/v1/records";

function validPeriod(value) {
  return /^2026-(0[1-9]|1[0-2])$/.test(value);
}

function periodsBetween(from, to) {
  if (!validPeriod(from) || !validPeriod(to) || from > to) throw new Error("SENADO_STATIC_INVALID_PERIOD_RANGE");
  const periods = [];
  for (let [year, month] = from.split("-").map(Number); `${year}-${String(month).padStart(2, "0")}` <= to; month += 1) {
    if (month === 13) { year += 1; month = 1; }
    const period = `${year}-${String(month).padStart(2, "0")}`;
    if (period > to) break;
    periods.push(period);
  }
  return periods;
}

/** Reads only the verified 2026 Senate vote periods from the public R2-backed API. */
export async function fetchVerifiedSenadoVoteRecords({
  from = "2026-01",
  to = new Date().toISOString().slice(0, 7),
  apiUrl = DEFAULT_RECORDS_API,
  fetcher = fetch,
} = {}) {
  const periods = periodsBetween(from, to);
  const records = [];
  const completePeriods = [];
  for (const period of periods) {
    const pageRecords = [];
    let expectedTotal = null;
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page += 1) {
      const url = new URL(apiUrl);
      url.searchParams.set("source", "votaciones_senado");
      url.searchParams.set("kind", "vote");
      url.searchParams.set("period", period);
      url.searchParams.set("limit", "100");
      url.searchParams.set("page", String(page));
      const response = await fetcher(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`SENADO_STATIC_API_HTTP:${period}:${response.status}`);
      const payload = await response.json();
      const meta = payload?.meta;
      const total = Number(meta?.total);
      if (!Number.isSafeInteger(total) || total < 0) throw new Error(`SENADO_STATIC_INVALID_TOTAL:${period}`);
      if (page === 1 && total === 0 && meta?.sourceBackend === "none" && meta?.sourceStatus === "temporarily-unavailable") {
        expectedTotal = 0;
        totalPages = 0;
        break;
      }
      if (meta?.sourceBackend !== "r2-lake" || meta?.sourceStatus !== "complete"
        || Number(meta?.missingPartitions ?? 0) !== 0
        || (meta?.publishedRows !== undefined && Number(meta.publishedRows) !== total)
        || (meta?.expectedRows !== undefined && Number(meta.expectedRows) !== total)) {
        throw new Error(`SENADO_STATIC_PERIOD_NOT_COMPLETE:${period}`);
      }
      if (expectedTotal !== null && total !== expectedTotal) throw new Error(`SENADO_STATIC_TOTAL_CHANGED:${period}`);
      expectedTotal = total;
      totalPages = Number(meta.totalPages ?? 1);
      if (!Number.isSafeInteger(totalPages) || totalPages < 1 || totalPages > 10_000) {
        throw new Error(`SENADO_STATIC_INVALID_PAGE_COUNT:${period}`);
      }
      if (!Array.isArray(payload.data)) throw new Error(`SENADO_STATIC_INVALID_PAGE:${period}:${page}`);
      pageRecords.push(...payload.data);
    }
    if (expectedTotal === 0) continue;
    if (pageRecords.length !== expectedTotal) throw new Error(`SENADO_STATIC_ROW_COUNT_MISMATCH:${period}:${pageRecords.length}:${expectedTotal}`);
    for (const record of pageRecords) {
      if (record?.sourceId !== "votaciones_senado" || record?.kind !== "vote"
        || String(record?.data?.fecha ?? "").slice(0, 7) !== period) {
        throw new Error(`SENADO_STATIC_PERIOD_RECORD_MISMATCH:${period}`);
      }
    }
    records.push(...pageRecords);
    completePeriods.push({ period, recordCount: pageRecords.length });
  }
  if (completePeriods.length === 0 || records.length === 0) throw new Error("SENADO_STATIC_NO_COMPLETE_PERIODS");
  return { records, completePeriods };
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(candidate, reference) {
  const left = normalizeName(candidate);
  const right = normalizeName(reference);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const leftSurnames = left.split(" ").slice(-2);
  const rightSurnames = right.split(" ").slice(-2);
  return leftSurnames.length === 2
    && rightSurnames.length === 2
    && leftSurnames[0] === rightSurnames[0]
    && leftSurnames[1] === rightSurnames[1];
}

function findSenator(name, senators) {
  const roster = senators.filter((person) => /senador/i.test(String(person?.cargo ?? "")));
  const normalized = normalizeName(name);
  return roster.find((person) => normalizeName(person.nombre_completo) === normalized)
    ?? roster.find((person) => namesMatch(name, person.nombre_completo))
    ?? null;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Refreshes only Senate months whose records were verified from the canonical
 * R2 API. Unprovided months and every Cámara session remain untouched.
 */
export function mergeSenadoVotesIntoStaticSnapshot(snapshot, records, { senators = [], generatedAt = new Date().toISOString() } = {}) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)
    || !snapshot.sessions || typeof snapshot.sessions !== "object"
    || !snapshot.votes || typeof snapshot.votes !== "object") {
    throw new Error("SENADO_STATIC_INVALID_SNAPSHOT");
  }
  if (!Array.isArray(records) || records.length === 0) throw new Error("SENADO_STATIC_NO_VERIFIED_RECORDS");
  if (!Array.isArray(senators)) throw new Error("SENADO_STATIC_INVALID_ROSTER");

  const seenIds = new Set();
  const canonical = records.map((record) => {
    if (record?.sourceId !== "votaciones_senado" || record?.kind !== "vote") {
      throw new Error("SENADO_STATIC_INVALID_SOURCE");
    }
    const data = record.data;
    const id = String(data?.votacion_id ?? "").trim();
    const fecha = String(data?.fecha ?? "").trim();
    if (!/^\d+$/.test(id) || !validDate(fecha) || fecha < MINIMUM_SUPPORTED_DATE
      || (record.occurredAt && record.occurredAt.slice(0, 10) !== fecha)) {
      throw new Error(`SENADO_STATIC_RECORD_OUT_OF_SCOPE:${id || "sin-id"}`);
    }
    if (seenIds.has(id)) throw new Error(`SENADO_STATIC_DUPLICATE_ID:${id}`);
    seenIds.add(id);
    if (!Array.isArray(data.votos)) throw new Error(`SENADO_STATIC_MISSING_ROLLCALL:${id}`);

    const sessionId = `senado-vot-${id}`;
    return {
      period: fecha.slice(0, 7),
      sessionId,
      data,
    };
  });

  const next = structuredClone(snapshot);
  const replacedPeriods = [...new Set(canonical.map((item) => item.period))].sort();
  const replacedPeriodSet = new Set(replacedPeriods);
  const removedSessionIds = new Set(
    Object.entries(next.sessions)
      .filter(([sessionId, session]) => {
        const date = String(session?.fecha ?? "");
        const period = date.slice(0, 7);
        const isSenate = session?.fuente === "senado" || sessionId.startsWith("senado-vot-");
        return isSenate && replacedPeriodSet.has(period);
      })
      .map(([sessionId]) => sessionId),
  );

  for (const sessionId of removedSessionIds) delete next.sessions[sessionId];
  for (const [politicianId, entries] of Object.entries(next.votes)) {
    next.votes[politicianId] = Array.isArray(entries)
      ? entries.filter((entry) => !removedSessionIds.has(String(entry?.[0] ?? "")))
      : [];
  }

  let mappedVotes = 0;
  let unmatchedVotes = 0;
  for (const { sessionId, data } of canonical) {
    const mappedForSession = new Set();
    const sessionVotes = data.votos;
    const totals = (option) => sessionVotes.filter((item) => normalizeName(item?.opcion) === normalizeName(option)).length;
    next.sessions[sessionId] = {
      id: sessionId,
      nombre: data.descripcion || recordTitle(data, sessionId),
      fecha: data.fecha,
      periodo: data.fecha.slice(0, 7),
      descripcion: data.descripcion || data.nombre || recordTitle(data, sessionId),
      resultado: data.resultado || "En trámite",
      quorum: data.quorum || null,
      tipo: data.tipo || "Votación en sala",
      total_si: String(data.total_si ?? totals("Afirmativo")),
      total_no: String(data.total_no ?? totals("En Contra")),
      total_abstencion: String(data.total_abstencion ?? totals("Abstención")),
      total_dispensado: String(data.total_dispensado ?? totals("Dispensado")),
      boletin: data.boletin ?? null,
      url: data.url || data.fuente_url || null,
      url_tramitacion: data.url_tramitacion || null,
      fuente: "senado",
    };

    for (const vote of sessionVotes) {
      const politician = findSenator(vote?.nombre, senators);
      if (!politician) {
        unmatchedVotes += 1;
        continue;
      }
      if (mappedForSession.has(politician.id)) throw new Error(`SENADO_STATIC_DUPLICATE_ROLLCALL:${sessionId}:${politician.id}`);
      mappedForSession.add(politician.id);
      const entries = Array.isArray(next.votes[politician.id]) ? next.votes[politician.id] : [];
      entries.push([sessionId, String(vote.opcion || "No Vota")]);
      next.votes[politician.id] = entries;
      mappedVotes += 1;
    }
  }

  next.generatedAt = generatedAt;
  next.totalSessions = Object.keys(next.sessions).length;
  return {
    snapshot: next,
    replacedPeriods,
    replacedSessions: removedSessionIds.size,
    addedSessions: canonical.length,
    mappedVotes,
    unmatchedVotes,
    changed: stableJson({ sessions: snapshot.sessions, votes: snapshot.votes })
      !== stableJson({ sessions: next.sessions, votes: next.votes }),
  };
}

function recordTitle(data, sessionId) {
  const bulletin = data.boletin ? ` · Boletín N° ${data.boletin}` : "";
  return data.titulo || `Votación Senado ${sessionId.replace("senado-vot-", "")}${bulletin}`;
}
