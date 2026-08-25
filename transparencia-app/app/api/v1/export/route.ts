import { getAllPoliticosWithEvidence, getSnapshotSummary } from "@/lib/data-source";
import { enforceExportRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/forms/turnstile";
import { csvCell } from "@/lib/format";

export const dynamic = "force-dynamic";

const EXPORT_TIMEOUT_MS = 30_000;
const ONE_MB = 1_048_576;

interface ExportFilterParams {
  format?: string;
  cargo?: string;
  partido?: string;
  distrito_region?: string;
  q?: string;
  limit?: number;
}

async function exportRows(filters: ExportFilterParams = {}) {
  const politicos = await getAllPoliticosWithEvidence();
  let rows = politicos.map(({ politico, partido, evidencia }) => {
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

  if (filters.cargo) {
    const cargoLower = filters.cargo.toLowerCase();
    rows = rows.filter((r) => r.cargo?.toLowerCase().includes(cargoLower));
  }
  if (filters.partido) {
    const partidoLower = filters.partido.toLowerCase();
    rows = rows.filter((r) => r.partido_sigla.toLowerCase() === partidoLower);
  }
  if (filters.distrito_region) {
    const distLower = filters.distrito_region.toLowerCase();
    rows = rows.filter((r) => r.distrito_region?.toLowerCase().includes(distLower));
  }
  if (filters.q) {
    const qLower = filters.q.toLowerCase();
    rows = rows.filter((r) =>
      r.nombre_completo.toLowerCase().includes(qLower) ||
      r.partido_sigla.toLowerCase().includes(qLower) ||
      (r.distrito_region?.toLowerCase().includes(qLower) ?? false)
    );
  }
  if (filters.limit && filters.limit > 0) {
    rows = rows.slice(0, filters.limit);
  }

  return rows;
}

export async function GET(request: Request) {
  const limited = await enforceExportRateLimit(request);
  if (limited) return limited;

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Filtros obligatorios: no se permite dump completo sin parámetros
  if (searchParams.size === 0) {
    return Response.json({
      error: {
        code: "MISSING_PARAMETERS",
        message: "Filtros obligatorios requeridos: especifique al menos un parámetro (ej. format=csv, format=json, cargo, partido, q, limit). No se permite volcado completo sin parámetros.",
      },
    }, {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  const format = searchParams.get("format") ?? "csv";
  const cargo = searchParams.get("cargo") ?? undefined;
  const partido = searchParams.get("partido") ?? undefined;
  const distrito_region = searchParams.get("distrito_region") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const executeExport = async (): Promise<Response> => {
      const rows = await exportRows({ format, cargo, partido, distrito_region, q, limit });
      const snapshot = getSnapshotSummary();

      let payloadString: string;
      let contentType: string;
      let filename: string;

      if (format === "json") {
        payloadString = JSON.stringify({ data: rows, meta: { version: "v1", count: rows.length, snapshot_etl: snapshot } });
        contentType = "application/json";
        filename = "transparencia_chile.json";
      } else {
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

        payloadString = `${header}\n${csv}`;
        contentType = "text/csv";
        filename = "transparencia_chile.csv";
      }

      const byteLength = new TextEncoder().encode(payloadString).byteLength;

      // Turnstile para exports > 1MB
      if (byteLength > ONE_MB) {
        const turnstileToken = request.headers.get("cf-turnstile-response")
          || request.headers.get("x-turnstile-token")
          || searchParams.get("turnstile_token");

        const verification = await verifyTurnstileToken(turnstileToken, request);
        if (!verification.success) {
          return Response.json({
            error: {
              code: "TURNSTILE_REQUIRED",
              message: "Descargas masivas superiores a 1MB requieren verificación Turnstile anti-bots. Proporcione token en cabecera 'cf-turnstile-response' o 'x-turnstile-token'.",
            },
          }, {
            status: 403,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "no-store",
            },
          });
        }
      }

      return new Response(payloadString, {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          "Content-Disposition": `attachment; filename=${filename}`,
        },
      });
    };

    const timeoutPromise = new Promise<Response>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("EXPORT_TIMEOUT")), EXPORT_TIMEOUT_MS);
      if (typeof timer === "object" && "unref" in timer) timer.unref();
    });

    return await Promise.race([executeExport(), timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === "EXPORT_TIMEOUT") {
      return Response.json({
        error: {
          code: "TIMEOUT",
          message: "La exportación excedió el tiempo límite de 30 segundos.",
        },
      }, {
        status: 504,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }
    throw error;
  }
}
