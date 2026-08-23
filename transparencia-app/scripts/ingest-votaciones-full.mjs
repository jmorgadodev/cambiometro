import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { POLITICOS_SEED } from "../lib/politicos-source.ts";

const USER_AGENT = "Cambiometro-ETL/1.0 (+https://cambiometro.impulsacv.cl)";
const REQUEST_TIMEOUT_MS = 30_000;
const PERIODO_ACTUAL_DESDE = "2026-03-11";

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameMatches(candidate, reference) {
  const c = normalizeText(candidate);
  const r = normalizeText(reference);
  if (c === r || c.includes(r) || r.includes(c)) return true;
  const cTokens = c.split(" ");
  const rTokens = r.split(" ");
  // Match if last two tokens (surnames) match
  const cSurnames = cTokens.slice(-2);
  const rSurnames = rTokens.slice(-2);
  if (cSurnames.length === 2 && rSurnames.length === 2) {
    if (cSurnames[0] === rSurnames[0] && cSurnames[1] === rSurnames[1]) return true;
  }
  return false;
}

// Load diputados IDs
const diputadosIdsPath = resolve("data/diputados-ids.json");
const diputadosIds = existsSync(diputadosIdsPath)
  ? JSON.parse(readFileSync(diputadosIdsPath, "utf8"))
  : {};

// Reverse map: DIPID -> politico
const dipIdToPolitico = new Map();
const dipNameToPolitico = new Map();
for (const p of POLITICOS_SEED.filter((pol) => pol.cargo === "Diputado")) {
  dipNameToPolitico.set(normalizeText(p.nombre_completo), p);
}
for (const [idStr, name] of Object.entries(diputadosIds)) {
  const norm = normalizeText(name);
  const pol = dipNameToPolitico.get(norm) || POLITICOS_SEED.find((p) => p.cargo === "Diputado" && nameMatches(p.nombre_completo, name));
  if (pol) {
    dipIdToPolitico.set(String(idStr), pol);
  }
}

// Senators mapping
const senNameToPolitico = new Map();
for (const p of POLITICOS_SEED.filter((pol) => pol.cargo === "Senador")) {
  senNameToPolitico.set(normalizeText(p.nombre_completo), p);
}

