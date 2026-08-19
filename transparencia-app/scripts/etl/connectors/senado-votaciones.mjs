/**
 * Votaciones de sala del Senado — connector ETL.
 *
 * Fuentes oficiales publicadas por el Senado de la República:
 * - Listado de sesiones:   https://tramitacion.senado.cl/wspublico/sesiones.php?legislatura=N (XML)
 * - Votaciones por sesión: https://web-back.senado.cl/api/votes?id_sesion=SID (JSON, voto individual)
 * - Asistencia por sesión: https://web-back.senado.cl/api/sessions/attendance?id_sesion=SID (JSON)
 *
 * El API entrega el voto individual de cada senador (SI/NO/ABSTENCION/PAREO). Para el padrón
 * completo de una votación se cruza con la asistencia de la misma sesión: quienes asistieron y
 * no aparecen en esa votación quedan como "No Vota" (verificable en la fuente). No se genera
 * ningún voto inventado.
 */

const SESIONES_URL = "https://tramitacion.senado.cl/wspublico/sesiones.php";
const API_BASE = "https://web-back.senado.cl";
const USER_AGENT = "Cambiometro-ETL/1.0 (+https://cambiometro.impulsacv.cl)";
const REQUEST_TIMEOUT_MS = 30_000;

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

export const OPCION_POR_SELECCION = {
  SI: "Afirmativo",
  NO: "En Contra",
  ABS: "Abstención",
  PAREO: "Dispensado",
  NP: "No Vota",
};

export function parseOfficialDate(rawValue) {
  const value = String(rawValue ?? "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function fechaDesdeSesion(inicioRaw) {
  // "Miércoles 5 de Agosto de 2026 16:16" → 2026-08-05
  const match = String(inicioRaw ?? "").match(/(\d{1,2}) de ([^ ]+) de (\d{4})/i);
  if (!match) return "";
  const month = MESES[match[2].toLocaleLowerCase("es-CL")];
  if (!month) return "";
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
}

function parseSessionList(xml, desde) {
  const sessionPattern = /<sesion>([\s\S]*?)<\/sesion>/g;
  const sessions = [];
  let match;
  while ((match = sessionPattern.exec(xml)) !== null) {
    const tag = (name) => match[1].match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
    const id = tag("SESIID");
    if (!id) continue;
    const fecha = fechaDesdeSesion(tag("FECHAINICIO"));
    if (!fecha || fecha < desde) continue;
    sessions.push({ id, numero: tag("NUMERO") || null, fecha });
  }
  return sessions.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

async function fetchJson(url, intentos = 3) {
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} → ${url}`);
      return response.json();
    } catch (error) {
      if (intento === intentos) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000 * intento));
    }
  }
}

async function fetchVotacionesDeSesion(sesionId) {
  const payload = await fetchJson(`${API_BASE}/api/votes?id_sesion=${encodeURIComponent(sesionId)}`);
  return payload?.data?.data ?? [];
}

async function fetchAsistenciaDeSesion(sesionId) {
  const payload = await fetchJson(`${API_BASE}/api/sessions/attendance?id_sesion=${encodeURIComponent(sesionId)}`);
  return Array.isArray(payload?.data?.DATA) ? payload.data.DATA : [];
}

function fullName(member) {
  return [member.NOMBRE, member.APELLIDO_PATERNO, member.APELLIDO_MATERNO]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function memberId(member) {
  return String(member.ID_PARLAMENTARIO ?? member.PARLID ?? member.UUID ?? "");
}

function buildVoto(member, opcion) {
  return {
    id: memberId(member),
    nombre: fullName(member),
    opcion_valor: opcion,
    opcion: OPCION_POR_SELECCION[opcion] ?? opcion,
  };
}

/**
 * Descarga todas las votaciones de la legislatura indicada desde `desde` (YYYY-MM-DD)
 * hasta `to` (YYYY-MM-DD, inclusive) con el padrón completo de la sesión.
 */
export async function fetchVotacionesSenado({ legislatura = 374, desde, to }) {
  const response = await fetch(`${SESIONES_URL}?legislatura=${encodeURIComponent(legislatura)}`, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Sesiones del Senado HTTP ${response.status}`);
  const sessions = parseSessionList(await response.text(), desde);
  const seen = new Set();
  const votes = [];

  for (const session of sessions) {
    if (session.fecha > (to ?? "9999-12-31")) continue;
    try {
      const [votaciones, asistencia] = await Promise.all([
        fetchVotacionesDeSesion(session.id),
        fetchAsistenciaDeSesion(session.id),
      ]);
      const asistentes = asistencia
        .filter((member) => member.ASISTENCIA !== "Inasiste")
        .map((member) => memberId(member));
      for (const votacion of votaciones) {
        const id = Number(votacion.ID_VOTACION);
        const fecha = parseOfficialDate(String(votacion.FECHA_VOTACION ?? "")) || session.fecha;
        if (fecha < desde || fecha > (to ?? "9999-12-31")) continue;
        if (seen.has(id)) continue;
        seen.add(id);

        const votos = [];
        for (const opcion of ["SI", "NO", "ABS", "PAREO", "NP"]) {
          const miembros = votacion.VOTACIONES?.[opcion];
          if (!Array.isArray(miembros)) continue;
          for (const member of miembros) {
            votos.push(buildVoto(member, opcion));
          }
        }
        const votantesIds = new Set(votos.map((voto) => voto.id));
        const asistenciaPorId = new Map(
          asistencia.filter((member) => member.ASISTENCIA !== "Inasiste").map((member) => [memberId(member), member])
        );
        for (const memberId of asistentes) {
          if (!votantesIds.has(memberId) && asistenciaPorId.has(memberId)) {
            votos.push(buildVoto(asistenciaPorId.get(memberId), "NP"));
          }
        }

        const totalSi = Number(votacion.SI ?? 0);
        const totalNo = Number(votacion.NO ?? 0);
        votes.push({
          id: `sen-vot-${id}`,
          votacion_id: String(id),
          descripcion: String(votacion.TEMA ?? "").trim() || "Votación en sala del Senado",
          fecha,
          fecha_original: String(votacion.FECHA_VOTACION ?? ""),
          total_si: String(totalSi),
          total_no: String(totalNo),
          total_abstencion: String(Number(votacion.ABS ?? 0)),
          total_dispensado: String(Number(votacion.PAREO ?? 0)),
          quorum: String(votacion.QUORUM ?? "").trim() || null,
          resultado: totalSi > totalNo ? "Aprobado" : totalNo > totalSi ? "Rechazado" : "Empate",
          tipo: "Votación en sala",
          boletin: String(votacion.BOLETIN ?? "").trim() || null,
          votos,
          url: `https://www.senado.cl/actividad-legislativa/sala-de-sesiones/sesiones-de-sala/${session.id}`,
          fuente:
            "Senado de la República · web-back.senado.cl (API votaciones y asistencia, legislatura 374)",
        });
      }
    } catch (error) {
      console.warn(`[etl] senado_votaciones: sesión ${session.id} (${session.fecha}) omitida: ${String(error).slice(0, 100)}`);
    }
  }
  return votes.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.votacion_id.localeCompare(b.votacion_id));
}
