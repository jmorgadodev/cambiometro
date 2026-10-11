import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { externalText } from "./etl/safe-text.mjs";
import { assertUsableOfficialHtml, isCamaraAccessBlock, mergeCamaraOfficialProfiles, mergeCamaraOpenDataProfiles, mergePersonalApoyoDeputies } from "./etl/personal-apoyo-publication.mjs";
import { parseSenadoAssignmentPolicy } from "./etl/senado-assignment.mjs";
import { assertSenadoSupportCollection, fetchSenadoSupportPage } from "./etl/senado-support.mjs";
import {
  appendCamaraRequestHeaders,
  assertCamaraTransparencyPeriod,
  buildCamaraTransparencyMonthPostback,
  camaraTransparencyHasAllMonths,
  CAMARA_TRANSPARENCY_TIMEOUT_SECONDS,
  parseCamaraDeputyProfile,
  parseCamaraOpenDataDeputies,
  parseCamaraTransparencyPage,
  parseCamaraTransparencyPeriodOptions,
  planCamaraTransparencyPeriods,
  parseCamaraDeputyIds,
  selectCamaraPersonalApoyoIds,
} from "./etl/camara-request-headers.mjs";
const CURL = process.platform === "win32" ? "curl.exe" : "curl";

function curlHtml(url, { post = false, jar = null, timeoutSeconds = 45 } = {}) {
  const args = ["-s", "--compressed", "--max-time", String(timeoutSeconds)];
  appendCamaraRequestHeaders(args);
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
const CAMARA_OFFICIAL_PROFILES_PATH = "data/camara-perfiles-oficiales-verificados.json";
const CAMARA_TRANSPARENCIA_PAGES = [
  ["asesorias_externas", "asesoriaexterna.aspx"],
  ["pasajes_aereos_nacionales", "pasajesaereos.aspx"],
  ["instancias_internacionales", "instanciainternacionales.aspx"],
  ["audiencias_no_lobby", "audiencia.aspx"],
];

/**
 * Cada fuente puede actualizarse por separado. La fuente no seleccionada se
 * conserva desde el snapshot de entrada para que una ejecución parcial nunca
 * borre la historia publicada de la otra cámara.
 */
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
const requestedSource = argumentValue("--source", cliArgs.includes("camara") ? "camara" : "all");
if (!["all", "camara", "senado"].includes(requestedSource)) {
  throw new Error(`PERSONAL_APOYO_SOURCE_INVALID: ${requestedSource}`);
}
const extraIdsArgument = cliArgs.find((argument) => argument.startsWith("--extra-ids="))?.split("=").slice(1).join("=")
  ?? (cliArgs.includes("--extra-ids") ? cliArgs[cliArgs.indexOf("--extra-ids") + 1] : "");
const EXTRA_IDS = [...new Set(String(extraIdsArgument ?? "").split(",").map((id) => id.trim()).filter((id) => /^\d+$/.test(id)))];
const ONLY_EXTRA = cliArgs.includes("--only-extra");
const OPEN_DATA_ONLY = cliArgs.includes("--open-data-only");
if (ONLY_EXTRA && EXTRA_IDS.length === 0) throw new Error("PERSONAL_APOYO_EXTRA_IDS_REQUIRED");
if (OPEN_DATA_ONLY && (requestedSource !== "camara" || ONLY_EXTRA || legacyLimit !== null)) {
  throw new Error("PERSONAL_APOYO_OPEN_DATA_ONLY_REQUIRES_UNLIMITED_CAMARA_SOURCE");
}
if (requestedSource === "senado" && (ONLY_EXTRA || EXTRA_IDS.length > 0 || legacyLimit !== null)) {
  throw new Error("PERSONAL_APOYO_SOURCE_CONFLICT: --source senado no acepta límites ni ids de Cámara");
}
const LIMIT = legacyLimit;
const INCLUDE_CAMARA = requestedSource !== "senado";
const INCLUDE_SENADO = requestedSource !== "camara";
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
    post: { __EVENTTARGET: ddlMes, __EVENTARGUMENT: "", __EVENTVALIDATION: st.ev, __VIEWSTATE: st.v, __VIEWSTATEGENERATOR: st.vg, [ddlMes]: String(mes), [ddlAno]: String(ano) },
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

async function fetchCamaraTransparency(id, page, jar) {
  const sourceUrl = `https://www.camara.cl/diputados/detalle/${page}?prmId=${encodeURIComponent(id)}`;
  const body = curlHtml(sourceUrl, { jar, timeoutSeconds: CAMARA_TRANSPARENCY_TIMEOUT_SECONDS });
  const latest = parseCamaraTransparencyPage(body);
  const filters = parseCamaraTransparencyPeriodOptions(body);
  const now = new Date();
  const yearOverride = process.env.CAMARA_TRANSPARENCIA_ANO
    ?? (process.env.CAMARA_TRANSPARENCIA_TODOS_ANOS === "1" ? null : String(now.getFullYear()));
  const latestYear = latest.period?.match(/\b\d{4}\b/)?.[0] ?? null;
  if (yearOverride && latest.status !== "unknown" && camaraTransparencyHasAllMonths(body) && latestYear === yearOverride) {
    return {
      ...latest,
      period: `Todos los meses · ${latestYear}`,
      source_url: sourceUrl,
      retrieved_at: new Date().toISOString(),
    };
  }
  const periodsToFetch = planCamaraTransparencyPeriods(filters, {
    currentYear: now.getFullYear(), currentMonth: now.getMonth() + 1, yearOverride,
  });

  // La ejecución programada consulta el año vigente. La recuperación histórica
  // se habilita explícitamente, pues multiplica los postbacks por cada año/mes.
  if (periodsToFetch.length === 0) {
    return { ...latest, source_url: sourceUrl, retrieved_at: new Date().toISOString() };
  }

  const periods = [];
  let stateHtml = body;
  for (const selectedPeriod of periodsToFetch) {
    const htmlPeriod = curlHtml(sourceUrl, {
      post: buildCamaraTransparencyMonthPostback(stateHtml, selectedPeriod),
      jar,
      timeoutSeconds: CAMARA_TRANSPARENCY_TIMEOUT_SECONDS,
    });
    stateHtml = htmlPeriod;
    const parsed = assertCamaraTransparencyPeriod(parseCamaraTransparencyPage(htmlPeriod), {
      page,
      period: selectedPeriod.label,
    });
    periods.push({
      period: selectedPeriod.label,
      status: parsed.status,
      rows: parsed.rows,
      retrieved_at: new Date().toISOString(),
    });
    await pausa(250);
  }
  const latestPeriod = periods[0];
  const hasRows = periods.some((period) => period.rows.length > 0);
  return {
    status: hasRows ? "available" : "empty_confirmed",
    period: latestPeriod?.period ?? latest.period,
    rows: latestPeriod?.rows ?? latest.rows,
    periods,
    source_url: sourceUrl,
    retrieved_at: new Date().toISOString(),
  };
}

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
      const htmlMes = postMes("poll", st, url, jar, mes, ano);
      filas = parseTabla(htmlMes);
      st = viewstate(htmlMes);
    } catch {
      filas = null;
    }
    if (filas && filas.length > 0) return { filas, etiqueta: `${nombre} ${ano}` };
  }
  return null;
}

