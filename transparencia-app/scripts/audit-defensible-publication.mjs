import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { buildReleaseSet } from "./release-set.mjs";
import { resolveSafeStaticPath } from "./static-site-inputs.mjs";

const BASE = "https://d81c86ed.cambiometro.pages.dev";
const PIN = "619765926f22de4569ec94fba5481bb1245e9b1a07ebcf5bdd2e06d2e46c54c6";
const MAX_BYTES = 12 * 1024 * 1024;
const PATHS = ["data/politicos-votaciones.json", "data/personal-apoyo.json", "data/movimientos.json"];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function auditPublishedVotes(data) {
  const sessions = data.sessions ?? {};
  const counts = new Map();
  /** @type {Record<string, { sessions: number, firstPeriod: string | null, lastPeriod: string | null, options: Record<string, number> }>} */
  const byChamber = {};
  let duplicatePairs = 0;
  let unknownSessions = 0;
  let malformedRows = 0;
  for (const rows of Object.values(data.votes ?? {})) {
    const seen = new Set();
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 2 || typeof row[1] !== "string") { malformedRows++; continue; }
      const [id, option] = row;
      if (seen.has(id)) { duplicatePairs++; continue; }
      seen.add(id);
      const session = sessions[id];
      if (!session) { unknownSessions++; continue; }
      const chamber = session.fuente ?? "no_informada";
      const tally = counts.get(id) ?? {};
      tally[option] = (tally[option] ?? 0) + 1;
      counts.set(id, tally);
      const group = byChamber[chamber] ?? { sessions: 0, firstPeriod: null, lastPeriod: null, options: {} };
      group.options[option] = (group.options[option] ?? 0) + 1;
      byChamber[chamber] = group;
    }
  }
  const totalDisagreements = [];
  const sessionsWithoutNominals = [];
  for (const [id, session] of Object.entries(sessions)) {
    const group = byChamber[session.fuente ?? "no_informada"] ??= { sessions: 0, firstPeriod: null, lastPeriod: null, options: {} };
    group.sessions++;
    if (session.fecha) {
      group.firstPeriod = !group.firstPeriod || session.fecha < group.firstPeriod ? session.fecha : group.firstPeriod;
      group.lastPeriod = !group.lastPeriod || session.fecha > group.lastPeriod ? session.fecha : group.lastPeriod;
    }
    const tally = counts.get(id);
    if (!tally) { sessionsWithoutNominals.push(id); continue; }
    for (const [field, option] of [["total_si", "Afirmativo"], ["total_no", "En Contra"], ["total_abstencion", "Abstención"]]) {
      const original = session[field];
      if (original === null || original === undefined || original === "") continue;
      const declared = Number(original);
      const observed = tally[option] ?? 0;
      if (!Number.isFinite(declared) || declared !== observed) totalDisagreements.push({ id, field, declared: original, observed });
    }
  }
  return { sessionCount: Object.keys(sessions).length, personKeys: Object.keys(data.votes ?? {}).length,
    byChamber, duplicatePairs, unknownSessions, malformedRows, sessionsWithoutNominals, totalDisagreements };
}

export function auditPartyArithmetic(data) {
  const disagreements = [];
  for (const [party, stats] of Object.entries(data)) {
    for (const chamber of ["votosCamara", "votosSenado"]) {
      const c = stats[chamber];
      if (!c) continue;
      const emitted = c.afirmativo + c.enContra + c.abstencion;
      if (emitted !== c.emitidos || emitted + c.noVota + c.dispensado !== c.apariciones)
        disagreements.push({ party, chamber, reason: "opciones/emitidos/apariciones" });
    }
    if (stats.gastos && stats.gastos.porMes.reduce((sum, period) => sum + period.total, 0) !== stats.gastos.total)
      disagreements.push({ party, reason: "gastos/periodos" });
  }
  return { partyCount: Object.keys(data).length, disagreements,
    interpretation: "voto emitido sobre apariciones; bancada del catálogo, no afiliación histórica acreditada" };
}

async function get(path, expected, budget) {
  const response = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "Cambiometro-ConfidenceReview/1.0" } });
  if (!response.ok) throw new Error(`REFERENCE_UNAVAILABLE ${path} ${response.status}`);
  const advertised = Number(response.headers.get("content-length"));
  if (advertised > budget.remaining) throw new Error("READ_BUDGET_EXCEEDED");
  const chunks = [];
  for await (const chunk of response.body) {
    budget.remaining -= chunk.length;
    if (budget.remaining < 0) throw new Error("READ_BUDGET_EXCEEDED");
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  const checksum = sha(bytes);
  if (expected && checksum !== expected) throw new Error(`CHECKSUM_MISMATCH ${path}`);
  return { data: JSON.parse(bytes.toString("utf8")), bytes: bytes.length, checksum };
}

