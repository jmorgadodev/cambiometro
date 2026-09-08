import type { Metadata } from "next";
import releaseManifest from "@/data/remuneraciones-38bis-publico-manifest.json";
import Remuneraciones38BisClient from "@/components/remuneraciones/Remuneraciones38BisClient";

export const metadata: Metadata = {
  title: "Remuneraciones públicas — El Cambiómetro",
  description: "Consulta mensual de remuneraciones brutas publicadas por organismo, cargo y persona, con trazabilidad y comparación entre cortes.",
  alternates: { canonical: "/remuneraciones-publicas" },
};

export default function RemuneracionesPublicasPage() {
  const { initial_rows: initialRows, ...manifest } = releaseManifest;
  return <Remuneraciones38BisClient manifest={manifest} initialRows={initialRows} />;
}
