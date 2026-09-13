import Link from "next/link";
import type { ChileCompraResumen } from "@/lib/chilecompra";

function formatAmount(value: number | null) {
  if (value === null || value <= 0) return "Monto no publicado";
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 1, notation: "compact" }).format(value);
}

function formatInteger(value: number) {
  return value.toLocaleString("es-CL");
}

export default function ChileCompraSummaryPanel({
  summary,
  currentCount,
  publicHistoricalCount,
  declaredHistoricalCount,
}: {
  summary: ChileCompraResumen;
  currentCount: number;
  publicHistoricalCount: number;
  declaredHistoricalCount: number;
}) {
  const maxMonthAmount = Math.max(1, ...summary.months.map((month) => month.monto_total_clp ?? 0));
  const historicalPending = publicHistoricalCount < declaredHistoricalCount;

  return (
    <section className="card" aria-labelledby="chilecompra-summary-title" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <span className="badge badge-info">ChileCompra · resumen del corte publicado</span>
          <h2 id="chilecompra-summary-title" style={{ margin: "0.45rem 0 0.35rem", fontSize: "1.2rem", color: "var(--text-primary)" }}>
            Compras públicas que sí se pueden recorrer
          </h2>
          <p style={{ margin: 0, maxWidth: 760, fontSize: "0.8rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
            Este panel usa agregados precalculados del release OCDS y deja el detalle original en una consulta paginada. Los montos no publicados no se convierten en cero.
          </p>
        </div>
        <Link prefetch={false} href="/cruces?vista=registros&fuente=chilecompra" className="btn btn-secondary btn-sm">
          Ver registros originales →
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "0.65rem", marginTop: "1rem" }}>
        <div className="stat-tile stat-tile--warn"><strong>{formatInteger(currentCount)}</strong><span>registros del corte</span></div>
        <div className="stat-tile stat-tile--info"><strong>{formatInteger(summary.topBuyers.length ? summary.topBuyers.reduce((total, buyer) => total + buyer.procesos, 0) : 0)}</strong><span>procesos en los principales compradores</span></div>
        <div className="stat-tile stat-tile--accent"><strong>{formatInteger(summary.months.length)}</strong><span>meses con agregado publicado</span></div>
        <div className="stat-tile stat-tile--alert"><strong>{formatInteger(summary.anomalies)}</strong><span>anomalías V7 en cuarentena</span></div>
      </div>

      {historicalPending && (
        <p role="status" style={{ margin: "1rem 0 0", padding: "0.75rem 0.85rem", border: "1px solid var(--warning)", borderRadius: 8, background: "color-mix(in srgb, var(--warning) 10%, transparent)", color: "var(--text-primary)", fontSize: "0.78rem", lineHeight: 1.5 }}>
          <strong>Histórico pendiente de publicación:</strong> el catálogo R2 permite consultar {formatInteger(publicHistoricalCount)} registros. El valor de referencia de {formatInteger(declaredHistoricalCount)} filas todavía no tiene particiones públicas recorribles.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1rem", marginTop: "1.1rem" }}>
        <div>
          <h3 style={{ margin: "0 0 0.45rem", fontSize: "0.95rem", color: "var(--text-primary)" }}>Evolución mensual del corte</h3>
          <div aria-label="Montos adjudicados por mes" style={{ display: "grid", gap: "0.45rem" }}>
            {summary.months.map((month) => (
              <div key={month.period} style={{ display: "grid", gridTemplateColumns: "4.5rem minmax(0, 1fr) auto", gap: "0.5rem", alignItems: "center", fontSize: "0.72rem" }}>
                <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>{month.period}</span>
                <span style={{ height: 8, borderRadius: 99, background: "var(--bg-surface-2)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.max(3, ((month.monto_total_clp ?? 0) / maxMonthAmount) * 100)}%`, background: "var(--accent)" }} />
                </span>
                <strong style={{ color: "var(--text-primary)", whiteSpace: "nowrap" }}>{formatAmount(month.monto_total_clp)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ margin: "0 0 0.45rem", fontSize: "0.95rem", color: "var(--text-primary)" }}>Principales organismos compradores</h3>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {summary.topBuyers.map((buyer) => (
              <div key={buyer.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", padding: "0.45rem 0", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.75rem" }}>
                <span style={{ minWidth: 0, color: "var(--text-primary)" }}>{buyer.name || "Organismo sin nombre publicado"}<small style={{ display: "block", color: "var(--text-subtle)" }}>{formatInteger(buyer.procesos)} procesos</small></span>
                <strong style={{ whiteSpace: "nowrap", color: "var(--accent)" }}>{formatAmount(buyer.monto_total_clp)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ margin: "0 0 0.45rem", fontSize: "0.95rem", color: "var(--text-primary)" }}>Principales proveedores</h3>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {summary.topSuppliers.map((supplier) => (
              <div key={supplier.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", padding: "0.45rem 0", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.75rem" }}>
                <span style={{ minWidth: 0, color: "var(--text-primary)" }}>{supplier.name}<small style={{ display: "block", color: "var(--text-subtle)" }}>{formatInteger(supplier.procesos)} procesos · {formatInteger(supplier.buyers)} compradores</small></span>
                <strong style={{ whiteSpace: "nowrap", color: "var(--accent)" }}>{formatAmount(supplier.monto_total_clp)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
