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
