import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseDelimited } from "./dipres.mjs";

const execFileAsync = promisify(execFile);

const REPORT_URL = "https://registros19862.gob.cl/reporte/transferencias";
const REQUIRED_COLUMNS = ["FOLIO", "FECHA_DECRETO", "FECHA_INGRESO", "PERIODO", "EMISORA_RUT", "EMISORA_NOMBRE", "RECEPTORA_RUT", "RECEPTORA_NOMBRE", "MONTO"];

function isoDate(value) {
  const match = String(value ?? "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) throw new Error(`LEY_19862_INVALID_DATE: ${value}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function entityId(rut) {
  const normalized = String(rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(normalized)) {
      return `legal-cl-invalid-${Buffer.from(String(rut)).toString('hex').slice(0, 8)}`;
  }
  return `legal-cl-${normalized.toLowerCase()}`;
}

function amountClp(value) {
  if (!/^\d+$/.test(String(value ?? "").trim())) throw new Error(`LEY_19862_INVALID_AMOUNT: ${value}`);
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) throw new Error(`LEY_19862_UNSAFE_AMOUNT: ${value}`);
  return amount;
}

export function buildTransferReportUrl(year, month) {
  if (!Number.isInteger(year) || year < 2003 || year > 2100) throw new Error("LEY_19862_INVALID_YEAR");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("LEY_19862_INVALID_MONTH");
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    "trans[desde]": from,
    "trans[hasta]": to,
    "trans[fecha]": "d",
    "trans[ejecutar]": "",
    csv: "1",
  });
  return `${REPORT_URL}?${params}`;
}

export function normalizeTransferCsv(csv, { sourceUrl }) {
  const rows = parseDelimited(csv, ";");
  if (rows.length === 0 || REQUIRED_COLUMNS.some((column) => !(column in rows[0]))) throw new Error("LEY_19862_INVALID_SCHEMA");
  const records = rows.map((row) => {
    const emitterEntityId = entityId(row.EMISORA_RUT);
    const receiverEntityId = entityId(row.RECEPTORA_RUT);
    const amount = amountClp(row.MONTO);
    const fecha = isoDate(row.FECHA_DECRETO);
    return {
      id: `ley-19862-transfer-${row.FOLIO}`,
      fecha,
      period: row.PERIODO || fecha.slice(0, 4),
      kind: "transfer",
      title: row.OBJETIVO_APORTE || `Transferencia ${row.FOLIO}`,
      description: row.MARCO_LEGAL || null,
      folio: row.FOLIO,
      decree_date: fecha,
      registered_at: isoDate(row.FECHA_INGRESO),
      budget_period: row.PERIODO,
      objective: row.OBJETIVO_APORTE,
      legal_framework: row.MARCO_LEGAL,
      classification: row.CLASIFICACION,
      emitter: {
        rut_juridico: row.EMISORA_RUT,
        name: row.EMISORA_NOMBRE,
        class: row.EMISORA_CLASE,
        entity_id: emitterEntityId,
      },
      receiver: {
        rut_juridico: row.RECEPTORA_RUT,
        name: row.RECEPTORA_NOMBRE,
        class: row.RECEPTORA_CLASE,
        entity_id: receiverEntityId,
      },
      municipality: row.COMUNA || null,
      monto_clp: amount,
      monto_original: { amount: row.MONTO, currency: "CLP", unit: "pesos" },
      subject_entity_ids: [emitterEntityId],
      object_entity_ids: [receiverEntityId],
      url: `https://registros19862.gob.cl/transferencia/${row.FOLIO}`,
      report_url: sourceUrl,
      fuente: "Registro Central de Colaboradores del Estado y Municipalidades · Ley 19.862",
      license: "CC BY 3.0 CL",
    };
  });
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== records.length) throw new Error("LEY_19862_DUPLICATE_FOLIO");
  return records;
}

function positiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function retryableNetworkError(error) {
  const code = error?.cause?.code ?? error?.code;
  return error instanceof TypeError
    || error?.name === "TimeoutError"
    || error?.name === "AbortError"
    || ["EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "ENETUNREACH", "EHOSTUNREACH"].includes(code);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithCurl(sourceUrl, timeoutMs) {
  const binary = process.platform === "win32" ? "curl.exe" : "curl";
  const curlTimeoutMs = Math.min(timeoutMs, 60_000);
  const { stdout } = await execFileAsync(binary, [
    "--fail-with-body",
    "--location",
    "--retry", "1",
    "--retry-all-errors",
    "--connect-timeout", String(Math.max(10, Math.ceil(curlTimeoutMs / 1000))),
    "--max-time", String(Math.max(30, Math.ceil(curlTimeoutMs / 1000))),
    "--user-agent", "TransparenciaChile-ETL/3.0",
    "--header", "Accept: text/csv",
    sourceUrl,
  ], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 });
  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
}

export async function fetchTransferMonth({
  year,
  month,
  fetchImpl = fetch,
  timeoutMs = positiveIntegerEnv("LEY_19862_TIMEOUT_MS", 180_000),
  maxAttempts = positiveIntegerEnv("LEY_19862_MAX_ATTEMPTS", 5),
  retryDelayMs = positiveIntegerEnv("LEY_19862_RETRY_DELAY_MS", 1_000),
}) {
  const sourceUrl = buildTransferReportUrl(year, month);
  let response;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetchImpl(sourceUrl, { headers: { "User-Agent": "TransparenciaChile-ETL/3.0", Accept: "text/csv" }, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        if (response.status < 500 || attempt === maxAttempts) throw new Error(`LEY_19862_HTTP_${response.status}`);
      } else {
        break;
      }
    } catch (error) {
      lastError = error;
      if (!retryableNetworkError(error)) throw error;
      if (attempt === maxAttempts) break;
    }
    await wait(retryDelayMs * attempt);
  }
  if (lastError && fetchImpl === fetch) {
    try {
      const data = await fetchWithCurl(sourceUrl, timeoutMs);
      response = { ok: true, arrayBuffer: async () => data };
    } catch (curlError) {
      curlError.cause = lastError;
      throw curlError;
    }
  }
  if (!response?.ok) throw new Error(`LEY_19862_HTTP_${response?.status ?? "UNKNOWN"}`);
  const original = Buffer.from(await response.arrayBuffer());
  const text = new TextDecoder("utf-8").decode(original);
  const records = normalizeTransferCsv(text, { sourceUrl });
  return {
    sourceId: "ley-19862",
    year,
    month,
    period: `${year}-${String(month).padStart(2, "0")}`,
    records,
    original: {
      name: `ley-19862-${year}-${String(month).padStart(2, "0")}-transferencias.csv`,
      url: sourceUrl,
      data: original,
      checksumSha256: createHash("sha256").update(original).digest("hex"),
      license: "CC BY 3.0 CL",
      redistributable: true,
    },
  };
}
