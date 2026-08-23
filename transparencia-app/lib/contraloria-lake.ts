import fs from "fs";
import path from "path";
import contraloriaStaticJson from "@/data/lake-subsets/contraloria.subset.json";
import type { CanonicalEntity, EvidenceRecord, RelationEdge } from "@/lib/data-contracts";

export interface ContraloriaProjection {
  generatedAt: string;
  sourceId: string;
  entityCount: number;
  recordCount: number;
  relationCount: number;
  entities: CanonicalEntity[];
  records: EvidenceRecord[];
  relations: RelationEdge[];
}

let cached: ContraloriaProjection | null = null;

/**
 * Proyección v1 de auditorías de Contraloría (generada por
 * scripts/build-contraloria-v1.mjs desde las particiones del lake).
 * Carga con fs en scripts locales y fallback a JSON empaquetado en Worker.
 */
export function leerContraloriaV1(): ContraloriaProjection | null {
  if (cached) return cached;
  try {
    const file = path.join(
      process.cwd(),
      "data",
      "lake",
      "projections",
      "v1",
      "contraloria.json",
    );
    if (fs.existsSync(file)) {
      cached = JSON.parse(fs.readFileSync(file, "utf8")) as ContraloriaProjection;
      return cached;
    }
  } catch {}
  cached = (contraloriaStaticJson as unknown) as ContraloriaProjection;
  return cached;
}