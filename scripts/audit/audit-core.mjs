import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AUDIT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const APP_ROOT = resolve(AUDIT_ROOT, "transparencia-app");
export const DOCS_ROOT = resolve(AUDIT_ROOT, "docs/auditoria");
export const DEFAULT_LAKE = "C:\\Users\\jorge\\Proyectos\\transparencia.impulsacv.cl_\\transparencia-app\\data\\lake";
export const DEFAULT_SITE = "https://cambiometro.impulsacv.cl";
export const DEFAULT_CUTOFF = "2026-08-20";

const ALLOWED_HOSTS = new Set([
  "cambiometro.impulsacv.cl",
  "web-back.senado.cl",
  "www.senado.cl",
  "tramitacion.senado.cl",
  "www.camara.cl",
  "opendata.congreso.cl",
  "datos.sinim.gov.cl",
  "www.sinim.gov.cl",
  "www.dipres.gob.cl",
  "api.mercadopublico.cl",
  "api.mercadopublico.cl",
]);

const SOURCE_INTERVAL_MS = new Map([
  ["cambiometro.impulsacv.cl", 2_100],
]);
const lastRequestAt = new Map();

export function parseClp(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const negative = text.includes("-");
  const digits = text.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const amount = Number.parseInt(digits, 10);
  return negative ? -amount : amount;
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeSurfaceText(value) {
  return String(value ?? "").toLocaleLowerCase("es-CL").trim().replace(/\s+/g, " ");
}

export function normalizeRut(value) {
  return String(value ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
}

function sum(values) {
  return values.reduce((total, value) => total + (parseClp(value) ?? 0), 0);
}

function result(validation, status, difference, details = {}) {
  return { validation, status, severity: status, difference, ...details };
}

export function validateV1({ officialTotal, items }) {
  const official = parseClp(officialTotal) ?? 0;
  const itemSum = sum(items ?? []);
  const difference = itemSum - official;
  return result("V1", difference === 0 ? "OK" : "CRITICA", difference, { officialTotal: official, itemSum });
}

export function validateV2({ assignment, salaries }) {
  const base = parseClp(assignment) ?? 0;
  const salarySum = sum(salaries ?? []);
  const difference = salarySum - base;
  const status = salarySum > base * 1.4 ? "CRITICA" : salarySum > base ? "ALTA" : "OK";
  return result("V2", status, difference, { assignment: base, salarySum });
}

export function validateV3({ total, favor, against, abstentions, presentNoVote }) {
  const components = [favor, against, abstentions, presentNoVote].map((value) => Number(value ?? 0));
  const componentSum = components.reduce((acc, value) => acc + value, 0);
  const difference = componentSum - Number(total ?? 0);
  return result("V3", difference === 0 ? "OK" : "CRITICA", difference, { componentSum });
}

export function validateV4({ numerator, denominator, officialSessions, publishedPercent }) {
  const n = Number(numerator ?? 0);
  const d = Number(denominator ?? 0);
  const sessions = Number(officialSessions ?? 0);
  const recalculatedPercent = d > 0 ? (n / d) * 100 : 0;
  const percentageDifference = Math.abs(recalculatedPercent - Number(publishedPercent ?? 0));
  const validBounds = n <= d && d <= sessions && n >= 0;
  const status = validBounds && percentageDifference <= 0.5 + Number.EPSILON ? "OK" : "ALTA";
  return result("V4", status, percentageDifference, { validBounds, recalculatedPercent });
}

export function validateV5({ publishedTotal, components }) {
  const published = Number(publishedTotal ?? 0);
  const componentSum = (components ?? []).reduce((total, value) => total + Number(value ?? 0), 0);
  const difference = componentSum - published;
  return result("V5", difference === 0 ? "OK" : "CRITICA", difference, { componentSum });
}

export function validateV6({ official, published }) {
  const rutMismatch = Boolean(official?.rut || published?.rut) && normalizeRut(official?.rut) !== normalizeRut(published?.rut);
  const partyMismatch = normalizeText(official?.party) !== normalizeText(published?.party);
  const nameMismatch = normalizeSurfaceText(official?.name) !== normalizeSurfaceText(published?.name);
  const roleMismatch = normalizeSurfaceText(official?.role) !== normalizeSurfaceText(published?.role);
  const status = rutMismatch || partyMismatch ? "ALTA" : nameMismatch || roleMismatch ? "MENOR" : "OK";
  return result("V6", status, null, { rutMismatch, partyMismatch, nameMismatch, roleMismatch });
}

export function validateV7({ monthlySalary, overtimeHours, relationAmount, annualOrganizationTotal, operationalExpenses, regionalAssignment }) {
  const violations = [];
  if (monthlySalary !== undefined && Number(monthlySalary) > 60_000_000) violations.push("sueldo_mensual");
  if (overtimeHours !== undefined && Number(overtimeHours) > 300) violations.push("horas_extras");
  if (relationAmount !== undefined && annualOrganizationTotal !== undefined && Number(relationAmount) > Number(annualOrganizationTotal)) violations.push("monto_relacion");
  if (operationalExpenses !== undefined && regionalAssignment !== undefined && Number(operationalExpenses) > Number(regionalAssignment) * 1.4) violations.push("gastos_operacionales");
  return result("V7", violations.length ? "ALTA" : "OK", violations.length, { violations });
}

export function deterministicSample(rows, ratio, keyOf) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const size = Math.ceil(rows.length * ratio);
  return rows
    .map((row) => ({ row, hash: sha256(String(keyOf(row))) }))
    .sort((left, right) => left.hash.localeCompare(right.hash) || String(keyOf(left.row)).localeCompare(String(keyOf(right.row))))
    .slice(0, size)
    .map(({ row }) => row);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function collectPrimitives(value, output) {
  if (value === null || value === undefined) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPrimitives(item, output);
    return;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      output.push(key);
      collectPrimitives(item, output);
    }
  }
}

