import { getSnapshotSummary } from "@/lib/data-source";
import { createOgSvg, svgResponse } from "@/lib/og-card";

export const dynamic = "force-static";

export async function GET() {
  const snapshot = getSnapshotSummary();
  return svgResponse(createOgSvg({
    title: "Datos públicos con trazabilidad",
    subtitle: "Autoridades · instituciones · registros · fuentes oficiales",
    freshness: `Datos ETL: ${snapshot.generatedAtChile ?? "sin fecha"}`,
    metric: `${snapshot.totalRecords.toLocaleString("es-CL")} registros disponibles`,
  }));
}
