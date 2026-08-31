import iconv from "iconv-lite";

const DEFAULT_CHUNK_SIZE = 32 * 1024 * 1024;
const DEFAULT_RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000, 20_000];
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const USER_AGENT = "cambiometro-etl/1.0 (+https://cambiometro.impulsacv.cl)";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function inspectSource(urls, fetchImpl, retryDelaysMs) {
  const failures = [];
  for (const candidate of urls) {
    for (const delayMs of retryDelaysMs) {
      if (delayMs > 0) await wait(delayMs);
      try {
        const response = await fetchImpl(candidate, {
          method: "HEAD",
          headers: {
            Accept: "text/csv,*/*",
            "Accept-Encoding": "identity",
            "User-Agent": USER_AGENT,
          },
        });
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

async function fetchRange({ sourceUrl, start, end, totalBytes, validator, fetchImpl, retryDelaysMs }) {
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
      const response = await fetchImpl(sourceUrl, { headers });
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
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length !== end - start + 1) {
        failures.push(`${start}-${end} -> bloque truncado ${body.length}/${end - start + 1}`);
        continue;
      }
      return body;
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
  fetchImpl = fetch,
  onSource,
} = {}) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error("CPLT_RANGE_URLS_REQUIRED");
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) throw new Error("CPLT_RANGE_CHUNK_SIZE_INVALID");
  const source = await inspectSource(urls, fetchImpl, retryDelaysMs);
  onSource?.(source);

  let carry = "";
  for (let start = 0; start < source.totalBytes; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, source.totalBytes - 1);
    const body = await fetchRange({
      ...source,
      start,
      end,
      fetchImpl,
      retryDelaysMs,
    });
    const pieces = `${carry}${iconv.decode(body, "win1252")}`.split(/\r?\n/);
    carry = pieces.pop() ?? "";
    for (const line of pieces) yield line;
  }
  if (carry) yield carry;
}