async function main() {
  const budget = { remaining: MAX_BYTES };
  const localFlag = process.argv.indexOf("--local-release-set");
  const localPin = localFlag >= 0 ? process.argv[localFlag + 1] : null;
  const manifestFlag = process.argv.indexOf("--manifest-file");
  const manifestPath = manifestFlag >= 0 ? process.argv[manifestFlag + 1] : null;
  const rootFlag = process.argv.indexOf("--input-root");
  const inputRoot = rootFlag >= 0 ? resolve(process.argv[rootFlag + 1]) : process.cwd();
  async function readPinned(path, expected) {
    const info = await stat(path);
    if (info.size > budget.remaining) throw new Error("READ_BUDGET_EXCEEDED");
    const bytes = await readFile(path);
    budget.remaining -= bytes.length;
    if (budget.remaining < 0) throw new Error("READ_BUDGET_EXCEEDED");
    const checksum = sha(bytes);
    if (expected && expected !== checksum) throw new Error(`CHECKSUM_MISMATCH ${path}`);
    return { data: JSON.parse(bytes.toString("utf8")), bytes: bytes.length, checksum };
  }
  // En CI el pin lo produce la hidratación canónica y lo verifica la guarda de ReleaseSet.
  // No usar este modo sobre fixtures para certificar producción.
  const rawManifest = manifestPath ? await readPinned(manifestPath) : null;
  const manifest = rawManifest
    ? { ...rawManifest, data: buildReleaseSet(rawManifest.data) }
    : localPin ? await readPinned(localPin) : await get("data/release-set.json", PIN, budget);
  const files = Object.values(manifest.data.domains).flatMap((domain) => domain.files);
  const selected = PATHS.map((path) => {
    const file = files.find((item) => item.path === path);
    if (!file || !Number.isSafeInteger(file.size) || file.size < 0) throw new Error(`NO_PREFLIGHT_METADATA ${path}`);
    return file;
  });
  const projected = manifest.bytes + selected.reduce((sum, file) => sum + file.size, 0);
  if (projected > MAX_BYTES) throw new Error("PREFLIGHT_READ_BUDGET_EXCEEDED");
  const preflight = { reference: manifestPath ? "objetos inmutables del manifiesto R2 obtenido por GET" : localPin ? "candidato CI hidratado y fijado" : BASE, releaseSetChecksum: rawManifest ? null : manifest.checksum, releaseSetId: manifest.data.releaseSetId, manifestChecksumSha256: manifest.data.manifestChecksumSha256, maximumGets: localPin || manifestPath ? 0 : 4, projectedBytes: projected, maxBytes: MAX_BYTES, writesR2: 0, queriesD1: 0 };
  if (!process.argv.includes("--run")) { console.log(JSON.stringify(preflight)); return; }
  const inputs = [];
  for (const file of selected) inputs.push(localPin || manifestPath ? await readPinned(resolveSafeStaticPath(inputRoot, file.path), file.checksumSha256) : await get(file.path, file.checksumSha256, budget));
  const support = inputs[1].data;
  const report = { reviewedOn: new Date().toISOString(), preflight,
    consumedBytes: MAX_BYTES - budget.remaining,
    evidence: selected.map((file, index) => ({ path: file.path, bytes: inputs[index].bytes, checksumSha256: inputs[index].checksum })),
    votes: auditPublishedVotes(inputs[0].data),
    parties: { status: "en_revision", reason: "partidos-stats.subset.json no está individualizado en el ReleaseSet; no sustituirlo por el fixture Git" },
    movements: { rows: inputs[2].data.movimientos.length, signals: inputs[2].data.signals.length,
      total: inputs[2].data.movimientos.length + inputs[2].data.signals.length },
    support: { diputadoOffices: Object.keys(support.diputados ?? {}).length, senateOffices: Object.keys(support.senadores ?? {}).length,
      senatePeriods: support.meses_senado_disponibles ?? [], status: "agregado mensual por bancada retirado; filas históricas no son personas únicas" },
    limitation: "Verifica estructura y aritmética de la proyección vinculada al catálogo. Diferencias nominales pueden ser de alcance y requieren conciliación, no prueban corrupción. No verifica todos los documentos originales, afiliación histórica ni cobertura nacional." };
  const output = process.argv.indexOf("--output");
  if (output >= 0) await writeFile(process.argv[output + 1], `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...preflight, consumedBytes: report.consumedBytes, voteSessions: report.votes.sessionCount,
    totalDisagreements: report.votes.totalDisagreements.length, duplicatePairs: report.votes.duplicatePairs,
    unknownSessions: report.votes.unknownSessions, missingNominals: report.votes.sessionsWithoutNominals.length,
    partyState: report.parties.status, movementTotal: report.movements.total, evidenceFiles: report.evidence.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
