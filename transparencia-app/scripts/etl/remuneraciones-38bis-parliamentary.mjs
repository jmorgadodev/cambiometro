function normalizeName(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
}

function chamberFromCargo(cargo) {
  const normalized = normalizeName(cargo);
  if (/^(?:SENADOR|SENADORA|(?:VICE)?PRESIDENT[EA] DEL SENADO)$/.test(normalized)) return "Senado";
  if (/^(?:DIPUTADO|DIPUTADA|(?:VICE)?PRESIDENT[EA] DE LA CAMARA DE DIPUTADOS(?: Y DIPUTADAS)?)$/.test(normalized)) return "Cámara";
  return null;
}

function parliamentaryRow(row) {
  const name = normalizeName(row?.nombre);
  return row?.partida === "Congreso Nacional" && name && name !== "NO REPORTADO" && chamberFromCargo(row.cargo);
}

function validCongressRow(row) {
  return parliamentaryRow(row) && Number.isSafeInteger(row.bruto_mensual) && row.bruto_mensual > 0;
}

export function buildParliamentarySalaryView(current, history, { expectedRows = 205 } = {}) {
  const validPeriod = period => /^\d{4}-(0[1-9]|1[0-2])$/.test(period ?? "");
  if (!validPeriod(current?.mes)) throw new Error("38BIS_CONGRESS_CURRENT_PERIOD_INVALID");
  if (!Number.isSafeInteger(expectedRows) || expectedRows < 1) throw new Error("38BIS_CONGRESS_EXPECTED_ROWS_INVALID");
  const seenPeriods = new Set();
  for (const period of history?.periodos ?? []) {
    if (!validPeriod(period?.mes) || seenPeriods.has(period.mes)) throw new Error("38BIS_CONGRESS_HISTORY_PERIOD_INVALID_OR_DUPLICATE");
    seenPeriods.add(period.mes);
  }
  const periods = [...(history?.periodos ?? [])].filter(period => period.mes < current.mes).sort((a, b) => a.mes.localeCompare(b.mes));
  for (const period of [...periods, current]) {
    for (const row of period.registros ?? []) {
      if (parliamentaryRow(row) && row.bruto_mensual != null && (!Number.isSafeInteger(row.bruto_mensual) || row.bruto_mensual < 0)) throw new Error("38BIS_CONGRESS_AMOUNT_INVALID");
    }
  }
  const baseline = [...periods].reverse().find(period => period.registros?.filter(validCongressRow).length === expectedRows);
  if (!baseline) throw new Error("38BIS_CONGRESS_BASELINE_MISSING");
  const previous = baseline.registros.filter(validCongressRow);
  const previousByName = new Map(previous.map(row => [normalizeName(row.nombre), row]));
  if (previousByName.size !== expectedRows) throw new Error("38BIS_CONGRESS_BASELINE_AMBIGUOUS");

  const latest = new Map(previous.map(row => [normalizeName(row.nombre), { ...row, mes: baseline.mes }]));
  // Un corte parcial no elimina la última observación oficial de otra persona.
  // Cero/null no se convierten en una dieta; se conserva la referencia anterior.
  for (const period of [...periods.filter(period => period.mes > baseline.mes), current]) {
    const observed = new Set();
    for (const row of period.registros ?? []) {
      if (!validCongressRow(row)) continue;
      const name = normalizeName(row.nombre);
      const original = previousByName.get(name);
      if (!original || observed.has(name) || chamberFromCargo(row.cargo) !== chamberFromCargo(original.cargo)) throw new Error("38BIS_CONGRESS_IDENTITY_MISMATCH");
      observed.add(name);
      latest.set(name, { ...row, mes: period.mes });
    }
  }
  const congreso = previous.map(row => latest.get(normalizeName(row.nombre)));
  const cortes = { [current.mes]: 0, [baseline.mes]: 0 };
  for (const row of congreso) cortes[row.mes] = (cortes[row.mes] ?? 0) + 1;
  return { fuente: current.fuente, url: current.url, mes: current.mes,
    extraido_en: current.extraido_en, filas: congreso.length, congreso, cortes };
}

/** Una corrección del mismo mes no borra una referencia positiva ya publicada. */
export function assertSamePeriodParliamentaryReferences(previous, current) {
  if (!previous || previous.mes !== current.mes) return;
  const key = row => JSON.stringify([normalizeName(row.nombre), chamberFromCargo(row.cargo)]);
  const reported = new Set((current.registros ?? []).filter(validCongressRow).map(key));
  if ((previous.registros ?? []).filter(validCongressRow).some(row => !reported.has(key(row)))) throw new Error("38BIS_CONGRESS_REFERENCE_LOSS");
}
