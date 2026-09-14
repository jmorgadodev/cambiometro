const DEFAULT_AMOUNT_FIELDS = [
  "montoBruto",
  "monto_bruto",
  "bruto_mensual",
  "monto_clp",
  "monto",
  "amount",
];

const DEFAULT_ORGANIZATION_FIELDS = [
  "organismoNormalizado",
  "organismo_normalizado",
  "organismo",
  "organismoOriginal",
];

const DEFAULT_ROLE_FIELDS = [
  "cargoNormalizado",
  "cargo_normalizado",
  "cargo",
  "cargoOriginal",
];

function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function firstValue(record, fields) {
  for (const field of fields) {
    const value = record?.[field];
    if (value !== null && value !== undefined && text(value) !== "") return value;
  }
  return null;
}

function numericValue(record, fields) {
  const value = firstValue(record, fields);
  if (value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function recordKey(record, keyFields, periodIndex, recordIndex, keyResolver) {
  const resolved = typeof keyResolver === "function" ? normalized(keyResolver(record)) : "";
  if (resolved) return { key: resolved, quality: "explicit-resolver" };
  const parts = keyFields.map((field) => normalized(record?.[field]));
  if (parts.every(Boolean)) {
    return { key: parts.join("|"), quality: "explicit" };
  }
  const recordId = text(record?.recordId ?? record?.record_id ?? record?.id);
  if (recordId) {
    return {
      key: `record-id|${normalized(recordId)}`,
      quality: "fallback-record-id",
    };
  }
  return {
    key: `period-row|${periodIndex}|${recordIndex}`,
    quality: "fallback-period-row",
  };
}

function validatePeriod(period, index, keyFields, keyResolver) {
  if (!period || typeof period !== "object") throw new Error(`Historial R2: período ${index + 1} inválido`);
  if (!text(period.period)) throw new Error(`Historial R2: período ${index + 1} sin period`);
  if (!text(period.releaseId)) throw new Error(`Historial R2: ${period.period} sin releaseId`);
  if (!text(period.checksum)) throw new Error(`Historial R2: ${period.period} sin checksum`);
  if (!Array.isArray(period.records)) throw new Error(`Historial R2: ${period.period} sin records[]`);

  const seen = new Map();
  const rows = period.records.map((original, recordIndex) => {
    if (!original || typeof original !== "object" || Array.isArray(original)) {
      throw new Error(`Historial R2: ${period.period} contiene una fila inválida en ${recordIndex}`);
    }
    const identity = recordKey(original, keyFields, index, recordIndex, keyResolver);
    const previous = seen.get(identity.key);
    if (previous !== undefined) {
      throw new Error(`Historial R2: clave duplicada ${identity.key} en ${period.period} (filas ${previous} y ${recordIndex})`);
    }
    seen.set(identity.key, recordIndex);
    return {
      key: identity.key,
      keyQuality: identity.quality,
      original,
      amount: numericValue(original, DEFAULT_AMOUNT_FIELDS),
      organization: text(firstValue(original, DEFAULT_ORGANIZATION_FIELDS)),
      role: text(firstValue(original, DEFAULT_ROLE_FIELDS)),
    };
  });

  return {
    period: text(period.period),
    releaseId: text(period.releaseId),
    checksum: text(period.checksum),
    publishedAt: text(period.publishedAt) || null,
    rows,
  };
}

function comparePeriods(previous, current) {
  const previousByKey = new Map(previous.rows.map((row) => [row.key, row]));
  const currentByKey = new Map(current.rows.map((row) => [row.key, row]));
  const added = [];
  const removed = [];
  const amountChanges = [];
  const organizationChanges = [];

  for (const [key, row] of currentByKey) {
    const oldRow = previousByKey.get(key);
    if (!oldRow) {
      added.push({ key, period: current.period, original: row.original });
      continue;
    }
    if (oldRow.amount !== null && row.amount !== null && oldRow.amount !== row.amount) {
      amountChanges.push({
        key,
        period: current.period,
        previousPeriod: previous.period,
        amountBefore: oldRow.amount,
        amountAfter: row.amount,
        difference: row.amount - oldRow.amount,
        originalBefore: oldRow.original,
        originalAfter: row.original,
      });
    }
    if (oldRow.organization && row.organization && normalized(oldRow.organization) !== normalized(row.organization)) {
      organizationChanges.push({
        key,
        period: current.period,
        previousPeriod: previous.period,
        organizationBefore: oldRow.organization,
        organizationAfter: row.organization,
        originalBefore: oldRow.original,
        originalAfter: row.original,
      });
    }
  }

  for (const [key, row] of previousByKey) {
    if (!currentByKey.has(key)) removed.push({ key, period: current.period, original: row.original });
  }

  return {
    fromPeriod: previous.period,
    toPeriod: current.period,
    fromReleaseId: previous.releaseId,
    toReleaseId: current.releaseId,
    added,
    removed,
    amountChanges,
    organizationChanges,
  };
}

/**
 * Builds a reversible history from already paginated R2 releases.
 * It never reads R2/D1 and never mutates the supplied records.
 */
export function buildR2History(periods, options = {}) {
  if (!Array.isArray(periods) || periods.length === 0) throw new Error("Historial R2: se requiere al menos un período");
  const keyFields = Array.isArray(options.keyFields) && options.keyFields.length > 0
    ? options.keyFields
    : ["personKey"];
  const keyResolver = options.keyResolver;
  const normalizedPeriods = periods.map((period, index) => validatePeriod(period, index, keyFields, keyResolver));
  const comparisons = [];
  for (let index = 1; index < normalizedPeriods.length; index += 1) {
    comparisons.push(comparePeriods(normalizedPeriods[index - 1], normalizedPeriods[index]));
  }

  const historyByKey = {};
  for (const period of normalizedPeriods) {
    for (const row of period.rows) {
      historyByKey[row.key] ??= [];
      historyByKey[row.key].push({
        period: period.period,
        releaseId: period.releaseId,
        checksum: period.checksum,
        keyQuality: row.keyQuality,
        original: row.original,
      });
    }
  }

  return {
    keyFields: [...keyFields],
    periods: normalizedPeriods.map((period) => ({
      period: period.period,
      releaseId: period.releaseId,
      checksum: period.checksum,
      publishedAt: period.publishedAt,
      count: period.rows.length,
      fallbackKeys: period.rows.filter((row) => !row.keyQuality.startsWith("explicit")).length,
    })),
    comparisons,
    historyByKey,
  };
}

function manifestValue(manifest, ...fields) {
  for (const field of fields) {
    const value = manifest?.[field];
    if (value !== null && value !== undefined && text(value) !== "") return value;
  }
  return null;
}

function manifestPeriod(manifest) {
  const direct = text(manifestValue(manifest, "period", "mes", "sourcePeriod"));
  if (direct) return direct;
  const year = Number(manifestValue(manifest, "year"));
  const month = Number(manifestValue(manifest, "month"));
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12
    ? `${year}-${String(month).padStart(2, "0")}`
    : "";
}

function manifestReleaseId(manifest) {
  return text(manifestValue(manifest, "releaseId", "release_id", "version", "id"));
}

function manifestChecksum(manifest) {
  return text(manifestValue(
    manifest,
    "checksum",
    "checksum_sha256",
    "checksumSha256",
    "projectionChecksumSha256",
    "projectionUncompressedChecksumSha256",
  ));
}

/**
 * Reads only the pages declared by one R2 release manifest. This is intended
 * for a controlled build/audit process, never for a browser request.
 */
export async function readR2ReleasePages(manifest, readJson) {
  if (typeof readJson !== "function") throw new Error("Historial R2: readJson debe ser una función");
  const period = manifestPeriod(manifest);
  const releaseId = manifestReleaseId(manifest);
  const checksum = manifestChecksum(manifest);
  const pages = Array.isArray(manifest?.pages) ? manifest.pages : [];
  if (!period) throw new Error("Historial R2: manifiesto sin period");
  if (!releaseId) throw new Error(`Historial R2: ${period} sin releaseId/version`);
  if (!checksum) throw new Error(`Historial R2: ${period} sin checksum`);
  if (pages.length === 0) throw new Error(`Historial R2: ${period} sin páginas declaradas`);

  const orderedPages = [...pages].sort((left, right) => Number(left?.page ?? 0) - Number(right?.page ?? 0));
  const seenKeys = new Set();
  const loaded = await Promise.all(orderedPages.map(async (page, index) => {
    const key = text(page?.key ?? page?.path);
    if (!key) throw new Error(`Historial R2: ${period} página ${index + 1} sin key`);
    if (seenKeys.has(key)) throw new Error(`Historial R2: ${period} página duplicada ${key}`);
    seenKeys.add(key);
    const rows = await readJson(key);
    if (!Array.isArray(rows)) throw new Error(`Historial R2: ${period} página ilegible ${key}`);
    if (page?.count != null && Number(page.count) !== rows.length) {
      throw new Error(`Historial R2: ${period} conteo incorrecto en ${key}`);
    }
    return rows;
  }));
  const records = loaded.flat();
  if (manifest?.total != null && Number(manifest.total) !== records.length) {
    throw new Error(`Historial R2: ${period} total de manifiesto no coincide`);
  }
  return {
    period,
    releaseId,
    checksum,
    publishedAt: text(manifestValue(manifest, "publishedAt", "published_at", "generatedAt", "extraido_en")) || null,
    records,
  };
}

/** Reads JSONL/JSON artifacts declared by a physical R2 partition manifest. */
export async function readR2ReleaseArtifacts(manifest, readRecords) {
  if (typeof readRecords !== "function") throw new Error("Historial R2: readRecords debe ser una función");
  const period = manifestPeriod(manifest);
  const releaseId = manifestReleaseId(manifest);
  const checksum = manifestChecksum(manifest);
  const artifacts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  if (!period) throw new Error("Historial R2: manifiesto sin period/sourcePeriod");
  if (!releaseId) throw new Error(`Historial R2: ${period} sin releaseId/version/id`);
  if (!checksum) throw new Error(`Historial R2: ${period} sin checksum`);
  if (artifacts.length === 0) throw new Error(`Historial R2: ${period} sin artefactos declarados`);

  const seenKeys = new Set();
  const loaded = await Promise.all(artifacts.map(async (artifact, index) => {
    const key = text(artifact?.key ?? artifact?.path);
    if (!key) throw new Error(`Historial R2: artefacto ${index + 1} sin key`);
    if (seenKeys.has(key)) throw new Error(`Historial R2: artefacto duplicado ${key}`);
    seenKeys.add(key);
    const payload = await readRecords(key, artifact);
    const rows = Array.isArray(payload) ? payload : payload?.records;
    if (!Array.isArray(rows)) throw new Error(`Historial R2: artefacto ilegible ${key}`);
    const actualChecksum = Array.isArray(payload) ? null : text(payload?.checksumSha256 ?? payload?.checksum);
    if (artifact?.checksumSha256 && actualChecksum && artifact.checksumSha256 !== actualChecksum) {
      throw new Error(`Historial R2: checksum incorrecto en ${key}`);
    }
    if (artifact?.recordCount != null && Number(artifact.recordCount) !== rows.length) {
      throw new Error(`Historial R2: conteo incorrecto en ${key}`);
    }
    return rows;
  }));
  const records = loaded.flat();
  const expected = Number(manifest?.total ?? manifest?.recordCount ?? NaN);
  if (Number.isFinite(expected) && expected !== records.length) {
    throw new Error(`Historial R2: ${period} total de manifiesto no coincide`);
  }
  return {
    period,
    releaseId,
    checksum,
    publishedAt: text(manifestValue(manifest, "publishedAt", "published_at", "generatedAt", "extraido_en")) || null,
    records,
  };
}

/** Loads declared R2 pages for each release, then performs the pure comparison. */
export async function buildR2HistoryFromManifests(manifests, readJson, options = {}) {
  if (!Array.isArray(manifests) || manifests.length === 0) throw new Error("Historial R2: se requieren manifiestos");
  const readArtifact = typeof options.readArtifact === "function" ? options.readArtifact : readJson;
  const releases = await Promise.all(manifests.map((manifest) => {
    if (Array.isArray(manifest?.pages)) return readR2ReleasePages(manifest, readJson);
    if (Array.isArray(manifest?.artifacts)) return readR2ReleaseArtifacts(manifest, readArtifact);
    throw new Error(`Historial R2: manifiesto ${manifest?.id ?? manifest?.period ?? "desconocido"} sin pages[] ni artifacts[]`);
  }));
  return buildR2History(releases, options);
}
