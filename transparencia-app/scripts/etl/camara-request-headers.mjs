import { externalText } from "./safe-text.mjs";

export const CAMARA_REQUEST_HEADERS = Object.freeze([
  "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language: es-CL,es;q=0.9,en;q=0.8",
  'sec-ch-ua: "Chromium";v="140", "Google Chrome";v="140", "Not;A=Brand";v="24"',
  'sec-ch-ua-mobile: ?0',
  'sec-ch-ua-platform: "Windows"',
]);

// Las páginas individuales de transparencia pueden tardar más de 30 s; se
// midieron respuestas válidas de 37 s. Un límite menor descartaba registros.
export const CAMARA_TRANSPARENCY_TIMEOUT_SECONDS = 60;

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

const CAMARA_OPEN_DATA_DEPUTIES_URL = "https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx/retornarDiputados";

/** Lee el partido actualmente vigente desde militancias Open Data, siempre por ID oficial. */
export function parseCamaraOpenDataDeputies(xml, { asOf = new Date() } = {}) {
  const source = String(xml ?? "");
  const records = {};
  for (const match of source.matchAll(/<Diputado\b[^>]*>([\s\S]*?)<\/Diputado>/gi)) {
    const deputy = match[1];
    const tag = (markup, name) => externalText(markup.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
    const id = tag(deputy, "Id");
    if (!/^\d+$/.test(id)) continue;
    const nombre = [tag(deputy, "Nombre"), tag(deputy, "Nombre2"), tag(deputy, "ApellidoPaterno"), tag(deputy, "ApellidoMaterno")]
      .filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const memberships = [...deputy.matchAll(/<Militancia\b[^>]*>([\s\S]*?)<\/Militancia>/gi)].map((match) => match[1]);
    const party = memberships.find((membership) => {
      const from = tag(membership, "FechaInicio").slice(0, 10);
      const to = tag(membership, "FechaTermino").slice(0, 10);
      const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00Z`) : null;
      const toDate = /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59Z`) : null;
      return Boolean(fromDate && fromDate <= asOf && (!toDate || toDate >= asOf));
    });
    const partyMarkup = party?.match(/<Partido\b[^>]*>([\s\S]*?)<\/Partido>/i)?.[1] ?? "";
    const prior = records[id];
    records[id] = {
      nombre: nombre || prior?.nombre || "",
      partido: (partyMarkup ? tag(partyMarkup, "Nombre") : "") || null,
      source_url: CAMARA_OPEN_DATA_DEPUTIES_URL,
    };
  }

  return records;
}

function cleanCell(value) {
  return externalText(String(value ?? "").replace(/<br\s*\/?\s*>/gi, " ").replace(/<\/p>/gi, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCamaraTransparencyPeriodOptions(html) {
  const source = String(html ?? "");
  const updatePanel = source.match(/<div\b[^>]*id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"[^>]*>([\s\S]*?)<footer\b/i)?.[1]
    ?? source.match(/<div\b[^>]*id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"[^>]*>([\s\S]*)$/i)?.[1]
    ?? source;
  const optionsFor = (suffix) => {
    const markup = updatePanel.match(new RegExp(`<select\\b[^>]*id="[^"]*${suffix}"[^>]*>([\\s\\S]*?)<\\/select>`, "i"))?.[1] ?? "";
    return [...markup.matchAll(/<option\b[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)]
      .map((match) => ({ value: match[1], label: cleanCell(match[2]) }));
  };
  const months = optionsFor("ddlMes").filter(({ value, label }) => value && !/^todos?$/i.test(label));
  const years = optionsFor("ddlAno").filter(({ value, label }) => /^\d{4}$/.test(value) && /^\d{4}$/.test(label));
  return { months, years };
}

export function planCamaraTransparencyPeriods(filters, { currentYear, currentMonth, yearOverride = null } = {}) {
  const years = (filters?.years ?? [])
    .map(({ value }) => Number.parseInt(value, 10))
    .filter((year) => Number.isInteger(year) && year > 0 && year <= currentYear)
    .filter((year) => yearOverride == null || year === Number.parseInt(String(yearOverride), 10))
    .sort((left, right) => right - left);
  const months = (filters?.months ?? [])
    .map(({ value, label }) => ({ value: String(value), label: cleanCell(label), number: Number.parseInt(value, 10) }))
    .filter(({ value, label, number }) => value && !/^todos?$/i.test(label) && Number.isInteger(number) && number >= 1 && number <= 12)
    .sort((left, right) => right.number - left.number);
  return years.flatMap((year) => months
    .filter(({ number }) => year !== currentYear || number <= currentMonth)
    .map(({ value, label }) => ({ month: value, year: String(year), label: `${label} ${year}` })));
}

export function buildCamaraTransparencyMonthPostback(html, { month, year }) {
  const source = String(html ?? "");
  const updatePanel = source.match(/<div\b[^>]*id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"[^>]*>([\s\S]*?)<footer\b/i)?.[1]
    ?? source.match(/<div\b[^>]*id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"[^>]*>([\s\S]*)$/i)?.[1]
    ?? source;
  const controlName = (suffix) => {
    const selector = updatePanel.match(new RegExp(`<select\\b(?=[^>]*\\bid="[^"]*${suffix}")[^>]*>`, "i"))?.[0] ?? "";
    return selector.match(/\bname="([^"]+)"/i)?.[1] ?? "";
  };
  const value = (name) => {
    const input = source.match(new RegExp(`<input\\b(?=[^>]*\\bname="${name}")[^>]*>`, "i"))?.[0] ?? "";
    return input.match(/\bvalue="([^"]*)"/i)?.[1] ?? "";
  };
  const monthControl = controlName("ddlMes");
  const yearControl = controlName("ddlAno");
  const viewState = value("__VIEWSTATE");
  const eventValidation = value("__EVENTVALIDATION");
  const viewStateGenerator = value("__VIEWSTATEGENERATOR");
  if (!monthControl || !yearControl || !viewState || !eventValidation) {
    throw new Error("CAMARA_TRANSPARENCY_POSTBACK_STATE_MISSING");
  }
  return {
    __EVENTTARGET: monthControl,
    __EVENTARGUMENT: "",
    __VIEWSTATE: viewState,
    __EVENTVALIDATION: eventValidation,
    ...(viewStateGenerator ? { __VIEWSTATEGENERATOR: viewStateGenerator } : {}),
    [monthControl]: String(month),
    [yearControl]: String(year),
  };
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

export function camaraTransparencyHasAllMonths(html) {
  const select = String(html ?? "").match(/<select\b(?=[^>]*\bid="[^"]*ddlMes")[^>]*>([\s\S]*?)<\/select>/i)?.[1] ?? "";
  const options = [...select.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)];
  const selected = options.find(([, attributes]) => /\bselected(?:="selected")?/i.test(attributes)) ?? options[0];
  if (!selected) return false;
  const value = selected[1].match(/\bvalue="([^"]*)"/i)?.[1] ?? "";
  const label = cleanCell(selected[2]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return value === "00" || label === "todos" || label === "todo";
}

export function assertCamaraTransparencyPeriod(parsed, { page, period }) {
  if (parsed?.status === "unknown") {
    throw new Error(`PERSONAL_APOYO_CAMARA_TRANSPARENCY_PERIOD_UNVERIFIED: ${page} ${period}`);
  }
  return parsed;
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
