import iconv from "iconv-lite";

const DEFAULT_CHUNK_SIZE = 32 * 1024 * 1024;
const DEFAULT_RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000, 20_000];
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const USER_AGENT = "cambiometro-etl/1.0 (+https://cambiometro.impulsacv.cl)";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

// V8 puede conservar el bloque UTF-16 completo cuando se entrega un
// `slice()` como subcadena. En los CSV de CPLT cada bloque pesa 32 MB y una
// fila retenida por el parser conservaría el bloque entero. La recodificación
// crea una cadena independiente y permite que el bloque anterior sea
// recolectado después de procesar sus filas.
function detachText(value) {
  return Buffer.from(value, "utf8").toString("utf8");
}

async function fetchWithTimeout(fetchImpl, input, init, requestTimeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, requestTimeoutMs);
  try {
    const response = await fetchImpl(input, { ...init, signal: controller.signal });
    const body = typeof response.arrayBuffer === "function"
      ? await response.arrayBuffer()
      : null;
    return { response, body };
  } catch (error) {
    if (timedOut) throw new Error(`CPLT_RANGE_REQUEST_TIMEOUT: ${requestTimeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function inspectSource(urls, fetchImpl, retryDelaysMs, requestTimeoutMs) {
  const failures = [];
  for (const candidate of urls) {
    for (const delayMs of retryDelaysMs) {
      if (delayMs > 0) await wait(delayMs);
      try {
        const { response } = await fetchWithTimeout(fetchImpl, candidate, {
          method: "HEAD",
          headers: {
            Accept: "text/csv,*/*",
            "Accept-Encoding": "identity",
            "User-Agent": USER_AGENT,
          },
        }, requestTimeoutMs);
        if (!response.ok) {
          failures.push(`${candidate} -> HEAD ${response.status}`);
          if (!RETRYABLE_STATUSES.has(response.status)) break;
          continue;
        }
        const totalBytes = Number(response.headers.get("content-length"));
        const acceptsRanges = response.headers.get("accept-ranges")?.toLowerCase() === "bytes";
        if (!Number.isSafeInteger(totalBytes) || totalBytes <= 0 || !acceptsRanges) {
          failures.push(`${candidate} -> rango no disponible o largo inválido`);
          break;
        }
        return {
          sourceUrl: response.url || candidate,
          totalBytes,
          validator: response.headers.get("etag") || response.headers.get("last-modified") || null,
        };
      } catch (error) {
        failures.push(`${candidate} -> ${errorMessage(error)}`);
      }
    }
  }
  throw new Error(`CPLT_RANGE_SOURCE_UNAVAILABLE: ${failures.join("; ")}`);
}

async function fetchRange({
  sourceUrl,
  start,
  end,
  totalBytes,
  validator,
  fetchImpl,
  retryDelaysMs,
  requestTimeoutMs,
}) {
  const failures = [];
  for (const delayMs of retryDelaysMs) {
    if (delayMs > 0) await wait(delayMs);
    try {
      const headers = {
        Accept: "text/csv,*/*",
        "Accept-Encoding": "identity",
        Range: `bytes=${start}-${end}`,
        "User-Agent": USER_AGENT,
      };
      if (validator) headers["If-Range"] = validator;
      const { response, body } = await fetchWithTimeout(fetchImpl, sourceUrl, { headers }, requestTimeoutMs);
      if (response.status !== 206) {
        failures.push(`${start}-${end} -> HTTP ${response.status}`);
        if (!RETRYABLE_STATUSES.has(response.status)) break;
        continue;
      }

      const contentRange = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get("content-range") || "");
      if (!contentRange
        || Number(contentRange[1]) !== start
        || Number(contentRange[2]) !== end
        || Number(contentRange[3]) !== totalBytes) {
        failures.push(`${start}-${end} -> Content-Range inválido`);
        continue;
      }
      const buffer = Buffer.from(body || []);
      if (buffer.length !== end - start + 1) {
        failures.push(`${start}-${end} -> bloque truncado ${buffer.length}/${end - start + 1}`);
        continue;
      }
      return buffer;
    } catch (error) {
      failures.push(`${start}-${end} -> ${errorMessage(error)}`);
    }
  }
  throw new Error(`CPLT_RANGE_DOWNLOAD_FAILED: ${failures.join("; ")}`);
}

export async function* readRangedTextLines({
  urls,
  chunkSize = DEFAULT_CHUNK_SIZE,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  fetchImpl = fetch,
  onSource,
} = {}) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("CPLT_RANGE_URLS_REQUIRED");
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) throw new Error("CPLT_RANGE_CHUNK_SIZE_INVALID");
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error("CPLT_RANGE_REQUEST_TIMEOUT_INVALID");
  }
  const source = await inspectSource(urls, fetchImpl, retryDelaysMs, requestTimeoutMs);
  onSource?.(source);

  let carry = "";
  let body = null;
  let decodedChunk = "";
  for (let start = 0; start < source.totalBytes; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, source.totalBytes - 1);
    body = await fetchRange({
      ...source,
      start,
      end,
      fetchImpl,
      retryDelaysMs,
      requestTimeoutMs,
    });
    decodedChunk = `${carry}${iconv.decode(body, "win1252")}`;
    let lineStart = 0;
    for (let index = 0; index < decodedChunk.length; index += 1) {
      if (decodedChunk.charCodeAt(index) !== 10) continue;
      const lineEnd = index > lineStart && decodedChunk.charCodeAt(index - 1) === 13
        ? index - 1
        : index;
      yield detachText(decodedChunk.slice(lineStart, lineEnd));
      lineStart = index + 1;
    }
    carry = decodedChunk.slice(lineStart);
    body = null;
    decodedChunk = "";
  }
  if (carry) yield detachText(carry);
}
