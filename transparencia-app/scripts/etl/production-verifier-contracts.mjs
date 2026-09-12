function visibleText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseChileanInteger(value) {
  const digits = String(value ?? "").replace(/\./g, "").replace(/\s/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

export function extractCanonicalCount(html) {
  const match = visibleText(html).match(/Registros\s+Canónicos\s+([\d.]+)/i);
  return parseChileanInteger(match?.[1]);
}

export function extractConsolidatedCount(html) {
  const match = visibleText(html).match(/consolidado\s+([\d.]+)/i);
  return parseChileanInteger(match?.[1]);
}
