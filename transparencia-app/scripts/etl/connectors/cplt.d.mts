export function fetchSparqlPages<T>(fetchPage: (offset: number, limit: number) => Promise<T[]>, options?: { pageSize?: number }): Promise<T[]>;
export function createInfoLobbyQuery(kind: "audience" | "travel" | "gift", from: string, to: string, limit: number, offset: number): string;
export function createInfoProbidadQuery(from: string, to: string, limit: number, offset: number): string;
export function projectProbidadJson(rawJson: string): Record<string, unknown> | null;
export function projectInfoProbidadRows(rows: Array<Record<string, string | null | undefined>>): Array<Record<string, unknown>>;
export function parseCsv(text: string): Array<Record<string, string>>;
export function createInfoLobbyDatasetUrl(year: number, quarter: number, dataset: string): string;
export function parseInfoLobbyLegalRut(value: unknown): { normalized: string; formatted: string } | null;
export function projectLobbyQuarter(
  datasets: Record<string, { url: string; rows: Array<Record<string, string>> }>,
  from: string,
  to: string,
): Array<Record<string, unknown>>;
export interface InfoProbidadOptions {
  from: string;
  to: string;
  fetchImpl?: typeof fetch;
  pageSize?: number;
  timeoutMs?: number;
  concurrency?: number;
  onProgress?: ((progress: Record<string, unknown>) => void) | null;
}
export function fetchInfoProbidadBundle(options: InfoProbidadOptions): Promise<{
  sourceId: "infoprobidad";
  records: Array<Record<string, unknown>>;
  originals: Array<{
    year: number;
    month: number;
    url: string;
    checksumSha256: string;
    size: number;
    pages: Array<{ offset: number; checksumSha256: string; size: number; rowCount: number }>;
  }>;
}>;
export function fetchInfoProbidad(options: InfoProbidadOptions): Promise<Array<Record<string, unknown>>>;
export interface InfoLobbyOptions {
  from: string;
  to: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  datasetConcurrency?: number;
  onProgress?: ((progress: Record<string, unknown>) => void) | null;
}
export function fetchInfoLobbyBundle(options: InfoLobbyOptions): Promise<{
  sourceId: "infolobby";
  records: Array<Record<string, unknown>>;
  originals: Array<{
    year: number;
    quarter: number;
    checksumSha256: string;
    size: number;
    url: string;
    datasets: Array<{ dataset: string; url: string; checksumSha256: string; size: number; rowCount: number; error?: string }>;
  }>;
}>;
export function fetchInfoLobby(options: InfoLobbyOptions): Promise<Array<Record<string, unknown>>>;
