export interface DipresAsset { id: string; year: number; month: number; period: string; title: string; csvUrl: string; xmlUrl: string | null; }
export function extractDipresBudgetYears(html: string): Array<{ year: number; id: string; budgetUrl: string }>;
export function extractDipresExecutionAssets(html: string, year: number): DipresAsset[];
export function parseDelimited(text: string, delimiter?: string): Array<Record<string, unknown>>;
export function decodeDipresCsv(buffer: Buffer | Uint8Array): string;
export function parseThousandsClp(value: string | null | undefined): number | null;
export function normalizeDipresRows(rows: Array<Record<string, unknown>>, asset: DipresAsset): Array<Record<string, unknown>>;
export function auditDipresHierarchy(records: Array<Record<string, unknown>>): { comparedAggregates: number; mismatchCount: number; discrepancies: Array<{ recordId: string; field: string; parentTotal: number; childTotal: number; difference: number }> };
export interface DipresExecutionResult extends Record<string, unknown> { month: number; period: string; records: Array<Record<string, unknown>>; original: { name: string; url: string; data: Buffer; checksumSha256: string; license: string; redistributable: boolean }; }
export function fetchDipresExecutions(options: { year: number; months?: number[]; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<DipresExecutionResult[]>;
export function fetchDipresExecution(options: { year: number; month?: number; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<DipresExecutionResult>;
