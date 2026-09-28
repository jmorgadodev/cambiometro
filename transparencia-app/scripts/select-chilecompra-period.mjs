import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectChileCompraPeriod } from "./etl/chilecompra-period.mjs";

const catalogPath = resolve("data/lake/catalog/v1/manifest.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const now = new Date();
const currentYear = now.getUTCFullYear();
const currentMonth = now.getUTCMonth() + 1;
const suppliedYear = process.env.INPUT_YEAR?.trim();
const suppliedMonth = process.env.INPUT_MONTH?.trim();
const isExplicit = Boolean(suppliedYear || suppliedMonth);
const year = Number(suppliedYear || currentYear);
const month = Number(suppliedMonth || currentMonth);

if (!Number.isInteger(year) || year < 2009 || year > currentYear
  || !Number.isInteger(month) || month < 1 || month > 12) {
  throw new Error("CHILECOMPRA_PERIOD_INPUT_INVALID");
}

const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
const explicitPeriod = isExplicit ? `${year}-${String(month).padStart(2, "0")}` : undefined;
const selected = await selectChileCompraPeriod({ catalog, currentPeriod, explicitPeriod });
const periodYear = selected?.period.slice(0, 4) ?? "";
const periodMonth = selected?.period.slice(5, 7) ?? "";
const result = {
  hasRecords: Boolean(selected),
  period: selected?.period ?? null,
  listingCounts: selected?.listingCounts ?? null,
  selection: isExplicit ? "manual" : "latest-available-unpublished",
};

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, [
    `has_records=${result.hasRecords}`,
    `year=${periodYear}`,
    `month=${periodMonth}`,
    `period=${result.period ?? ""}`,
    `listing_counts=${result.listingCounts ? JSON.stringify(result.listingCounts) : ""}`,
  ].join("\n") + "\n");
}

console.log(JSON.stringify(result));
