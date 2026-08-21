/** Separa filas que superan los límites estrictos V7 sin alterar evidencia. */
export function partitionV7Records(records) {
  const regular = [];
  const anomalies = [];
  for (const record of records) {
    const salary = Number(record?.remuneracion_bruta_mensual ?? 0);
    const overtime = Number(record?.horas_extras_mes_anterior ?? 0);
    const violations = [];
    if (salary > 60_000_000) violations.push("sueldo_mensual");
    if (overtime > 300) violations.push("horas_extras");
    if (violations.length === 0) {
      regular.push(record);
      continue;
    }
    anomalies.push({
      id: String(record?.id ?? ""),
      severity: "ALTA",
      validation: "V7",
      violations,
      source_url: record?.url ?? record?.fuente ?? null,
      record,
    });
  }
  return { regular, anomalies };
}
