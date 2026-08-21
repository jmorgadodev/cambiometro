import type { Metadata } from "next";
import Link from "next/link";
import { getAllCrosses } from "@/lib/data-platform-v1";
import { leerContraloriaV1 } from "@/lib/contraloria-lake";
import { leerChileCompraV1 } from "@/lib/chilecompra";
import { leerInfoLobbyV1 } from "@/lib/infolobby";
import CrucesExplorerClient from "@/components/cruces/CrucesExplorerClient";
import { getLey19862Summary } from "@/lib/transferencias-data";

export const metadata: Metadata = {
  title: "Explorador de Cruces de Datos Públicos — El Cambiómetro",
  description:
    "Cruces documentales trazables entre compras públicas, auditorías de Contraloría, lobby, votaciones y autoridades del Estado chileno.",
  alternates: { canonical: "/cruces" },
};

export default async function CrossesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const rawQuery = params.q?.trim() ?? "";
  const crosses = await getAllCrosses();

  const contraloria = leerContraloriaV1();
  const chilecompra = leerChileCompraV1();
  const infolobby = leerInfoLobbyV1();
  const ley19862 = getLey19862Summary();

  const clp = (amount: number | null) => {
    if (amount === null || amount <= 0) return "—";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(amount);
  };

  const montosChilecompra = chilecompra?.buyers
    ?.map((buyer) => buyer.monto_total_clp)
    .filter((amount): amount is number => typeof amount === "number") ?? [];
  const totalChilecompraMonto = typeof chilecompra?.total_adjudicado_clp === "number"
    ? chilecompra.total_adjudicado_clp
    : montosChilecompra.length > 0
      ? montosChilecompra.reduce((sum, amount) => sum + amount, 0)
      : null;

  const procesosChilecompra = chilecompra?.buyers
    ?.map((buyer) => buyer.procesos)
    .filter((count): count is number => typeof count === "number") ?? [];
  const totalChilecompraProcesos = procesosChilecompra.length > 0
    ? procesosChilecompra.reduce((sum, count) => sum + count, 0)
    : null;

  return (
    <main>
      {/* ─── 1. HEADER (Título + UNA línea exacta C3) ─────────────────────────── */}
      <section className="page-masthead">
        <div className="container-main">
          <div style={{ maxWidth: 880 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span className="badge badge-info">Relaciones Documentales Oficiales</span>
              <span className="badge badge-ok">Grafo de Evidencias</span>
            </div>
            <h1
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.4rem)",
                fontWeight: 900,
                color: "var(--text-1)",
                margin: "0 0 0.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              Explorador de Cruces Públicos
            </h1>
            <p
              style={{
                fontSize: "0.95rem",
                color: "var(--text-2)",
                lineHeight: 1.5,
                margin: 0,
                fontWeight: 500,
              }}
            >
              Un cruce es una relación documental entre autoridades, organismos, proveedores y auditorías, respaldada por identificadores oficiales.
            </p>
          </div>
        </div>
      </section>

      <div className="container-main" style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "2.25rem", paddingBottom: "4rem" }}>
        {/* ─── 2. KPIS (4) (Fix $0 Compras Públicas OCDS) ────────────────────── */}
        <section aria-label="Estadísticas de fuentes y relaciones">
          <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {/* KPI 1 */}
            <div className="stat-tile stat-tile--accent">
              <div className="stat-tile__value">{crosses.length.toLocaleString("es-CL")}</div>
              <div className="stat-tile__label">Relaciones en Grafo</div>
              <div className="stat-tile__hint">{crosses.length.toLocaleString("es-CL")} relaciones agregadas</div>
            </div>

            {/* KPI 2 */}
            <div className="stat-tile stat-tile--ok">
              <div className="stat-tile__value">{contraloria?.records.length ?? "—"}</div>
              <div className="stat-tile__label">Auditorías CGR</div>
              <div className="stat-tile__hint">Informes de fiscalización 2025-2026</div>
            </div>

            {/* KPI 3 (Monto real, NUNCA $0) */}
            <div className="stat-tile stat-tile--warn">
              <div className="stat-tile__value">{clp(totalChilecompraMonto)}</div>
              <div className="stat-tile__label">Compras ChileCompra</div>
              <div className="stat-tile__hint">{totalChilecompraProcesos?.toLocaleString("es-CL") ?? "—"} procesos OCDS</div>
            </div>

            {/* KPI 4 */}
            <div className="stat-tile stat-tile--alert">
              <div className="stat-tile__value">{infolobby?.count?.toLocaleString("es-CL") ?? "—"}</div>
              <div className="stat-tile__label">Registros InfoLobby</div>
              <div className="stat-tile__hint">Audiencias, viajes y donativos</div>
            </div>
          </div>
        </section>

        {/* ─── 3. EXPLORADOR ÚNICO (PRESETS + CHIPS + TABLA 20 + DRAWER) ───────── */}
        <CrucesExplorerClient initialRows={crosses} initialQuery={rawQuery} />

        {/* ─── 4. FUENTES Y COBERTURA (Cards con enlaces a módulos existentes) ── */}
        <section aria-label="Fuentes oficiales y cobertura">
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.3rem", color: "var(--text-primary)" }}>
              🏛️ Fuentes Oficiales y Cobertura Integrada
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Accede a los módulos y dashboards especializados que consolidan cada una de las fuentes del grafo.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* Card 1: CGR */}
            <div className="card" style={{ padding: "1.25rem", background: "var(--surface)", borderColor: "var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.3rem" }}>⚖️</span>
                <span className="badge badge-ok">{contraloria?.records.length ?? "—"} informes</span>
              </div>
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "block" }}>
                Contraloría General (CGR)
              </strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.3rem 0 0.85rem", lineHeight: 1.4 }}>
                Informes finales de auditoría y dictámenes vinculados a servicios públicos y municipios.
              </p>
              <Link href="/servicios-publicos" className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem", width: "100%", textAlign: "center" }}>
                Ver en Servicios Públicos →
              </Link>
            </div>

            {/* Card 2: ChileCompra */}
            <div className="card" style={{ padding: "1.25rem", background: "var(--surface)", borderColor: "var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.3rem" }}>🛒</span>
                <span className="badge badge-warn">{totalChilecompraProcesos?.toLocaleString("es-CL") ?? "—"} procesos</span>
              </div>
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "block" }}>
                ChileCompra MercadoPúblico
              </strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.3rem 0 0.85rem", lineHeight: 1.4 }}>
                Licitaciones públicas, tratos directos y convenios marco unificados por OCID oficial.
              </p>
              <Link href="/servicios-publicos" className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem", width: "100%", textAlign: "center" }}>
                Ver Compras Públicas →
              </Link>
            </div>

            {/* Card 3: InfoLobby */}
            <div className="card" style={{ padding: "1.25rem", background: "var(--surface)", borderColor: "var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.3rem" }}>🤝</span>
                <span className="badge badge-info">{infolobby?.count?.toLocaleString("es-CL") ?? "—"} registros</span>
              </div>
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "block" }}>
                InfoLobby (Ley 20.730)
              </strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.3rem 0 0.85rem", lineHeight: 1.4 }}>
                Registro de audiencias sostenidas con autoridades, viajes financiados y donativos.
              </p>
              <Link href="/politico" className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem", width: "100%", textAlign: "center" }}>
                Ver Autoridades y Lobby →
              </Link>
            </div>

            {/* Card 4: Ley 19.862 */}
            <div className="card" style={{ padding: "1.25rem", background: "var(--surface)", borderColor: "var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "1.3rem" }}>📑</span>
                <span className="badge badge-info">{ley19862.kpis.total_transfers.toLocaleString("es-CL")} registros</span>
              </div>
              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "block" }}>
                Transferencias Ley 19.862
              </strong>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.3rem 0 0.85rem", lineHeight: 1.4 }}>
                Aportes y transferencias del Estado a personas jurídicas y entidades privadas receptoras.
              </p>
              <Link href="/transferencias" className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem", width: "100%", textAlign: "center" }}>
                Ver Módulo Transferencias →
              </Link>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
            <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5, textAlign: "center" }}>
              ℹ️ <strong>Nota de rigor y transparencia</strong>: Una relación documental refleja vínculos registrados en fuentes públicas oficiales (CGR, ChileCompra, InfoLobby, CPLT, Hacienda) y no implica irregularidad ni responsabilidad penal o civil.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
