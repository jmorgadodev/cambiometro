import { externalText } from "./safe-text.mjs";

export const CAMARA_REQUEST_HEADERS = Object.freeze([
  "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language: es-CL,es;q=0.9,en;q=0.8",
  'sec-ch-ua: "Chromium";v="126", "Google Chrome";v="126", "Not;A=Brand";v="99"',
]);

export function appendCamaraRequestHeaders(args) {
  for (const header of CAMARA_REQUEST_HEADERS) args.push("-H", header);
}

export function parseCamaraDeputyIds(html) {
  const selector = String(html).match(
    /<select\b[^>]*\bid="ContentPlaceHolder1_ContentPlaceHolder1_ddlDiputados"[^>]*>([\s\S]*?)<\/select>/i,
  );
  if (!selector) throw new Error("PERSONAL_APOYO_DEPUTY_SELECTOR_MISSING");
  return [...selector[1].matchAll(/<option\b[^>]*\bvalue="(\d+)"[^>]*>([^<]+)<\/option>/gi)].map((match) => ({
    id: match[1],
    apellido: match[2],
  }));
}

function sectionForLabel(html, label, nextLabel) {
  const start = String(html).search(new RegExp(`<li\\b[^>]*class=["'][^"']*rotulo-ficha-diputados[^"']*["'][^>]*>\\s*${label}\\s*<\\/li>`, "i"));
  if (start < 0) return "";
  const remainder = String(html).slice(start);
  const next = remainder.search(new RegExp(`<li\\b[^>]*class=["'][^"']*rotulo-ficha-diputados[^"']*["'][^>]*>\\s*${nextLabel}\\s*<\\/li>`, "i"));
  return next < 0 ? remainder : remainder.slice(0, next);
}

function fieldValue(html, label) {
  const match = String(html).match(new RegExp(`${label}:\\s*([^<]*?)(?:<br\\s*\\/?\\s*>|<\\/p>|$)`, "i"));
  return match ? externalText(match[1]) || null : null;
}

