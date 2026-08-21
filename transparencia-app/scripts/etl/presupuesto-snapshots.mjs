function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * DIPRES publica ejecución acumulada por corte mensual. Para un desglose
 * vigente sólo es válido agregar filas dentro del último corte disponible.
 */
export function latestBudgetSnapshot(records) {
  const periods = records
    .map((record) => String(record?.period ?? ""))
    .filter((period) => /^\d{4}-\d{2}$/.test(period));
  const period = periods.sort().at(-1) ?? null;
  if (!period) return { period: null, subtitulos: [] };

  const bySubtitle = new Map();
  for (const record of records) {
    if (String(record?.period ?? "") !== period) continue;
    const subtitulo = String(record?.subtitulo ?? "");
    const current = bySubtitle.get(subtitulo) ?? {
      subtitulo,
      denominacion: String(record?.denominacion ?? ""),
      inicial: 0,
      vigente: 0,
      ejecutado: 0,
    };
    current.inicial += number(record?.inicial);
    current.vigente += number(record?.vigente);
    current.ejecutado += number(record?.ejecutado);
    bySubtitle.set(subtitulo, current);
  }

  return {
    period,
    subtitulos: [...bySubtitle.values()].sort((left, right) =>
      Number(left.subtitulo) - Number(right.subtitulo) || left.subtitulo.localeCompare(right.subtitulo),
    ),
  };
}
