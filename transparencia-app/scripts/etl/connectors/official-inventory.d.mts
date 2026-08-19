export const OFFICIAL_SOURCE_INDEXES: Record<string, { label: string; url: string; hosts: string[] }>;
export function extractOfficialAssets(html: string, indexUrl: string, allowedHosts: string[]): Array<{ url: string; label: string }>;
export function discoverOfficialSource(sourceId: string, options?: { fetchImpl?: typeof fetch; timeoutMs?: number; maxAssets?: number }): Promise<Record<string, unknown>>;
export function inventoryOfficialSources(sourceIds?: string[], options?: { fetchImpl?: typeof fetch; timeoutMs?: number; maxAssets?: number }): Promise<Array<Record<string, unknown>>>;
export function mergeInventoryOutcomes(previousInventory: { generatedAt?: string; sources?: Array<Record<string, unknown>> } | null, currentSources: Array<Record<string, unknown>>, generatedAt: string): Array<Record<string, unknown>>;