function mapSenatorToPolitico(member) {
  const fullName = [member.NOMBRE, member.APELLIDO_PATERNO, member.APELLIDO_MATERNO]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const norm = normalizeText(fullName);
  if (senNameToPolitico.has(norm)) return senNameToPolitico.get(norm);
  for (const [sNorm, pol] of senNameToPolitico.entries()) {
    if (nameMatches(fullName, pol.nombre_completo)) return pol;
  }
  return null;
}

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        console.warn(`[WARN] error en item ${i}:`, err.message);
        results[i] = null;
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CÁMARA DE DIPUTADOS
// ─────────────────────────────────────────────────────────────────────────────
async function fetchCamaraVotaciones() {
  console.log("[ingest-votaciones] Descargando listado de votaciones de Cámara (2026)...");
  const url = "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx/retornarVotacionesXAnno?prmAnno=2026";
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Camara HTTP ${res.status}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<Votacion>([\s\S]*?)<\/Votacion>/g)];
  
  const rawVotes = [];
  for (const match of matches) {
    const block = match[1];
    const tag = (name) => block.match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
    const text = (name) => block.match(new RegExp(`<${name} Valor="\\d+">(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
    const rawDate = tag("Fecha");
    const date = rawDate ? rawDate.slice(0, 10) : "";
    if (date < PERIODO_ACTUAL_DESDE) continue;

    rawVotes.push({
      id: tag("Id"),
      descripcion: tag("Descripcion"),
      fecha: date,
      fecha_original: rawDate,
      total_si: tag("TotalSi"),
      total_no: tag("TotalNo"),
      total_abstencion: tag("TotalAbstencion"),
      total_dispensado: tag("TotalDispensado"),
      quorum: text("Quorum") || null,
      resultado: text("Resultado") || null,
      tipo: text("Tipo") || null,
    });
  }

  console.log(`[ingest-votaciones] Cámara: ${rawVotes.length} votaciones desde ${PERIODO_ACTUAL_DESDE}. Descargando detalles concurrentes...`);

  const detailed = await mapConcurrent(rawVotes, 12, async (vote) => {
    const detailUrl = `https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx/retornarVotacionDetalle?prmVotacionId=${vote.id}`;
    const dRes = await fetch(detailUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!dRes.ok) return null;
    const dXml = await dRes.text();
    const vMatches = [...dXml.matchAll(/<Voto>([\s\S]*?)<\/Voto>/g)];
    
    const individualVotes = [];
    for (const vMatch of vMatches) {
      const vBlock = vMatch[1];
      const member = vBlock.match(/<Diputado>([\s\S]*?)<\/Diputado>/s)?.[1] ?? "";
      const memberTag = (name) => member.match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
      const opt = vBlock.match(/<OpcionVoto Valor="(\d+)">(.*?)<\/OpcionVoto>/s);
      individualVotes.push({
        dipId: memberTag("Id"),
        nombre: `${memberTag("Nombre")} ${memberTag("ApellidoPaterno")} ${memberTag("ApellidoMaterno")}`.replace(/\s+/g, " ").trim(),
        opcion: opt?.[2]?.trim() ?? "Sin Emitir",
      });
    }

    const boletinMatch = String(vote.descripcion ?? "").match(/Bolet[íi]n\s*N[º°]?\s*([0-9.\-]+)/i);
    const boletin = boletinMatch ? boletinMatch[1].replace(/\./g, "") : null;
    const tramitacionLink = boletin
      ? `https://tramitacion.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=${boletin}`
      : null;

    return {
      id: `camara-vot-${vote.id}`,
      nombre: vote.descripcion || (boletin ? `Boletín N° ${boletin}` : `Votación ${vote.id}`),
      fecha: vote.fecha,
      periodo: vote.fecha.slice(0, 7),
      descripcion: vote.descripcion,
      resultado: vote.resultado || "Aprobado",
      quorum: vote.quorum || "Quórum Simple",
      tipo: vote.tipo || (boletin ? "Proyecto de Ley" : "Otros"),
      total_si: vote.total_si,
      total_no: vote.total_no,
      total_abstencion: vote.total_abstencion,
      total_dispensado: vote.total_dispensado,
      boletin,
      url: detailUrl,
      url_tramitacion: tramitacionLink,
      fuente: "camara",
      votos: individualVotes,
    };
  });

  return detailed.filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SENADO DE LA REPÚBLICA
// ─────────────────────────────────────────────────────────────────────────────
async function fetchSenadoVotaciones() {
  console.log("[ingest-votaciones] Descargando sesiones de Senado (legislatura 374)...");
  const url = "https://tramitacion.senado.cl/wspublico/sesiones.php?legislatura=374";
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Senado HTTP ${res.status}`);
  const xml = await res.text();
  const sMatches = [...xml.matchAll(/<sesion>([\s\S]*?)<\/sesion>/g)];

  const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const sessions = [];
  for (const m of sMatches) {
    const block = m[1];
    const tag = (name) => block.match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
    const id = tag("SESIID");
    const rawIni = tag("FECHAINICIO");
    const dMatch = String(rawIni).match(/(\d{1,2}) de ([^ ]+) de (\d{4})/i);
    if (!dMatch) continue;
    const mo = MESES[dMatch[2].toLowerCase()];
    if (!mo) continue;
    const fecha = `${dMatch[3]}-${String(mo).padStart(2, "0")}-${String(Number(dMatch[1])).padStart(2, "0")}`;
    if (fecha < PERIODO_ACTUAL_DESDE) continue;
    sessions.push({ id, numero: tag("NUMERO"), fecha });
  }

  console.log(`[ingest-votaciones] Senado: ${sessions.length} sesiones desde ${PERIODO_ACTUAL_DESDE}. Descargando votos por sesión...`);

  const senadoVotes = [];
  await mapConcurrent(sessions, 6, async (session) => {
    try {
      const [vRes, aRes] = await Promise.all([
        fetch(`https://web-back.senado.cl/api/votes?id_sesion=${session.id}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
        fetch(`https://web-back.senado.cl/api/sessions/attendance?id_sesion=${session.id}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
      ]);
      const vJson = vRes.ok ? await vRes.json() : null;
      const aJson = aRes.ok ? await aRes.json() : null;
      const votesList = vJson?.data?.data ?? [];
      const attendance = Array.isArray(aJson?.data?.DATA) ? aJson.data.DATA : [];

      for (const vote of votesList) {
        const id = vote.ID_VOTACION;
        const rawDate = String(vote.FECHA_VOTACION ?? "").trim();
        const dateMatch = rawDate.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
        const fecha = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : session.fecha;
        if (fecha < PERIODO_ACTUAL_DESDE) continue;

        const boletin = vote.BOLETIN ? String(vote.BOLETIN).trim() : null;
        const tramitacionLink = boletin
          ? `https://tramitacion.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=${boletin.split("-")[0]}`
          : null;

        // Collect individual votes
        const individualVotes = [];
        const votacionesObj = vote.VOTACIONES || {};
        
        const parseSubList = (list, optionName) => {
          if (!Array.isArray(list)) return;
          for (const mem of list) {
            const pol = mapSenatorToPolitico(mem);
            if (pol) {
              individualVotes.push({
                polId: pol.id,
                nombre: pol.nombre_completo,
                opcion: optionName,
              });
            }
          }
        };

        parseSubList(votacionesObj.SI, "Afirmativo");
        parseSubList(votacionesObj.NO, "En Contra");
        parseSubList(votacionesObj.ABS || votacionesObj.ABSTENCION, "Abstención");
        parseSubList(votacionesObj.PAREO, "Pareo");

        // Any attendee not in voted list is "No Vota"
        const votedPolIds = new Set(individualVotes.map((v) => v.polId));
        for (const att of attendance) {
          if (att.ASISTENCIA !== "Inasiste") {
            const pol = mapSenatorToPolitico(att);
            if (pol && !votedPolIds.has(pol.id)) {
              individualVotes.push({
                polId: pol.id,
                nombre: pol.nombre_completo,
                opcion: "No Vota",
              });
              votedPolIds.add(pol.id);
            }
          }
        }

        senadoVotes.push({
          id: `senado-vot-${id}`,
          nombre: vote.TEMA || (boletin ? `Boletín N° ${boletin}` : `Votación Senado ${id}`),
          fecha,
          periodo: fecha.slice(0, 7),
          descripcion: vote.TEMA || `Votación de Sala Sesión ${session.numero ?? session.id}`,
          resultado: (vote.SI ?? 0) > (vote.NO ?? 0) ? "Aprobado" : "Rechazado",
          quorum: vote.QUORUM || "Mayoría simple",
          tipo: boletin ? "Proyecto de Ley" : "Otros",
          total_si: String(vote.SI ?? 0),
          total_no: String(vote.NO ?? 0),
          total_abstencion: String(vote.ABS ?? 0),
          total_dispensado: String(vote.PAREO ?? 0),
          boletin,
          url: `https://web-back.senado.cl/api/votes?id_sesion=${session.id}`,
          url_tramitacion: tramitacionLink,
          fuente: "senado",
          votos: individualVotes,
        });
      }
    } catch (err) {
      console.warn(`[WARN] error en sesion senado ${session.id}:`, err.message);
    }
  });

  return senadoVotes;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSOLIDACIÓN FINAL
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const [camaraSessions, senadoSessions] = await Promise.all([
    fetchCamaraVotaciones(),
    fetchSenadoVotaciones(),
  ]);

  console.log(`[ingest-votaciones] Consolidando: ${camaraSessions.length} Cámara + ${senadoSessions.length} Senado...`);

  const allSessions = [...camaraSessions, ...senadoSessions];
  allSessions.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

  const sessionsMap = {};
  const votesMap = {};

  // Initialize all 205 politicians in votesMap
  for (const pol of POLITICOS_SEED) {
    votesMap[pol.id] = [];
  }

  for (const session of allSessions) {
    const { votos, ...sessionMeta } = session;
    sessionsMap[session.id] = sessionMeta;

    if (session.fuente === "camara") {
      // Map Cámara individual votes to deputies
      for (const v of votos) {
        const pol = dipIdToPolitico.get(String(v.dipId)) ||
          dipNameToPolitico.get(normalizeText(v.nombre)) ||
          POLITICOS_SEED.find((p) => p.cargo === "Diputado" && nameMatches(p.nombre_completo, v.nombre));
        if (pol && votesMap[pol.id]) {
          votesMap[pol.id].push([session.id, v.opcion]);
        }
      }
    } else if (session.fuente === "senado") {
      // Map Senado individual votes to senators
      for (const v of votos) {
        if (v.polId && votesMap[v.polId]) {
          votesMap[v.polId].push([session.id, v.opcion]);
        }
      }
    }
  }

  const outputPayload = {
    generatedAt: new Date().toISOString(),
    period: "2026-2030",
    totalSessions: Object.keys(sessionsMap).length,
    sessions: sessionsMap,
    votes: votesMap,
  };

  const targetPath = resolve("data/politicos-votaciones.json");
  writeFileSync(targetPath, JSON.stringify(outputPayload, null, 2), "utf8");
  console.log(`[ingest-votaciones] ✅ Escrito ${targetPath} (${(Buffer.byteLength(JSON.stringify(outputPayload)) / 1024 / 1024).toFixed(2)} MB, ${outputPayload.totalSessions} sesiones)`);

  // Count stats
  const voteCounts = Object.entries(votesMap).map(([id, list]) => ({ id, count: list.length }));
  const avg = (voteCounts.reduce((sum, item) => sum + item.count, 0) / voteCounts.length).toFixed(1);
  console.log(`[ingest-votaciones] Promedio de votos por parlamentario: ${avg} (mínimo: ${Math.min(...voteCounts.map((v) => v.count))}, máximo: ${Math.max(...voteCounts.map((v) => v.count))})`);
}

main().catch((err) => {
  console.error("[ingest-votaciones] ERROR FATAL:", err);
  process.exit(1);
});
