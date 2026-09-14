import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PERSONAL_SCOPES = new Set(["personal"]);

function integerOrNull(value) {
  return Number.isSafeInteger(value) ? value : null;
}

function healthForSource(sourceId, health) {
  if (sourceId === "transparencia-activa") return health.cplt ?? null;
  return health[sourceId] ?? null;
}

export function buildNormalizationSourceAudit({ qualitySources, sourceHealth, now = new Date() }) {
  return qualitySources.map((source) => {
    const health = healthForSource(source.id, sourceHealth);
    const canonicalCount = integerOrNull(source.canonicalCount);
    const historicalCount = integerOrNull(source.historicalCount);
    const queryableCount = integerOrNull(source.queryableCount);
    const flags = [];

    if (canonicalCount !== null && historicalCount !== null && canonicalCount > historicalCount) {
      flags.push("canonical_may_exceed_historical");
    }
    if (canonicalCount !== null && queryableCount !== null && canonicalCount !== queryableCount) {
      flags.push("canonical_differs_from_queryable");
    }
    if (queryableCount === null) flags.push("queryable_count_not_declared");
    if (source.derived) flags.push("derived_source");
    if (source.scope === "personal") flags.push("personal_normalization_required");
    if (health?.status === "partial") flags.push("source_partial");

    const generatedAt = health?.generatedAt ?? null;
    const ageDays = generatedAt
      ? Math.max(0, (now.getTime() - new Date(generatedAt).getTime()) / 86_400_000)
      : null;
    if (ageDays !== null && ageDays > 30) flags.push("metadata_older_than_30_days");

    return {
      id: source.id,
      label: source.label,
      scope: source.scope ?? "unknown",
      derived: source.derived === true,
      normalizationContract: PERSONAL_SCOPES.has(source.scope)
        ? "funcionarios-v1"
        : "domain-specific-pending",
      originalValuePolicy: PERSONAL_SCOPES.has(source.scope)
        ? "preserve-original-and-annotate"
        : "not-applicable-until-domain-contract",
      canonicalCount,
      historicalCount,
      queryableCount,
      healthCount: integerOrNull(health?.recordCount),
      healthGeneratedAt: generatedAt,
      flags: [...new Set(flags)].sort(),
    };
  });
}

export function readNormalizationInputs(root = process.cwd()) {
  const qualitySources = JSON.parse(readFileSync(resolve(root, "data/data-quality-sources.json"), "utf8"));
  const sourceHealth = JSON.parse(readFileSync(resolve(root, "data/etl/source-health.json"), "utf8")).sources ?? {};
  return { qualitySources, sourceHealth };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const report = buildNormalizationSourceAudit(readNormalizationInputs());
  process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), sources: report }, null, 2)}\n`);
}
