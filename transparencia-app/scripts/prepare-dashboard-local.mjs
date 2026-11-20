/** Reutiliza archivos publicados guardados; no extrae ni escribe datos remotos. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const arg = name => { const i = process.argv.indexOf(name); if (i < 0 || !process.argv[i + 1]) throw new Error(`Missing ${name}`); return path.resolve(process.argv[i + 1]); };
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const pin = JSON.parse(fs.readFileSync(arg("--release-set")));
const receipt = { releaseId: pin.releaseSetId, inputs: [], salary: null };
function readPublished(flag, publishedPath) {
  const inputPath = arg(flag), raw = fs.readFileSync(inputPath), parsed = JSON.parse(raw);
  const value = parsed.candidate ?? parsed;
  const bytes = parsed.candidate ? Buffer.from(JSON.stringify(value) + "\n") : raw;
  const expected = Object.values(pin.domains).flatMap(d => d.files).find(f => f.path === publishedPath);
  if (!expected || expected.checksumSha256 !== hash(bytes) || expected.size !== bytes.length) throw new Error(`DASHBOARD_PUBLISHED_INPUT_MISMATCH:${publishedPath}`);
  receipt.inputs.push({ inputPath, publishedPath, checksumSha256: hash(bytes), size: bytes.length });
  return value;
}
const camara = readPublished("--camara", "data/lake-subsets/gastos-camara.subset.json");
const senado = readPublished("--senado", "data/lake-subsets/gastos-senado.subset.json");
const staff = readPublished("--personal", "data/personal-apoyo.json");
const salaryPath = arg("--salary"), salaryReceipt = JSON.parse(fs.readFileSync(arg("--salary-receipt")));
if (salaryReceipt.projectedSha256 !== hash(fs.readFileSync(salaryPath)) || salaryReceipt.releaseId !== pin.releaseSetId) throw new Error("DASHBOARD_SALARY_RECEIPT_MISMATCH");
receipt.salary = salaryReceipt;
const output = path.resolve("artifacts/dashboard"); fs.mkdirSync(output, { recursive: true });
const modulePath = path.join(output, "data-adapter.cjs");
await build({ entryPoints: ["lib/parliamentary-dashboard-data.ts"], outfile: modulePath, bundle: true, platform: "node", format: "cjs", packages: "external", tsconfig: "tsconfig.json", plugins: [{ name: "verified-local-salary", setup(b) { b.onResolve({ filter: /data\/remuneraciones-38bis\.json$/ }, () => ({ path: salaryPath })); } }] });
process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY = "1";
const { assembleDashboard } = (await import(pathToFileURL(modulePath).href)).default;
const data = await assembleDashboard({ camara: camara.records, senado: senado.records, staff, releaseId: pin.releaseSetId, mode: "local-verified" });
const sha256 = hash(JSON.stringify(data));
fs.writeFileSync(path.join(output, "local-data.json"), JSON.stringify({ sha256, data }));
fs.writeFileSync(path.join(output, "input-receipt.json"), JSON.stringify({ ...receipt, outputSha256: sha256, members: data.members.length, rows: data.rows.length }, null, 2));
console.log(JSON.stringify({ status: "verified-local-only", members: data.members.length, rows: data.rows.length, sha256, output: path.join(output, "local-data.json") }));
