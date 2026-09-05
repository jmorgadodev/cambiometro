import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildLandingSummary } from "../lib/landing-summary.ts";

const root = join(import.meta.dirname, "..");
const readJson = (relativePath) => readFile(join(root, relativePath), "utf8").then(JSON.parse);

const [sourceHealth, movements, globalKpis] = await Promise.all([
  readJson("data/etl/source-health.json"),
  readJson("data/movimientos.json"),
  readJson("lib/global-kpis.json"),
]);
const summary = buildLandingSummary({ sourceHealth, movements, globalKpis });
const content = `${JSON.stringify(summary, null, 2)}\n`;

await mkdir(join(root, "data", "generated"), { recursive: true });
await mkdir(join(root, "public", "data"), { recursive: true });
await writeFile(join(root, "data", "generated", "landing-summary.json"), content, "utf8");
await writeFile(join(root, "public", "data", "landing-summary.json"), content, "utf8");

const siteManifestPath = join(root, "public", "data", "static-site-manifest.json");
try {
  const siteManifest = JSON.parse(await readFile(siteManifestPath, "utf8"));
  siteManifest.datasets ??= {};
  siteManifest.datasets.landing = {
    path: "/data/landing-summary.json",
    sourceCount: summary.sourceCount,
    totalSourceRecords: summary.totalSourceRecords,
    movements: summary.movements.total,
    dataUpdatedAt: summary.dataUpdatedAt,
    checksumSha256: crypto.createHash("sha256").update(content).digest("hex"),
  };
  await writeFile(siteManifestPath, `${JSON.stringify(siteManifest, null, 2)}\n`, "utf8");
} catch {
  // The standalone summary command is also useful before static-site-data is built.
}

console.log(JSON.stringify({
  status: "generated",
  sourceCount: summary.sourceCount,
  totalSourceRecords: summary.totalSourceRecords,
  movements: summary.movements.total,
  dataUpdatedAt: summary.dataUpdatedAt,
}, null, 2));
