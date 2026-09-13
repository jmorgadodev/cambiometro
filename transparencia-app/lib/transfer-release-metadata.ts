import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface TransferReleaseMetadata {
  totalRows: number;
  totalAmountClp: number;
  totalRecipients: number;
  totalEmitters: number;
  generatedAt: string | null;
  checksumSha256: string | null;
}

const FALLBACK: TransferReleaseMetadata = {
  totalRows: 59361,
  totalAmountClp: 5011094170302,
  totalRecipients: 14640,
  totalEmitters: 272,
  generatedAt: "2026-08-24T13:52:22.514Z",
  checksumSha256: null,
};

function positiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function validDate(value: unknown): string | null {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function readJson(relativePath: string): Record<string, unknown> | null {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function fromCandidate(candidate: Record<string, unknown>): TransferReleaseMetadata | null {
  const kpis = candidate.kpis && typeof candidate.kpis === "object"
    ? candidate.kpis as Record<string, unknown>
    : {};
  const expected = candidate.expected && typeof candidate.expected === "object"
    ? candidate.expected as Record<string, unknown>
    : {};
  const totalRows = positiveInteger(candidate.totalRows)
    ?? positiveInteger(kpis.total_transfers)
    ?? positiveInteger(candidate.sourceRows);
  if (totalRows === null || totalRows < 1) return null;

  return {
    totalRows,
    totalAmountClp: nonNegativeNumber(kpis.total_monto_clp)
      ?? nonNegativeNumber(expected.totalMontoClp)
      ?? 0,
    totalRecipients: positiveInteger(kpis.total_receptores) ?? 0,
    totalEmitters: positiveInteger(kpis.total_emisores) ?? 0,
    generatedAt: validDate(candidate.generatedAt),
    checksumSha256: typeof candidate.checksumSha256 === "string" ? candidate.checksumSha256 : null,
  };
}

/**
 * Reads only compact release metadata generated during the Pages build.
 * It never loads transfer rows and falls back to the last pinned baseline
 * when a checkout has not been hydrated yet.
 */
export function getTransferReleaseMetadata(): TransferReleaseMetadata {
  for (const relativePath of [
    "data/generated/transferencias/summary.json",
    "public/data/transferencias/manifest.json",
    "data/lake/projections/v1/ley19862-summary.json",
  ]) {
    const metadata = readJson(relativePath);
    const parsed = metadata ? fromCandidate(metadata) : null;
    if (parsed) return parsed;
  }
  return FALLBACK;
}
