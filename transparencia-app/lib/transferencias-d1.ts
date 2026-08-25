import { getD1Database } from "@/lib/db";
import { getLey19862Summary, type TransferenciaDetalle, type Ley19862Summary } from "@/lib/transferencias-data";
import { SOURCE_CANONICAL_COUNTS } from "@/lib/published-sources";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readR2EvidenceRecords } from "@/lib/r2-records";

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
  sourceStatus?: "complete" | "partial" | "fallback";
}

type TransferEvidence = {
  id: string;
  occurredAt: string | null;
  amount?: { amountClp?: number | null } | null;
  data: Record<string, unknown>;
};

function text(value: unknown): string | null {
  const normalized = value == null ? "" : String(value).trim();
  return normalized || null;
}

function transferFromEvidence(record: TransferEvidence): TransferenciaDetalle | null {
  const raw = record.data ?? {};
  const emitter = raw.emitter && typeof raw.emitter === "object" ? raw.emitter as Record<string, unknown> : {};
  const receiver = raw.receiver && typeof raw.receiver === "object" ? raw.receiver as Record<string, unknown> : {};
  const amount = Number(raw.monto_clp ?? record.amount?.amountClp);
  if (!record.id || !Number.isSafeInteger(amount) || amount < 0) return null;
  return {
    id: text(raw.id) ?? record.id,
    fecha: text(raw.fecha) ?? record.occurredAt,
    period: text(raw.period ?? raw.budget_period) ?? record.occurredAt?.slice(0, 4) ?? null,
    title: text(raw.title ?? raw.objective),
    description: text(raw.description ?? raw.legal_framework),
    classification: text(raw.classification),
    emitter_name: text(emitter.name ?? raw.emitter_name),
    emitter_rut: text(emitter.rut_juridico ?? raw.emitter_rut),
    receiver_name: text(receiver.name ?? raw.receiver_name),
    receiver_rut: text(receiver.rut_juridico ?? raw.receiver_rut),
    monto_clp: amount,
    url: text(raw.url ?? raw.report_url),
    municipality: text(raw.municipality ?? raw.comuna),
  };
}

function summarizeTransfers(rows: TransferenciaDetalle[]): Pick<TransferenciasQueryResult, "kpis" | "by_year"> {
  const receivers = new Set(rows.map((row) => row.receiver_rut || row.receiver_name).filter(Boolean));
  const emitters = new Set(rows.map((row) => row.emitter_rut || row.emitter_name).filter(Boolean));
  const byYear: Record<string, { count: number; total: number }> = {};
  for (const row of rows) {
    const year = row.fecha?.slice(0, 4) ?? row.period ?? "";
    if (!year) continue;
    byYear[year] ??= { count: 0, total: 0 };
    byYear[year].count += 1;
    byYear[year].total += row.monto_clp;
  }
  return {
    kpis: {
      total_monto_clp: rows.reduce((total, row) => total + row.monto_clp, 0),
      total_transfers: rows.length,
      total_receptores: receivers.size,
      total_emisores: emitters.size,
    },
    by_year: byYear,
  };
}

async function queryTransferenciasFromR2(params: {
  search: string;
  year: string;
  emisor: string;
  sortBy: "monto" | "fecha";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}): Promise<TransferenciasQueryResult | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) return null;
    const archive = await readR2EvidenceRecords(env.PUBLIC_DATA, {
      source: "ley-19862",
      limit: 100_000,
    });
    if (!archive) return null;
    let rows = archive.data
      .map((record) => transferFromEvidence(record as unknown as TransferEvidence))
      .filter((row): row is TransferenciaDetalle => Boolean(row));
    if (params.year && params.year !== "Todos") rows = rows.filter((row) => row.period === params.year || row.fecha?.startsWith(params.year));
    if (params.emisor && params.emisor !== "Todos") rows = rows.filter((row) => row.emitter_name?.toLocaleLowerCase("es-CL") === params.emisor.toLocaleLowerCase("es-CL"));
    if (params.search) {
      const query = params.search.toLocaleLowerCase("es-CL");
      rows = rows.filter((row) => [row.title, row.emitter_name, row.receiver_name, row.emitter_rut, row.receiver_rut, row.municipality]
        .some((value) => value?.toLocaleLowerCase("es-CL").includes(query)));
    }
    rows.sort((left, right) => {
      const comparison = params.sortBy === "fecha"
        ? (left.fecha ?? "").localeCompare(right.fecha ?? "")
        : left.monto_clp - right.monto_clp;
      return params.sortOrder === "asc" ? comparison : -comparison;
    });
    const summary = summarizeTransfers(rows);
    const offset = (params.page - 1) * params.limit;
    return {
      data: rows.slice(offset, offset + params.limit),
      total: rows.length,
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(rows.length / params.limit)),
      ...summary,
      sourceStatus: "partial",
    };
  } catch (error) {
    console.warn("R2 query transferencias fallback to projection:", error);
    return null;
  }
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
          sourceStatus: "complete",
        };
      }
    } catch (error) {
      console.warn("D1 query transferencias fallback to projection:", error);
    }
  }

  const r2Result = await queryTransferenciasFromR2({ search, year, emisor, sortBy, sortOrder, page, limit });
  if (r2Result) return r2Result;

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
    sourceStatus: "fallback",
  };
}
