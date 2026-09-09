import type { Metadata } from "next";
import releaseManifest from "@/data/remuneraciones-38bis-publico-manifest.json";
import Remuneraciones38BisClient, { type ReleaseManifest } from "@/components/remuneraciones/Remuneraciones38BisClient";
import RemuneracionesUnifiedExplorer from "@/components/remuneraciones/RemuneracionesUnifiedExplorer";

export const metadata: Metadata = {
  title: "Remuneraciones públicas — El Cambiómetro",
  description: "Consulta mensual de remuneraciones brutas publicadas por organismo, cargo y persona, con trazabilidad y comparación entre cortes.",
  alternates: { canonical: "/remuneraciones-publicas" },
};

export default function RemuneracionesPublicasPage() {
  const { initial_rows: initialRows, ...manifest } = releaseManifest;
  return (
    <>
      <RemuneracionesUnifiedExplorer />
      <section className="page-shell" aria-labelledby="remuneraciones-38bis-detail-title" style={{ paddingTop: "1rem" }}>
        <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: "0.35rem" }}>DETALLE POR FUENTE</div>
        <h2 id="remuneraciones-38bis-detail-title" style={{ margin: 0, fontSize: "clamp(1.35rem, 3vw, 2rem)" }}>Registro 38 bis: historial, cambios y filas originales</h2>
      </section>
      <Remuneraciones38BisClient manifest={manifest as unknown as ReleaseManifest} initialRows={initialRows} />
    </>
  );
}
