function canonicalRut(value) {
  const compact = String(value ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(compact)) return null;

  const body = compact.slice(0, -1);
  let factor = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return expected === compact.at(-1) ? compact : null;
}

export function findBuyerByVerifiedRut(buyers, legalRut) {
  const expected = canonicalRut(legalRut);
  if (!expected || !Array.isArray(buyers)) return null;
  return buyers.find((buyer) => canonicalRut(buyer?.rut_juridico) === expected) ?? null;
}

/**
 * R10: esta proyección es deliberadamente conservadora. Los registros `top`
 * son adjudicaciones oficiales; no se dividen en órdenes ni se completan
 * proveedores, fechas, montos o identificadores ausentes.
 */
export function projectOfficialBuyer(buyer) {
  if (!buyer || !canonicalRut(buyer.rut_juridico)) return null;

  const top = Array.isArray(buyer.top) ? buyer.top : [];
  return {
    rut_comprador: buyer.rut_juridico,
    nombre_comprador: buyer.name || null,
    monto_total_clp: Number.isFinite(buyer.monto_total_clp) ? buyer.monto_total_clp : null,
    procesos_count: Number.isFinite(buyer.procesos) ? buyer.procesos : null,
    ordenes_count: null,
    top_compras: top.map((record) => ({
      titulo: record.title || null,
      proveedor: record.proveedor || null,
      monto_clp: Number.isFinite(record.monto_clp) ? record.monto_clp : null,
      fecha: record.fecha || null,
      url: record.url || null,
      ocid: record.ocid || null,
    })),
    anomalias_integridad: (Array.isArray(buyer.anomalies) ? buyer.anomalies : []).map((anomaly) => ({
      id: anomaly.id || null,
      severity: anomaly.severity || null,
      validation: anomaly.validation || null,
      violations: Array.isArray(anomaly.violations) ? anomaly.violations : [],
      titulo: anomaly.title || null,
      monto_oficial_clp: Number.isFinite(anomaly.monto_oficial_clp) ? anomaly.monto_oficial_clp : null,
      fecha: anomaly.fecha || null,
      source_url: anomaly.source_url || null,
      excluded_from_totals_and_rankings: anomaly.excluded_from_totals_and_rankings === true,
    })),
    procesos: [],
    distribucion_modalidades: null,
    metodo_enlace: "RUT_EXACTO",
    fuente: "ChileCompra · Estándar OCDS",
  };
}
