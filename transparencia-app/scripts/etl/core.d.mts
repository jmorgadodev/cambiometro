export function stableStringify(value: unknown): string;
export function buildDeterministicPartition<T extends { id: string }>(records: T[]): {
  records: T[];
  compressed: Buffer;
  checksumSha256: string;
  uncompressedChecksumSha256: string;
};
export function gzipDeterministicJsonl<T>(records: T[], compare?: (a: T, b: T) => number): Promise<{
  compressed: Buffer;
  checksumSha256: string;
  uncompressedChecksumSha256: string;
}>;
export function splitDeterministically(input: Buffer, maxPartBytes?: number): Buffer[];
export function sanitizeForPublication<T>(value: T, key?: string): T;
export function protectPersonalIdentifiers<T extends Record<string, unknown>>(record: T, hmacSecret: string): {
  internal: { personalRutHmac: string | null };
  public: Partial<T>;
};
export function storagePolicy(usedGb: number, limitGb?: number): {
  action: "publish" | "archive_cold_partitions" | "block_growth";
  ratio: number;
};
export function applyConnectorOutcome(previous: { records: unknown[]; checksumSha256: string | null; status: string } | null, outcome: {
  records?: unknown[];
  checksumSha256?: string | null;
  status?: string;
  error?: unknown;
}): { records: unknown[]; checksumSha256: string | null; status: string; errors: string[] };
