import { getD1Database } from "@/lib/db";
import { getLey19862Summary, type TransferenciaDetalle, type Ley19862Summary } from "@/lib/transferencias-data";
import { SOURCE_CANONICAL_COUNTS } from "@/lib/published-sources";

export interface TransferenciaQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  year?: string;
  emisor?: string;
  sortBy?: "monto" | "fecha";
  sortOrder?: "asc" | "desc";
}

export interface TransferenciasQueryResult {
  data: TransferenciaDetalle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  kpis: Ley19862Summary["kpis"];
  by_year: Record<string, { count: number; total: number }>;
}

export async function queryTransferencias(params: TransferenciaQueryParams = {}): Promise<TransferenciasQueryResult> {
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";
  const year = params.year?.trim() || "";
  const emisor = params.emisor?.trim() || "";
  const sortBy = params.sortBy === "fecha" ? "fecha" : "monto";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

  const summary = getLey19862Summary();
  const canonicalTotal = SOURCE_CANONICAL_COUNTS["ley-19862"] ?? summary.kpis?.total_transfers ?? 59361;
  const db = await getD1Database();

  if (db) {
    try {
      const conditions: string[] = [];
      const bindings: (string | number)[] = [];

      if (year && year !== "Todos") {
        conditions.push("periodo = ?");
        bindings.push(year);
      }

      if (emisor && emisor !== "Todos") {
        conditions.push("emisor_nombre = ?");
        bindings.push(emisor);
      }

      if (search) {
        conditions.push(
          "(emisor_nombre LIKE ? OR receptor_nombre LIKE ? OR materia LIKE ? OR emisor_rut LIKE ? OR receptor_rut LIKE ? OR comuna LIKE ?)"
        );
        const term = `%${search}%`;
        bindings.push(term, term, term, term, term, term);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const orderColumn = sortBy === "fecha" ? "fecha" : "monto_clp";
      const orderDirection = sortOrder.toUpperCase();

      // Total count query
      const countSql = `SELECT COUNT(*) as count FROM transferencias_19862 ${whereClause}`;
      const countRes = await db.prepare(countSql).bind(...bindings).first<{ count: number }>();
      const dbCount = countRes?.count ?? 0;
      const total = dbCount > 0 ? dbCount : canonicalTotal;

      // Data query
      const offset = (page - 1) * limit;
      const dataSql = `SELECT id, folio, fecha, periodo, emisor_nombre, emisor_rut, receptor_nombre, receptor_rut, materia, monto_clp, url_registro, clasificacion, comuna FROM transferencias_19862 ${whereClause} ORDER BY ${orderColumn} ${orderDirection} LIMIT ? OFFSET ?`;
      interface TransferenciaDbRow {
        id: string;
        folio?: string;
        fecha: string;
        periodo: string;
        emisor_nombre: string;
        emisor_rut: string | null;
        receptor_nombre: string;
        receptor_rut: string | null;
        materia: string;
        monto_clp: number;
        url_registro: string;
        clasificacion: string;
        comuna: string | null;
      }
      const { results } = await db.prepare(dataSql).bind(...bindings, limit, offset).all<TransferenciaDbRow>();

      if (results && results.length > 0) {
        const data: TransferenciaDetalle[] = results.map((row) => ({
          id: row.id,
          fecha: row.fecha,
          period: row.periodo,
          title: row.materia,
          description: null,
          classification: row.clasificacion,
          emitter_name: row.emisor_nombre,
          emitter_rut: row.emisor_rut,
          receiver_name: row.receptor_nombre,
          receiver_rut: row.receptor_rut,
          monto_clp: row.monto_clp,
          url: row.url_registro,
          municipality: row.comuna,
        }));

        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          kpis: summary.kpis,
          by_year: summary.by_year,
        };
      }
    } catch (error) {
      console.warn("D1 query transferencias fallback to projection:", error);
    }
  }

  // Fallback: In-memory filtering over summary
  let list = summary.transfers_sample || [];
  if (year && year !== "Todos") {
    list = list.filter((t) => t.period === year || (t.fecha && t.fecha.startsWith(year)));
  }
  if (emisor && emisor !== "Todos") {
    list = list.filter((t) => t.emitter_name && t.emitter_name.toLowerCase() === emisor.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.receiver_name && t.receiver_name.toLowerCase().includes(q)) ||
        (t.emitter_name && t.emitter_name.toLowerCase().includes(q)) ||
        (t.receiver_rut && t.receiver_rut.toLowerCase().includes(q)) ||
        (t.emitter_rut && t.emitter_rut.toLowerCase().includes(q)) ||
        (t.municipality && t.municipality.toLowerCase().includes(q))
    );
  }

  // Sorting
  list = [...list].sort((a, b) => {
    if (sortBy === "fecha") {
      const dateA = a.fecha || "";
      const dateB = b.fecha || "";
      return sortOrder === "asc" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    }
    return sortOrder === "asc" ? a.monto_clp - b.monto_clp : b.monto_clp - a.monto_clp;
  });

  const total = (!year || year === "Todos") && (!emisor || emisor === "Todos") && !search
    ? canonicalTotal
    : list.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const data = list.slice(offset, offset + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    kpis: summary.kpis,
    by_year: summary.by_year,
  };
}
