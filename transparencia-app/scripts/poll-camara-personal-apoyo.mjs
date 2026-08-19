/**
 * Polling mensual de la Cámara: consulta el selector oficial de
 * personaldepoyo.aspx y detecta si existe un mes publicado con datos más
 * reciente que el que tenemos. NO re-escrapea; solo informa.
 *
 * Uso: node scripts/poll-camara-personal-apoyo.mjs
 *   exit 0  = sin cambios
 *   exit 2  = mes nuevo publicado con datos (correr etl-personal-apoyo.mjs camara)
 *   exit 1  = error de red/parseo
 *
 * En CI escribe variables en $GITHUB_OUTPUT: poll_changed=true|false, poll_mes=...
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { externalText } from "./etl/safe-text.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CURL = process.platform === "win32" ? "curl.exe" : "curl";

function curlHtml(url, { post = false, jar = null } = {}) {
  const args = [
    "-s", "--compressed",
    "-H", `User-Agent: ${UA}`,
    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H", "Accept-Language: es-CL,es;q=0.9,en;q=0.8",
  ];
  if (jar) args.push("-c", jar, "-b", jar);
  if (post) {
    args.push("-X", "POST");
    for (const [k, v] of Object.entries(post)) args.push("--data-urlencode", `${k}=${v}`);
  }
  args.push(url);
  try {
    return execFileSync(CURL, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    throw new Error(`curl ${e.status ?? ""}: ${String(e.stderr ?? e.message).slice(0, 200)}`);
  }
}

const html = externalText;
const NOMBRES_MES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

const parseTabla = (h) => {
  const body = h.match(/<table class="tabla">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>\s*<\/table>/);
  return body ? [...body[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].filter((tr) => tr[1].includes("<td")).length : 0;
};

const viewstate = (h) => ({
  v: h.match(/id="__VIEWSTATE" value="([^"]*)"/)?.[1] ?? "",
  ev: h.match(/id="__EVENTVALIDATION" value="([^"]*)"/)?.[1] ?? "",
  vg: h.match(/id="__VIEWSTATEGENERATOR" value="([^"]*)"/)?.[1] ?? "",
});

function leerMesActual() {
  try {
    const d = JSON.parse(fs.readFileSync("data/personal-apoyo.json", "utf8"));
    const etiqueta = d.diputados?.["1009"]?.mes_personal ?? "";
    const m = etiqueta.match(/(\w+)\s+(\d{4})/);
    if (!m) return { ano: 0, mes: 0, etiqueta };
    return { ano: parseInt(m[2], 10), mes: NOMBRES_MES[m[1].toLowerCase()] ?? 0, etiqueta };
  } catch {
    return { ano: 0, mes: 0, etiqueta: "(sin datos locales)" };
  }
}

async function main() {
  const jar = `cookies-poll-${Date.now()}.txt`;
  const url = "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1009";
  const htmlGet = curlHtml(url, { jar });
  const st = viewstate(htmlGet);
  const ddlMes = "ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlMes";
  const ddlAno = "ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlAno";
  try { fs.unlinkSync(jar); } catch {}

  const mesSelect = [...htmlGet.matchAll(/id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlMes"[^>]*>([\s\S]*?)<\/select>/g)];
  const anoSelect = [...htmlGet.matchAll(/id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlAno"[^>]*>([\s\S]*?)<\/select>/g)];
  if (!mesSelect.length || !anoSelect.length) throw new Error("no se encontraron selectores de mes/año");

  const meses = [...mesSelect[0][1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/g)].map((m) => ({ num: parseInt(m[1], 10), nombre: html(m[2]).toLowerCase() }));
  const anos = [...anoSelect[0][1].matchAll(/<option[^>]*value="(\d+)"[^>]*>/g)].map((m) => parseInt(m[1], 10)).sort((a, b) => b - a);
  const candidatos = [];
  for (const ano of anos) for (const { num, nombre } of [...meses].sort((a, b) => b.num - a.num)) candidatos.push({ ano, mes: num, nombre });
  if (!candidatos.length) throw new Error("selector de meses vacío");
  console.log(`selector: ${candidatos.length} combinaciones mes/año (${meses.length} meses × ${anos.length} años)`);

  let publicado = null;
  for (const { ano, mes, nombre } of candidatos.slice(0, 3)) {
    try {
      const jarPost = `cookies-poll2-${Date.now()}.txt`;
      const htmlPost = curlHtml(url, {
        post: { __EVENTVALIDATION: st.ev, __VIEWSTATE: st.v, __VIEWSTATEGENERATOR: st.vg, [ddlMes]: String(mes), [ddlAno]: String(ano) },
        jar: jarPost,
      });
      try { fs.unlinkSync(jarPost); } catch {}
      const filas = parseTabla(htmlPost);
      console.log(`  ${nombre} ${ano}: ${filas} filas en la tabla publicada`);
      if (filas > 0) { publicado = { ano, mes, nombre, filas }; break; }
    } catch (e) {
      console.log(`  ${nombre} ${ano}: fallo (${String(e.message).slice(0, 60)})`);
    }
  }

  const actual = leerMesActual();
  const changed = publicado !== null && (publicado.ano > actual.ano || (publicado.ano === actual.ano && publicado.mes > actual.mes));
  const etiqueta = publicado ? `${publicado.nombre} ${publicado.ano}` : "(ninguno con datos)";
  console.log(`mes actual en data: ${actual.etiqueta} | publicado con datos: ${etiqueta} | changed=${changed}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `poll_changed=${changed}\npoll_mes=${etiqueta}\npoll_num=${publicado?.mes ?? ""}\npoll_ano=${publicado?.ano ?? ""}\n`
    );
  }
  process.exit(changed ? 2 : 0);
}

main().catch((e) => {
  console.error(`[poll] error: ${e.message}`);
  process.exit(1);
});
