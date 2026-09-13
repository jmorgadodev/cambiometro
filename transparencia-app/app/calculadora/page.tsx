import type { Metadata } from "next";
import ImpuestoCalculator from "@/components/ImpuestoCalculator";
import { SUELDO_MINIMO_CHILE_CLP, toSueldosMinimos } from "@/lib/seed-politicos";

export const metadata: Metadata = {
  title: "Calculadora Mi Impuesto — El Cambiómetro",
  description:
    "Calcula con precisión tributaria cuántos pesos de tu trabajo financian las dietas y gastos del Congreso Nacional y los servicios del Estado de Chile.",
  alternates: { canonical: "/calculadora" },
};

export default function CalculadoraPage() {
  const formatCLP = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Math.round(n));

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "5rem" }}>
      <section className="page-masthead">
        <div className="container-main">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className="badge badge-info">Calculadora Tributaria Oficial Chile</span>
            <span className="badge badge-ok">Sueldo Mínimo: {formatCLP(SUELDO_MINIMO_CHILE_CLP)} CLP</span>
          </div>

          <h1 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 900, color: "var(--text-1)", margin: "0.4rem 0 0.75rem" }}>
            🧮 Calculadora &quot;Mi Impuesto&quot;
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: "1rem", maxWidth: 680, lineHeight: 1.6 }}>
            Los impuestos no son cifras abstractas. Visualiza en pesos exactos cuánto financia tu esfuerzo mensual a los servicios públicos, el Censo, los municipios y las dietas parlamentarias del Congreso Nacional.
          </p>
        </div>
      </section>

      <div className="container-main" style={{ padding: "3rem 1.5rem", maxWidth: 840 }}>
        <ImpuestoCalculator initialSueldo={1200000} />

        <div style={{ marginTop: "2.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <div className="card-flat">
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
              💵 Dieta Parlamentaria Bruta
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.3rem", fontWeight: 800, color: "var(--accent)", margin: "0.3rem 0" }}>
              $8.291.039 CLP/mes
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>
              Vigente desde marzo 2026. Equivalente a <strong>{toSueldosMinimos(8291039)}</strong> sueldos mínimos mensuales por parlamentario.
            </div>
          </div>

          <div className="card-flat">
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
              📊 Censo 2024 & Finanzas
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.3rem", fontWeight: 800, color: "var(--accent)", margin: "0.3rem 0" }}>
              17.5M+ Habitantes
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>
              Población censada en Chile que financia el presupuesto público nacional.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
