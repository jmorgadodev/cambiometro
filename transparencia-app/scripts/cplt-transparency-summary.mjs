const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isPlausiblePeriod(period, generatedAt) {
  if (!PERIOD_PATTERN.test(period)) return false;
  const year = Number(String(period).slice(0, 4));
  if (year < 2000 || year > 2100) return false;
  const releasePeriod = String(generatedAt ?? "").slice(0, 7);
  return !PERIOD_PATTERN.test(releasePeriod) || period <= releasePeriod;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fieldOf(row, fullName, compactName) {
  if (row && Object.prototype.hasOwnProperty.call(row, fullName)) return row[fullName];
  return row?.[compactName];
}

function periodOf(row) {
  const value = String(fieldOf(row, "fuente_periodo", "p") ?? fieldOf(row, "periodo", "p") ?? "").trim().slice(0, 7);
  return value || null;
}

function amountOf(row) {
  const raw = fieldOf(row, "remuneracion_bruta_mensual", "b");
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function personKeyOf(row) {
  const name = normalizeText(fieldOf(row, "nombre_completo", "n"));
  const organism = normalizeText(fieldOf(row, "organo_nombre", "o") ?? row.organo_id ?? row.oid);
  const contract = normalizeText(fieldOf(row, "tipo_contrato", "t"));
  return name ? `${name}|${organism}|${contract}` : null;
}

function basePersonKeyOf(row) {
  const name = normalizeText(fieldOf(row, "nombre_completo", "n"));
  const contract = normalizeText(fieldOf(row, "tipo_contrato", "t"));
  return name ? `${name}|${contract}` : null;
}

function addToSet(map, key, value) {
  if (!key || !value) return;
  const values = map.get(key) ?? new Set();
  values.add(value);
  map.set(key, values);
}

function sortedPeriods(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function classifyPeriod(current, previous) {
  if (!previous) {
    return { status: "linea_base", reason: "No existe un corte anterior comparable." };
  }
  const rowsDroppedAbruptly = previous.rows >= 1_000 && current.rows < previous.rows * 0.25;
  const organismsDroppedAbruptly = previous.organisms.size >= 50 && current.organisms.size < previous.organisms.size * 0.25;
  if (rowsDroppedAbruptly || organismsDroppedAbruptly) {
    return {
      status: "parcial",
      reason: "La caída abrupta de filas u organismos indica una publicación posiblemente incompleta; requiere confirmación en la fuente oficial.",
    };
  }
  return { status: "comparable", reason: "No se detectó una caída abrupta frente al corte anterior." };
}

function coverageSummaryOf(coverage) {
  const coverageRows = Array.isArray(coverage) ? coverage : [];
  return {
    total: coverageRows.length,
    available: coverageRows.filter((item) => item.status === "available").length,
    unavailable: coverageRows.filter((item) => item.status === "unavailable").length,
    notApplicable: coverageRows.filter((item) => item.status === "not_applicable").length,
    unavailableItems: coverageRows
      .filter((item) => item.status !== "available")
      .map((item) => ({
        communeId: item.communeId,
        name: item.name ?? item.communeId,
        cut: item.cut ?? null,
        status: item.status,
        reason: item.status === "not_applicable"
          ? "Territorio no aplicable como nómina municipal independiente."
          : "La fuente no publicó una nómina disponible para este corte.",
      })),
  };
}

/**
 * Builds a small, aggregate-only view of the CPLT payroll release.
 * It deliberately contains no names, RUTs or individual rows: those remain
 * in the original R2 release and are queried through the indexed API.
 */
export function buildCpltTransparencySummary(rows, coverage, generatedAt) {
  const periods = new Map();
  const peopleByPeriod = new Map();
  const salaryByPerson = new Map();
  const organismByPerson = new Map();
  const roleByPerson = new Map();
  const organismsByName = new Map();
  const issueCounts = {};
  const contractCounts = {};
  let invalidPeriodCount = 0;
  let positiveAmountCount = 0;
  let zeroAmountCount = 0;
  let missingAmountCount = 0;
  let recordsWithIssues = 0;

  for (const row of rows ?? []) {
    const period = periodOf(row);
    const validPeriod = isPlausiblePeriod(period, generatedAt);
    if (!validPeriod) invalidPeriodCount += 1;
    const amount = amountOf(row);
    const periodStats = validPeriod
      ? periods.get(period) ?? {
        period,
        rows: 0,
        withAmount: 0,
        withoutAmount: 0,
        grossTotal: 0,
        averageGross: null,
        people: new Set(),
        organisms: new Set(),
        contracts: {},
      }
      : null;

    if (amount === null) missingAmountCount += 1;
    else if (amount === 0) zeroAmountCount += 1;
    else positiveAmountCount += 1;

    const contract = String(fieldOf(row, "tipo_contrato", "t") ?? "").trim() || "No informado";
    contractCounts[contract] = (contractCounts[contract] ?? 0) + 1;
    const issues = Array.isArray(row.calidad_datos?.incidencias)
      ? row.calidad_datos.incidencias
      : Array.isArray(row.q) ? row.q : [];
    if (issues.length > 0) recordsWithIssues += 1;
    for (const issue of issues) issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;

    const personKey = personKeyOf(row);
    const basePersonKey = basePersonKeyOf(row);
    const name = fieldOf(row, "nombre_completo", "n");
    const organismName = fieldOf(row, "organo_nombre", "o") ?? row.organo_id ?? row.oid;
    addToSet(organismsByName, normalizeText(name), normalizeText(organismName));
    if (periodStats) {
      periodStats.rows += 1;
      if (amount === null) periodStats.withoutAmount += 1;
      else {
        periodStats.withAmount += 1;
        periodStats.grossTotal += amount;
      }
      if (personKey) periodStats.people.add(personKey);
      const organism = normalizeText(organismName);
      if (organism) periodStats.organisms.add(organism);
      periodStats.contracts[contract] = (periodStats.contracts[contract] ?? 0) + 1;
      periods.set(period, periodStats);
    }

    if (personKey && basePersonKey && validPeriod) {
      const periodPeople = peopleByPeriod.get(period) ?? new Set();
      periodPeople.add(personKey);
      peopleByPeriod.set(period, periodPeople);
      const salaryPeriods = salaryByPerson.get(basePersonKey) ?? new Map();
      if (!salaryPeriods.has(period)) salaryPeriods.set(period, amount);
      salaryByPerson.set(basePersonKey, salaryPeriods);
      addToSet(organismByPerson, `${basePersonKey}|${period}`, normalizeText(organismName));
      addToSet(roleByPerson, `${basePersonKey}|${period}`, normalizeText(fieldOf(row, "cargo", "c")));
    }
  }

  const periodList = sortedPeriods(periods.keys());
  const monthly = periodList.map((period, index) => {
    const current = periods.get(period);
    const previousPeriod = periodList[index - 1] ?? null;
    const previous = previousPeriod ? periods.get(previousPeriod) : null;
    const currentPeople = peopleByPeriod.get(period) ?? new Set();
    const previousPeople = previousPeriod ? peopleByPeriod.get(previousPeriod) ?? new Set() : new Set();
    const newRecords = [...currentPeople].filter((key) => !previousPeople.has(key)).length;
    const removedRecords = [...previousPeople].filter((key) => !currentPeople.has(key)).length;
    let amountChanges = 0;
    let amountDelta = 0;
    let organismChanges = 0;
    let roleChanges = 0;
    if (previousPeriod) {
      for (const [personKey, salaryPeriods] of salaryByPerson) {
        const before = salaryPeriods.get(previousPeriod);
        const after = salaryPeriods.get(period);
        if (before !== undefined && after !== undefined && before !== after && before !== null && after !== null) {
          amountChanges += 1;
          amountDelta += after - before;
        }
        const previousOrganisms = organismByPerson.get(`${personKey}|${previousPeriod}`) ?? new Set();
        const currentOrganisms = organismByPerson.get(`${personKey}|${period}`) ?? new Set();
        if (previousOrganisms.size > 0 && currentOrganisms.size > 0
          && [...previousOrganisms].some((value) => !currentOrganisms.has(value))) organismChanges += 1;
        const previousRoles = roleByPerson.get(`${personKey}|${previousPeriod}`) ?? new Set();
        const currentRoles = roleByPerson.get(`${personKey}|${period}`) ?? new Set();
        if (previousRoles.size > 0 && currentRoles.size > 0
          && [...previousRoles].some((value) => !currentRoles.has(value))) roleChanges += 1;
      }
    }
    const rowsInPeriod = current?.rows ?? 0;
    const periodClassification = classifyPeriod(current ?? { rows: 0, organisms: new Set() }, previous);
    return {
      period,
      status: periodClassification.status,
      statusReason: periodClassification.reason,
      rows: rowsInPeriod,
      people: current?.people.size ?? 0,
      organisms: current?.organisms.size ?? 0,
      withAmount: current?.withAmount ?? 0,
      withoutAmount: current?.withoutAmount ?? 0,
      grossTotal: current?.grossTotal ?? 0,
      averageGross: current?.withAmount ? Math.round((current.grossTotal / current.withAmount) * 100) / 100 : null,
      newRecords,
      removedRecords,
      amountChanges,
      amountDelta,
      organismChanges,
      roleChanges,
      contracts: current?.contracts ?? {},
    };
  });

  const coverageSummary = coverageSummaryOf(coverage);

  const multiOrganismPeople = [...organismsByName.values()].filter((organisms) => organisms.size > 1).length;

  return {
    schemaVersion: 1,
    dataset: "transparencia-activa-funcionarios-summary",
    comparisonsAvailable: true,
    generatedAt,
    recordCount: rows?.length ?? 0,
    periods: monthly,
    coverage: coverageSummary,
    quality: {
      recordsWithIssues,
      byIssue: issueCounts,
      invalidPeriodCount,
      amountStates: {
        positive: positiveAmountCount,
        zero: zeroAmountCount,
        notPublished: missingAmountCount,
      },
    },
    contractCounts,
    latestPeriod: periodList.at(-1) ?? null,
    latestPeriodStatus: monthly.at(-1)?.status ?? null,
    latestPeriodStatusReason: monthly.at(-1)?.statusReason ?? null,
    multiOrganismPeople,
    notes: [
      "Las altas y bajas son cambios de presencia entre cortes publicados; no equivalen por sí solos a contrataciones o despidos.",
      "Los cambios de monto comparan remuneraciones brutas publicadas para una misma combinación normalizada de nombre y tipo de contrato; los cambios de organismo se cuentan por separado.",
      "Los registros originales y sus valores publicados permanecen separados en la fuente consultable.",
    ],
  };
}

/**
 * Fallback used only when an older R2 release predates the precomputed
 * summary. It is intentionally aggregate-only and does not retain person
 * keys, so Pages stays fast and memory-bounded. Historical deltas are marked
 * unavailable until the next CPLT publication generates the full summary.
 */
export function buildCpltAggregateSummary(stats, coverage, generatedAt) {
  const periodList = sortedPeriods(stats.periods?.keys?.() ?? []);
  const periods = periodList.map((period) => {
    const current = stats.periods.get(period);
    return {
      period,
      rows: current.rows,
      people: null,
      organisms: current.organisms.size,
      withAmount: current.withAmount,
      withoutAmount: current.withoutAmount,
      grossTotal: current.grossTotal,
      averageGross: current.withAmount ? Math.round((current.grossTotal / current.withAmount) * 100) / 100 : null,
      newRecords: null,
      removedRecords: null,
      amountChanges: null,
      amountDelta: null,
      organismChanges: null,
      roleChanges: null,
      contracts: current.contracts,
    };
  });
  return {
    schemaVersion: 1,
    dataset: "transparencia-activa-funcionarios-summary",
    comparisonsAvailable: false,
    generatedAt,
    recordCount: stats.recordCount,
    periods,
    coverage: coverageSummaryOf(coverage),
    quality: {
      recordsWithIssues: stats.recordsWithIssues,
      byIssue: stats.issueCounts,
      invalidPeriodCount: stats.invalidPeriodCount,
      amountStates: {
        positive: stats.positiveAmountCount,
        zero: stats.zeroAmountCount,
        notPublished: stats.missingAmountCount,
      },
    },
    contractCounts: stats.contractCounts,
    latestPeriod: periodList.at(-1) ?? null,
    multiOrganismPeople: null,
    notes: [
      "Este resumen se calculó durante el build desde un release R2 anterior que no tenía agregados precomputados.",
      "Las altas, bajas y cambios de monto aparecerán cuando el próximo release CPLT publique el resumen histórico completo.",
      "Los registros originales y sus valores publicados permanecen separados en la fuente consultable.",
    ],
  };
}

export { PERIOD_PATTERN };
