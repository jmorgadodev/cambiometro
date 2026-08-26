import type { Metadata } from "next";
import Link from "next/link";
import { leerServelV1 } from "@/lib/servel";

export const metadata: Metadata = {
  title: "Rankings electorales 2025 · SERVEL",
  description: "Resultados oficiales de la elección general 2025-11-16: candidatos más votados y pactos por contienda.",
};

const CONTEST_LABEL: Record<string, string> = {
  deputies: "Cámara de Diputadas y Diputados",
  senators: "Senado",
  president: "Presidencial",
};

export default function RankingsPage() {
  const servel = leerServelV1();
  const candidatos = servel?.candidatos ?? [];
  const hasData = candidatos.length > 0;
  const porContest = (contest: string) => candidatos.filter((c) => c.contest === contest);
  const n = (amount: number) => amount.toLocaleString("es-CL");

  return (
    <main>
      <section className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <p className="eyebrow">Elección general 16/11/2025 · SERVEL</p>
            <h1>Rankings electorales</h1>
            <p>Candidatos más votados y pactos por contienda, desde la proyección oficial normalizada del lake.</p>
          </div>
          <dl className="page-fact-sheet">
            <div>
              <dt>Candidatos</dt>
              <dd>{hasData && servel?.total_candidatos ? n(servel.total_candidatos) : "23.894 (en proceso)"}</dd>
            </div>
            <div>
              <dt>Pactos</dt>
              <dd>{hasData && servel?.pactos.length ? n(servel.pactos.length) : "En actualización"}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{servel?.election_date ?? "16/11/2025"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="container-main entity-layout">
        {!hasData && (
          <div
            role="alert"
            style={{
              background: "var(--warn-bg)",
              border: "1px solid var(--warn)",
              borderRadius: 8,
              padding: "1.25rem",
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden="true">⚠</span>
              <div>
                <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                  Rankings en actualización: SERVEL 2025 cargado (23.894 registros). Materialización pendiente.
                </strong>
                <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Última sinc: 21-08-2026 ·{" "}
                  <a
                    href="https://www.servel.cl/resultados-electorales/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)", textDecoration: "underline" }}
                  >
                    Ver fuente oficial ↗
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {(["deputies", "senators"] as const).map((contest) => {
          const lista = porContest(contest).slice(0, 15);
          return (
            <section key={contest} aria-labelledby={`top-${contest}`}>
              <div className="section-heading">
                <div><p className="eyebrow">{CONTEST_LABEL[contest]}</p><h2 id={`top-${contest}`}>Candidatos más votados</h2></div>
                <span>{hasData ? `${porContest(contest).length} candidatos` : "Materialización pendiente"}</span>
              </div>
              <div className="table-shell">
                <table className="data-table">
                  <thead><tr><th>#</th><th>Candidato/a</th><th>Pacto</th><th>Partido</th><th>Votos</th><th>Electo</th><th>Ficha</th></tr></thead>
                  <tbody>
                    {lista.length > 0 ? (
                      lista.map((c, index) => (
                        <tr key={c.id}>
                          <td>{index + 1}</td>
                          <td><strong>{c.name}</strong></td>
                          <td>{c.pact ?? "Independiente"}</td>
                          <td>{c.party ?? "—"}</td>
                          <td style={{ fontFamily: "monospace" }}>{n(c.votes_total)}</td>
                          <td>{c.elected ? "✓" : "—"}</td>
                          <td><Link prefetch={false} className="data-link" href={`/cruces?q=${encodeURIComponent(c.name)}`}>Buscar ficha ↗</Link></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
                          Rankings en actualización · 23.894 registros SERVEL 2025 cargados en lake
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <section aria-labelledby="pactos-title">
          <div className="section-heading">
            <div><p className="eyebrow">Pactos por contienda</p><h2 id="pactos-title">Votación y escaños por pacto</h2></div>
            <span>{hasData && servel?.pactos ? `${servel.pactos.length} pactos` : "Materialización pendiente"}</span>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead><tr><th>Contienda</th><th>Pacto</th><th>Lista</th><th>Votos</th><th>Candidatos</th><th>Electos</th></tr></thead>
              <tbody>
                {(servel?.pactos ?? []).length > 0 ? (
                  (servel?.pactos ?? []).map((p) => (
                    <tr key={`${p.contest}-${p.pact}`}>
                      <td>{CONTEST_LABEL[p.contest] ?? p.contest}</td>
                      <td><strong>{p.pact}</strong></td>
                      <td>{p.pact_letter ?? "—"}</td>
                      <td style={{ fontFamily: "monospace" }}>{n(p.votes_total)}</td>
                      <td>{p.candidatos}</td>
                      <td>{p.electos}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
                      Pactos en actualización · 23.894 registros SERVEL 2025 cargados en lake
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="relation-disclaimer">Resultados oficiales SERVEL 2025 normalizados en la proyección lake v1; votos a nivel de candidato sumados desde registros por circunscripción.</p>
        </section>
      </div>
    </main>
  );
}