async function main() {
  const previo = fs.existsSync(ENTRADA) ? JSON.parse(fs.readFileSync(ENTRADA, "utf8")) : null;
  const officialProfileSnapshot = fs.existsSync(CAMARA_OFFICIAL_PROFILES_PATH)
    ? JSON.parse(fs.readFileSync(CAMARA_OFFICIAL_PROFILES_PATH, "utf8"))
    : null;
  const senatePolicyUrl = "https://www.senado.cl/transparencia/personal-de-apoyo-senadores";
  let senateAssignment = previo?.asignacion_senado_2026 ?? null;
  if (INCLUDE_SENADO) {
    const senatePolicyHtml = curlHtml(senatePolicyUrl);
    const senatePolicy = parseSenadoAssignmentPolicy(senatePolicyHtml);
    senateAssignment = {
      ...senatePolicy,
      source_url: senatePolicyUrl,
      retrieved_at: new Date().toISOString(),
      checksum_sha256: createHash("sha256").update(senatePolicyHtml).digest("hex"),
      // La regla general no prueba un traspaso individual. Este arreglo sólo puede
      // poblarse desde un documento oficial individualizado incorporado por ETL.
      transferencias_acreditadas: [],
    };
  }

  const diputadosActualizados = {};
  const blockedTransparencyCategories = new Set();
  let fallos = 0;
  let perfilesOpenData = {};

  if (INCLUDE_CAMARA) {
    const openDataUrl = "https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx/retornarDiputados";
    try {
      const response = await fetch(openDataUrl, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      perfilesOpenData = parseCamaraOpenDataDeputies(await response.text());
      if (Object.keys(perfilesOpenData).length < 100) throw new Error(`CONTEO_INESPERADO_${Object.keys(perfilesOpenData).length}`);
      console.log(`Open Data Cámara: ${Object.keys(perfilesOpenData).length} diputados por ID; partido vigente cuando la fuente lo informa`);
    } catch (error) {
      console.error(`Open Data Cámara no disponible; se conserva lo anterior: ${error.message}`);
    }
  }
  if (OPEN_DATA_ONLY) {
    if (Object.keys(perfilesOpenData).length < 100) throw new Error("PERSONAL_APOYO_OPEN_DATA_ONLY_SOURCE_INCOMPLETE");
    const candidateWithSnapshot = mergeCamaraOfficialProfiles(
      previo,
      officialProfileSnapshot?.profiles,
      "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}",
      officialProfileSnapshot?.retrievedAt,
    );
    const candidate = mergeCamaraOpenDataProfiles(candidateWithSnapshot, perfilesOpenData);
    candidate.generado_en = new Date().toISOString();
    candidate.fuentes = {
      ...(candidate.fuentes ?? {}),
      camara_perfiles_oficiales: {
        url: officialProfileSnapshot?.source ?? "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}",
        nota: `Campos oficiales de perfil incorporados sólo cuando faltaban. Captura verificada ${officialProfileSnapshot?.retrievedAt ?? "sin fecha"}; correspondencia por ID de Cámara.`,
      },
      camara_open_data: {
        url: "https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx/retornarDiputados",
        nota: "Partido vigente sólo cuando la fecha de militancia coincide con la extracción. Enlace por ID oficial de diputado.",
      },
    };
    fs.writeFileSync(ESCRITURA, JSON.stringify(candidate, null, 1), "utf8");
    console.log(`Open Data aplicado a ${Object.keys(candidate.diputados ?? {}).length} fichas existentes. Sin llamadas a Transparencia individual ni alteración de otros datos.`);
    console.log("guardado:", ESCRITURA);
    return;
  }

  let vigentes = null;
  try {
    const opendata = JSON.parse(fs.readFileSync("data/etl/latest.json", "utf8")).fuentes?.congreso_opendata;
    if (Array.isArray(opendata)) vigentes = new Set(opendata.map((d) => String(d.id)));
  } catch {}

  let lista = [];
  if (INCLUDE_CAMARA) {
    const primera = curlHtml("https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1009");
    const ids = parseCamaraDeputyIds(primera).map((candidate) => ({ ...candidate, apellido: html(candidate.apellido) }));
    console.log("diputados en select:", ids.length);
    const enSelect = new Set(ids.map((x) => x.id));
    const faltantes = vigentes ? [...vigentes].filter((id) => !enSelect.has(id)) : [];
    if (faltantes.length) console.log("ids opendata ausentes del selector (se completan):", faltantes.join(", "));
    const listaCompleta = selectCamaraPersonalApoyoIds({
      selectorIds: ids.map(({ id }) => id),
      openDataIds: faltantes,
      previousDeputies: previo?.diputados ?? {},
      extraIds: EXTRA_IDS,
      year: new Date().getFullYear(),
    }).map((id) => ({ id }));
    lista = ONLY_EXTRA
      ? EXTRA_IDS.map((id) => ({ id }))
      : LIMIT ? listaCompleta.slice(0, LIMIT) : listaCompleta;
  }
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
      Object.assign(ficha, parseCamaraDeputyProfile(htmlGet));

      const transparenciaCamara = {};
      for (const [category, page] of CAMARA_TRANSPARENCIA_PAGES) {
        if (blockedTransparencyCategories.has(category)) continue;
        try {
          transparenciaCamara[category] = await fetchCamaraTransparency(id, page, jarId);
        } catch (error) {
          if (isCamaraAccessBlock(error)) blockedTransparencyCategories.add(category);
          // Una categoría fallida no reemplaza su corte previo ni detiene la nómina principal.
          console.error(`Cámara transparencia no disponible: id=${id} categoría=${category} motivo=${error.message}`);
          transparenciaCamara[category] = {
            status: "unavailable",
            period: null,
            rows: [],
            source_url: `https://www.camara.cl/diputados/detalle/${page}?prmId=${encodeURIComponent(id)}`,
            retrieved_at: new Date().toISOString(),
          };
        }
        await pausa(150);
      }

      const filas = corte?.filas ?? porDefecto;
      diputadosActualizados[id] = {
        meses,
        mes_por_defecto: meses[0]?.nombre ?? null,
        ficha,
        transparencia_camara: transparenciaCamara,
        personal_apoyo: filas,
        mes_personal: corte?.etiqueta ?? (meses[0] ? `${meses[0].nombre} 2026` : null),
      };
      const n = diputadosActualizados[id].ficha.region ? "ok" : "sin-ficha";
      if (n === "sin-ficha") fallos++;
      process.stdout.write(`[${i + 1}/${lista.length}] id=${id} ${n} filas=${filas.length} mes=${diputadosActualizados[id].mes_personal}\n`);
      await pausa(400);
    } catch (e) {
      if (isCamaraAccessBlock(e)) throw e;
      console.error(`id ${id} ERROR: ${e.message}`);
      fallos++;
      await pausa(2000);
    } finally {
      try { fs.unlinkSync(jarId); } catch {}
    }
  }
  if (INCLUDE_CAMARA) console.log("Cámara listo. fallos:", fallos);

  const diputadosBase = INCLUDE_CAMARA
    ? mergePersonalApoyoDeputies(previo?.diputados ?? {}, diputadosActualizados)
    : (previo?.diputados ?? {});
  const diputadosWithSnapshot = INCLUDE_CAMARA
    ? mergeCamaraOfficialProfiles(
      { ...(previo ?? {}), diputados: diputadosBase },
      officialProfileSnapshot?.profiles,
      "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}",
      officialProfileSnapshot?.retrievedAt,
    ).diputados
    : diputadosBase;
  const diputados = INCLUDE_CAMARA && Object.keys(perfilesOpenData).length
    ? mergeCamaraOpenDataProfiles({ diputados: diputadosWithSnapshot }, perfilesOpenData).diputados
    : diputadosWithSnapshot;
  if (vigentes) {
    const historicos = Object.keys(diputados).filter((id) => !vigentes.has(id));
    if (historicos.length) {
      console.log("diputados historicos preservados aunque ya no figuren en la nomina vigente:", historicos.join(", "));
    }
  } else {
    console.log("sin data/etl/latest.json: se conserva la historia publicada");
  }

  let senadores = INCLUDE_SENADO ? {} : (previo?.senadores ?? {});
  let mesesSenado = new Set(INCLUDE_SENADO ? [] : (previo?.meses_senado_disponibles ?? []));
  if (INCLUDE_SENADO) {
    let page = 1;
    const pageSize = 500;
    let expectedTotal = null;
    let expectedPageCount = null;
    const senadoRows = [];
    while (true) {
      const u = `https://web-back.senado.cl/api/transparency/senator-assignments/support-staff?filters%5Bano%5D%5B%24eq%5D=2026&pagination%5BpageSize%5D=${pageSize}&pagination%5Bpage%5D=${page}`;
      const { rows, pagination } = await fetchSenadoSupportPage(u);
      if (pagination.page !== page) throw new Error(`SENADO_SUPPORT_PAGE_MISMATCH: requested=${page} received=${pagination.page}`);
      if (expectedTotal === null) {
        expectedTotal = pagination.total;
        expectedPageCount = pagination.pageCount;
      } else if (pagination.total !== expectedTotal || pagination.pageCount !== expectedPageCount) {
        throw new Error(`SENADO_SUPPORT_PAGINATION_DRIFT: page=${page}`);
      }
      senadoRows.push(...rows);
      console.log(`senado página ${page}/${pagination.pageCount} (${pagination.total})`);
      if (page >= pagination.pageCount) break;
      page++;
      await pausa(250);
    }
    assertSenadoSupportCollection(senadoRows, expectedTotal);
    for (const f of senadoRows) {
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
      camara_open_data: {
        url: "https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx/retornarDiputados",
        nota: "Militancia/partido actual sólo cuando el rango de fechas de la fuente cubre la fecha de extracción; se vincula por ID oficial de diputado.",
      },
      camara_perfiles_oficiales: {
        url: officialProfileSnapshot?.source ?? "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}",
        nota: `Comunas, distrito, región, períodos, partido, bancada, contacto y enlaces públicos publicados por Cámara. Captura verificada ${officialProfileSnapshot?.retrievedAt ?? "sin fecha"}; completa campos ausentes y vincula por ID oficial.`,
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
