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

export function isRetryableHttpStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}
