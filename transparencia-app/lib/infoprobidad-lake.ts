import fs from "fs";
import path from "path";
import type { EtlRecord } from "@/lib/data-source";

export interface InfoProbidadProjection {
  generatedAt: string;
  count: number;
  records: EtlRecord[];
}

let cached: InfoProbidadProjection | null = null;

/**
 * Proyección v1 de declaraciones InfoProbidad período 2026-2030 (generada por
 * scripts/build-infoprobidad-v1.mjs desde las particiones del lake).
 * La ficha del político la prioriza sobre la ventana del snapshot ETL para
 * tener todo el período de asunción sin inflar data/etl/latest.json.
 * Carga con fs + cache (patrón leerContraloriaV1).
 */
export function leerInfoProbidadV1(): InfoProbidadProjection | null {
  if (cached) return cached;
  try {
    const fullFile = path.join(
      process.cwd(),
      "data",
      "lake",
      "projections",
      "v1",
      "infoprobidad.json",
    );
    const subsetFile = path.join(
      process.cwd(),
      "data",
      "lake-subsets",
      "infoprobidad.subset.json",
    );
    const targetFile = fs.existsSync(fullFile) ? fullFile : subsetFile;
    if (!fs.existsSync(targetFile)) return null;

    cached = JSON.parse(fs.readFileSync(targetFile, "utf8")) as InfoProbidadProjection;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}