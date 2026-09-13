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

function periodOf(row) {
  const value = String(row.fuente_periodo ?? row.periodo ?? "").trim().slice(0, 7);
  return value || null;
}

function amountOf(row) {
  const raw = row.remuneracion_bruta_mensual;
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function personKeyOf(row) {
  const name = normalizeText(row.nombre_completo);
  const organism = normalizeText(row.organo_nombre ?? row.organo_id);
  const contract = normalizeText(row.tipo_contrato);
  return name ? `${name}|${organism}|${contract}` : null;
}

function basePersonKeyOf(row) {
  const name = normalizeText(row.nombre_completo);
  const contract = normalizeText(row.tipo_contrato);
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

    const contract = String(row.tipo_contrato ?? "").trim() || "No informado";
    contractCounts[contract] = (contractCounts[contract] ?? 0) + 1;
    const issues = Array.isArray(row.calidad_datos?.incidencias) ? row.calidad_datos.incidencias : [];
    if (issues.length > 0) recordsWithIssues += 1;
    for (const issue of issues) issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;

    const personKey = personKeyOf(row);
    const basePersonKey = basePersonKeyOf(row);
    addToSet(organismsByName, normalizeText(row.nombre_completo), normalizeText(row.organo_nombre ?? row.organo_id));
    if (periodStats) {
      periodStats.rows += 1;
      if (amount === null) periodStats.withoutAmount += 1;
      else {
        periodStats.withAmount += 1;
        periodStats.grossTotal += amount;
      }
      if (personKey) periodStats.people.add(personKey);
      const organism = normalizeText(row.organo_nombre ?? row.organo_id);
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
      addToSet(organismByPerson, `${basePersonKey}|${period}`, normalizeText(row.organo_nombre ?? row.organo_id));
      addToSet(roleByPerson, `${basePersonKey}|${period}`, normalizeText(row.cargo));
    }
  }

  const periodList = sortedPeriods(periods.keys());
  const monthly = periodList.map((period, index) => {
    const current = periods.get(period);
    const previousPeriod = periodList[index - 1] ?? null;
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
    return {
      period,
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
