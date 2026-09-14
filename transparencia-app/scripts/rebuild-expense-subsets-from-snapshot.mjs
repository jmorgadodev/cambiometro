import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildExpenseSubset, EXPENSE_SOURCES, readExpenseSnapshot, readExpenseSubset } from "./expense-release.mjs";

const root = resolve(import.meta.dirname, "..");
const requested = process.argv.flatMap((arg, index, args) => arg === "--source" ? String(args[index + 1] ?? "").split(",") : [])
  .map((value) => value.trim()).filter(Boolean);
const sources = requested.length ? requested : EXPENSE_SOURCES;
const snapshot = readExpenseSnapshot(root);
if (!snapshot?.fuentes) throw new Error("EXPENSE_SNAPSHOT_MISSING:data/etl/latest.json");

for (const sourceId of sources) {
  if (!EXPENSE_SOURCES.includes(sourceId)) throw new Error(`EXPENSE_SOURCE_UNKNOWN:${sourceId}`);
  const rows = snapshot.fuentes[sourceId];
  if (!Array.isArray(rows)) throw new Error(`EXPENSE_SOURCE_MISSING_IN_SNAPSHOT:${sourceId}`);
  const previous = readExpenseSubset(root, sourceId);
  const subset = buildExpenseSubset({ sourceId, records: rows, generatedAt: snapshot.actualizado_en ?? undefined });
  if (previous && subset.recordCount < previous.recordCount) {
    throw new Error(`EXPENSE_RECORDS_DECREASED:${sourceId}:${previous.recordCount}->${subset.recordCount}`);
  }
  const target = join(root, "data", "lake-subsets", `${sourceId.replace("gastos_", "gastos-")}.subset.json`);
  if (!existsSync(join(root, "data", "lake-subsets"))) throw new Error("EXPENSE_SUBSET_DIRECTORY_MISSING");
  const staged = `${target}.next`;
  writeFileSync(staged, `${JSON.stringify(subset)}\n`, "utf8");
  renameSync(staged, target);
  console.log(JSON.stringify({ sourceId, previousCount: previous?.recordCount ?? null, recordCount: subset.recordCount, checksumSha256: subset.checksumSha256, path: target }));
}
