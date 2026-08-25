import { NextResponse } from "next/server";
import {
  getEvidenceForPolitico,
  getPartidoById,
  getPoliticoById,
  getSnapshotSummary,
} from "@/lib/data-source";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const politico = getPoliticoById(id);

  if (!politico) {
    return NextResponse.json(
      { error: "Político no encontrado" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  const partido = getPartidoById(politico.partido_id);

  return NextResponse.json(
    {
      data: {
        ...politico,
        partido: partido ?? null,
        evidencia: await getEvidenceForPolitico(politico),
        url_ficha: `https://cambiometro.impulsacv.cl/politico/${id}`,
      },
      meta: {
        version: "v1",
        generado_en: new Date().toISOString(),
        fuente: "El Cambiómetro — cambiometro.impulsacv.cl",
        licencia: "Datos públicos oficiales. Uso libre con atribución.",
        snapshot_etl: getSnapshotSummary(),
      },
      links: {
        self: request.url,
        canonical: `https://cambiometro.impulsacv.cl/politico/${id}`,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        "Access-Control-Allow-Origin": "*",
        "X-Powered-By": "ImpulsaCV",
      },
    }
  );
}
