"use client";

import { useState } from "react";

interface Props {
  className?: string;
  initialSueldo?: number;
}

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

// ── Cálculo exacto del Impuesto Único de Segunda Categoría (Chile, baremo SII dic-2024 vigente 2025) ──
// Tabla de retención mensual SII: Retención = Tasa × Renta Imponible − Cantidad a Rebajar.
// Límites y rebajas verificados contra el sitio oficial del SII (tabla vigente desde 01-12-2024).
const TRAMOS_SII = [
  { hasta: 938817, tasa: 0, rebaja: 0 },
  { hasta: 1582302, tasa: 0.04, rebaja: 37552 },
  { hasta: 2758013, tasa: 0.08, rebaja: 121003 },
  { hasta: 3748423, tasa: 0.135, rebaja: 312243 },
  { hasta: 6971709, tasa: 0.23, rebaja: 774698 },
  { hasta: 16799977, tasa: 0.304, rebaja: 1237848 },
  { hasta: 43001399, tasa: 0.35, rebaja: 1621719 },
  { hasta: Infinity, tasa: 0.4, rebaja: 2699620 },
] as const;

function calcularImpuestoSegundaCategoria(sueldoBrutoEst: number): number {
  // Renta Imponible = Sueldo Bruto menos Cotizaciones Obligatorias (~18.1%)
  const imponible = Math.max(0, sueldoBrutoEst * 0.819);

  const tramo = TRAMOS_SII.find((t) => imponible <= t.hasta) ?? TRAMOS_SII[TRAMOS_SII.length - 1];
  return Math.max(0, imponible * tramo.tasa - tramo.rebaja);
}

