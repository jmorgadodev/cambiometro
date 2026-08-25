import { getEvidenceForPolitico, getPartidoById, getPoliticoById, getSnapshotSummary } from "@/lib/data-source";
import { createOgSvg, svgResponse } from "@/lib/og-card";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const politico = getPoliticoById(id);

  if (!politico) return new Response("Not found", { status: 404 });


  const snapshot = getSnapshotSummary();
  const partido = politico ? getPartidoById(politico.partido_id) : null;
  const evidenciasList = await getEvidenceForPolitico(politico);
  const totalEvidencia = evidenciasList.reduce((total, source) => total + source.records.length, 0);

  return svgResponse(createOgSvg({
    title: politico.nombre_completo,
    subtitle: `${politico.cargo} · ${politico.distrito_region} · ${partido?.sigla ?? "IND"}`,
    freshness: `Datos ETL: ${snapshot.generatedAtChile ?? "sin fecha"}`,
    metric: `${totalEvidencia} evidencias disponibles`,
  }));
}
