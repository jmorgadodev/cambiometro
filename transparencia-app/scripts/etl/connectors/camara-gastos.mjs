/**
 * Gastos operacionales rendidos por diputados/as publicados por la Cámara de
 * Diputados (Transparencia por diputado, gastosoperacionales.aspx).
 *
 * El sitio es ASP.NET WebForms detrás de Cloudflare: no hay API y el POST
 * directo (fetch/curl) es bloqueado. Se navega con un navegador headless
 * (Microsoft Edge) con el plugin de stealth, y cada mes se consulta por
 * postback asíncrono (UpdatePanel) dentro de la sesión. El id del diputado en
 * el sitio (prmId / ddlDiputados) coincide con el id de la fuente
 * congreso_opendata, por lo que los registros se unen por diputado_id.
 *
 * RITMO: Cloudflare aplica rate limiting por IP con respuestas 429 tras ráfagas
 * (verificado: >200 peticiones en minutos → bloqueo temporal). Por eso esta
 * fuente es deliberadamente lenta y secuencial: una sola página, ~1 s entre
 * peticiones y reintentos con espera larga ante 429/desafíos. Si encadena
 * errores consecutivos aborta para no agravar el bloqueo de la IP.
 */
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileIfPresent } from "../safe-file.mjs";
import { launchFirstAvailable } from "../browser-launch.mjs";

puppeteerExtra.use(StealthPlugin());

const BASE_URL = "https://www.camara.cl/diputados/detalle/gastosoperacionales.aspx";
const PANEL_ID = "ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1";
const FUENTE = "Cámara de Diputados · Gastos operacionales (rendiciones por diputado, transparencia.camara.cl)";
const PROGRESO_DIR = join(tmpdir(), "cambiometro-camara-gastos");
const PACE_MS = 1000;
const RETRY_WAIT_MS = 20_000;
const MAX_REINTENTOS = 3;
const MAX_ERRORES_CONSECUTIVOS = 5;

export function assertCamaraExpenseComplete(completed, expected) {
  if (!Number.isSafeInteger(completed) || !Number.isSafeInteger(expected) || expected < 1 || completed < expected) {
    throw new Error(`CAMARA_GASTOS_INCOMPLETE: ${completed}/${expected} diputados completados`);
  }
  return true;
}

/**
 * A progress marker is only resumable when the corresponding result
 * checkpoint exists. The old runner could leave all IDs marked after a later
 * phase failed, causing a retry to return an empty extraction.
 */
export function resumableCamaraIds(progressIds = [], checkpointIds = []) {
  const checkpoints = new Set(checkpointIds.map((id) => String(id)));
  return new Set(progressIds.map((id) => String(id)).filter((id) => checkpoints.has(id)));
}

function checkpointPath(checkpointDir, diputadoId) {
  return join(checkpointDir, `diputado-${String(diputadoId)}.json`);
}

function loadCheckpoints(checkpointDir, diputados) {
  const recordsById = new Map();
  for (const diputado of diputados) {
    const path = checkpointPath(checkpointDir, diputado.id);
    const raw = readFileIfPresent(path, "utf8");
    if (!raw) continue;
    try {
      const records = JSON.parse(raw);
      if (Array.isArray(records)) recordsById.set(String(diputado.id), records);
    } catch (error) {
      console.warn(`[camara-gastos] checkpoint inválido para ${diputado.id}; se volverá a consultar`);
    }
  }
  return recordsById;
}

function writeCheckpoint(checkpointDir, diputadoId, records) {
  const target = checkpointPath(checkpointDir, diputadoId);
  const staged = `${target}.next`;
  writeFileSync(staged, `${JSON.stringify(records)}\n`, "utf8");
  renameSync(staged, target);
}

function browserExecutables() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : null,
    process.platform === "win32" ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" : null,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const executables = [...new Set(candidates.filter((candidate) => existsSync(candidate)))];
  if (executables.length === 0) throw new Error("CAMARA_GASTOS_BROWSER_NOT_FOUND");
  return executables;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function limpiarCelda(texto) {
  return texto
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrae el HTML del UpdatePanel del delta de ScriptManager (length-prefixed). */
function parseUpdatePanel(delta) {
  const marker = `updatePanel|${PANEL_ID}|`;
  const start = delta.indexOf(marker);
  if (start < 0) throw new Error("respuesta sin updatePanel");
  const inicioContenido = start + marker.length;
  const finRe = /\|\d+\|updatePanelIDs\|/;
  const finMatch = finRe.exec(delta.slice(inicioContenido));
  if (!finMatch) throw new Error("respuesta sin fin de updatePanel");
  return delta.slice(inicioContenido, inicioContenido + finMatch.index);
}

/** Convierte las filas <tr><td>item</td><td>monto</td></tr> en registros. */
function parseRows(html) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  for (const match of html.matchAll(rowRe)) {
    const celdas = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((td) => limpiarCelda(td[1]));
    if (celdas.length < 2) continue;
    const item = celdas[0];
    if (!item) continue;
    const montoTexto = celdas[1].replace(/[^0-9]/g, "");
    if (montoTexto === "") continue;
    rows.push({ item, monto_clp: Number(montoTexto) });
  }
  return rows;
}

