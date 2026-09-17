import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { auditCatalogReferences } from "../lib/r2-catalog-audit.mjs";
import { listR2Objects } from "../lib/r2-live-list.mjs";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const bucket = process.env.R2_BUCKET || "transparencia-public-data";
const catalogKey = process.env.R2_CATALOG_KEY || "catalog/v1/manifest.json";
if (!accountId || !token) throw new Error("R2_CATALOG_AUDIT_MISSING_CLOUDFLARE_CREDENTIALS");

function wranglerGet(key) {
  const result = spawnSync(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), "r2", "object", "get", `${bucket}/${key}`, "--remote", "--pipe"], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `WRANGLER_EXIT_${result.status}`);
  const output = String(result.stdout ?? "");
  const start = output.indexOf("{");
  if (start < 0) throw new Error(`R2_OBJECT_NOT_JSON: ${key}`);
  return JSON.parse(output.slice(start));
}

const catalog = wranglerGet(catalogKey);
const objectKeys = (await listR2Objects({ accountId, token, bucket })).map((item) => item.key);
const report = auditCatalogReferences(catalog, objectKeys);
const alternateIndexes = [];
for (const source of report.bySource.filter((item) => item.missing > 0)) {
  const key = `indexes/v1/${source.sourceId}/manifest.json`;
  try {
    const manifest = wranglerGet(key);
    if (manifest?.sourceId !== source.sourceId || !Number.isSafeInteger(Number(manifest.totalRows))) continue;
    alternateIndexes.push({
      sourceId: source.sourceId,
      key,
      totalRows: Number(manifest.totalRows),
      pageCount: Array.isArray(manifest.pages) ? manifest.pages.length : null,
      generatedAt: manifest.generatedAt ?? null,
      status: "alternate_index_present",
    });
  } catch {
    // A missing alternate index is part of the audit result, not a fatal
    // condition. The strict publication guard still rejects orphaned entries.
  }
}
console.log(JSON.stringify({
  source: "r2-live-list",
  bucket,
  catalogKey,
  objectCount: objectKeys.length,
  ...report,
  alternateIndexes,
}, null, 2));
