import crypto from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { getAllCrosses } from "@/lib/data-platform-v1";
import type { CrossEdge } from "@/lib/data-contracts";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputDir = join(root, "public", "data", "cruces");
const pageSize = 50;

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

  const manifest = {
    schemaVersion: 1,
    dataset: "cruces-documentales",
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    pageSize,
    totalPages,
    pages,
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
