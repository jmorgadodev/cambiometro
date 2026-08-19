import { getAllPoliticosWithEvidence, getSnapshotSummary } from "@/lib/data-source";
import { enforcePublicRateLimit } from "@/lib/rate-limit";
import { csvCell } from "@/lib/format";

async function exportRows() {
  const politicos = await getAllPoliticosWithEvidence();
  return politicos.map(({ politico, partido, evidencia }) => {
    return {
      id: politico.id,
      nombre_completo: politico.nombre_completo,
      cargo: politico.cargo,
      partido_sigla: partido?.sigla ?? "IND",
      distrito_region: politico.distrito_region,
      fuente: politico.fuente ?? null,
      evidencia_etl: evidencia.reduce((total, source) => total + source.records.length, 0),
    };
  });
}

export async function GET(request: Request) {
  const limited = await enforcePublicRateLimit(request, "export");
  if (limited) return limited;
  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  const rows = await exportRows();
  const snapshot = getSnapshotSummary();

  if (format === "json") {
    return Response.json(
      { data: rows, meta: { version: "v1", snapshot_etl: snapshot } },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          "Content-Disposition": "attachment; filename=transparencia_chile.json",
        },
      }
    );
  }

  // default to csv
  const header = [
    "id",
    "nombre_completo",
    "cargo",
    "partido_sigla",
    "distrito_region",
    "fuente",
    "evidencia_etl",
  ].join(",");

  const csv = rows
    .map((row) =>
      [
        csvCell(row.id),
        csvCell(row.nombre_completo),
        csvCell(row.cargo),
        csvCell(row.partido_sigla),
        csvCell(row.distrito_region),
        csvCell(row.fuente),
        csvCell(row.evidencia_etl),
      ].join(",")
    )
    .join("\n");

  const output = `${header}\n${csv}`;
  return new Response(output, {
    headers: {
      "Content-Type": "text/csv",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      "Content-Disposition": "attachment; filename=transparencia_chile.csv",
    },
  });
}
