/**
 * Runner local para la extracción WebForms de gastos operacionales de Cámara.
 *
 * Cámara bloquea con frecuencia las IP efímeras de GitHub Actions. Este
 * proceso se ejecuta en un equipo persistente, descarga el último release
 * válido desde R2, reanuda el progreso del conector, valida el universo y
 * publica únicamente el subconjunto completo. No escribe datasets en Git.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildExpenseSubset, readExpenseSubset } from "./expense-release.mjs";
import { fetchGastosCamara } from "./etl/connectors/camara-gastos.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = argument("--bucket", "transparencia-public-data");
const force = process.argv.includes("--force");
const hydrateOnly = process.argv.includes("--hydrate-only");
const triggerPages = process.argv.includes("--trigger-pages");
const staticManifestKey = "projections/static-site-v1/manifest.json";
const expenseFiles = {
  gastos_camara: "data/lake-subsets/gastos-camara.subset.json",
  gastos_senado: "data/lake-subsets/gastos-senado.subset.json",
};

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

export function chileExpenseSchedule(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute), shouldRun: Number(parts.day) === 2 };
}

export function mergeExpenseRecords(previous = [], incoming = []) {
  const merged = new Map();
  for (const record of [...previous, ...incoming]) {
    if (record?.id) merged.set(String(record.id), record);
  }
  return [...merged.values()];
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function run(binary, args, label) {
  const result = spawnSync(binary, args, { cwd: root, encoding: "utf8", stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`${label}_FAILED:${result.status ?? result.error?.message ?? "unknown"}`);
  return result;
}

function wrangler(args, label = "WRANGLER") {
  const bin = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");
  return run(process.execPath, [bin, ...args, "--remote"], label);
}

function npm(args, label) {
  const npmCli = resolve(root, "node_modules", "npm", "bin", "npm-cli.js");
  if (existsSync(npmCli)) return run(process.execPath, [npmCli, ...args], label);
  return run(process.platform === "win32" ? "npm.cmd" : "npm", args, label);
}

function readRemoteManifest(work) {
  const manifestPath = join(work, "static-site-manifest.json");
  wrangler(["r2", "object", "get", `${bucket}/${staticManifestKey}`, "--file", manifestPath], "EXPENSE_REMOTE_MANIFEST");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error("EXPENSE_REMOTE_MANIFEST_INVALID");
  return manifest;
}

function downloadExpenseSubsets(work) {
  const manifest = readRemoteManifest(work);
  for (const [sourceId, relativePath] of Object.entries(expenseFiles)) {
    const entry = manifest.files.find((item) => item.path === relativePath);
    if (!entry) throw new Error(`EXPENSE_REMOTE_SUBSET_MISSING:${sourceId}`);
    const downloaded = join(work, `${sourceId}.subset.json`);
    wrangler(["r2", "object", "get", `${bucket}/${entry.key}`, "--file", downloaded], `EXPENSE_REMOTE_${sourceId}`);
    const data = readFileSync(downloaded);
    if (data.byteLength !== entry.size || sha256(data) !== entry.checksumSha256) {
      throw new Error(`EXPENSE_REMOTE_CHECKSUM_MISMATCH:${sourceId}`);
    }
    const target = resolve(root, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    const staged = `${target}.download`;
    writeFileSync(staged, data);
    renameSync(staged, target);
  }
  return manifest;
}

function writeSubset(sourceId, subset) {
  const target = resolve(root, expenseFiles[sourceId]);
  mkdirSync(dirname(target), { recursive: true });
  const staged = `${target}.next`;
  writeFileSync(staged, `${JSON.stringify(subset)}\n`, "utf8");
  renameSync(staged, target);
}

function loadDeputies() {
  const rosterPath = join(root, "data", "diputados-ids.json");
  if (!existsSync(rosterPath)) throw new Error("EXPENSE_LOCAL_ROSTER_MISSING:data/diputados-ids.json");
  const roster = JSON.parse(readFileSync(rosterPath, "utf8"));
  const diputados = Object.entries(roster).map(([id, nombre]) => ({ id, nombre: String(nombre) })).filter((item) => item.id && item.nombre);
  if (diputados.length < 100) throw new Error(`EXPENSE_LOCAL_ROSTER_TOO_SMALL:${diputados.length}`);
  return diputados;
}

function triggerPagesRefresh() {
  run("gh", ["workflow", "run", "Pages estático - refresco automático verificable", "--ref", "main"], "PAGES_REFRESH");
}

export async function main() {
  if (process.env.GITHUB_ACTIONS === "true" && !hydrateOnly) throw new Error("EXPENSE_LOCAL_GITHUB_FORBIDDEN: Cámara debe ejecutarse fuera de GitHub Actions");
  const schedule = chileExpenseSchedule();
  if (!force && !schedule.shouldRun) {
    console.log(JSON.stringify({ status: "skipped", reason: "not-expense-day", chileDate: schedule.date }, null, 2));
    return;
  }
  if (!process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || !process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    throw new Error("EXPENSE_LOCAL_MISSING_CLOUDFLARE_CREDENTIALS");
  }

  const work = mkdtempSync(join(tmpdir(), "cambiometro-expenses-local-"));
  try {
    const remoteManifest = downloadExpenseSubsets(work);
    if (hydrateOnly) {
      console.log(JSON.stringify({ status: "hydrated", files: Object.values(expenseFiles), remoteChecksum: remoteManifest.checksumSha256 }, null, 2));
      return;
    }

    const previous = readExpenseSubset(root, "gastos_camara");
    const fresh = await fetchGastosCamara({ diputados: loadDeputies() });
    const merged = mergeExpenseRecords(previous?.records ?? [], fresh);
    const subset = buildExpenseSubset({ sourceId: "gastos_camara", records: merged, generatedAt: new Date().toISOString() });
    if (previous && subset.recordCount < previous.recordCount) throw new Error(`EXPENSE_LOCAL_RECORDS_DECREASED:${previous.recordCount}->${subset.recordCount}`);
    if (subset.recordCount === 0) throw new Error("EXPENSE_LOCAL_EMPTY");
    writeSubset("gastos_camara", subset);

    run(process.execPath, ["scripts/verify-expense-release.mjs", "--required"], "EXPENSE_VERIFY");
    npm(["run", "data:publish:static", "--", "--groups", "gastos"], "EXPENSE_STATIC_PUBLISH");

    const verifyWork = mkdtempSync(join(tmpdir(), "cambiometro-expenses-verify-"));
    try {
      downloadExpenseSubsets(verifyWork);
      const published = readExpenseSubset(root, "gastos-camara");
      if (published?.checksumSha256 !== subset.checksumSha256) throw new Error("EXPENSE_LOCAL_PUBLISHED_CHECKSUM_MISMATCH:gastos_camara");
    } finally {
      rmSync(verifyWork, { recursive: true, force: true });
    }

    if (triggerPages) triggerPagesRefresh();
    console.log(JSON.stringify({ status: "published", source: "gastos_camara", records: subset.recordCount, checksumSha256: subset.checksumSha256, pagesRefreshTriggered: triggerPages }, null, 2));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error("[etl-expenses-local] error fatal:", error);
    process.exit(1);
  });
}
