import type { CamaraTransparencyCategory, CamaraTransparencySection } from "@/lib/personal-apoyo";

const CATEGORY_DETAILS: Record<CamaraTransparencyCategory, { label: string; page: string }> = {
  asesorias_externas: { label: "Asesorías externas", page: "asesoriaexterna.aspx" },
  pasajes_aereos_nacionales: { label: "Pasajes aéreos nacionales", page: "pasajesaereos.aspx" },
  instancias_internacionales: { label: "Participación en instancias internacionales", page: "instanciainternacionales.aspx" },
  audiencias_no_lobby: { label: "Audiencias no regidas por la Ley del Lobby", page: "audiencia.aspx" },
};

function sortPeriods(section: CamaraTransparencySection) {
  if (section.periods?.length) return [...section.periods].sort((a, b) => periodSortKey(b.period).localeCompare(periodSortKey(a.period)));
  return [{
    period: section.period,
    status: section.status,
    rows: section.rows,
    retrieved_at: section.retrieved_at,
  }];
}

function periodSortKey(period: string) {
  const months: Record<string, string> = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };
  const normalized = period.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const match = normalized.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/);
  return match ? `${match[2]}-${months[match[1]]}` : normalized;
}

export function CamaraTransparencyDetails({
  deputyId,
  sections,
}: {
  deputyId: string;
  sections: Partial<Record<CamaraTransparencyCategory, CamaraTransparencySection>> | undefined;
}) {
  return (
    <section aria-labelledby="camara-transparency-title" style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "0.85rem", paddingTop: "0.75rem" }}>
      <h3 id="camara-transparency-title" style={{ fontSize: "0.82rem", margin: "0 0 0.5rem" }}>Registros de transparencia publicados por Cámara</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", margin: "0 0 0.65rem" }}>
        Se muestran por categoría y período. No se suman a la dieta ni al costo mensual del parlamentario.
      </p>
      <div style={{ display: "grid", gap: "0.45rem" }}>
        {(Object.entries(CATEGORY_DETAILS) as [CamaraTransparencyCategory, (typeof CATEGORY_DETAILS)[CamaraTransparencyCategory]][]).map(([category, detail]) => {
          const section = sections?.[category];
          const records = section?.periods?.length
            ? section.periods.reduce((total, period) => total + period.rows.length, 0)
            : section?.rows.length ?? 0;
          const url = `https://www.camara.cl/diputados/detalle/${detail.page}?prmId=${encodeURIComponent(deputyId)}`;

          return (
            <details key={category} style={{ border: "1px solid var(--border-subtle)", borderRadius: "0.5rem", padding: "0.55rem 0.7rem" }}>
              <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.76rem" }}>
                <span>{detail.label}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {!section ? "Sin corte incorporado" : section.status === "unknown" || section.status === "unavailable"
                    ? "Corte no verificado" : records === 0
                      ? "Sin registros en cortes incorporados" : `${records} registros en cortes incorporados`}
                </span>
              </summary>
              {section ? (
                <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.6rem" }}>
                  {sortPeriods(section).map((period) => (
                    <div key={period.period ?? "sin-periodo"}>
                      <h4 style={{ fontSize: "0.72rem", margin: "0 0 0.4rem" }}>{period.period ?? "Período no informado por la fuente"}</h4>
                      {period.rows.length ? (
                        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                          <table style={{ borderCollapse: "collapse", fontSize: "0.72rem", minWidth: "34rem", width: "100%" }}>
                            <thead>
                              <tr>
                                {Object.keys(period.rows[0].values).map((column) => (
                                  <th key={column} scope="col" style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.4rem", textAlign: "left" }}>{column}</th>
                                ))}
                                <th scope="col" style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.4rem", textAlign: "left" }}>Evidencia</th>
                              </tr>
                            </thead>
                            <tbody>
                              {period.rows.map((row, rowIndex) => (
                                <tr key={`${category}-${period.period}-${rowIndex}`}>
                                  {Object.keys(period.rows[0].values).map((column) => (
                                    <td key={column} style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.4rem", verticalAlign: "top" }}>{row.values[column] || "—"}</td>
                                  ))}
                                  <td style={{ borderBottom: "1px solid var(--border-subtle)", padding: "0.4rem", verticalAlign: "top" }}>
                                    {row.sourceLinks.length ? row.sourceLinks.map((link, index) => (
                                      <a key={link} href={link} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>Documento {index + 1} ↗</a>
                                    )) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p role="status" style={{ color: "var(--text-muted)", fontSize: "0.7rem", margin: 0 }}>
                          {period.status === "empty_confirmed" ? "La Cámara no registra elementos en este corte."
                            : section.status === "unavailable" ? "No se pudo consultar esta categoría; revisa el registro oficial."
                              : "No hay filas verificables para este corte; consulta el registro oficial."}
                        </p>
                      )}
                    </div>
                  ))}
                  <small style={{ color: "var(--text-muted)" }}>Consulta el registro oficial completo: <a href={url} target="_blank" rel="noopener noreferrer">{detail.label} ↗</a></small>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", margin: "0.5rem 0 0" }}>
                  Aún no hay un corte incorporado. <a href={url} target="_blank" rel="noopener noreferrer">Consultar en la Cámara ↗</a>
                </p>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
