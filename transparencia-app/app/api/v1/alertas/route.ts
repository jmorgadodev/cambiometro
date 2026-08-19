import { apiSuccess } from "@/lib/api-v1";
import { getEvidenceForPolitico, getPoliticoById, getSnapshotSummary } from "@/lib/data-source";
import { CAMBIOS_VERIFICADOS, getPoliticoPath } from "@/lib/public-changes";

export async function GET(request: Request) {
  const data = await Promise.all(CAMBIOS_VERIFICADOS.map(async (cambio) => {
    const politico = getPoliticoById(cambio.politicoId);
    const evidencia = politico ? await getEvidenceForPolitico(politico) : [];
    return {
      id: cambio.id,
      politico_id: cambio.politicoId,
      politico_nombre: cambio.politico,
      nivel_gravedad: cambio.tipo,
      tipo_alerta: "InicioPeriodo",
      descripcion: cambio.descripcion,
      fecha: cambio.fechaIso,
      fuente_nomina: politico?.fuente ?? null,
      evidencia_etl: evidencia.map((source) => ({ fuente: source.source.label, registros: source.records.length, url: source.source.url })),
      url: getPoliticoPath(cambio.politicoId),
    };
  }));
  const snapshot = getSnapshotSummary();
  return apiSuccess(data, {
    total: data.length,
    tipoFeed: "registro editorial versionado",
    fuente: "El Cambiometro - cambiometro.impulsacv.cl",
    snapshotEtl: snapshot,
    updatedAt: snapshot.generatedAt,
    stale: snapshot.generatedAt ? Date.now() - Date.parse(snapshot.generatedAt) > 36 * 3_600_000 : true,
  }, { self: request.url }, 300);
}
