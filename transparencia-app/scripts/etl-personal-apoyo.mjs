import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { externalText } from "./etl/safe-text.mjs";
import { assertUsableOfficialHtml, mergePersonalApoyoDeputies } from "./etl/personal-apoyo-publication.mjs";
import { parseSenadoAssignmentPolicy } from "./etl/senado-assignment.mjs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const CURL = process.platform === "win32" ? "curl.exe" : "curl";

function curlHtml(url, { post = false, jar = null } = {}) {
  const args = [
    "-s",
    "--compressed",
    "-H", `User-Agent: ${UA}`,
    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H", "Accept-Language: es-CL,es;q=0.9,en;q=0.8",
    "-H", "sec-ch-ua: \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\", \"Not;A=Brand\";v=\"99\"",
  ];
  if (jar) args.push("-c", jar, "-b", jar);
  if (post) {
    args.push("-X", "POST");
    for (const [k, v] of Object.entries(post)) {
      args.push("--data-urlencode", `${k}=${v}`);
    }
  }
  args.push(url);
  try {
    const body = execFileSync(CURL, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    return assertUsableOfficialHtml(body, url);
  } catch (e) {
    if (String(e?.message ?? "").startsWith("PERSONAL_APOYO_SOURCE_")) throw e;
    throw new Error(`curl ${e.status ?? ""}: ${String(e.stderr ?? e.message).slice(0, 200)}`);
  }
}

const html = externalText;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const OUT = "data/personal-apoyo.json";

/** "camara": solo Cámara, preservando senadores guardados; sin argumento: Cámara + Senado completos. */
const cliArgs = process.argv.slice(2);
function argumentValue(name, fallback) {
  const inline = cliArgs.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = cliArgs.indexOf(name);
  return index >= 0 ? cliArgs[index + 1] : fallback;
}
const legacyLimit = cliArgs[0] === "camara" && /^\d+$/.test(cliArgs[1] ?? "")
  ? parseInt(cliArgs[1], 10)
  : null;
const extraIdsArgument = cliArgs.find((argument) => argument.startsWith("--extra-ids="))?.split("=").slice(1).join("=")
  ?? (cliArgs.includes("--extra-ids") ? cliArgs[cliArgs.indexOf("--extra-ids") + 1] : "");
const EXTRA_IDS = [...new Set(String(extraIdsArgument ?? "").split(",").map((id) => id.trim()).filter((id) => /^\d+$/.test(id)))];
const ONLY_EXTRA = cliArgs.includes("--only-extra");
if (ONLY_EXTRA && EXTRA_IDS.length === 0) throw new Error("PERSONAL_APOYO_EXTRA_IDS_REQUIRED");
const LIMIT = legacyLimit;
const SOLO_CAMARA = cliArgs.includes("camara") || LIMIT !== null || EXTRA_IDS.length > 0 || ONLY_EXTRA;
const ENTRADA = argumentValue("--input", OUT);
const ESCRITURA = argumentValue("--output", LIMIT ? "data/personal-apoyo.test.json" : OUT);

const viewstate = (h) => {
  const v = h.match(/id="__VIEWSTATE" value="([^"]*)"/);
  const ev = h.match(/id="__EVENTVALIDATION" value="([^"]*)"/);
  const vg = h.match(/id="__VIEWSTATEGENERATOR" value="([^"]*)"/);
  return { v: v?.[1] ?? "", ev: ev?.[1] ?? "", vg: vg?.[1] ?? "" };
};

function postMes(id, st, url, jar, mes, ano) {
  const ddlMes = "ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlMes";
  const ddlAno = "ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlAno";
  return curlHtml(url, {
    post: { __EVENTVALIDATION: st.ev, __VIEWSTATE: st.v, __VIEWSTATEGENERATOR: st.vg, [ddlMes]: String(mes), [ddlAno]: String(ano) },
    jar,
  });
}

const parseTabla = (h) => {
  const body = h.match(/<table class="tabla">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>\s*<\/table>/);
  if (!body) return [];
  const rows = [];
  for (const tr of body[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const tds = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => html(m[1]));
    if (tds.length >= 5) {
      rows.push({
        tipo: tds[0],
        nombre: tds[2],
        cargo: tds[3],
        sueldo: parseInt((tds[4] ?? "").replace(/\./g, "").replace(/[^\d]/g, "") || "0", 10),
        cargo_servel: tds[5] ?? "",
        cese: tds[6] ?? "",
      });
    }
  }
  return rows;
};

/**
 * Busca el mes más reciente publicado con datos: recorre meses del selector
 * (más nuevo primero); el primero cuya tabla tenga filas es el mes de corte.
 * Cae al mes por defecto del GET si el POST no devuelve filas en ninguno.
 * Con CAMARA_MES/CAMARA_ANO en el entorno fuerza ese mes (el poller lo entrega).
 */
