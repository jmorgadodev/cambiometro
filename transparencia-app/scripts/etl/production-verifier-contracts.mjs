export function parseDisplayedInteger(value) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : null;
}

export function extractInfoLobbyCount(html) {
  const match = String(html).match(
    /<div[^>]*class="[^"]*stat-tile__value[^"]*"[^>]*>\s*([\d.]+)\s*<\/div>\s*<div[^>]*class="[^"]*stat-tile__label[^"]*"[^>]*>\s*Registros InfoLobby\s*<\/div>/i,
  );
  return parseDisplayedInteger(match?.[1]);
}

export function extractCanonicalCount(html) {
  const match = String(html).match(
    /<dt>\s*Registros Canónicos\s*<\/dt>\s*<dd[^>]*>\s*([\d.]+)\s*<\/dd>/i,
  );
  return parseDisplayedInteger(match?.[1]);
}

export function extractConsolidatedCount(html) {
  const match = String(html).match(/consolidado\s+([\d.]+)/i);
  return parseDisplayedInteger(match?.[1]);
}

const SPANISH_MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function matchesPeriod(text, period) {
  if (text.includes(period)) return true;
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return false;
  const month = Number(match[2]);
  const monthName = SPANISH_MONTHS[month - 1];
  return Boolean(monthName && new RegExp(`\\b${monthName}\\s+${match[1]}\\b`, "i").test(text));
}

export function hasPublishedParliamentaryDiet(html, period = null) {
  const text = String(html)
    .replace(/<!--.*?-->/gs, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");
  const hasLabel = /dieta parlamentaria bruta/i.test(text);
  const hasAmount = /\$\s*\d{1,3}(?:\.\d{3})+/.test(text);
  const hasPeriod = period ? matchesPeriod(text, String(period)) : true;
  return hasLabel && hasAmount && hasPeriod;
}

export function hasConsistentPublishedStaffExcess(html) {
  const text = String(html)
    .replace(/<!--.*?-->/gs, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  if (!text.includes("Personal de Apoyo y Asesores")) return false;

  const base = parseDisplayedInteger(text.match(/Base mensual oficial:\s*(\$[\d.]+)/i)?.[1]);
  const total = parseDisplayedInteger(text.match(/Total publicado:\s*(\$[\d.]+)/i)?.[1]);
  if (base === null || total === null || base <= 0) return false;

  const reported = text.match(/Exceso de\s*([+-]?\d+(?:,\d)?)%\s*sobre la base mensual oficial/i);
  if (!reported) return total <= base;
  const expected = Number((((total - base) / base) * 100).toFixed(1));
  return total > base && Number(reported[1].replace(",", ".")) === expected;
}

export function isRetryableHttpStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}
