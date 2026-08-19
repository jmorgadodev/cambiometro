"use client";

import { useState } from "react";

type PoliticoData = {
  id: string;
  nombre_completo: string;
  cargo: string;
  foto_url: string;
  distrito_region: string;
  votos_2025: number | null;
  partido_sigla: string;
  partido_color: string;
  votosSi: number;
  votosNo: number;
  votosAbst: number;
  votosNoVota: number;
  totalVotaciones: number;
  pctAsistencia: number | null;
  pctSi: number | null;
  gastoTotal: number;
  ultimoMesGasto: string | null;
  apoyoTotal: number;
  apoyoN: number;
  apoyoMes: string | null;
};

function formatCLP(n: number) {
  if (n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  return `$${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}

function MetricRow({ label, val1, val2, higherIsBetter }: { label: string; val1: string | number | null; val2: string | number | null; higherIsBetter?: boolean }) {
  const num1 = typeof val1 === "number" ? val1 : null;
  const num2 = typeof val2 === "number" ? val2 : null;
  const winner1 = num1 !== null && num2 !== null && (higherIsBetter ? num1 > num2 : num1 < num2);
  const winner2 = num1 !== null && num2 !== null && (higherIsBetter ? num2 > num1 : num2 < num1);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ fontFamily: "monospace", fontWeight: winner1 ? 800 : 400, color: winner1 ? "var(--accent)" : "var(--text-primary)", textAlign: "right" }}>
        {val1 ?? "—"}
        {winner1 && <span style={{ marginLeft: "0.25rem", color: "var(--ok)" }}>★</span>}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontWeight: winner2 ? 800 : 400, color: winner2 ? "var(--accent)" : "var(--text-primary)", textAlign: "left" }}>
        {winner2 && <span style={{ marginRight: "0.25rem", color: "var(--ok)" }}>★</span>}
        {val2 ?? "—"}
      </div>
    </div>
  );
}

export default function CompararClient({ politicos }: { politicos: PoliticoData[] }) {
  const [p1Id, setP1Id] = useState<string>(politicos[0]?.id ?? "");
  const [p2Id, setP2Id] = useState<string>(politicos[1]?.id ?? "");

  const pol1 = politicos.find((p) => p.id === p1Id) ?? politicos[0];
  const pol2 = politicos.find((p) => p.id === p2Id) ?? politicos[1];

  if (!pol1 || !pol2) return null;

  const hayVotaciones1 = pol1.totalVotaciones > 0;
  const hayVotaciones2 = pol2.totalVotaciones > 0;
  const hayDatos = hayVotaciones1 || hayVotaciones2 || pol1.gastoTotal > 0 || pol2.gastoTotal > 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          background: "var(--surface)",
          padding: "2.5rem 0 2rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="container-main">
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", marginBottom: "0.5rem" }}>
            ⚖️ Comparador Lado a Lado
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: 640 }}>
            Compara votaciones en sala, gastos operacionales y equipo de apoyo con datos reales del Congreso.
          </p>
        </div>
      </section>

      <div className="container-main" style={{ padding: "2.5rem 1.5rem" }}>
        {/* Selectors */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem", display: "block" }}>
              Seleccionar Representante 1
            </label>
            <select
              value={p1Id}
              onChange={(e) => setP1Id(e.target.value)}
              className="calculator-input"
              style={{ fontSize: "0.9rem" }}
            >
              {politicos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_completo} ({p.cargo} · {p.partido_sigla})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem", display: "block" }}>
              Seleccionar Representante 2
            </label>
            <select
              value={p2Id}
              onChange={(e) => setP2Id(e.target.value)}
              className="calculator-input"
              style={{ fontSize: "0.9rem" }}
            >
              {politicos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_completo} ({p.cargo} · {p.partido_sigla})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Profile headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {[pol1, pol2].map((pol) => (
            <div key={pol.id} className="card-flat" style={{ borderTop: `4px solid ${pol.partido_color}`, display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pol.foto_url}
                alt={pol.nombre_completo}
                style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", background: "var(--bg-surface-2)", flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{pol.nombre_completo}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {pol.cargo} · {pol.partido_sigla} · {pol.distrito_region}
                </div>
                {pol.votos_2025 && (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                    {pol.votos_2025.toLocaleString("es-CL")} votos en 2025
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Metrics table */}
        {hayDatos ? (
          <div className="card-flat">
            <div className="section-title" style={{ marginBottom: "1rem" }}>📊 Datos verificados con fuente</div>

            {/* Votaciones */}
            {(hayVotaciones1 || hayVotaciones2) && (
              <>
                <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, padding: "0.5rem 0 0.25rem", borderBottom: "1px solid var(--border)" }}>
                  Votaciones en sala · Fuente: opendata.camara.cl / web-back.senado.cl
                </div>
                <MetricRow label="Total votaciones registradas" val1={pol1.totalVotaciones} val2={pol2.totalVotaciones} higherIsBetter />
                <MetricRow label="% Asistencia (voto emitido)" val1={pol1.pctAsistencia !== null ? `${pol1.pctAsistencia}%` : null} val2={pol2.pctAsistencia !== null ? `${pol2.pctAsistencia}%` : null} />
                <MetricRow label="Votos Sí" val1={pol1.votosSi} val2={pol2.votosSi} />
                <MetricRow label="Votos No" val1={pol1.votosNo} val2={pol2.votosNo} />
                <MetricRow label="Abstenciones" val1={pol1.votosAbst} val2={pol2.votosAbst} />
                <MetricRow label="No vota / Dispensado" val1={pol1.votosNoVota} val2={pol2.votosNoVota} />
                <MetricRow label="% Afirmativo" val1={pol1.pctSi !== null ? `${pol1.pctSi}%` : null} val2={pol2.pctSi !== null ? `${pol2.pctSi}%` : null} />
              </>
            )}

            {/* Gastos operacionales */}
            {(pol1.gastoTotal > 0 || pol2.gastoTotal > 0) && (
              <>
                <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, padding: "0.75rem 0 0.25rem", borderBottom: "1px solid var(--border)" }}>
                  Gastos operacionales rendidos · Fuente: Cámara / Senado (Transparencia Activa)
                </div>
                <MetricRow
                  label="Total gastos rendidos"
                  val1={pol1.gastoTotal > 0 ? formatCLP(pol1.gastoTotal) : "Sin registros"}
                  val2={pol2.gastoTotal > 0 ? formatCLP(pol2.gastoTotal) : "Sin registros"}
                />
              </>
            )}

            {/* Equipo de apoyo */}
            {(pol1.apoyoTotal > 0 || pol2.apoyoTotal > 0) && (
              <>
                <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, padding: "0.75rem 0 0.25rem", borderBottom: "1px solid var(--border)" }}>
                  Personal de apoyo · Fuente: nómina oficial Cámara{pol1.apoyoMes ?? pol2.apoyoMes ? ` (${pol1.apoyoMes ?? pol2.apoyoMes})` : ""}
                </div>
                <MetricRow
                  label="Gasto mensual equipo apoyo"
                  val1={pol1.apoyoTotal > 0 ? formatCLP(pol1.apoyoTotal) : "—"}
                  val2={pol2.apoyoTotal > 0 ? formatCLP(pol2.apoyoTotal) : "—"}
                />
                <MetricRow
                  label="Nro. personas en equipo"
                  val1={pol1.apoyoN > 0 ? pol1.apoyoN : null}
                  val2={pol2.apoyoN > 0 ? pol2.apoyoN : null}
                />
              </>
            )}

            <p style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: "1rem", lineHeight: 1.6 }}>
              ★ indica el valor más favorable según la métrica. Fuentes: votaciones de sala desde opendata.camara.cl
              (Cámara) y web-back.senado.cl (Senado); gastos desde los sistemas de Transparencia Activa de Cámara
              y Senado; personal de apoyo desde la nómina oficial de la Cámara de Diputadas y Diputados.
              No se publican métricas, alertas ni scores sin fuente verificable.
            </p>
          </div>
        ) : (
          <div className="card-flat" style={{ textAlign: "center", padding: "2.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📭</div>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Sin datos verificados para esta combinación</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: 480, margin: "0 auto" }}>
              Las fuentes disponibles (Cámara, Senado, Transparencia Activa) no tienen registros para estos dos
              representantes. Prueba seleccionar diputados del período 2026-2030 con votaciones registradas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
