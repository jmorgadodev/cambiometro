/** Reuses verified cached inputs and public salary projections. No source extraction or remote mutations. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { buildParliamentarySalaryView } from "./etl/remuneraciones-38bis-parliamentary.mjs";
const args = process.argv.slice(2),
  arg = (key, fallback) => {
    const i = args.indexOf(key);
    return i < 0 ? fallback : args[i + 1];
  };
const base = arg("--source", "https://cambiometro.impulsacv.cl").replace(
  /\/$/,
  "",
);
if (!/^https:\/\//.test(base))
  throw new Error("Published HTTPS source required");
const receipt = JSON.parse(
  fs.readFileSync(
    arg("--receipt", "artifacts/dashboard/input-receipt.json"),
    "utf8",
  ),
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
async function read(suffix) {
  const response = await fetch(base + suffix);
  if (!response.ok)
    throw new Error(`EXPLORER_PUBLIC_INPUT_HTTP_${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const pinBytes = await read("/data/release-set.json"),
  pin = JSON.parse(pinBytes),
  expected = Object.values(pin.domains).flatMap((d) => d.files);
for (const file of receipt.inputs) {
  const raw = fs.readFileSync(file.inputPath),
    parsed = JSON.parse(raw);
  const bytes = parsed.candidate
    ? Buffer.from(JSON.stringify(parsed.candidate) + "\n")
    : raw;
  const entry = expected.find((f) => f.path === file.publishedPath);
  if (
    !entry ||
    entry.checksumSha256 !== hash(bytes) ||
    entry.size !== bytes.length
  )
    throw new Error(
      `EXPLORER_CACHED_INPUT_NOT_CURRENT:${file.publishedPath}. Hydrate published data; never substitute Git snapshots.`,
    );
}
const manifestBytes = await read("/data/remuneraciones-38bis/manifest.json"),
  historyBytes = await read("/data/remuneraciones-38bis/history/index.json"),
  manifest = JSON.parse(manifestBytes),
  historyIndex = JSON.parse(historyBytes);
const periods = Map.groupBy(
  Object.values(historyIndex).flat(),
  (row) => row.mes,
);
const salary = buildParliamentarySalaryView(
  { mes: manifest.mes, registros: periods.get(manifest.mes) ?? [] },
  {
    periodos: [...periods]
      .filter(([mes]) => mes < manifest.mes)
      .map(([mes, registros]) => ({ mes, registros })),
  },
);
if (
  JSON.parse(await read("/data/release-set.json")).releaseSetId !==
    pin.releaseSetId ||
  hash(await read("/data/remuneraciones-38bis/manifest.json")) !==
    hash(manifestBytes)
)
  throw new Error("EXPLORER_PUBLIC_RELEASE_CHANGED_DURING_PREPARATION");
const root = path.resolve("artifacts/dashboard-explorer/input");
fs.mkdirSync(root, { recursive: true });
fs.writeFileSync(path.join(root, "release-set.json"), pinBytes);
const salaryPath = path.join(root, "salary.json"),
  salaryBytes = Buffer.from(JSON.stringify(salary) + "\n");
fs.writeFileSync(salaryPath, salaryBytes);
const salaryReceipt = {
  releaseId: pin.releaseSetId,
  source: base + "/data/remuneraciones-38bis/history/index.json",
  sourceSha256: hash(historyBytes),
  manifestSource: base + "/data/remuneraciones-38bis/manifest.json",
  manifestSha256: hash(manifestBytes),
  projectedSha256: hash(salaryBytes),
  references: salary.congreso.length,
};
const salaryReceiptPath = path.join(root, "salary-receipt.json");
fs.writeFileSync(salaryReceiptPath, JSON.stringify(salaryReceipt));
const cached = (published) =>
  receipt.inputs.find((f) => f.publishedPath === published).inputPath;
const result = spawnSync(
  process.execPath,
  [
    "scripts/prepare-dashboard-local.mjs",
    "--release-set",
    path.join(root, "release-set.json"),
    "--camara",
    cached("data/lake-subsets/gastos-camara.subset.json"),
    "--senado",
    cached("data/lake-subsets/gastos-senado.subset.json"),
    "--personal",
    cached("data/personal-apoyo.json"),
    "--salary",
    salaryPath,
    "--salary-receipt",
    salaryReceiptPath,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const verified = JSON.parse(
  fs.readFileSync("artifacts/dashboard/input-receipt.json", "utf8"),
);
fs.writeFileSync(
  path.join(root, "source-receipt.json"),
  JSON.stringify({ ...verified, salaryPath }, null, 2),
);
console.log(
  JSON.stringify({
    status: "verified-local-inputs",
    releaseId: pin.releaseSetId,
    references: salary.congreso.length,
    sourceReceipt: path.join(root, "source-receipt.json"),
  }),
);
