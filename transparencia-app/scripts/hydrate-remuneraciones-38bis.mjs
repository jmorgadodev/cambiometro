import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { createR2ManifestClient } from "./etl/r2-conditional-manifest.mjs";
import { validate38BisArtifacts } from "./etl/remuneraciones-38bis-publication.mjs";

const client = await createR2ManifestClient(requireCloudflareDataCredentials());
const artifacts = [
  ["current.json", "remuneraciones-38bis-publico.json"],
  ["current-history.json", "remuneraciones-38bis-publico-historico.json"],
  ["current-audit.json", "remuneraciones-38bis-publico-audit.json"],
];
const buffers = [];
let bytes = 0;
for (const [key] of artifacts) {
  const response = await client.fetch(client.url("transparencia-public-data", `projections/remuneraciones-38bis-v1/${key}`), { headers: { "Accept-Encoding": "identity" } });
  if (!response.ok || !response.body) throw new Error(`38BIS_HYDRATE_READ_${response.status}`);
  const chunks = [];
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > 12_000_000) throw new Error("38BIS_HYDRATE_BYTE_BUDGET_EXCEEDED");
    chunks.push(chunk);
  }
  buffers.push(Buffer.concat(chunks));
}
// Validate the entire bundle before replacing any local build input. No Git fallback.
const result = validate38BisArtifacts(...buffers.map((buffer) => JSON.parse(buffer.toString("utf8"))));
if (!process.argv.includes("--verify-only")) {
  const directory = resolve("data");
  await mkdir(directory, { recursive: true });
  for (let index = 0; index < artifacts.length; index++) await writeFile(resolve(directory, artifacts[index][1]), buffers[index]);
}
console.log(JSON.stringify({ ...result, bytes, r2Reads: artifacts.length, r2Writes: 0, d1: [0, 0], verifyOnly: process.argv.includes("--verify-only") }));