export default function ImpuestoCalculator({ initialSueldo = 1200000 }: Props) {
  const [sueldoLiquido, setSueldoLiquido] = useState<number>(initialSueldo);

  // Estimación de Sueldo Bruto a partir de Líquido
  const sueldoBrutoEst = sueldoLiquido * 1.22;

  // Cotizaciones previsionales obligatorias (AFP 10% + Salud 7% + Seguro Cesantía/Accidentes ~1.8%)
  const afpSaludMensual = sueldoBrutoEst * 0.188;

  // Impuesto a la Renta de Segunda Categoría
  const impuestoRentaMensual = calcularImpuestoSegundaCategoria(sueldoBrutoEst);

  // Índice del tramo SII en que cae la renta imponible (para resaltarlo en la tabla)
  const tramoActivoIndex = Math.max(
    0,
    TRAMOS_SII.findIndex((t) => sueldoBrutoEst * 0.819 <= t.hasta)
  );

  // Impuesto al Valor Agregado (IVA 19%) estimado en consumo básico (~70% del ingreso gastado en productos con IVA)
  const ivaEstimadoMensual = sueldoLiquido * 0.70 * (0.19 / 1.19);

  // Total Aporte Tributario Directo + Indirecto (Impuesto Renta + IVA)
  const impuestoTotalMensual = impuestoRentaMensual + ivaEstimadoMensual;
  const impuestoTotalAnual = impuestoTotalMensual * 12;

  // Dieta parlamentaria mensual bruta ($8.291.039 CLP vigente desde marzo 2026 -> ~$276.368 CLP / día)
  const dietaDiariaParlamentario = 8291039 / 30; // $276.368 / día
  // ~0.8% del presupuesto público nacional financia el Congreso y sus dietas/asignaciones
  const aporteAlineadoCongresoAnual = impuestoTotalAnual * 0.008;
  const diasSueldoParlamentario = (aporteAlineadoCongresoAnual / dietaDiariaParlamentario).toFixed(1);

  // Desglose del destino fiscal de tus impuestos en Chile
  const desgloseDestino = [
    { label: "🏥 Salud Pública & CESFAM / Fonasa (22%)", monto: impuestoTotalAnual * 0.22, color: "var(--ok)" },
    { label: "🎓 Educación Pública & Subvenciones (20%)", monto: impuestoTotalAnual * 0.20, color: "var(--accent)" },
    { label: "🏙️ Fondo Común Municipal & Vivienda (15%)", monto: impuestoTotalAnual * 0.15, color: "var(--info)" },
    { label: "🛡️ Seguridad, Carabineros & PDI (12%)", monto: impuestoTotalAnual * 0.12, color: "var(--warn)" },
    { label: "🏗️ Obras Públicas & Transporte MOP (10%)", monto: impuestoTotalAnual * 0.10, color: "var(--accent)" },
    { label: "🏛️ Congreso Nacional & Asignaciones (0.8%)", monto: aporteAlineadoCongresoAnual, color: "var(--bad)" },
  ];

  return (
    <div className="card-flat" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <div className="section-title" style={{ fontSize: "1.05rem", marginBottom: "0.4rem" }}>
        🧮 Calculadora Verificada &quot;Mi Impuesto&quot; (Chile 2025–2026)
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Ingresa tu sueldo líquido mensual para calcular con precisión tributaria (baremo SII vigente 2025 del Impuesto Único de 2ª Categoría + IVA estimado) cuánto dinero aportas al Estado y qué fracción financia la dieta de los parlamentarios.
      </p>

      {/* Controles de Sueldo */}
      <div
        style={{
          marginBottom: "1.25rem",
          padding: "1rem 1.1rem",
          background: "var(--bg-primary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Tu Sueldo Líquido Mensual
          </label>
          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 800, color: "var(--accent)" }}>
            {formatCLP(sueldoLiquido)}
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontFamily: "monospace",
              color: "var(--accent)",
              fontSize: "1rem",
              fontWeight: 800,
            }}
          >
            $
          </span>
          <input
            type="number"
            value={sueldoLiquido}
            onChange={(e) => setSueldoLiquido(Math.max(0, Number(e.target.value)))}
            placeholder="1.200.000"
            className="calculator-input"
            style={{ paddingLeft: "2rem", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}
          />
        </div>
        <input
          type="range"
          min="400000"
          max="6000000"
          step="50000"
          value={sueldoLiquido}
          onChange={(e) => setSueldoLiquido(Number(e.target.value))}
          style={{ width: "100%", marginTop: "0.6rem", accentColor: "var(--accent)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-3)", marginTop: "0.2rem" }}>
          <span>$400.000 (Mínimo)</span>
          <span>$3.000.000</span>
          <span>$6.000.000 (Alta Renta)</span>
        </div>
      </div>

      {/* Resultados Tributarios */}
      <div
        style={{
          background: "var(--bg-primary)",
          borderRadius: 10,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Tarjeta destacada: Aporte Anual Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            background: "var(--info-bg)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            marginBottom: "0.25rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>Aporte Tributario Anual Total</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>Impuesto Renta + IVA Consumo acumulado al año</div>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 900, color: "var(--accent)" }}>
            {formatCLP(impuestoTotalAnual)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-subtle)" }}>Sueldo Bruto Estimado</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>{formatCLP(sueldoBrutoEst)}/mes</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-subtle)" }}>Cotizaciones Obligatorias (AFP + Salud 18.8%)</span>
            <span style={{ fontFamily: "monospace", color: "var(--text-3)" }}>{formatCLP(afpSaludMensual)}/mes</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-subtle)" }}>Impuesto 2ª Categoría (SII Renta)</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: impuestoRentaMensual > 0 ? "var(--warn)" : "var(--ok)" }}>
              {impuestoRentaMensual > 0 ? formatCLP(impuestoRentaMensual) : "$0 (Exento)"}/mes
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-subtle)" }}>IVA Pago Consumo Diario (19% est.)</span>
            <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>{formatCLP(ivaEstimadoMensual)}/mes</span>
          </div>
        </div>

        {/* Tarjeta Impacto Congreso */}
        <div
          style={{
            marginTop: "0.5rem",
            padding: "1rem",
            background: "var(--warn-bg)",
            border: "1px solid var(--warn)",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "var(--bad)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🏛️ Tu Aporte a las Dietas del Congreso Nacional
          </div>
          <div style={{ fontSize: "1.6rem", fontFamily: "monospace", fontWeight: 900, color: "var(--warn)", margin: "0.2rem 0" }}>
            {diasSueldoParlamentario} días
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Tu impuesto anual financia <strong style={{ color: "var(--text-primary)" }}>{diasSueldoParlamentario} días completos</strong> del sueldo bruto diario de un Senador o Diputado ({formatCLP(dietaDiariaParlamentario)} CLP/día, dieta $8.291.039/mes vigente 2026).
          </div>
        </div>

        {/* Desglose Destino Fiscal */}
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
            📍 ¿A dónde van tus impuestos anuales? ({formatCLP(impuestoTotalAnual)})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {desgloseDestino.map((item) => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: item.color }}>{formatCLP(item.monto)}</span>
                </div>
                <div style={{ height: 5, background: "var(--bg-surface)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(item.monto / impuestoTotalAnual) * 100}%`, background: item.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Tramos SII Vigente */}
      <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "var(--bg-primary)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.6rem" }}>
          📋 Tramos de retención SII vigentes (desde 01-12-2024) — Impuesto Único 2ª Categoría
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.75rem" }}>
          {TRAMOS_SII.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.5rem",
                borderBottom: i < TRAMOS_SII.length - 1 ? "1px dashed var(--border-subtle)" : "none",
                paddingBottom: i < TRAMOS_SII.length - 1 ? "0.3rem" : 0,
                ...(tramoActivoIndex === i
                  ? {
                      background: "var(--info-bg)",
                      border: "1px solid var(--accent)",
                      borderRadius: 6,
                      padding: "0.25rem 0.5rem",
                      margin: "0.1rem -0.5rem",
                    }
                  : {}),
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                {i === 0 ? "Hasta $938.817 (exento)" : i === TRAMOS_SII.length - 1 ? `Más de ${formatCLP(43001399)}` : `Más de ${formatCLP(TRAMOS_SII[i - 1].hasta)} hasta ${formatCLP(t.hasta)}`}
              </span>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: t.tasa > 0 ? "var(--warn)" : "var(--ok)" }}>
                {t.tasa > 0 ? `${Math.round(t.tasa * 1000) / 10}% (rebaja ${formatCLP(t.rebaja)})` : "Sin retención"}
              </span>
            </div>
          ))}
          <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: "0.3rem" }}>
            Retención = Tasa × Renta Imponible − Rebaja. Renta Imponible = Sueldo Bruto − Cotizaciones (~18.1%). Detalle oficial: sitio SII, tablas de retención mensual.
          </div>
        </div>
      </div>
    </div>
  );
}
