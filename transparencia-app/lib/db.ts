import type { D1Database } from '@cloudflare/workers-types';

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { EtlRecord, VotacionDelPolitico } from "@/lib/data-source";

export async function getD1Database(): Promise<D1Database | null> {
    try {
        const { env } = await getCloudflareContext({ async: true });
        if (env && env.DB) {
            return env.DB as unknown as D1Database;
        }
    } catch (e) {
        // Fallback or ignore if not in Cloudflare context
    }
    
    const nodeEnv = process.env as unknown as { DB?: D1Database };
    if (!nodeEnv.DB) {
        console.warn("D1 Database not bound. Make sure to run with Cloudflare workers/OpenNext preview, or mock the binding for local node scripts.");
        return null;
    }
    return nodeEnv.DB;
}

export interface PoliticoDataCache {
    politico_id: string;
    gastos_json: string | null;
    votaciones_json: string | null;
    stats_json: string | null;
}

export interface PoliticoCacheData {
    gastos: EtlRecord[];
    votaciones: VotacionDelPolitico[];
    stats: Array<Record<string, unknown>>;
}

export async function getPoliticoDataCache(politicoId: string): Promise<PoliticoCacheData> {
    const db = await getD1Database();
    if (!db) return { gastos: [], votaciones: [], stats: [] };
    try {
        const result = await db.prepare(
            `SELECT gastos_json, votaciones_json, stats_json FROM politico_data_cache WHERE politico_id = ?`
        ).bind(politicoId).first<PoliticoDataCache>();
        
        if (!result) return { gastos: [], votaciones: [], stats: [] };
        
        const gastos = result.gastos_json ? JSON.parse(result.gastos_json) as EtlRecord[] : [];
        const votaciones = result.votaciones_json ? JSON.parse(result.votaciones_json) as VotacionDelPolitico[] : [];
        const stats = result.stats_json ? JSON.parse(result.stats_json) as Array<Record<string, unknown>> : [];
        
        return { gastos, votaciones, stats };
    } catch (e) {
        console.error("Error en getPoliticoDataCache:", e);
        return { gastos: [], votaciones: [], stats: [] };
    }
}

export async function getKvCache<T>(key: string): Promise<T | null> {
    const db = await getD1Database();
    if (!db) return null;
    try {
        const { results } = await db.prepare(
            `SELECT value_json FROM kv_cache WHERE key = ? OR key LIKE ? ORDER BY key ASC`
        ).bind(key, `${key}-part%`).all<{ value_json: string }>();
        if (!results || results.length === 0) return null;
        const fullString = results.map(r => r.value_json).join("");
        return JSON.parse(fullString) as T;
    } catch (e) {
        console.error(`Error en getKvCache para ${key}:`, e);
        return null;
    }
}

export interface GastoOperacionalD1 {
    id: string;
    politico_id: string;
    mes: string;
    monto_clp: number;
    categoria: string;
    url_fuente: string;
    created_at: string;
}

export async function getGastosOperacionales(politicoId: string): Promise<GastoOperacionalD1[]> {
    const db = await getD1Database();
    if (!db) return [];
    try {
        const { results } = await db.prepare(
            `SELECT * FROM gastos_operacionales WHERE politico_id = ? ORDER BY mes DESC`
        ).bind(politicoId).all<GastoOperacionalD1>();
        return results ?? [];
    } catch {
        return [];
    }
}

export async function getVotaciones(politicoId: string) {
    const db = await getD1Database();
    if (!db) return [];
    try {
        const { results } = await db.prepare(
            `SELECT * FROM votaciones WHERE politico_id = ? ORDER BY fecha_votacion DESC`
        ).bind(politicoId).all();
        return results ?? [];
    } catch {
        return [];
    }
}

export async function getCausasJudiciales(politicoId: string) {
    const db = await getD1Database();
    if (!db) return [];
    try {
        const { results } = await db.prepare(
            `SELECT * FROM causas_judiciales WHERE politico_id = ? ORDER BY fecha_ingreso DESC`
        ).bind(politicoId).all();
        return results ?? [];
    } catch {
        return [];
    }
}

export interface GastoAgregado {
    politico_id: string;
    total_mensual: number;
    meses_registrados: number;
    ultimo_mes: string;
}

export function aggregatePoliticoExpenseCache(
    rows: Array<{ politico_id: string; gastos_json: string | null }>,
): Record<string, GastoAgregado> {
    const aggregated: Record<string, GastoAgregado> = {};

    for (const row of rows) {
        let records: Array<{ periodo?: unknown; monto_clp?: unknown }> = [];
        try {
            const parsed = row.gastos_json ? JSON.parse(row.gastos_json) : [];
            if (Array.isArray(parsed)) records = parsed;
        } catch {
            continue;
        }
        const valid = records
            .map((record) => ({
                period: typeof record.periodo === "string" ? record.periodo : "",
                amount: typeof record.monto_clp === "number" && Number.isFinite(record.monto_clp)
                    ? record.monto_clp
                    : 0,
            }))
            .filter((record) => record.period);
        if (valid.length === 0) continue;
        const periods = [...new Set(valid.map((record) => record.period))].sort();
        const latestPeriod = periods.at(-1) ?? "";
        const included = row.politico_id.startsWith("dip-")
            ? valid.filter((record) => record.period === latestPeriod)
            : valid;
        aggregated[row.politico_id] = {
            politico_id: row.politico_id,
            total_mensual: included.reduce((total, record) => total + record.amount, 0),
            meses_registrados: periods.length,
            ultimo_mes: latestPeriod,
        };
    }

    return aggregated;
}

export async function getGastosAgregadosD1(): Promise<Record<string, GastoAgregado>> {
    const db = await getD1Database();
    if (!db) return {};
    try {
        const { results } = await db.prepare(
            "SELECT politico_id, gastos_json FROM politico_data_cache",
        ).all<{ politico_id: string; gastos_json: string | null }>();
        return aggregatePoliticoExpenseCache(results ?? []);
    } catch (error) {
        console.error("Error en getGastosAgregadosD1:", error instanceof Error ? error.message : error);
        return {};
    }
}

export interface EntidadD1 {
    id: string;
    kind: string;
    name: string;
    identifiers_json: string;
    attributes_json: string;
    source_ids_json: string;
    updated_at: string | null;
}

export interface RecordD1 {
    id: string;
    kind: string;
    source_id: string;
    title: string;
    description: string | null;
    occurred_at: string | null;
    period_json: string;
    subject_entity_ids_json: string;
    object_entity_ids_json: string;
    amount_json: string | null;
    evidence_json: string;
    data_json: string;
}

export interface RelationD1 {
    id: string;
    from_id: string;
    predicate: string;
    to_id: string;
    evidence_record_ids_json: string;
    period_json: string;
    reconciliation_json: string;
    disclaimer: string;
}
