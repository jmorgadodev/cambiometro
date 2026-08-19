import { decodeEntitiesOnce } from "./safe-text.mjs";

export const CAMARA_ROSTER_URL = "https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes";
export const SENATE_ROSTER_URL = "https://tramitacion.senado.cl/appsenado/index.php?ac=periodos&mo=senadores";

function entity(value) {
  return decodeEntitiesOnce(value);
}

export function parseCamaraRoster(xml) {
  const members = [];
  for (const match of String(xml).matchAll(/<Diputado>([\s\S]*?)<\/Diputado>/g)) {
    const tag = (name) => entity(match[1].match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "");
    const id = tag("DIPID");
    const name = [tag("Nombre"), tag("Apellido_Paterno"), tag("Apellido_Materno")].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (id && name) members.push({ entityId: `person-camara-${id}`, name, chamber: "camara", evidenceUrl: CAMARA_ROSTER_URL });
  }
  return members;
}

export function parseSenateRoster(html) {
  const members = [];
  const pattern = /href="[^"]*ac=fichasenador&amp;id=(\d+)[^"]*"[^>]*title="([^"]+)"|href="[^"]*ac=fichasenador&id=(\d+)[^"]*"[^>]*title="([^"]+)"/g;
  for (const match of String(html).matchAll(pattern)) {
    const id = match[1] ?? match[3];
    const listed = entity(match[2] ?? match[4]);
    const [lastNames, firstNames] = listed.split(",").map((part) => part.trim());
    const name = firstNames ? `${firstNames} ${lastNames}` : listed;
    const evidenceUrl = `https://tramitacion.senado.cl/appsenado/index.php?mo=senadores&ac=fichasenador&id=${id}`;
    members.push({ entityId: `person-senado-${id}`, name, chamber: "senado", evidenceUrl });
  }
  return members;
}

async function download(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Cambiometro-ETL/1.0 (+https://cambiometro.impulsacv.cl)" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`PARLIAMENT_ROSTER_HTTP_${response.status}: ${url}`);
  return response.text();
}

export async function fetchParliamentRosters() {
  const [camara, senate] = await Promise.all([download(CAMARA_ROSTER_URL), download(SENATE_ROSTER_URL)]);
  const members = [...parseCamaraRoster(camara), ...parseSenateRoster(senate)];
  const camaraCount = members.filter((member) => member.chamber === "camara").length;
  const senateCount = members.filter((member) => member.chamber === "senado").length;
  if (camaraCount < 100 || senateCount < 40) throw new Error(`PARLIAMENT_ROSTER_UNEXPECTED_COUNT: camara=${camaraCount},senado=${senateCount}`);
  return members;
}
