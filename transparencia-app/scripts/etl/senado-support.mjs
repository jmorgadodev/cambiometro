const DEFAULT_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([408, 425, 429]);

function objectLike(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseSenadoSupportPage(input) {
  let payload = input;
  if (typeof input === "string") {
    try {
      payload = JSON.parse(input);
    } catch {
      throw new Error("SENADO_SUPPORT_RESPONSE_NOT_JSON");
    }
  }

  const rows = payload?.data?.data;
  const pagination = payload?.data?.meta?.pagination;
  const validPagination = objectLike(pagination)
    && Number.isSafeInteger(pagination.page) && pagination.page >= 1
    && Number.isSafeInteger(pagination.pageSize) && pagination.pageSize >= 1
    && Number.isSafeInteger(pagination.pageCount) && pagination.pageCount >= 0
    && Number.isSafeInteger(pagination.total) && pagination.total >= 0
    && pagination.pageCount === (pagination.total === 0 ? 0 : Math.ceil(pagination.total / pagination.pageSize))
    && (pagination.pageCount === 0 ? pagination.total === 0 : pagination.page <= pagination.pageCount);
  if (!validPagination) throw new Error("SENADO_SUPPORT_PAGINATION_INVALID");
  if (!Array.isArray(rows)) throw new Error("SENADO_SUPPORT_ROWS_INVALID");
  if (rows.length > pagination.pageSize || rows.length > pagination.total) {
    throw new Error("SENADO_SUPPORT_ROWS_COUNT_INVALID");
  }
  for (const row of rows) {
    const attributes = row?.attributes;
    if (!(typeof row?.id === "string" || Number.isSafeInteger(row?.id))
      || String(row.id).trim() === ""
      || !objectLike(attributes)
      || !Number.isSafeInteger(Number(attributes.ano))
      || !Number.isSafeInteger(Number(attributes.mes))
      || Number(attributes.mes) < 1 || Number(attributes.mes) > 12
      || typeof attributes.unidad_laboral !== "string"
      || !Object.hasOwn(attributes, "monto")) {
      throw new Error("SENADO_SUPPORT_ROW_SCHEMA_INVALID");
    }
  }
  return { rows, pagination };
}

export function assertSenadoSupportCollection(rows, expectedTotal) {
  if (!Array.isArray(rows) || !Number.isSafeInteger(expectedTotal) || expectedTotal < 0 || rows.length !== expectedTotal) {
    throw new Error(`SENADO_SUPPORT_TOTAL_MISMATCH: expected=${expectedTotal} received=${Array.isArray(rows) ? rows.length : "invalid"}`);
  }
  const ids = new Set();
  for (const row of rows) {
    const id = String(row?.id ?? "").trim();
    if (!id) throw new Error("SENADO_SUPPORT_MISSING_ID");
    if (ids.has(id)) throw new Error(`SENADO_SUPPORT_DUPLICATE_ID: ${id}`);
    ids.add(id);
  }
  return rows;
}

export async function fetchSenadoSupportPage(url, {
  fetchImpl = fetch,
  attempts = DEFAULT_ATTEMPTS,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 20_000,
} = {}) {
  let lastCode = "UNKNOWN";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { "user-agent": "cambiometro ETL", accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        lastCode = `HTTP_${response.status}`;
        if (!(RETRYABLE_STATUS.has(response.status) || response.status >= 500) || attempt === attempts) break;
      } else {
        const body = await response.text();
        try {
          return parseSenadoSupportPage(body);
        } catch (error) {
          lastCode = error?.message ?? "INVALID_RESPONSE";
          if (lastCode !== "SENADO_SUPPORT_RESPONSE_NOT_JSON" || attempt === attempts) break;
        }
      }
    } catch (error) {
      lastCode = error?.name === "TimeoutError" || error?.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR";
      if (attempt === attempts) break;
    }
    await wait(Math.min(500 * (2 ** (attempt - 1)), 2_000));
  }
  throw new Error(`SENADO_SUPPORT_FETCH_FAILED: ${lastCode}`);
}
