const DEFAULT_MUNICIPAL_SEARCH_PAGE_SIZE = 10_000;
const DEFAULT_CENTRAL_SEARCH_PAGE_SIZE = 1_000;
const MIN_SEARCH_PAGE_SIZE = 500;
const MAX_MUNICIPAL_SEARCH_PAGE_SIZE = 10_000;
const MAX_CENTRAL_SEARCH_PAGE_SIZE = 2_500;

/**
 * @param {{ central?: boolean, override?: string|number }} options
 */
export function getCpltSearchPageSize({ central = false, override } = {}) {
  const fallback = central ? DEFAULT_CENTRAL_SEARCH_PAGE_SIZE : DEFAULT_MUNICIPAL_SEARCH_PAGE_SIZE;
  const maximum = central ? MAX_CENTRAL_SEARCH_PAGE_SIZE : MAX_MUNICIPAL_SEARCH_PAGE_SIZE;
  const raw = override ?? (central ? process.env.CPLT_CENTRAL_SEARCH_PAGE_SIZE : process.env.CPLT_SEARCH_PAGE_SIZE);
  if (raw == null || String(raw).trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < MIN_SEARCH_PAGE_SIZE || value > maximum) {
    throw new Error(`CPLT_SEARCH_PAGE_SIZE_INVALID: ${raw}`);
  }
  return value;
}
