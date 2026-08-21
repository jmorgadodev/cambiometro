import { spawnSync } from "node:child_process";

// Re-verifica la integridad del data lake por job (fuente/año/mes): cada job
// publica un release `data-<sourceId>-<year>-<hash>` en GitHub con su
// sha256.txt. Este script descarga cada sha256.txt y verifica que cada hash
// listado exista como digest real de un asset del release (integridad
// verificable de punta a punta, sin descargar los datos completos).
// Uso: node scripts/verify-lake-manifests.mjs [--tags N] [--repo jmorgadodev/cambiometro]

const args = process.argv.slice(2);
const tagsLimitIndex = args.indexOf("--tags");
const tagsLimit = tagsLimitIndex >= 0 ? Number(args[tagsLimitIndex + 1]) : Infinity;
const repoIndex = args.indexOf("--repo");
const repo = repoIndex >= 0 ? args[repoIndex + 1] : "jmorgadodev/cambiometro";

function gh(argsList, allowFailure = false) {
  const result = spawnSync("gh", argsList, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`gh ${argsList.join(" ")} fallo: ${result.stderr?.trim() ?? `codigo ${result.status}`}`);
  }
  return result;
}

function releaseTags() {
  const result = gh(["release", "list", "--repo", repo, "--limit", "200", "--json", "tagName"]);
  return JSON.parse(result.stdout).map((entry) => entry.tagName).filter((tag) => tag.startsWith("data-"));
}

function releaseAssets(tag) {
  const result = gh(["release", "view", tag, "--repo", repo, "--json", "assets", "--jq", ".assets[] | [.name, .digest] | @tsv"], true);
  if (result.status !== 0) return [];
  const assets = new Map();
  for (const line of result.stdout.split(/\r?\n/)) {
    const [name, digest] = line.split("\t");
    if (name && digest) assets.set(name, digest);
  }
  return assets;
}

function downloadAsset(tag, name) {
  const result = spawnSync("gh", ["release", "download", tag, "--repo", repo, "--pattern", name, "--clobber", "--dir", "."], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`gh release download ${tag}/${name} fallo: ${result.stderr?.trim()}`);
  return name;
}

function parseSha256Txt(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([0-9a-f]{64})\s+(.+)$/);
    if (match) entries.set(match[2], match[1]);
  }
  return entries;
}

const tags = releaseTags();
if (tags.length === 0) throw new Error("NO_DATA_RELEASES_FOUND");

const checkedTags = tags.slice(0, tagsLimit);
const results = [];
for (const tag of checkedTags) {
  const assets = releaseAssets(tag);
  const sha256Asset = [...assets.keys()].find((name) => name.endsWith("-sha256.txt"));
  if (!sha256Asset) continue;
  downloadAsset(tag, sha256Asset);
  const text = spawnSync("node", ["-e", `process.stdout.write(require("fs").readFileSync(${JSON.stringify(sha256Asset)}, "utf8"))`], { encoding: "utf8" }).stdout;
  spawnSync("node", ["-e", `require("fs").unlinkSync(${JSON.stringify(sha256Asset)})`]);
  const entries = parseSha256Txt(text);
  const digests = new Set([...assets.values()]);
  for (const [name, expected] of entries) {
    if (!digests.has(`sha256:${expected}`)) {
      throw new Error(`LAKE_MANIFEST_MISMATCH ${tag}: hash ${expected} (${name}) no existe como digest de asset`);
    }
  }
  results.push({ tag, assets: assets.size, listed: entries.size });
  console.log(`[OK] ${tag}: ${entries.size} hashes verificados contra ${assets.size} assets`);
}

console.log(JSON.stringify({ releases: results.length, jobs: results.length, hashes: results.reduce((t, r) => t + r.listed, 0), status: "OK" }, null, 2));