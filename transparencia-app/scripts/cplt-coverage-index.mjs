const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Builds a small audit index from the compact rows already held by the CPLT
 * publisher. It deliberately stores aggregates, not names or full records.
 * The source projections remain the audit authority.
 */
export function buildCpltCoverageIndex(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const byOrganismPeriod = new Map();
  let invalidPeriodRows = 0;

  for (const row of sourceRows) {
    const period = text(row?.p);
    if (!PERIOD_PATTERN.test(period)) {
      invalidPeriodRows += 1;
      continue;
    }

    const organismId = text(row?.oid, "sin-organismo");
    const key = `${organismId}\u0000${period}`;
    const current = byOrganismPeriod.get(key) ?? {
      organismId,
      organismName: text(row?.o, organismId),
      organismType: text(row?.ot, "sin-clasificar"),
      period,
      records: 0,
      recordsWithAmount: 0,
      zeroAmount: 0,
      amountNotClassified: 0,
      qualityIssueRows: 0,
      grossTotal: 0,
      contractCounts: {},
    };

    current.records += 1;
    const gross = amount(row?.b);
    if (gross === null) current.amountNotClassified += 1;
    else if (gross > 0) {
      current.recordsWithAmount += 1;
      current.grossTotal += gross;
    } else if (gross === 0) current.zeroAmount += 1;
    else current.amountNotClassified += 1;

    if (Array.isArray(row?.q) && row.q.length > 0) current.qualityIssueRows += 1;

    const contract = text(row?.t, "sin-informar");
    current.contractCounts[contract] = (current.contractCounts[contract] ?? 0) + 1;
    byOrganismPeriod.set(key, current);
  }

  const entries = [...byOrganismPeriod.values()]
    .map((entry) => ({
      ...entry,
      grossTotal: Math.round(entry.grossTotal * 100) / 100,
      contractCounts: Object.fromEntries(Object.entries(entry.contractCounts).sort(([left], [right]) => left.localeCompare(right, "es-CL"))),
    }))
    .sort((left, right) => left.organismId.localeCompare(right.organismId, "es-CL") || left.period.localeCompare(right.period));

  return {
    schemaVersion: 1,
    dataset: "transparencia-activa-funcionarios",
    totalRows: sourceRows.length,
    indexedRows: sourceRows.length - invalidPeriodRows,
    invalidPeriodRows,
    entries,
  };
}