export function extractRscPrimitives(payload) {
  const output = [];
  for (const line of String(payload ?? "").split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const frame = line.slice(separator + 1).trim();
    if (!frame || !["{", "[", '"'].includes(frame[0])) continue;
    try {
      collectPrimitives(JSON.parse(frame), output);
    } catch {
      // Import/error frames and split streaming frames are intentionally ignored.
    }
  }
  return output;
}

export function stableSortFindings(findings) {
  return [...findings].sort((left, right) => {
    const a = [left.entity_type, left.entity_id, left.period, left.field, left.layer_from, left.layer_to, left.id].map((value) => String(value ?? "")).join("\u0000");
    const b = [right.entity_type, right.entity_id, right.period, right.field, right.layer_from, right.layer_to, right.id].map((value) => String(value ?? "")).join("\u0000");
    return a.localeCompare(b, "es-CL");
  });
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function writeMarkdown(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, String(value).trimEnd() + "\n", "utf8");
  await rename(temporary, path);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export async function fetchWithPolicy(rawUrl, options = {}) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) throw new Error(`AUDIT_URL_NOT_ALLOWED:${url.hostname}`);
  const interval = SOURCE_INTERVAL_MS.get(url.hostname) ?? 1_000;
  const previous = lastRequestAt.get(url.hostname) ?? 0;
  const remaining = interval - (Date.now() - previous);
  if (remaining > 0) await sleep(remaining);

  const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    lastRequestAt.set(url.hostname, Date.now());
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Cambiometro-Auditoria/1.0", Accept: options.accept ?? "*/*", ...options.headers },
        redirect: "error",
        signal: AbortSignal.timeout(options.timeoutMs ?? 60_000),
      });
      if (response.status === 429 || response.status === 503) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0) * 1_000;
        if (attempt < 3) await sleep(Math.max(retryAfter, 2 ** (attempt - 1) * 1_000));
        lastError = new Error(`AUDIT_HTTP_${response.status}`);
        continue;
      }
      if (!response.ok) throw new Error(`AUDIT_HTTP_${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxBytes) throw new Error("AUDIT_RESPONSE_TOO_LARGE");
      return { body: buffer.toString("utf8"), headers: response.headers, status: response.status, checksum: sha256(buffer) };
    } catch (error) {
      lastError = error;
      if (attempt < 3 && (error?.name === "TimeoutError" || error?.name === "TypeError")) {
        await sleep(2 ** (attempt - 1) * 1_000);
        continue;
      }
      break;
    }
  }
  const unavailable = new Error(`FUENTE_NO_DISPONIBLE:${url.hostname}:${lastError?.message ?? "unknown"}`);
  unavailable.cause = lastError;
  throw unavailable;
}

export function findingId(parts) {
  return sha256(parts.map((part) => String(part ?? "")).join("|")).slice(0, 20);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { cutoff: DEFAULT_CUTOFF, lake: DEFAULT_LAKE, site: DEFAULT_SITE };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--cutoff") args.cutoff = argv[++index];
    else if (token === "--lake") args.lake = resolve(argv[++index]);
    else if (token === "--site") args.site = argv[++index].replace(/\/$/, "");
    else if (token === "--calibrate-only") args.calibrateOnly = true;
    else throw new Error(`AUDIT_UNKNOWN_ARGUMENT:${token}`);
  }
  if (!/^2026-\d{2}-\d{2}$/.test(args.cutoff)) throw new Error("AUDIT_INVALID_CUTOFF");
  return args;
}
