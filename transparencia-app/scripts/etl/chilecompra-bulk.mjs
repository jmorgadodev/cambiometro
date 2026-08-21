import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

export function buildBulkLicitacionUrl(year, month) {
  if (!Number.isInteger(year) || year < 2009 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("CHILECOMPRA_BULK_INVALID_PERIOD");
  }
  return `https://ocds-lic-files.da.mercadopublico.cl/${year}/${year}${String(month).padStart(2, "0")}.7z`;
}

export function recordPackageFromBulk(document) {
  if (document && Number.isInteger(document.status) && typeof document.detail === "string" && !("records" in document)) {
    return null;
  }
  if (!document || !Array.isArray(document.records)) {
    throw new Error("CHILECOMPRA_BULK_INVALID_SCHEMA");
  }
  if (document.records.length === 0) return null;
  const releases = document.records.map((record) => record?.compiledRelease).filter(Boolean);
  if (releases.length !== document.records.length) throw new Error("CHILECOMPRA_BULK_COMPILED_RELEASE_MISSING");
  return { uri: document.uri, publishedDate: document.publishedDate, releases };
}

async function downloadArchive(url, archivePath, fetchImpl) {
  if (existsSync(archivePath)) return;
  const response = await fetchImpl(url, {
    headers: { "User-Agent": "TransparenciaChile-ETL/3.0", Accept: "application/octet-stream" },
    signal: AbortSignal.timeout(10 * 60_000),
  });
  if (!response.ok) throw new Error(`CHILECOMPRA_BULK_HTTP_${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.byteLength < 1_000 || data.byteLength > 2_000_000_000) throw new Error(`CHILECOMPRA_BULK_SIZE_INVALID:${data.byteLength}`);
  const temporary = `${archivePath}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, data);
  renameSync(temporary, archivePath);
}

export async function loadOfficialBulkLicitaciones({ year, month, workRoot, fetchImpl = fetch }) {
  const url = buildBulkLicitacionUrl(year, month);
  const root = resolve(workRoot);
  const cacheRoot = resolve(root, `chilecompra-bulk-${year}-${String(month).padStart(2, "0")}`);
  if (!cacheRoot.startsWith(`${root}${sep}`)) throw new Error("CHILECOMPRA_BULK_INVALID_WORK_ROOT");
  const archivePath = join(cacheRoot, `${year}${String(month).padStart(2, "0")}.7z`);
  const extractedRoot = join(cacheRoot, "extracted");
  const completeMarker = join(extractedRoot, ".complete");
  mkdirSync(cacheRoot, { recursive: true });
  await downloadArchive(url, archivePath, fetchImpl);
  mkdirSync(extractedRoot, { recursive: true });
  if (!existsSync(completeMarker)) {
    const extraction = spawnSync("tar", ["-xf", archivePath, "-C", extractedRoot], { encoding: "utf8", windowsHide: true });
    if (extraction.status !== 0) throw new Error(`CHILECOMPRA_BULK_EXTRACT_FAILED:${extraction.stderr || extraction.stdout}`);
    writeFileSync(completeMarker, `${url}\n`, "utf8");
  }

  const documents = new Map();
  const skippedEmptyFiles = [];
  for (const fileName of readdirSync(extractedRoot).filter((name) => name.endsWith(".json")).sort()) {
    const processId = basename(fileName, ".json");
    const raw = JSON.parse(readFileSync(join(extractedRoot, fileName), "utf8"));
    const payload = recordPackageFromBulk(raw);
    if (payload === null) {
      skippedEmptyFiles.push(fileName);
      continue;
    }
    documents.set(processId, { url: `${url}#${encodeURIComponent(fileName)}`, payload });
  }
  if (documents.size < 1) throw new Error("CHILECOMPRA_BULK_EMPTY");
  return { url, archivePath, documents, skippedEmptyFiles };
}
