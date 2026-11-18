import { buildExpenseSubset, assertExpenseSubsetIntegrity, compactExpenseRecord, broadAllZeroPeriods, sanitizeExpenseSubsetForPublication } from "../expense-release.mjs";
import { isExpensePeriod, isExpenseSummaryItem } from "../../lib/expense-record-contract.mjs";

function identityFor(record, sourceId) {
  return String(sourceId === "gastos_camara" ? record.diputado_id ?? "" : record.nombre ?? "").replace(/\s+/g, " ").trim();
}

function groupKey(record, sourceId) { return JSON.stringify([record.periodo, identityFor(record, sourceId)]); }

function itemTotals(records) {
  const totals = new Map();
  for (const row of records.filter(row => !isExpenseSummaryItem(row.item))) {
    const item = totals.get(row.item) ?? { records: 0, knownTotal: 0, unknownAmounts: 0 };
    item.records += 1;
    item.knownTotal += row.monto_clp ?? 0;
    item.unknownAmounts += Number(row.monto_clp === null);
    if (!Number.isSafeInteger(item.knownTotal)) throw new Error("EXPENSE_TOTAL_OVERFLOW");
    totals.set(row.item, item);
  }
  return totals;
}

function compareMonthlyGroups(previous, incoming, sourceId) {
  const previousByGroup = Map.groupBy(previous, row => groupKey(row, sourceId));
  const incomingByGroup = Map.groupBy(incoming, row => groupKey(row, sourceId));
  const changes = [];
  for (const [key, beforeRows] of previousByGroup) {
    const afterRows = incomingByGroup.get(key) ?? [];
    const beforeItems = itemTotals(beforeRows);
    const afterItems = itemTotals(afterRows);
    const itemChanges = [...new Set([...beforeItems.keys(), ...afterItems.keys()])].sort().flatMap(item => {
      const before = beforeItems.get(item) ?? null;
      const after = afterItems.get(item) ?? null;
      return JSON.stringify(before) === JSON.stringify(after) ? [] : [{ item, before, after }];
    });
    const beforeTotal = auditExpenseGroups(beforeRows, sourceId)[0].observedTotal;
    const afterTotal = afterRows.length ? auditExpenseGroups(afterRows, sourceId)[0].observedTotal : null;
    if (itemChanges.length || beforeTotal !== afterTotal) changes.push({ period: beforeRows[0].periodo, identity: identityFor(beforeRows[0], sourceId), beforeTotal, afterTotal, itemChanges });
  }
  return changes;
}

export function auditExpenseGroups(records, sourceId) {
  const groups = new Map();
  for (const record of records) {
    const key = groupKey(record, sourceId);
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  }
  return [...groups.values()].map(rows => {
    const items = rows.filter(row => !isExpenseSummaryItem(row.item));
    const summaries = rows.filter(row => isExpenseSummaryItem(row.item));
    const knownItemsTotal = items.reduce((sum, row) => sum + (row.monto_clp ?? 0), 0);
    if (!Number.isSafeInteger(knownItemsTotal)) throw new Error("EXPENSE_TOTAL_OVERFLOW");
    const unknownAmounts = rows.filter(row => row.monto_clp === null).length;
    const unknownItemAmounts = items.filter(row => row.monto_clp === null).length;
    const sourceTotal = summaries.length === 1 ? summaries[0].monto_clp : null;
    const issues = [];
    if (unknownAmounts) issues.push("amount-not-informed");
    if (!items.length) issues.push("item-detail-not-incorporated");
    if (summaries.length > 1) issues.push("multiple-summary-rows");
    if (sourceTotal !== null && items.length && !unknownAmounts && sourceTotal !== knownItemsTotal) issues.push("source-total-differs-from-items");
    return {
      identity: identityFor(rows[0], sourceId), period: rows[0].periodo,
      records: rows.length, itemRecords: items.length, summaryRecords: summaries.length,
      unknownAmounts, unknownItemAmounts, knownItemsTotal, sourceTotal,
      observedTotal: items.length ? unknownItemAmounts ? null : knownItemsTotal : sourceTotal,
      issues,
    };
  }).sort((a, b) => a.period.localeCompare(b.period) || a.identity.localeCompare(b.identity));
}

