import fs from "node:fs";
import path from "node:path";
import { getLey19862Summary, type Ley19862Summary, type TransferenciaDetalle } from "./transferencias-data";

export interface TransferenciasStaticManifest {
  schemaVersion: number;
  dataset: string;
  generatedAt: string;
  totalRows: number;
  pageSize: number;
  totalPages: number;
  pages: Array<{ page: number; path: string; count: number; sha256: string }>;
  searchIndex: { path: string; count: number; sha256: string };
  checksumSha256: string;
  expected: { totalMontoClp: number };
}

export interface TransferenciasStaticData {
  manifest: TransferenciasStaticManifest | null;
  summary: Ley19862Summary;
  initialTransfers: TransferenciaDetalle[];
}

const staticRoot = path.join(process.cwd(), "public", "data", "transferencias");

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function getStaticTransferencias(): TransferenciasStaticData {
  const fallback = getLey19862Summary();
  const manifest = readJson<TransferenciasStaticManifest>(path.join(staticRoot, "manifest.json"));
  const generatedSummary = readJson<Ley19862Summary>(path.join(staticRoot, "summary.json"));
  const firstPage = manifest ? readJson<TransferenciaDetalle[]>(path.join(staticRoot, "p-0001.json")) : null;
  return {
    manifest,
    summary: generatedSummary ?? fallback,
    initialTransfers: firstPage ?? fallback.transfers_sample.slice(0, 10),
  };
}