function mejorMesConDatos(htmlGet, meses, st, url, jar) {
  const anos = [...htmlGet.matchAll(/id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlAno"[^>]*>([\s\S]*?)<\/select>/g)];
  const anoSel = anos.length
    ? [...anos[0][1].matchAll(/<option[^>]*value="(\d+)"[^>]*>/g)].map((m) => parseInt(m[1], 10)).sort((a, b) => b - a)
    : [2026];
  const orden = [];
  for (const ano of anoSel) {
    for (const m of [...meses].sort((a, b) => parseInt(b.num, 10) - parseInt(a.num, 10))) {
      orden.push({ mes: parseInt(m.num, 10), ano, nombre: m.nombre });
    }
  }
  if (process.env.CAMARA_MES) {
    const forzado = orden.find((o) => o.mes === parseInt(process.env.CAMARA_MES, 10) && o.ano === parseInt(process.env.CAMARA_ANO ?? "2026", 10));
    if (forzado) orden.unshift(forzado);
  }
  for (const { mes, ano, nombre } of orden.slice(0, 3)) {
    let filas = null;
    try {
      filas = parseTabla(postMes("poll", st, url, jar, mes, ano));
    } catch {
      filas = null;
    }
    if (filas && filas.length > 0) return { filas, etiqueta: `${nombre} ${ano}` };
  }
  return null;
}

async function main() {
  const senatePolicyUrl = "https://www.senado.cl/transparencia/personal-de-apoyo-senadores";
  const senatePolicyHtml = curlHtml(senatePolicyUrl);
  const senatePolicy = parseSenadoAssignmentPolicy(senatePolicyHtml);
  const senateAssignment = {
    ...senatePolicy,
    source_url: senatePolicyUrl,
    retrieved_at: new Date().toISOString(),
    checksum_sha256: createHash("sha256").update(senatePolicyHtml).digest("hex"),
    // La regla general no prueba un traspaso individual. Este arreglo sólo puede
    // poblarse desde un documento oficial individualizado incorporado por ETL.
    transferencias_acreditadas: [],
  };

  const jar = `cookies-${Date.now()}.txt`;
  const primera = curlHtml("https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1009", { jar });
  const ids = [...primera.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)].map((m) => ({ id: m[1], apellido: html(m[2]) }));
  console.log("diputados en select:", ids.length);
  try { fs.unlinkSync(jar); } catch {}

  const previo = fs.existsSync(ENTRADA) ? JSON.parse(fs.readFileSync(ENTRADA, "utf8")) : null;
  const diputadosActualizados = {};
  let fallos = 0;

  let vigentes = null;
  try {
    const opendata = JSON.parse(fs.readFileSync("data/etl/latest.json", "utf8")).fuentes?.congreso_opendata;
    if (Array.isArray(opendata)) vigentes = new Set(opendata.map((d) => String(d.id)));
  } catch {}

  const enSelect = new Set(ids.map((x) => x.id));
  const faltantes = vigentes ? [...vigentes].filter((id) => !enSelect.has(id)) : [];
  if (faltantes.length) console.log("ids opendata ausentes del selector (se completan):", faltantes.join(", "));
  const candidatos = [...ids, ...faltantes.map((id) => ({ id })), ...EXTRA_IDS.map((id) => ({ id }))];
  const listaCompleta = [...new Map(candidatos.map((candidate) => [candidate.id, candidate])).values()];
  const lista = ONLY_EXTRA
    ? EXTRA_IDS.map((id) => ({ id }))
    : LIMIT ? listaCompleta.slice(0, LIMIT) : listaCompleta;
  for (const [i, { id }] of lista.entries()) {
    const jarId = `cookies-${id}.txt`;
    try {
      const url = `https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=${id}`;
      const htmlGet = curlHtml(url, { jar: jarId });
      const st = viewstate(htmlGet);
      const mesSelect = [...htmlGet.matchAll(/id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlMes"[^>]*>([\s\S]*?)<\/select>/g)];
      const meses = mesSelect.length
        ? [...mesSelect[0][1].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]+)<\/option>/g)].map((m) => ({ num: m[1], nombre: html(m[2]) }))
        : [];
      const corte = mejorMesConDatos(htmlGet, meses, st, url, jarId);
      const porDefecto = parseTabla(htmlGet);

      const redes = Object.fromEntries(
        [...htmlGet.matchAll(/<a href="(https?:\/\/(?:www\.)?(?:twitter|x|facebook|instagram)\.com\/[^"]*)"[^>]*>[\s\S]*?<\/a>/gi)].map((m) => {
          const u = m[1];
          const host = u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] ?? "";
          const t = host.startsWith("twitter") || host.startsWith("x") ? "x" : host.startsWith("facebook") ? "facebook" : host.startsWith("instagram") ? "instagram" : "";
          return t ? [t, u] : null;
        }).filter(Boolean)
      );
      const ficha = (() => {
        const fcha = htmlGet.match(/Comunas:\s*([^<]+?)<br\s*\/?>/s);
        const distrito = htmlGet.match(/Distrito:\s*N[º°]?\s*(\d+)/);
        const region = htmlGet.match(/Región:\s*([^<]+?)<br\s*\/?>/s);
        const periodo = htmlGet.match(/Período:\s*([^<]+?)<br\s*\/?>/s);
        const partido = htmlGet.match(/Partido:\s*([^<]+?)<br\s*\/?>/s);
        const bancada = htmlGet.match(/Bancada:\s*([^<]+?)(?:<br\s*\/?>|<\/p>|$)/s);
        const foto = htmlGet.match(/<img src="(\/img\.aspx\?prmID=GRCL\d+)"[^>]*>/);
        return {
          comunas_distrito: fcha ? html(fcha[1]) : null,
          numero_distrito: distrito ? parseInt(distrito[1], 10) : null,
          region: region ? html(region[1]) : null,
          periodo: periodo ? html(periodo[1]) : null,
          partido: partido ? html(partido[1]) : null,
          bancada: bancada ? html(bancada[1]) : null,
          foto: foto ? `https://www.camara.cl${foto[1]}` : null,
          redes,
        };
      })();

      const filas = corte?.filas ?? porDefecto;
      diputadosActualizados[id] = {
        meses,
        mes_por_defecto: meses[0]?.nombre ?? null,
        ficha,
        personal_apoyo: filas,
        mes_personal: corte?.etiqueta ?? (meses[0] ? `${meses[0].nombre} 2026` : null),
      };
      const n = diputadosActualizados[id].ficha.region ? "ok" : "sin-ficha";
      if (n === "sin-ficha") fallos++;
      process.stdout.write(`[${i + 1}/${lista.length}] id=${id} ${n} filas=${filas.length} mes=${diputadosActualizados[id].mes_personal}\n`);
      await pausa(400);
    } catch (e) {
      console.error(`id ${id} ERROR: ${e.message}`);
      fallos++;
      await pausa(2000);
    } finally {
      try { fs.unlinkSync(jarId); } catch {}
    }
  }
  console.log("Cámara listo. fallos:", fallos);

  const diputados = mergePersonalApoyoDeputies(previo?.diputados ?? {}, diputadosActualizados);
  if (vigentes) {
    const historicos = Object.keys(diputados).filter((id) => !vigentes.has(id));
    if (historicos.length) {
      console.log("diputados historicos preservados aunque ya no figuren en la nomina vigente:", historicos.join(", "));
    }
  } else {
    console.log("sin data/etl/latest.json: se conserva la historia publicada");
  }

  let senadores = SOLO_CAMARA ? (previo?.senadores ?? {}) : {};
  let mesesSenado = new Set(SOLO_CAMARA ? (previo?.meses_senado_disponibles ?? []) : []);
  if (!SOLO_CAMARA) {
    let page = 1;
    const pageSize = 500;
    while (true) {
      const u = `https://web-back.senado.cl/api/transparency/senator-assignments/support-staff?filters%5Bano%5D%5B%24eq%5D=2026&pagination%5BpageSize%5D=${pageSize}&pagination%5Bpage%5D=${page}`;
      const r = await fetch(u, { headers: { "user-agent": "transparencia-impulsacv ETL" } });
      const j = await r.json();
      const meta = j.data.meta.pagination;
      for (const f of j.data.data) {
        const a = f.attributes;
        const sen = (a.unidad_laboral ?? "").trim();
        if (!senadores[sen]) senadores[sen] = [];
        senadores[sen].push({
          ano: a.ano,
          mes: a.mes,
          apellido_paterno: a.appaterno,
          apellido_materno: a.apmaterno,
          nombre: a.nombre,
          cargo: a.cargo,
          monto: a.monto,
          calidad_juridica: a.calidad_juridica,
        });
      }
      console.log(`senado página ${page}/${meta.pageCount} (${meta.total})`);
      if (page >= meta.pageCount) break;
      page++;
      await pausa(250);
    }
    for (const rows of Object.values(senadores)) for (const r of rows) mesesSenado.add(`${r.ano}-${String(r.mes).padStart(2, "0")}`);
    for (const rows of Object.values(senadores)) for (const r of rows) r.periodo = `${r.ano}-${String(r.mes).padStart(2, "0")}`;
  }

  if (Object.keys(senadores).length === 0 && previo?.senadores && Object.keys(previo.senadores).length > 0) {
    senadores = previo.senadores;
    mesesSenado = new Set(previo.meses_senado_disponibles ?? []);
  }

  const out = {
    generado_en: new Date().toISOString(),
    fuentes: {
      camara: {
        url: "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}",
        nota: "Personal de apoyo y asesorías externas por diputado (tabla oficial de la Cámara). mes_personal = mes más reciente publicado con datos en el selector oficial.",
      },
      senado: {
        url: "https://web-back.senado.cl/api/transparency/senator-assignments/support-staff",
        nota: "Personal de apoyo de senadores, registros mensuales 2026.",
      },
    },
    meses_senado_disponibles: [...mesesSenado].sort(),
    asignacion_senado_2026: senateAssignment,
    diputados,
    senadores,
  };
  fs.writeFileSync(ESCRITURA, JSON.stringify(out, null, 1), "utf8");
  console.log("guardado:", ESCRITURA);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