function obtenerMesesDisponibles(page) {
  return page.evaluate(() => {
    const sel = document.querySelector('select[name$="ddlMes"]');
    return sel ? [...sel.options].map((o) => o.value).filter(Boolean) : [];
  });
}

/**
 * Postback asíncrono del ddlMes. Devuelve { filas } o { nodata: true }; lanza
 * ErrorRateLimit si Cloudflare responde 429 o desafío (para retry con espera).
 */
async function postbackMes(page, { mes, anno, diputadoId }) {
  const respuesta = await page.evaluate(async ({ mes, anno, diputadoId }) => {
    const form = document.querySelector("#Form1") ?? document.forms[document.forms.length - 1];
    if (!form) return { status: 0, text: "" };
    const selMes = document.querySelector('select[name$="ddlMes"]');
    const selAno = document.querySelector('select[name$="ddlAno"]');
    const selDip = document.querySelector('select[name$="ddlDiputados"]');
    const data = new FormData(form);
    for (const [clave] of [...data.entries()]) {
      if (!clave.includes("ddl") && !clave.includes("ScriptManager") && !clave.startsWith("__")) data.delete(clave);
    }
    if (selMes) {
      data.set(selMes.name, String(mes));
      data.set("__EVENTTARGET", selMes.name);
    }
    if (selAno && [...selAno.options].some((o) => o.value === String(anno))) data.set(selAno.name, String(anno));
    if (selDip && [...selDip.options].some((o) => o.value === String(diputadoId))) data.set(selDip.name, String(diputadoId));
    data.set("__EVENTARGUMENT", "");
    data.set("__ASYNCPOST", "true");
    const resp = await fetch(form.getAttribute("action") || location.href, {
      method: "POST",
      body: data,
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest", "X-MicrosoftAjax": "Delta=true" },
    });
    return { status: resp.status, text: await resp.text() };
  }, { mes, anno, diputadoId });

  if (respuesta.status === 429 || /cf-wrapper|Just a moment|Attention Required/i.test(respuesta.text)) {
    throw Object.assign(new Error(`Cloudflare rate-limit en mes ${mes} (status ${respuesta.status})`), { rate: true });
  }
  if (respuesta.status !== 200 || !respuesta.text) {
    throw new Error(`postback mes ${mes}: status ${respuesta.status}`);
  }
  if (/no han sido publicados/.test(respuesta.text)) return { nodata: true };
  try {
    return { filas: parseRows(parseUpdatePanel(respuesta.text)) };
  } catch (error) {
    if (process.env.CAMARA_GASTOS_DUMP) {
      writeFileSync(join(PROGRESO_DIR, `dbg-postback-${diputadoId}-${mes}.html`), respuesta.text);
      console.warn(`[camara-gastos] dump guardado para ${diputadoId} mes ${mes} (${respuesta.text.length} chars)`);
    }
    throw error;
  }
}

