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

export function parseCamaraDeputyProfile(html) {
  const source = String(html ?? "");
  const contact = sectionForLabel(source, "Contacto", "Sitio web y redes sociales");
  const social = sectionForLabel(source, "Sitio web y redes sociales", "Periodos parlamentarios");
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
    telefono,
    email: contactEmail(contact),
    redes: socialLinks(social),
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
