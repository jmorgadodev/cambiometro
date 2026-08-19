export interface SinimMetric { id: number; area: number; subarea: number; code: string; label: string; unit: string; kind: "budget_execution" | "expense" | "transfer" | "remuneration" }
export const SINIM_CORE_METRICS: SinimMetric[];
export function extractSinimPeriods(html: string): Array<{ id: number; year: number }>;
export function buildSinimExportUrl(periodId: number, metrics?: SinimMetric[]): string;
export function normalizeSinimSpreadsheetXml(xml: string, context: { year: number; metrics?: SinimMetric[]; sourceUrl: string }): { records: Array<Record<string, unknown> & { id: string; kind: SinimMetric["kind"]; monto_clp: number | null }>; municipalityCount: number; missingValueCount: number };
export function fetchSinimAnnual(options: { year: number; metrics?: SinimMetric[]; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<Record<string, unknown>>;
