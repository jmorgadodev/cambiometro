import { formatCLP } from "@/lib/format";
import { externalAdvisoryAmountsByPeriod, parsePublishedClpAmount } from "@/lib/parliamentary-cost-periods";
import type { CamaraTransparencySection } from "@/lib/personal-apoyo";

function sortPeriods(section: CamaraTransparencySection) {
  const periods = section.periods?.length ? section.periods : section.period ? [{
    period: section.period,
    status: section.status === "available" ? "available" as const : "empty_confirmed" as const,
    rows: section.rows,
    retrieved_at: section.retrieved_at,
  }] : [];
  return [...periods].sort((a, b) => periodSortKey(b.period).localeCompare(periodSortKey(a.period)));
}

function periodSortKey(period: string) {
  const months: Record<string, string> = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };
  const normalized = period.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const match = normalized.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/);
  return match ? `${match[2]}-${months[match[1]]}` : normalized;
}

function periodTotal(period: { period: string; rows: { values: Record<string, string> }[] }) {
  return externalAdvisoryAmountsByPeriod([period]).get(periodSortKey(period.period)) ?? null;
}

export function CamaraTransparencyDetails({
  deputyId,
  applicantName,
  section,
  historicalPeriod,
}: {
  deputyId: string;
  applicantName: string;
  section: CamaraTransparencySection | null | undefined;
  historicalPeriod?: string | null;
}) {
  if (!section) return null;

  const periods = sortPeriods(section);
  const recordCount = periods.reduce((total, period) => total + period.rows.length, 0);
  const periodCount = periods.filter((period) => period.rows.length > 0).length;
  const advisoryAmounts = periods.flatMap((period) => period.rows.map((row) => parsePublishedClpAmount(row.values.Monto)));
  const reportedAmounts = advisoryAmounts.filter((amount): amount is number => amount !== null);
  const unreportedAmountCount = advisoryAmounts.length - reportedAmounts.length;
  const reportedAmountTotal = reportedAmounts.reduce((total, amount) => total + amount, 0);
  const sourceUrl = `https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=${encodeURIComponent(deputyId)}`;

  return (
    <section
      id="asesorias-externas"
      className="container-main card-flat"
      aria-labelledby="external-advisories-title"
      style={{ padding: "1rem", marginTop: "1rem" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <span style={{ color: "var(--accent)", fontSize: "0.68rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Transparencia de la Cámara
          </span>
          <h2 id="external-advisories-title" className="section-title" style={{ margin: "0.15rem 0 0" }}>
            Asesorías externas
          </h2>
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
          Solicitante: {applicantName}{periodCount > 0 ? ` · último corte: ${periods.find((period) => period.rows.length > 0)?.period}` : ""}
        </span>
      </div>
      {historicalPeriod && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.76rem", margin: "0.5rem 0" }}>
          Registros de su período anterior en la Cámara ({historicalPeriod}); no se agregan al costo de su cargo actual.
        </p>
      )}
      <p style={{ color: "var(--text-muted)", fontSize: "0.76rem", margin: "0.5rem 0 0.75rem" }}>
        Asesorías externas registradas a nombre del parlamentario, según los cortes mensuales publicados por la Cámara. La suma acumula los montos informados en los meses incorporados; no equivale necesariamente al valor total de contratos ni a pagos ejecutados, y no es el sueldo personal del diputado.
      </p>

      <div aria-label="Resumen de asesorías externas" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))", gap: "0.6rem", marginBottom: "0.85rem" }}>
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "0.5rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Montos informados · cortes incluidos</div>
          <strong style={{ display: "block", marginTop: "0.25rem", color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "1.05rem" }}>
            {reportedAmounts.length ? formatCLP(reportedAmountTotal) : "No calculable"}
          </strong>
          {unreportedAmountCount > 0 && <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{unreportedAmountCount} {unreportedAmountCount === 1 ? "monto no informado" : "montos no informados"}; no incluidos en la suma.</span>}
        </div>
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "0.5rem", padding: "0.7rem 0.8rem", minWidth: 0 }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Registros publicados</div>
          <strong style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", fontSize: "1.05rem" }}>{recordCount}</strong>
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{periodCount} {periodCount === 1 ? "mes con registros" : "meses con registros"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.45rem" }}>
        {periods.map((period, index) => {
          const total = periodTotal(period);
          return (
            <details key={period.period} open={index === 0} style={{ border: "1px solid var(--border-subtle)", borderRadius: "0.5rem", padding: "0.55rem 0.7rem" }}>
              <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
                <strong>{period.period}</strong>
                <span style={{ color: "var(--text-muted)" }}>
                  {period.rows.length} {period.rows.length === 1 ? "asesoría" : "asesorías"}
                  {total !== null ? ` · subtotal publicado ${formatCLP(total)}` : " · monto no disponible"}
                </span>
              </summary>
              {period.rows.length ? (
                <div style={{ overflowX: "auto", marginTop: "0.55rem" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: "0.78rem", minWidth: "25rem", width: "100%" }}>
                    <thead>
                      <tr>
                        {["Folio", "Asesor externo", "Monto informado"].map((label) => (
                          <th key={label} scope="col" style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.5rem", textAlign: label === "Monto informado" ? "right" : "left" }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {period.rows.map((row, rowIndex) => {
                        const amount = parsePublishedClpAmount(row.values.Monto);
                        return (
                          <tr key={`${row.values.Folio ?? "folio"}-${rowIndex}`}>
                            <td style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.5rem" }}>{row.values.Folio || "—"}</td>
                            <td style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.5rem" }}>{row.values.Asesor || "No informado por la fuente"}</td>
                            <td style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.5rem", textAlign: "right", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                              {amount !== null ? formatCLP(amount) : row.values.Monto || "No informado"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p role="status" style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: "0.5rem 0 0" }}>
                  La Cámara no publica registros para este corte.
                </p>
              )}
            </details>
          );
        })}
      </div>

      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.7rem", color: "var(--accent)", fontSize: "0.75rem" }}>
        Revisar el registro oficial de la Cámara ↗
      </a>
    </section>
  );
}
