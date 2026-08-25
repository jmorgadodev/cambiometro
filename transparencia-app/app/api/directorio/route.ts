import { apiError, apiSuccess } from "@/lib/api-v1";
import { getD1Database } from "@/lib/db";

export const runtime = "edge";

interface DirectoryRow {
  id: string;
  nombre: string;
  sigla: string;
  tipo_organo: string;
  director_jefe_actual: string | null;
  ministerio_dependiente: string | null;
}

export async function GET(request: Request) {
  try {
    const db = await getD1Database();
    if (!db) return apiError("DATABASE_UNAVAILABLE", "D1 no esta disponible.", 503);
    const { results } = await db.prepare(
      "SELECT id,nombre,sigla,tipo_organo,director_jefe_actual,ministerio_dependiente FROM servicios_publicos ORDER BY nombre ASC",
    ).all<DirectoryRow>();
    return apiSuccess(results, { total: results.length }, { self: request.url }, 3600);
  } catch {
    return apiError("DATABASE_UNAVAILABLE", "No fue posible consultar el directorio.", 503);
  }
}
