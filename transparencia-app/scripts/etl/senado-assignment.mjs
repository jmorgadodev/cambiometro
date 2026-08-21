function textContent(html) {
  return String(html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function clp(value) {
  return Number(String(value ?? "").replace(/\./g, ""));
}

export function parseSenadoAssignmentPolicy(html) {
  const text = textContent(html);
  const base = text.match(/asignaci[oó]n mensual desde enero\s+(\d{4})\s+es de\s+\$\s*([\d.]+)/i);
  const operating = text.match(/traspase hasta el\s+(\d+(?:[,.]\d+)?)%\s+de la Asignaci[oó]n de Gastos Operacionales/i);
  const advisory = text.match(/desde el\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4}),?\s+hasta un monto de\s+\$\s*([\d.]+)/i);
  if (!base || !operating || !advisory) throw new Error("SENADO_ASSIGNMENT_POLICY_SCHEMA_INVALID");

  const months = {
    enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
    julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
  };
  const month = months[advisory[2].toLowerCase()];
  if (!month) throw new Error("SENADO_ASSIGNMENT_POLICY_DATE_INVALID");

  return {
    year: Number(base[1]),
    base_mensual_clp: clp(base[2]),
    acumulable: !/no susceptible de ser acumulado/i.test(text),
    max_transfer_gastos_operacionales_pct: Number(operating[1].replace(",", ".")),
    max_transfer_asesoria_externa_clp: clp(advisory[4]),
    transfer_asesoria_desde: `${advisory[3]}-${month}-${String(advisory[1]).padStart(2, "0")}`,
  };
}

function isVerifiedTransfer(transfer, period) {
  if (!transfer || transfer.period !== period || !Number.isFinite(transfer.amount_clp) || transfer.amount_clp <= 0) return false;
  if (!/^[a-f0-9]{64}$/i.test(String(transfer.checksum_sha256 ?? ""))) return false;
  try {
    const url = new URL(transfer.source_url);
    return url.protocol === "https:" && (url.hostname === "senado.cl" || url.hostname.endsWith(".senado.cl"));
  } catch {
    return false;
  }
}

export function evaluateSenateSupport({ total_clp, period, base_mensual_clp, verified_transfers = [] }) {
  const total = Number(total_clp);
  const base = Number(base_mensual_clp);
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(base) || base <= 0 || !/^\d{4}-\d{2}$/.test(period)) {
    throw new Error("SENADO_SUPPORT_EVALUATION_INVALID");
  }
  const excess = Math.max(0, total - base);
  const verified = verified_transfers
    .filter((transfer) => isVerifiedTransfer(transfer, period))
    .reduce((sum, transfer) => sum + transfer.amount_clp, 0);
  const unexplained = Math.max(0, excess - verified);
  const unexplainedPct = (unexplained / base) * 100;
  return {
    status: unexplained === 0 ? "OK" : unexplainedPct <= 40 ? "ALTA" : "CRITICA",
    period,
    base_mensual_clp: base,
    total_clp: total,
    excess_clp: excess,
    verified_transfer_clp: Math.min(excess, verified),
    unexplained_clp: unexplained,
    unexplained_pct_base: unexplainedPct,
  };
}