function decodeCloudflareEmail(encoded) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(String(encoded ?? ""))) return null;
  const bytes = String(encoded).match(/[0-9a-f]{2}/gi).map((byte) => Number.parseInt(byte, 16));
  const key = bytes.shift();
  const email = bytes.map((byte) => String.fromCharCode(byte ^ key)).join("");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function contactEmail(section) {
  const cf = String(section).match(/data-cfemail=["']([0-9a-f]+)["']/i);
  if (cf) return decodeCloudflareEmail(cf[1]);
  const mailto = String(section).match(/href=["']mailto:([^"']+)["']/i);
  return mailto ? decodeURIComponent(mailto[1].split("?")[0]) : null;
}

function socialLinks(section) {
  const result = {};
  for (const match of String(section).matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
    try {
      const url = new URL(match[1]);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      const kind = ["x.com", "twitter.com"].includes(host)
        ? "x"
        : host === "facebook.com"
          ? "facebook"
          : host === "instagram.com"
            ? "instagram"
            : null;
      if (!kind || result[kind]) continue;
      url.protocol = "https:";
      result[kind] = url.toString();
    } catch {
      // Ignora enlaces malformados publicados en el HTML de origen.
    }
  }
  return result;
}

function profileLinks(section) {
  const seen = new Set();
  return [...String(section).matchAll(/<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .flatMap((match) => {
      try {
        const url = new URL(match[1]);
        url.protocol = "https:";
        const href = url.toString();
        if (seen.has(href)) return [];
        seen.add(href);
        return [{ label: externalText(match[2]) || url.hostname, url: href }];
      } catch {
        return [];
      }
    });
}

export function parseCamaraDeputyProfile(html) {
  const source = String(html ?? "");
  const contact = sectionForLabel(source, "Contacto", "Sitio web y redes sociales");
  const social = sectionForLabel(source, "Sitio web y redes sociales", "Periodos parlamentarios");
  const enlacesPublicos = profileLinks(social);
  const periodStart = source.search(/<li\b[^>]*class=["'][^"']*rotulo-ficha-diputados[^"']*["'][^>]*>\s*Periodos parlamentarios\s*<\/li>/i);
  const periodsMarkup = periodStart < 0 ? "" : source.slice(periodStart);
  const periodItems = [...periodsMarkup.matchAll(/<li\b[^>]*>\s*(\d{4}\s*[-–]\s*\d{4})\s*<\/li>/gi)]
    .map((match) => externalText(match[1]).replace(/\s+/g, ""));
  const phoneBlock = contact.match(/Tel[eé]fono\b([\s\S]*?)(?:<\/li>|$)/i)?.[1] ?? "";
  const telefono = externalText(phoneBlock).replace(/^\s*<br\s*\/?\s*>\s*/i, "").trim() || null;
  const district = fieldValue(source, "Distrito")?.match(/\d+/);

  return {
    comunas_distrito: fieldValue(source, "Comunas"),
    numero_distrito: district ? Number.parseInt(district[0], 10) : null,
    region: fieldValue(source, "Regi[oó]n"),
    periodo: fieldValue(source, "Per[ií]odo"),
    periodos: [...new Set(periodItems)],
    partido: fieldValue(source, "Partido"),
    bancada: fieldValue(source, "Bancada"),
    sitio_web: enlacesPublicos.find((link) => /sitio\s+web/i.test(link.label))?.url ?? null,
    telefono,
    email: contactEmail(contact),
    redes: socialLinks(social),
    enlaces_publicos: enlacesPublicos,
  };
}

function cleanCell(value) {
  return externalText(String(value ?? "").replace(/<br\s*\/?\s*>/gi, " ").replace(/<\/p>/gi, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lee tablas de transparencia de las páginas individuales de Cámara.
 * No interpreta montos ni completa columnas: conserva etiquetas y valores
 * originales para que la ficha pueda mostrar la evidencia tal como se publica.
 */
export function parseCamaraTransparencyPage(html) {
  const source = String(html ?? "");
  const updatePanel = source.match(/<div\b[^>]*id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"[^>]*>([\s\S]*?)<footer\b/i)?.[1]
    ?? source.match(/<div\b[^>]*id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"[^>]*>([\s\S]*)$/i)?.[1]
    ?? source;
  if (!updatePanel) return { status: "unknown", rows: [], period: null };

  const periodFor = (suffix) => {
    const selector = updatePanel.match(new RegExp(`<select\\b[^>]*id="[^"]*${suffix}"[^>]*>([\\s\\S]*?)<\\/select>`, "i"))?.[1] ?? "";
    const selected = selector.match(/<option\b[^>]*selected(?:="selected")?[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/i)
      ?? selector.match(/<option\b[^>]*value="([^"]*)"[^>]*selected(?:="selected")?[^>]*>([\s\S]*?)<\/option>/i);
    if (selected) return { value: selected[1], label: cleanCell(selected[2]) };
    return null;
  };
  const month = periodFor("ddlMes");
  const year = periodFor("ddlAno");
  const period = [month?.label && month.label.toLowerCase() !== "todos" ? month.label : null, year?.label]
    .filter(Boolean).join(" ") || null;

  const rows = [];
  for (const table of updatePanel.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)) {
    if (!/class=["'][^"']*\btabla\b/i.test(table[1]) && !/id=["']tabla["']/i.test(table[1])) continue;
    const tableHtml = table[2];
    const tableRows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
    if (!tableRows.length) continue;
    const headerIndex = tableRows.findIndex((row) => /<th\b/i.test(row));
    if (headerIndex < 0) continue;
    const headers = [...tableRows[headerIndex].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)]
      .map((match, index) => cleanCell(match[1]) || `Campo ${index + 1}`);
    if (!headers.length) continue;
    for (const rowHtml of tableRows.slice(headerIndex + 1)) {
      const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => cleanCell(match[1]));
      if (!cells.length || cells.every((cell) => !cell)) continue;
      const values = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
      const sourceLinks = [...rowHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
        .map((match) => match[1])
        .filter((href) => /^https:\/\/(?:www\.)?camara\.cl\//i.test(href) || href.startsWith("/"))
        .map((href) => href.startsWith("/") ? `https://www.camara.cl${href}` : href);
      rows.push({ values, sourceLinks: [...new Set(sourceLinks)] });
    }
  }

  const structuredTableWithoutRows = rows.length === 0 && /<table\b[^>]*(?:class=["'][^"']*\btabla\b|id=["']tabla["'])/i.test(updatePanel);
  const explicitlyEmpty = /no (?:hay|existen) registros(?: para el mes seleccionado)?/i.test(cleanCell(updatePanel))
    || structuredTableWithoutRows;
  return {
    status: rows.length ? "available" : explicitlyEmpty ? "empty_confirmed" : "unknown",
    period,
    rows,
  };
}

export function selectCamaraPersonalApoyoIds({ selectorIds, openDataIds = [], previousDeputies = {}, extraIds = [], year }) {
  const currentIds = new Set(selectorIds.map(String));
  const previousCurrentYearIds = Object.entries(previousDeputies)
    .filter(([id, record]) => {
      return !currentIds.has(id)
        && Array.isArray(record?.personal_apoyo)
        && record.personal_apoyo.length > 0
        && String(record.mes_personal ?? "").includes(String(year));
    })
    .map(([id]) => id);

  return [...new Set([
    ...selectorIds.map(String),
    ...openDataIds.map(String).filter((id) => !currentIds.has(id)),
    ...previousCurrentYearIds,
    ...extraIds.map(String),
  ])];
}
