import type { DisciplinaBancada } from "@/lib/partido-estadisticas";
import { formatPct, formatFechaCorta } from "@/lib/format";

interface Props {
  disciplina: DisciplinaBancada;
  sigla: string;
}

export default function DisciplinaBancadaCard({ disciplina, sigla }: Props) {
  const tieneRebeldes = disciplina.topVotosRebeldes && disciplina.topVotosRebeldes.length > 0;

  return (
    <div
      className="card"
      id="disciplina-bancada-block"
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
            <span style={{ fontSize: "1.1rem" }}>⚖️</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-1)" }}>
              Disciplina de Bancada y Cohesión de Voto
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-2)", margin: "0.3rem 0 0 0" }}>
            Nivel de alineamiento interno en votaciones de sala registradas en el Congreso Nacional.
          </p>
        </div>

        {/* Indicador de Cohesión */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <div
            style={{
              padding: "0.4rem 0.75rem",
              background: "var(--ok-bg)",
              color: "var(--ok)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontWeight: 800,
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 700 }}>Cohesión Mayoritaria</div>
            <div>{formatPct(disciplina.pctDisciplina, 1)}</div>
          </div>

          <div
            style={{
              padding: "0.4rem 0.75rem",
              background: disciplina.pctRebelion > 5 ? "var(--warn-bg)" : "var(--surface-2)",
              color: disciplina.pctRebelion > 5 ? "var(--warn)" : "var(--text-2)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontWeight: 800,
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 700 }}>Tasa de Rebelión</div>
            <div>{formatPct(disciplina.pctRebelion, 1)}</div>
          </div>
        </div>
      </div>

      {/* Barra visual de disciplina */}
      <div>
        <div
          style={{
            width: "100%",
            height: "10px",
            background: "var(--surface-2)",
            borderRadius: "999px",
            overflow: "hidden",
            display: "flex",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: `${disciplina.pctDisciplina}%`,
              background: "var(--ok)",
              transition: "width 0.3s ease",
            }}
            title={`Votos en bloque mayoritario: ${disciplina.pctDisciplina}%`}
          />
          <div
            style={{
              width: `${disciplina.pctRebelion}%`,
              background: "var(--warn)",
              transition: "width 0.3s ease",
            }}
            title={`Votos rebeldes / disidentes: ${disciplina.pctRebelion}%`}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.35rem", fontSize: "0.72rem", color: "var(--text-3)" }}>
          <span>{disciplina.totalVotosCoincidentes.toLocaleString("es-CL")} votos con la mayoría ({formatPct(disciplina.pctDisciplina, 1)})</span>
          <span>{disciplina.totalVotosRebeldes.toLocaleString("es-CL")} votos disidentes ({formatPct(disciplina.pctRebelion, 1)})</span>
        </div>
      </div>

      {/* Top 3 Votaciones con Quiebre de Bancada */}
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-1)", marginBottom: "0.6rem" }}>
          Top 3 Votaciones con Mayor Quiebre de Bancada
        </div>

        {!tieneRebeldes ? (
          <div style={{ fontSize: "0.78rem", color: "var(--text-3)", padding: "0.75rem", background: "var(--surface-2)", borderRadius: "8px" }}>
            No se registran votaciones con quiebre o votos disidentes significativos en el período.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {disciplina.topVotosRebeldes.map((ses, idx) => (
              <div
                key={ses.id || idx}
                style={{
                  padding: "0.85rem",
                  background: "var(--surface-2)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-1)" }}>
                      {ses.descripcion}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-3)", marginTop: "0.15rem" }}>
                      📅 {formatFechaCorta(ses.fecha)} · {ses.tramite}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "6px",
                        background: "var(--bad-bg)",
                        color: "var(--bad)",
                        fontWeight: 700,
                      }}
                    >
                      ⚡ {ses.votosRebeldesCount} voto{ses.votosRebeldesCount > 1 ? "s" : ""} disidente{ses.votosRebeldesCount > 1 ? "s" : ""} (vs {ses.votosMayoriaCount} {ses.opcionMayoria})
                    </span>

                    {ses.url_tramitacion && (
                      <a
                        href={ses.url_tramitacion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capsule"
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.2rem 0.5rem",
                          textDecoration: "none",
                          background: "var(--surface)",
                          color: "var(--accent)",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          fontWeight: 600,
                        }}
                      >
                        Ver Acta ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Nombres de los disidentes */}
                {ses.rebeldes && ses.rebeldes.length > 0 && (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-2)", marginTop: "0.2rem", paddingTop: "0.3rem", borderTop: "1px dashed var(--border)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-3)" }}>Votaron distinto a la bancada: </span>
                    {ses.rebeldes.map((r, rIdx) => (
                      <span key={r.politico_id || rIdx}>
                        <strong>{r.nombre}</strong> ({r.opcion})
                        {rIdx < ses.rebeldes.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
