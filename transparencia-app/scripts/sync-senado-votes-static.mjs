import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { POLITICOS_SEED } from "../lib/politicos-source.ts";
import { assertStaticInputContentQuality } from "./static-site-inputs.mjs";
import { fetchVerifiedSenadoVoteRecords, mergeSenadoVotesIntoStaticSnapshot } from "./etl/senado-static-projection.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const target = resolve("data/politicos-votaciones.json");
if (!existsSync(target)) throw new Error("SENADO_STATIC_SNAPSHOT_MISSING");

const snapshot = JSON.parse(readFileSync(target, "utf8"));
const fetched = await fetchVerifiedSenadoVoteRecords({
  from: argument("--from", "2026-01"),
  to: argument("--to", new Date().toISOString().slice(0, 7)),
  apiUrl: argument("--api-url", "https://cambiometro.impulsacv.cl/api/v1/records"),
});
const merged = mergeSenadoVotesIntoStaticSnapshot(snapshot, fetched.records, {
  senators: POLITICOS_SEED,
  generatedAt: new Date().toISOString(),
});

if (!merged.changed) {
  console.log(JSON.stringify({ action: "unchanged", ...merged, snapshot: undefined, completePeriods: fetched.completePeriods }, null, 2));
  process.exit(0);
}

const serialized = `${JSON.stringify(merged.snapshot, null, 2)}\n`;
assertStaticInputContentQuality("data/politicos-votaciones.json", Buffer.from(serialized));
writeFileSync(target, serialized, "utf8");
console.log(JSON.stringify({
  action: "updated",
  completePeriods: fetched.completePeriods,
  replacedPeriods: merged.replacedPeriods,
  replacedSessions: merged.replacedSessions,
  addedSessions: merged.addedSessions,
  mappedVotes: merged.mappedVotes,
  unmatchedVotes: merged.unmatchedVotes,
  totalSessions: merged.snapshot.totalSessions,
  generatedAt: merged.snapshot.generatedAt,
}, null, 2));
