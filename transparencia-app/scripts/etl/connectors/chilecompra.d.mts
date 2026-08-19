export type ChileCompraType = "licitacion" | "trato_directo" | "convenio_marco";
export interface ChileCompraRawRecord extends Record<string, unknown> {
  id: string;
  title: string;
  stage: "tender" | "award" | "contract";
  fecha: string | null;
  period: string | null;
  kind: "purchase" | "contract";
  monto_clp: number | null;
  monto_original: { amount: string; currency: string | null; unit: string } | null;
  buyer: { id: string; name: string; legal_name?: string; rut_juridico?: string } | null;
  suppliers: Array<{ id: string; name: string; legal_name?: string; rut_juridico?: string }>;
  items: Array<{ id: string; description: string; quantity: number | null; unit: string | null; unitValue: unknown; classification: { id: string; scheme: string } | null }>;
  source_id_collision?: true;
}
export function buildChileCompraListUrl(type: ChileCompraType, year: number, month: number, offset: number, limit: number): string;
export function normalizeOcdsPackage(packageData: Record<string, unknown>, context: { procurementType: ChileCompraType; sourceUrl: string }): ChileCompraRawRecord[];
export function reconcileChileCompraRecords(records: ChileCompraRawRecord[]): ChileCompraRawRecord[];
export function fetchChileCompraMonth(options: {
  year: number;
  month: number;
  types?: ChileCompraType[];
  pageSize?: number;
  concurrency?: number;
  fetchImpl?: typeof fetch & { peekJson?: (url: string) => Promise<unknown | undefined> | unknown | undefined };
  timeoutMs?: number;
  onProgress?: (progress: { phase: string; type?: string; completed: number; total: number }) => void;
  requestsPerSecond?: number;
  retryBaseMs?: number;
}): Promise<{
  sourceId: "chilecompra";
  year: number;
  month: number;
  period: string;
  listingCounts: Record<string, number>;
  records: ChileCompraRawRecord[];
  documents: Array<{ url: string; stage: string; procurementType: ChileCompraType; ocid: string; payload: Record<string, unknown> }>;
  rejectedDocuments: Array<{
    url: string;
    ocid: string | null;
    stage: string;
    procurementType: ChileCompraType;
    reason: "CHILECOMPRA_INVALID_PACKAGE_SCHEMA";
  }>;
  license: "CC0-1.0";
}>;
