export interface R2RemunerationHistoryRow {
  id?: unknown;
  nombre_completo?: unknown;
  nombre?: unknown;
  organo_nombre?: unknown;
  organo_id?: unknown;
  cargo?: unknown;
  tipo_contrato?: unknown;
  periodo?: unknown;
  fuente_periodo?: unknown;
  remuneracion_bruta_mensual?: unknown;
  remuneracion_liquida_mensual?: unknown;
  remuneracion_liquida_mensual_original?: unknown;
  url?: unknown;
  [key: string]: unknown;
}

interface HistoryObservation {
  recordId: string;
  name: string;
  organism: string;
  organismId: string | null;
  role: string;
  contract: string;
  period: string;
  gross: number | null;
  grossState: "reported" | "zero" | "not_reported";
  liquid: number | null;
  officialUrl: string | null;
  original: R2RemunerationHistoryRow;
}

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function text(value: unknown, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalize(value: unknown) {
  return text(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identityKey(name: string) {
  return [...new Set(normalize(name).split(" ").filter((token) => token.length >= 2))].sort().join(" ");
}

function periodOf(row: R2RemunerationHistoryRow) {
  const period = text(row.periodo ?? row.fuente_periodo);
  return PERIOD_PATTERN.test(period) ? period : null;
}

function amountOf(value: unknown): { value: number | null; state: HistoryObservation["grossState"] } {
  if (value === null || value === undefined || text(value) === "") return { value: null, state: "not_reported" };
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return { value: null, state: "not_reported" };
  return { value: amount, state: amount === 0 ? "zero" : "reported" };
}

function observationOf(row: R2RemunerationHistoryRow, index: number): HistoryObservation | null {
  const name = text(row.nombre_completo ?? row.nombre);
  const period = periodOf(row);
  if (!name || !period) return null;
  const gross = amountOf(row.remuneracion_bruta_mensual);
  const liquid = amountOf(row.remuneracion_liquida_mensual);
  return {
    recordId: text(row.id, `r2-row-${index}`),
    name,
    organism: text(row.organo_nombre ?? row.organo_id, "Organismo no informado"),
    organismId: text(row.organo_id) || null,
    role: text(row.cargo, "Cargo no informado"),
    contract: text(row.tipo_contrato, "Tipo de contrato no informado"),
    period,
    gross: gross.value,
    grossState: gross.state,
    liquid: liquid.value,
    officialUrl: text(row.url) || null,
    original: row,
  };
}

function positionKey(observation: HistoryObservation) {
  return [normalize(observation.organism), normalize(observation.role), normalize(observation.contract)].join("|");
}

function monthDistance(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

function compactObservation(observation: HistoryObservation) {
  return {
    recordId: observation.recordId,
    name: observation.name,
    organism: observation.organism,
    organismId: observation.organismId,
    role: observation.role,
    contract: observation.contract,
    period: observation.period,
    gross: observation.gross,
    grossState: observation.grossState,
    liquid: observation.liquid,
    officialUrl: observation.officialUrl,
    original: observation.original,
  };
}

export function buildR2RemunerationHistory(rows: R2RemunerationHistoryRow[], options: { targetName?: string } = {}) {
  const observations = rows.map(observationOf).filter((value): value is HistoryObservation => value !== null);
  const invalidPeriodCount = rows.length - observations.length;
  const targetKey = options.targetName ? identityKey(options.targetName) : null;
  const grouped = new Map<string, HistoryObservation[]>();
  for (const observation of observations) {
    const key = identityKey(observation.name);
    if (!key || (targetKey && key !== targetKey)) continue;
    const group = grouped.get(key) ?? [];
    group.push(observation);
    grouped.set(key, group);
  }

  const people = [...grouped.entries()].map(([personKey, personRows]) => {
    const periods = [...new Set(personRows.map((row) => row.period))].sort();
    const byPeriod = new Map<string, HistoryObservation[]>();
    for (const row of personRows) {
      const periodRows = byPeriod.get(row.period) ?? [];
      periodRows.push(row);
      byPeriod.set(row.period, periodRows);
    }
    const comparisons = periods.slice(1).map((period, index) => {
      const previousPeriod = periods[index];
      const previous = byPeriod.get(previousPeriod) ?? [];
      const current = byPeriod.get(period) ?? [];
      const previousByPosition = new Map(previous.map((row) => [positionKey(row), row]));
      const currentByPosition = new Map(current.map((row) => [positionKey(row), row]));
      const comparable = monthDistance(previousPeriod, period) === 1;
      const entries = [...currentByPosition.keys()].filter((key) => !previousByPosition.has(key)).length;
      const exitsObserved = comparable
        ? [...previousByPosition.keys()].filter((key) => !currentByPosition.has(key)).length
        : null;
      const amountChanges = [...currentByPosition.entries()].filter(([key, currentRow]) => {
        const previousRow = previousByPosition.get(key);
        return previousRow && previousRow.gross !== null && currentRow.gross !== null && previousRow.gross !== currentRow.gross;
      }).map(([key, currentRow]) => ({
        positionKey: key,
        before: previousByPosition.get(key)?.gross ?? null,
        after: currentRow.gross,
        delta: (currentRow.gross ?? 0) - (previousByPosition.get(key)?.gross ?? 0),
      }));
      const previousOrganisms = new Set(previous.map((row) => row.organism));
      const currentOrganisms = new Set(current.map((row) => row.organism));
      const organismChanges = [...currentOrganisms].some((organism) => !previousOrganisms.has(organism))
        || [...previousOrganisms].some((organism) => !currentOrganisms.has(organism));
      return {
        from: previousPeriod,
        to: period,
        comparable,
        entries,
        exitsObserved,
        amountChanges,
        organismChanges,
        note: comparable
          ? "Comparación entre cortes mensuales consecutivos; una salida observada no prueba por sí sola un término contractual."
          : "Hay un intervalo sin corte consecutivo; no se atribuyen altas ni bajas en ese salto.",
      };
    });
    const latest = personRows.at(-1);
    return {
      personKey,
      identityConfidence: "name-only",
      names: [...new Set(personRows.map((row) => row.name))],
      firstPeriod: periods[0] ?? null,
      lastPeriod: periods.at(-1) ?? null,
      periods: periods.map((period) => ({ period, records: (byPeriod.get(period) ?? []).map(compactObservation) })),
      comparisons,
      recordCount: personRows.length,
      quality: {
        periodsObserved: periods.length,
        monthsWithMissingGross: personRows.filter((row) => row.gross === null).length,
        organismCount: new Set(personRows.map((row) => row.organism)).size,
        latestOfficialUrl: latest?.officialUrl ?? null,
      },
    };
  });

  return {
    schemaVersion: 1,
    source: "r2",
    targetName: options.targetName ?? null,
    recordCount: observations.length,
    invalidPeriodCount,
    people,
  };
}