async function abrirDiputado(page, diputadoId, reintentos = MAX_REINTENTOS) {
  for (let intento = 1; intento <= reintentos; intento += 1) {
    try {
      await page.goto(`${BASE_URL}?prmId=${diputadoId}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector('select[name$="ddlMes"]', { timeout: 60000 });
      return true;
    } catch (error) {
      console.warn(`[camara-gastos] ${diputadoId}: goto intento ${intento} falló (${error.message})`);
      await esperar(RETRY_WAIT_MS * intento);
    }
  }
  return false;
}

/**
 * Descarga la serie mensual de gastos operacionales de cada diputado de la
 * nómina congreso_opendata. Devuelve un registro por ítem y mes publicado.
 */
export async function fetchGastosCamara({ diputados = [] } = {}) {
  const hoy = new Date();
  const anno = hoy.getFullYear();
  const hoyStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  mkdirSync(PROGRESO_DIR, { recursive: true });
  const progresoFile = join(PROGRESO_DIR, `camara-gastos-progreso-${hoyStamp}.txt`);
  const previousProgress = readFileIfPresent(progresoFile, "utf8");
  const hechos = new Set(previousProgress?.split(/\r?\n/).filter(Boolean) ?? []);
  const checkpointDir = join(PROGRESO_DIR, `camara-gastos-resultados-${hoyStamp}`);
  mkdirSync(checkpointDir, { recursive: true });
  const checkpoints = loadCheckpoints(checkpointDir, diputados);
  const completedIds = resumableCamaraIds(hechos, checkpoints.keys());
  const cachedResults = [...completedIds].flatMap((id) => checkpoints.get(id) ?? []);
  const nómina = diputados
    .map((diputado) => ({ id: String(diputado.id), nombre: String(diputado.nombre ?? "") }))
    .filter((diputado) => diputado.id)
    .filter((diputado) => !completedIds.has(diputado.id));
  const expectedIds = new Set(diputados.map((diputado) => String(diputado.id)).filter(Boolean));
  const totalDiputados = expectedIds.size;
  if (nómina.length === 0) {
    assertCamaraExpenseComplete(completedIds.size, totalDiputados);
    console.log(`[camara-gastos] checkpoint completo: ${cachedResults.length} registros, ${completedIds.size}/${totalDiputados} diputados`);
    return cachedResults;
  }

  const browserProfile = mkdtempSync(join(PROGRESO_DIR, "pptr-etl-"));
  const browser = await launchFirstAvailable(
    browserExecutables(),
    (executablePath) => puppeteerExtra.launch({
      executablePath,
      headless: "new",
      userDataDir: browserProfile,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1366,900",
        "--lang=es-CL,es",
      ],
    }),
    (executable, message) => console.warn(`[camara-gastos] navegador no disponible ${executable}: ${message.split("\n")[0]}`),
  );

  const resultados = [...cachedResults];
  let erroresConsecutivos = 0;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    page.setDefaultTimeout(60000);

    let meses = [];
    try {
      await page.goto(`${BASE_URL}?prmId=${nómina[0].id}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector('select[name$="ddlMes"]', { timeout: 60000 });
      meses = await obtenerMesesDisponibles(page);
    } catch (error) {
      throw new Error(`página inicial no disponible (${error.message})`);
    }
    if (meses.length === 0) throw new Error("no se pudo acceder al selector de meses (Cloudflare)");

    for (const diputado of nómina) {
      if (erroresConsecutivos >= MAX_ERRORES_CONSECUTIVOS) {
        console.warn(`[camara-gastos] ${diputado.id}+: abortado tras ${erroresConsecutivos} errores consecutivos (rate-limit)`);
        break;
      }
      if (!(await abrirDiputado(page, diputado.id))) {
        erroresConsecutivos += 1;
        continue;
      }
      erroresConsecutivos = 0;
      await esperar(PACE_MS);
      const diputadoResultados = [];
      for (const mes of meses) {
        if (erroresConsecutivos >= MAX_ERRORES_CONSECUTIVOS) break;
        try {
          const respuesta = await postbackMes(page, { mes, anno, diputadoId: diputado.id });
          if (respuesta.nodata) break;
          const mesPad = String(mes).padStart(2, "0");
          for (const registro of respuesta.filas) {
            diputadoResultados.push({
              id: `${diputado.id}-${anno}-${mesPad}-${registro.item
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`,
              diputado_id: diputado.id,
              nombre: diputado.nombre,
              fecha: `${anno}-${mesPad}-01`,
              periodo: `${anno}-${mesPad}`,
              item: registro.item,
              monto_clp: registro.monto_clp,
              url: `${BASE_URL}?prmId=${diputado.id}`,
              fuente: FUENTE,
            });
          }
          await esperar(PACE_MS);
        } catch (error) {
          erroresConsecutivos += 1;
          console.warn(`[camara-gastos] ${diputado.id} mes ${mes}: ${error.message}`);
          if (error.rate) await esperar(RETRY_WAIT_MS);
        }
      }
      if (erroresConsecutivos === 0) {
        writeCheckpoint(checkpointDir, diputado.id, diputadoResultados);
        resultados.push(...diputadoResultados);
        appendFileSync(progresoFile, `${diputado.id}\n`);
        hechos.add(diputado.id);
        completedIds.add(diputado.id);
      }
    }
    console.log(`[camara-gastos] fin: ${resultados.length} registros, ${completedIds.size}/${totalDiputados} diputados completados`);
    assertCamaraExpenseComplete(completedIds.size, totalDiputados);
    await page.close();
  } finally {
    await browser.close().catch(() => {});
    try { rmSync(browserProfile, { recursive: true, force: true }); } catch {}
  }
  return resultados;
}
