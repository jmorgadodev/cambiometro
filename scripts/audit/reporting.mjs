export function calculateAccuracy(findings) {
  const comparableRows = findings.filter((row) => !["FUENTE_NO_DISPONIBLE", "CAPA_NO_DISPONIBLE"].includes(row.status));
  const approved = comparableRows.filter((row) => row.status === "OK").length;
  const comparable = comparableRows.length;
  const total = findings.length;
  return {
    approved,
    comparable,
    total,
    accuracyPct: comparable ? Math.round((approved / comparable) * 10_000) / 100 : 0,
    coveragePct: total ? Math.round((comparable / total) * 10_000) / 100 : 0,
  };
}

export function classifyRootCause(finding) {
  if (finding.category === "gastos_operacionales") return "RC-01";
  if (finding.category === "personal_apoyo") return "RC-02";
  if (finding.category === "compras") return "RC-03";
  if (finding.category === "presupuesto") return "RC-04";
  if (finding.category === "dotacion") return "RC-05";
  if (finding.category === "identidad") return "RC-06";
  if (finding.category === "sinim") return "RC-07";
  if (finding.category === "votaciones" || finding.category === "asistencia") return "RC-08";
  return "RC-99";
}

export function verifyCauseCoverage(findings) {
  const uncovered = findings.filter((row) => ["ALTA", "CRITICA"].includes(row.status) && !classifyRootCause(row));
  if (uncovered.length) throw new Error(`AUDIT_UNCOVERED_ROOT_CAUSES:${uncovered.map((row) => row.id).join(",")}`);
  return true;
}

export function assertAltaSourceDisclosed(findings) {
  const invalid = findings.filter((row) => row.status === "ALTA"
    && (row.detail?.source_anomaly !== true || row.detail?.site_disclosure !== true));
  if (invalid.length) throw new Error(`AUDIT_ALTA_NOT_DISCLOSED:${invalid.map((row) => row.id).join(",")}`);
  return true;
}

export function correctionVerdict({ critical, high, coveragePct }) {
  if (critical > 0) return "NO";
  if (high > 0 || coveragePct < 100) return "CON FIXES";
  return "SI";
}
