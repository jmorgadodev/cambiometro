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
      <section id="detalle-38bis" className="page-shell remuneration-detail-module" aria-labelledby="remuneraciones-38bis-detail-title" style={{ paddingTop: "1rem" }}>
        <details className="remuneration-panel">
          <summary><span><span className="eyebrow">03 · DETALLE</span><strong id="remuneraciones-38bis-detail-title">Registro 38 bis: historial, cambios y filas originales</strong></span><small>Ver detalle mensual</small></summary>
          <Remuneraciones38BisClient manifest={manifest as unknown as ReleaseManifest} initialRows={initialRows} />
        </details>
      </section>
    </>
  );
}