/** Produces a reviewable local candidate; it never publishes or changes its inputs. */
export function prepareExpenseCandidate({ baseline, incoming, scope, generatedAt = new Date().toISOString() }) {
  const previous = assertExpenseSubsetIntegrity(baseline);
  const sourceId = baseline.sourceId;
  if (scope?.sourceId !== sourceId || scope.complete !== true || !Array.isArray(scope.periods) || !scope.periods.length
    || scope.periods.some(period => !isExpensePeriod(period)) || new Set(scope.periods).size !== scope.periods.length) throw new Error("EXPENSE_CANDIDATE_SCOPE_INVALID");
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("EXPENSE_CANDIDATE_TIMESTAMP_INVALID");
  if (!Array.isArray(incoming) || !incoming.length) throw new Error("EXPENSE_CANDIDATE_EMPTY");
  if (scope.identities !== undefined && (!Array.isArray(scope.identities) || !scope.identities.length
    || scope.identities.some(identity => typeof identity !== "string" || !identity.trim())
    || new Set(scope.identities).size !== scope.identities.length)) throw new Error("EXPENSE_CANDIDATE_IDENTITIES_INVALID");
  const inScope = row => scope.periods.includes(row.periodo) && (!scope.identities || scope.identities.includes(identityFor(row, sourceId)));
  const previousById = new Map(previous.map(row => [row.id, row]));
  const refreshed = incoming.map((row, index) => {
    const compact = compactExpenseRecord(row, sourceId);
    if (!compact) throw new Error(`EXPENSE_ROW_INVALID:${sourceId}:${index}`);
    const domain = sourceId === "gastos_camara" ? "camara.cl" : "senado.cl";
    let hostname;
    try { hostname = new URL(compact.url).hostname; } catch { throw new Error(`EXPENSE_CANDIDATE_SOURCE_URL_INVALID:${compact.id}`); }
    if (hostname !== domain && !hostname.endsWith(`.${domain}`)) throw new Error(`EXPENSE_CANDIDATE_SOURCE_URL_INVALID:${compact.id}`);
    if (!identityFor(compact, sourceId)) throw new Error(`EXPENSE_CANDIDATE_IDENTITY_MISSING:${compact.id}`);
    if (!inScope(compact)) throw new Error(`EXPENSE_CANDIDATE_ROW_OUTSIDE_SCOPE:${compact.id}`);
    const before = previousById.get(compact.id);
    if (before && (groupKey(before, sourceId) !== groupKey(compact, sourceId) || before.item !== compact.item)) throw new Error(`EXPENSE_CANDIDATE_ID_REASSIGNED:${compact.id}`);
    return compact;
  });
  const incomingIds = new Set(refreshed.map(row => row.id));
  if (incomingIds.size !== refreshed.length) throw new Error(`EXPENSE_DUPLICATE_ID:${sourceId}`);
  const scopedPrevious = previous.filter(inScope);
  const removedIds = scopedPrevious.filter(row => !incomingIds.has(row.id)).map(row => row.id);
  const amountChanges = refreshed.filter(row => previousById.has(row.id) && row.monto_clp !== previousById.get(row.id).monto_clp)
    .map(row => ({ id: row.id, before: previousById.get(row.id).monto_clp, after: row.monto_clp }));
  const candidate = buildExpenseSubset({ sourceId, generatedAt, records: [...previous.filter(row => !inScope(row)), ...refreshed] });
  const groups = auditExpenseGroups(refreshed, sourceId);
  const unverifiedZeroPeriods = [...broadAllZeroPeriods(sourceId, refreshed)].sort();
  for (const group of groups) {
    if (unverifiedZeroPeriods.includes(group.period)) {
      group.observedTotal = null;
      group.issues.push("source-zero-matrix-unverified");
    }
  }
  const monthlyChanges = compareMonthlyGroups(scopedPrevious, refreshed, sourceId);
  const observedGroups = new Set(refreshed.map(row => groupKey(row, sourceId)));
  const missingGroups = (scope.identities ?? []).flatMap(identity => scope.periods
    .filter(period => !observedGroups.has(JSON.stringify([period, identity])))
    .map(period => ({ identity, period })));
  const reasons = [];
  if (removedIds.length) reasons.push("published-records-missing-in-refreshed-scope");
  if (amountChanges.length) reasons.push("published-amounts-revised");
  if (monthlyChanges.length) reasons.push("published-monthly-items-revised");
  if (unverifiedZeroPeriods.length) reasons.push("source-zero-matrix-unverified");
  if (missingGroups.length) reasons.push("declared-authority-period-without-records");
  if (groups.some(group => group.issues.length)) reasons.push("monthly-totals-or-detail-require-review");
  return { candidate, review: {
    schemaVersion: 1, sourceId, generatedAt, status: reasons.length ? "requires-review" : "prepared",
    automaticPublication: false, sourceVerification: "not-performed-by-file-preparation",
    identityKind: sourceId === "gastos_camara" ? "official-deputy-id" : "published-name-not-identity-reconciliation",
    baselineChecksumSha256: baseline.checksumSha256, candidateChecksumSha256: candidate.checksumSha256,
    scope, previousRecords: previous.length, incomingRecords: refreshed.length, candidateRecords: candidate.recordCount,
    preservedOutsideScope: previous.filter(row => !inScope(row)).length, removedIds, amountChanges, monthlyChanges, missingGroups, unverifiedZeroPeriods, groups, reasons,
  } };
}

/** Decide locally before the runner can write operational data or publish. */
export function planCamaraExpensePublication({ baseline, incoming, generatedAt = new Date().toISOString() }) {
  const previous = assertExpenseSubsetIntegrity(baseline);
  if (baseline.sourceId !== "gastos_camara" || !Array.isArray(incoming) || !incoming.length) throw new Error("EXPENSE_LOCAL_EMPTY_EXTRACTION");
  const raw = buildExpenseSubset({ sourceId: "gastos_camara", records: incoming, generatedAt });
  const { subset: verified, excludedPeriods } = sanitizeExpenseSubsetForPublication(raw);
  const publishedPeriodsWithheld = excludedPeriods.filter(({ period }) => baseline.periods.includes(period));
  if (publishedPeriodsWithheld.length || !verified.records.length) return { shouldPublish: false, candidate: baseline,
    review: { status: "requires-review", automaticPublication: false, excludedPeriods, publishedPeriodsWithheld,
      reasons: [publishedPeriodsWithheld.length ? "published-period-became-unverified" : "no-verified-source-period"] } };
  const result = prepareExpenseCandidate({ baseline, incoming: verified.records,
    scope: { sourceId: "gastos_camara", complete: true, periods: verified.periods }, generatedAt });
  const unchanged = JSON.stringify(buildExpenseSubset({ sourceId: "gastos_camara", records: previous, generatedAt }).records) === JSON.stringify(result.candidate.records);
  return { ...result, shouldPublish: result.review.status === "prepared" && !unchanged,
    review: { ...result.review, status: unchanged && result.review.status === "prepared" ? "unchanged" : result.review.status, excludedPeriods } };
}
