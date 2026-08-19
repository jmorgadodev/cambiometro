import { formatCLP, formatPct } from "@/lib/format";
import type { RadiografiaElectoral } from "@/lib/partido-electoral-data";

interface Props {
  datos: RadiografiaElectoral;
  sigla: string;
  nombrePartido: string;
}

export default function RadiografiaElectoralCard({ datos, sigla, nombrePartido }: Props) {
  const esPositivo = datos.deltaPct > 0;
  const esNeutro = datos.deltaPct === 0;
  const colorDelta = esNeutro ? "var(--text-2)" : esPositivo ? "var(--ok)" : "var(--bad)";
  const bgDelta = esNeutro ? "var(--surface-2)" : esPositivo ? "var(--ok-bg)" : "var(--bad-bg)";

  return (
    <div
      className="card"
      id="radiografia-electoral-block"
      style={{
        padding: "1.5rem",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🗳️</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-1)" }}>
              Radiografía Electoral SERVEL
            </h3>
            <span
              style={{
                fontSize: "0.68rem",
                padding: "0.2rem 0.5rem",
                borderRadius: "6px",
                background: "var(--info-bg)",
                color: "var(--info)",
                fontWeight: 700,
                border: "1px solid var(--border)",
              }}
            >
              Elección General 2025
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-2)", margin: "0.3rem 0 0 0" }}>
            Desempeño electoral oficial registrado por el Servicio Electoral (SERVEL) y evolución parlamentaria.
          </p>
        </div>

        {/* Badge Pacto / Coalición */}
        <div
          style={{
            padding: "0.4rem 0.8rem",
            background: "var(--surface-2)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: "0.68rem", color: "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
            Pacto Electoral · {datos.coalicion}
          </div>
          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-1)", marginTop: "0.1rem" }}>
            {datos.pacto}
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principales */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Votación 2025 Cámara */}
        <div
          style={{
            padding: "1rem",
            background: "var(--surface-2)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
            Votos Cámara (Diputados 2025)
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-1)", marginTop: "0.25rem", fontFamily: "monospace" }}>
            {datos.votosDiputados2025.toLocaleString("es-CL")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.2rem" }}>
            <strong>{formatPct(datos.pctDiputados2025, 2)}</strong> de la votación nacional válida
          </div>
        </div>

        {/* Comparativa vs 2021 (Delta) */}
        <div
          style={{
            padding: "1rem",
            background: "var(--surface-2)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
            Variación vs. Elección 2021
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                color: colorDelta,
                background: bgDelta,
                padding: "0.2rem 0.55rem",
                borderRadius: "6px",
                fontFamily: "monospace",
              }}
            >
              {datos.simboloFlecha} {datos.deltaPct > 0 ? `+${datos.deltaPct.toFixed(2)}` : datos.deltaPct.toFixed(2)} pp
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.25rem" }}>
            2021: <strong>{formatPct(datos.pctDiputados2021, 2)}</strong> ({datos.escañosDiputados2021} diputados)
          </div>
        </div>

        {/* Escaños Electos vs Actuales */}
        <div
          style={{
            padding: "1rem",
            background: "var(--surface-2)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
            Escaños Electos vs. Actuales
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-1)", marginTop: "0.25rem" }}>
            {datos.escañosDiputados2025}D · {datos.escañosSenadores2025}S
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.2rem" }}>
            {datos.totalEscañosElectos2025} electos en 2025 → <strong>{datos.totalEscañosActuales} en bancada actual</strong>
          </div>
        </div>

        {/* Votos Senado 2025 */}
        <div
          style={{
            padding: "1rem",
            background: "var(--surface-2)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase" }}>
            Votos Senado (2025)
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-1)", marginTop: "0.25rem", fontFamily: "monospace" }}>
            {datos.votosSenadores2025.toLocaleString("es-CL")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.2rem" }}>
            Total general: <strong>{datos.totalVotos2025.toLocaleString("es-CL")} votos</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
