import crypto from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllCrosses } from "@/lib/data-platform-v1";
import type { CrossEdge } from "@/lib/data-contracts";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputDir = join(root, "public", "data", "cruces");
const pageSize = 50;

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function categoryIds(row: CrossEdge) {
  const sourceIds = (row.fromEntity.sourceIds || [])
    .concat(row.toEntity.sourceIds || [])
    .concat(row.evidence.map((evidence) => evidence.sourceId));
  const sources = sourceIds.join(" ").toLowerCase();
  const predicate = row.relation.predicate.toLowerCase();
  const categories: string[] = [];
  if (sources.includes("contraloria") || predicate.includes("audit")) categories.push("Auditorías");
  if (sources.includes("infoprobidad") || predicate.includes("declaration")) categories.push("Declaraciones");
  if (sources.includes("chilecompra") || predicate.includes("contract") || predicate.includes("purchase") || predicate.includes("awarded")) categories.push("Compras");
  if (sources.includes("infolobby") || predicate.includes("lobby")) categories.push("Lobby");
  if (sources.includes("ley-19862") || sources.includes("transfer") || predicate.includes("transfer")) categories.push("Transferencias");
  if (sources.includes("camara") || sources.includes("senado") || predicate.includes("vote") || predicate.includes("mandate") || predicate.includes("office") || predicate.includes("cast")) categories.push("Votaciones");
  return categories;
}

function searchText(row: CrossEdge) {
  return normalizeSearch([
    row.fromEntity.name,
    row.toEntity.name,
    row.relation.predicate,
    ...row.evidence.flatMap((evidence) => [evidence.sourceId, evidence.title, evidence.description || ""]),
  ].join(" "));
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

// Only fields rendered by the public explorer are copied into the static
// release. The original lake remains unchanged; raw evidence payloads are not
// sent to every browser page just because a user opens one relation.
function compactCross(row: CrossEdge): CrossEdge {
  return {
    relation: row.relation,
    fromEntity: {
      ...row.fromEntity,
      identifiers: row.fromEntity.identifiers.filter((identifier) => identifier.isPublic),
      attributes: {},
    },
    toEntity: {
      ...row.toEntity,
      identifiers: row.toEntity.identifiers.filter((identifier) => identifier.isPublic),
      attributes: {},
    },
    evidence: row.evidence.map((record) => ({
      ...record,
      subjectEntityIds: [],
      objectEntityIds: [],
      data: {},
    })),
    totalAmountClp: row.totalAmountClp,
  };
}

async function main() {
  const rows = (await getAllCrosses()).map(compactCross);
  const canonical = JSON.stringify(rows);
  const totalPages = Math.ceil(rows.length / pageSize);
  const categoryRows: Record<string, number[]> = {
    Auditorías: [],
    Declaraciones: [],
    Compras: [],
    Lobby: [],
    Transferencias: [],
    Votaciones: [],
  };
  const searchBuckets = new Map<string, Record<string, number[]>>();
  rows.forEach((row, index) => {
    for (const category of categoryIds(row)) categoryRows[category].push(index);
    const tokens = new Set(searchText(row).split(/\s+/).filter((token) => token.length >= 2));
    for (const token of tokens) {
      const bucket = token[0] || "_";
      if (!searchBuckets.has(bucket)) searchBuckets.set(bucket, {});
      const bucketIndex = searchBuckets.get(bucket)!;
      (bucketIndex[token] ??= []).push(index);
    }
  });

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const pages: string[] = [];
  for (let offset = 0; offset < rows.length; offset += pageSize) {
    const pageNumber = Math.floor(offset / pageSize) + 1;
    const filename = `p-${String(pageNumber).padStart(4, "0")}.json`;
    const content = `${JSON.stringify(rows.slice(offset, offset + pageSize))}\n`;
    await writeFile(join(outputDir, filename), content, "utf8");
    pages.push(filename);
  }

  const searchIndexBuckets: Record<string, string> = {};
  for (const [bucket, bucketIndex] of searchBuckets.entries()) {
    const filename = `search-${bucket}.json`;
    await writeFile(join(outputDir, filename), `${JSON.stringify(bucketIndex)}\n`, "utf8");
    searchIndexBuckets[bucket] = filename;
  }

  const manifest = {
    schemaVersion: 1,
    dataset: "cruces-documentales",
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    pageSize,
    totalPages,
    pages,
    categoryRows,
    searchIndex: { buckets: searchIndexBuckets },
    checksumSha256: sha256(canonical),
    note: "Páginas estáticas del universo de relaciones documentales; no requiere D1 para la consulta pública.",
  };
  await writeFile(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[cruces-static] ${rows.length.toLocaleString("es-CL")} filas en ${totalPages.toLocaleString("es-CL")} páginas · checksum ${manifest.checksumSha256}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
