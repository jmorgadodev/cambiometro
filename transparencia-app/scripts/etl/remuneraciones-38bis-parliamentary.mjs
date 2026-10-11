function normalizeName(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
}

function validCongressRow(row) {
  return row.partida === "Congreso Nacional"
    && normalizeName(row.nombre) !== "NO REPORTADO"
    && Number.isFinite(row.bruto_mensual) && row.bruto_mensual > 0;
}

function chamberFromCargo(cargo) {
  const normalized = normalizeName(cargo);
  if (normalized.includes("SENAD")) return "Senado";
  if (normalized.includes("DIPUTAD") || normalized.includes("CAMARA")) return "Cámara";
  return null;
}

export function buildParliamentarySalaryView(current, history, { expectedRows = 205 } = {}) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(current?.mes ?? "")) throw new Error("38BIS_CONGRESS_CURRENT_PERIOD_INVALID");
  const baseline = [...(history?.periodos ?? [])]
    .filter((period) => period.mes < current.mes)
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .find((period) => period.registros?.filter(validCongressRow).length === expectedRows);
  if (!baseline) throw new Error("38BIS_CONGRESS_BASELINE_MISSING");

  const previous = baseline.registros.filter(validCongressRow);
  const previousNames = new Set(previous.map((row) => normalizeName(row.nombre)));
  if (previousNames.size !== expectedRows) throw new Error("38BIS_CONGRESS_BASELINE_AMBIGUOUS");
  const previousByName = new Map(previous.map((row) => [normalizeName(row.nombre), row]));

  const latest = new Map();
  for (const row of current.registros ?? []) {
    if (!validCongressRow(row)) continue;
    const name = normalizeName(row.nombre);
    const old = previousByName.get(name);
    if (!old || latest.has(name) || !chamberFromCargo(row.cargo)
      || chamberFromCargo(row.cargo) !== chamberFromCargo(old.cargo)) throw new Error("38BIS_CONGRESS_IDENTITY_MISMATCH");
    latest.set(name, row);
  }

  const congreso = previous.map((row) => {
    const replacement = latest.get(normalizeName(row.nombre));
    return { ...(replacement ?? row), mes: replacement ? current.mes : baseline.mes };
  });
  return {
    fuente: current.fuente, url: current.url, mes: current.mes,
    extraido_en: current.extraido_en, filas: congreso.length, congreso,
    cortes: { [current.mes]: latest.size, [baseline.mes]: expectedRows - latest.size },
  };
}
