import { createHash } from "node:crypto";

import { extractRscPrimitives, normalizeText, parseClp, validateV1, validateV2 } from "./audit-core.mjs";

const TOTAL_LABELS = new Set(["valor total", "total", "total gastos operacionales"]);

function isTotalRow(row) {
  return TOTAL_LABELS.has(normalizeText(row?.title ?? row?.category ?? row?.item));
}

export function analyzeOperationalExpenseGroup(records) {
  const totals = records.filter(isTotalRow);
  const items = records.filter((row) => !isTotalRow(row));
  const officialTotal = totals.length ? parseClp(totals.at(-1)?.monto_clp) ?? 0 : 0;
  const itemValues = items.map((row) => parseClp(row?.monto_clp) ?? 0);
  const itemSum = itemValues.reduce((sum, value) => sum + value, 0);
  const projectedVisibleTotal = records.reduce((sum, row) => sum + (parseClp(row?.monto_clp) ?? 0), 0);
  return {
    officialTotal,
    itemSum,
    projectedVisibleTotal,
    sourceIntegrity: validateV1({ officialTotal, items: itemValues }),
    publicationIntegrity: validateV1({ officialTotal, items: [projectedVisibleTotal] }),
    hasOfficialTotal: totals.length > 0,
    itemCount: items.length,
  };
}

export function analyzeSupportAssignment({ assignment, salaries }) {
  const validation = validateV2({ assignment, salaries });
  return { assignment: parseClp(assignment), salarySum: validation.salarySum, validation };
}

function hash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function selectRscValidationSample(rows) {
  const kaiser = rows.find((row) => row.id === "sen-038");
  if (!kaiser) throw new Error("AUDIT_KAISER_NOT_FOUND");
  const take = (role, count) => rows
    .filter((row) => row.cargo === role && row.id !== "sen-038")
    .map((row) => ({ row, hash: hash(row.id) }))
    .sort((left, right) => left.hash.localeCompare(right.hash) || left.row.id.localeCompare(right.row.id))
    .slice(0, count)
    .map(({ row }) => row);
  return [kaiser, ...take("Senador", 2), ...take("Diputado", 2)];
}

export function politicianSlug(name) {
  return normalizeText(name).replace(/\s+/g, "-");
}

function comparableTokens(value) {
  const tokens = new Set();
  const add = (candidate) => {
    const text = normalizeText(candidate);
    if (text) tokens.add(text);
    const amount = parseClp(candidate);
    if (amount !== null) tokens.add(`n:${amount}`);
  };
  if (Array.isArray(value)) for (const item of value) add(item);
  else add(value);
  return tokens;
}

function htmlText(html) {
  return String(html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ");
}

function containsExpected(haystack, expected) {
  const raw = String(haystack ?? "");
  if (typeof expected === "number") {
    const digits = raw.replace(/[^0-9]+/g, " ").split(/\s+/).filter(Boolean);
    const compact = raw.replace(/[^0-9]/g, "");
    return digits.includes(String(expected)) || compact.includes(String(expected));
  }
  return normalizeText(raw).includes(normalizeText(expected));
}

export function compareRscWithHtml({ rsc, html, expected }) {
  const primitives = extractRscPrimitives(rsc);
  const rscSurface = primitives.join(" ");
  const visible = htmlText(html);
  const checks = expected.map((value) => ({
    value,
    rsc: containsExpected(rscSurface, value),
    html: containsExpected(visible, value),
  }));
  return { ok: checks.every((check) => check.rsc && check.html), checks, rscTokenCount: comparableTokens(primitives).size };
}

export function reconcileRoster(official, published) {
  const remainingPublished = new Map(published.map((row) => [normalizeText(row.nombre_completo), row]));
  const matches = [];
  const unmatchedOfficial = [];
  for (const row of official) {
    const officialKey = normalizeText(row.name);
    let match = remainingPublished.get(officialKey);
    if (!match) {
      const officialTokens = new Set(officialKey.split(" "));
      const role = row.chamber === "senado" ? "Senador" : "Diputado";
      const candidates = [...remainingPublished.entries()]
        .filter(([, candidate]) => candidate.cargo === role)
        .map(([key, candidate]) => {
          const tokens = key.split(" ");
          const shared = tokens.filter((token) => officialTokens.has(token)).length;
          return { key, candidate, shared, ratio: shared / Math.max(tokens.length, officialTokens.size) };
        })
        .filter((candidate) => candidate.shared >= 2 && candidate.ratio >= 0.5)
        .sort((left, right) => right.ratio - left.ratio || right.shared - left.shared || left.key.localeCompare(right.key));
      if (candidates.length === 1 || (candidates[0] && candidates[0].ratio > (candidates[1]?.ratio ?? 0))) match = candidates[0].candidate;
    }
    if (!match) unmatchedOfficial.push(row);
    else {
      matches.push({ official: row, published: match });
      remainingPublished.delete(normalizeText(match.nombre_completo));
    }
  }
  return { matches, unmatchedOfficial, unmatchedPublished: [...remainingPublished.values()] };
}
