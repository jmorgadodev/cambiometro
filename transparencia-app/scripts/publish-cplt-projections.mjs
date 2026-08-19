import { createHash } from "node:crypto";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const inputRoot = resolve("data/raw/transparencia_activa");
const projectionRoot = join(inputRoot, "projections", "funcionarios-v1");
const validationRoot = join(inputRoot, "validation");
const coverageRoot = join(inputRoot, "coverage");
const outputRoot = resolve("data/lake-cplt");
const required = ["planta", "contrata", "honorarios", "codigotrabajo"];

async function checksum(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

if (!existsSync(projectionRoot)) throw new Error("CPLT_MISSING_PROJECTIONS");
const validations = required.map((source) => {
  const filePath = join(validationRoot, `${source}.json`);
  if (!existsSync(filePath)) throw new Error(`CPLT_MISSING_VALIDATION: ${source}`);
  const report = JSON.parse(readFileSync(filePath, "utf8"));
  if (report.status !== "valid" || !Number.isSafeInteger(report.recordCount) || report.recordCount < 1) {
    throw new Error(`CPLT_INVALID_SOURCE: ${source}`);
  }
  return report;
});

const latest = validations.map((report) => report.generatedAt).sort().at(-1) ?? new Date().toISOString();
const month = latest.slice(0, 7);
const version = latest.replace(/[:.]/g, "-");
// Un release por versión evita superar el límite de 1.000 assets de GitHub Releases:
// cada lote nacional publica más de 300 archivos versionados.
const releaseTag = `data-cplt-personal-${version}`;
const files = readdirSync(projectionRoot).filter((name) => name.endsWith(".json")).sort();
if (files.length < 1) throw new Error("CPLT_MISSING_PROJECTIONS");

const assets = [];
const manifestAssets = [];
for (const fileName of files) {
  const source = join(projectionRoot, fileName);
  const size = statSync(source).size;
  if (size < 2) throw new Error(`CPLT_EMPTY_PROJECTION: ${fileName}`);
  const checksumSha256 = await checksum(source);
  const key = `projections/funcionarios-v1/versions/${version}/${fileName}`;
  const target = join(outputRoot, key);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  const releaseAssetName = `cplt-${version}-${fileName}`;
  assets.push({ key, checksumSha256, size, releaseTag, releaseAssetName });
  manifestAssets.push({ key, checksumSha256, size });
}

const manifest = {
  schemaVersion: "1.0.0",
  sourceId: "transparencia-activa",
  generatedAt: latest,
  version,
  recordCount: validations.reduce((total, report) => total + report.recordCount, 0),
  sources: validations.map(({ sourceId, sourceUrl, recordCount, checksumSha256 }) => ({ sourceId, sourceUrl, recordCount, checksumSha256 })),
  coverage: (() => {
    const byCommune = new Map();
    for (const source of required) {
      const filePath = join(coverageRoot, `${source}.json`);
      if (!existsSync(filePath)) throw new Error(`CPLT_MISSING_COVERAGE: ${source}`);
      const report = JSON.parse(readFileSync(filePath, "utf8"));
      for (const item of report.coverage ?? []) {
        const current = byCommune.get(item.communeId) ?? {
          communeId: item.communeId,
          cut: item.cut,
          administrationId: item.administrationId,
          status: item.status === "not_applicable" ? "not_applicable" : "unavailable",
          recordCount: 0,
          categories: {},
        };
        current.categories[source] = { status: item.status, recordCount: item.recordCount };
        current.recordCount += item.recordCount;
        if (item.status === "available") current.status = "available";
        byCommune.set(item.communeId, current);
      }
    }
    const coverage = [...byCommune.values()].sort((left, right) => left.cut.localeCompare(right.cut));
    if (coverage.length !== 346) throw new Error(`CPLT_COVERAGE_COUNT_INVALID: ${coverage.length}`);
    return coverage;
  })(),
  assets: manifestAssets,
};
const manifestKey = "projections/funcionarios-v1/manifest.json";
const manifestTarget = join(outputRoot, manifestKey);
mkdirSync(dirname(manifestTarget), { recursive: true });
const manifestData = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(manifestTarget, manifestData);
assets.push({
  key: manifestKey,
  checksumSha256: createHash("sha256").update(manifestData).digest("hex"),
  size: manifestData.byteLength,
  releaseTag,
  releaseAssetName: `cplt-${version}-manifest.json`,
});

mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, "publish-plan.json"), `${JSON.stringify({ schemaVersion: "1.0.0", generatedAt: latest, assets }, null, 2)}\n`);
const modes = ["--releases", "--r2"].filter((mode) => process.argv.includes(mode));
if (modes.length === 0) throw new Error("CPLT_PUBLICATION_MODE_REQUIRED");
const localAuth = process.argv.includes("--local-auth") ? ["--local-auth"] : [];
const result = spawnSync(process.execPath, [resolve("scripts/publish-data-lake.mjs"), "--output", outputRoot, ...modes, ...localAuth], { stdio: "inherit" });
if (result.status !== 0) throw new Error(`CPLT_PUBLICATION_FAILED: ${result.status}`);
console.log(JSON.stringify({ version, records: manifest.recordCount, assets: manifestAssets.length, manifest: manifestKey }, null, 2));
