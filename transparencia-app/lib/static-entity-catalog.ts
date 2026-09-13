import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CanonicalEntity } from "@/lib/data-contracts";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

export interface StaticEntityCatalog {
  schemaVersion: 1;
  generatedAt: string;
  total: number;
  pageSize: number;
  firstPage: CanonicalEntity[];
  countsByKind: Record<string, number>;
  sourceChecksumSha256: string;
}

const FALLBACK: StaticEntityCatalog = {
  schemaVersion: 1,
  generatedAt: "fallback",
  total: GLOBAL_KPIS.entidades,
  pageSize: 40,
  firstPage: [],
  countsByKind: {},
  sourceChecksumSha256: "fallback",
};

/**
 * Reads only the small build-generated summary. The canonical catalog itself
 * is consumed by scripts/build-static-site-data.mjs, never by app runtime.
 */
export function getStaticEntityCatalog(): StaticEntityCatalog {
  try {
    return JSON.parse(
      readFileSync(join(process.cwd(), "data", "generated", "entity-catalog.json"), "utf8"),
    ) as StaticEntityCatalog;
  } catch {
    return FALLBACK;
  }
}
