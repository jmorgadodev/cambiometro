function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSignature(name) {
  const tokens = normalizeName(name).split(" ").filter(Boolean);
  if (tokens.length < 3) return null;
  return `${tokens[0]}|${tokens.at(-2)}|${tokens.at(-1)}`;
}

function isLegislativeEntity(entity) {
  return entity?.kind === "person"
    && (/^person-(camara|senado)-/.test(String(entity.id))
      || entity.sourceIds?.some((sourceId) => sourceId === "camara" || sourceId === "senado"));
}

function sourceIdForAlias(entity) {
  return entity.sourceIds?.find((sourceId) => sourceId !== "camara" && sourceId !== "senado")
    ?? String(entity.id).match(/^person-([a-z0-9-]+?)-/)?.[1]
    ?? "unknown";
}

/**
 * Reconciliation deliberately favors false negatives over false positives.
 * A match needs first given name plus both surnames and uniqueness on each side.
 */
export function reconcilePersonAliases(entities) {
  const people = entities.filter((entity) => entity?.kind === "person" && entity?.id && entity?.name);
  const canonicals = people.filter(isLegislativeEntity);
  const aliases = people.filter((entity) => !isLegislativeEntity(entity));
  const canonicalBySignature = new Map();
  const aliasesBySourceAndSignature = new Map();

  for (const entity of canonicals) {
    const signature = nameSignature(entity.name);
    if (!signature) continue;
    const group = canonicalBySignature.get(signature) ?? [];
    group.push(entity);
    canonicalBySignature.set(signature, group);
  }
  for (const entity of aliases) {
    const signature = nameSignature(entity.name);
    if (!signature) continue;
    const sourceId = sourceIdForAlias(entity);
    const key = `${sourceId}|${signature}`;
    const group = aliasesBySourceAndSignature.get(key) ?? [];
    group.push(entity);
    aliasesBySourceAndSignature.set(key, group);
  }

  const reconciled = [];
  for (const [key, candidates] of aliasesBySourceAndSignature) {
    if (candidates.length !== 1) continue;
    const separator = key.indexOf("|");
    const sourceId = key.slice(0, separator);
    const signature = key.slice(separator + 1);
    const matchingCanonicals = canonicalBySignature.get(signature) ?? [];
    if (matchingCanonicals.length !== 1) continue;
    const alias = candidates[0];
    const canonical = matchingCanonicals[0];
    reconciled.push({
      canonicalId: canonical.id,
      aliasId: alias.id,
      sourceId,
      method: "unique_first_name_and_two_surnames",
      confidence: 0.99,
      evidence: {
        canonicalName: canonical.name,
        aliasName: alias.name,
        canonicalIdentifiers: canonical.identifiers ?? [],
        aliasIdentifiers: alias.identifiers ?? [],
      },
    });
  }
  return reconciled.sort((left, right) => left.aliasId.localeCompare(right.aliasId));
}

export const __test = { normalizeName, nameSignature };
