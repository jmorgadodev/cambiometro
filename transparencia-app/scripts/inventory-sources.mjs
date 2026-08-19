import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { inventoryOfficialSources, mergeInventoryOutcomes } from "./etl/connectors/official-inventory.mjs";
import { readJsonIfPresent, writeFileAtomic } from "./etl/safe-file.mjs";

const outputIndex = process.argv.indexOf("--output");
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : "data/etl/source-inventory.json");
const requestedIndex = process.argv.indexOf("--source");
const requested = requestedIndex >= 0 ? process.argv[requestedIndex + 1].split(",").map((value) => value.trim()).filter(Boolean) : undefined;
const currentSources = await inventoryOfficialSources(requested);
const generatedAt = new Date().toISOString();
const previous = readJsonIfPresent(output, null);
const sources = mergeInventoryOutcomes(previous, currentSources, generatedAt);
const inventory = { schemaVersion: "1.0.0", generatedAt, sources };
mkdirSync(dirname(output), { recursive: true });
writeFileAtomic(output, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, sources: sources.length, partial: sources.filter((source) => source.status === "partial").length, unavailable: sources.filter((source) => source.status === "unavailable").length }, null, 2));
if (sources.every((source) => source.status === "unavailable")) process.exitCode = 1;
