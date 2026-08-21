import fs from "fs";
import path from "path";
import { PARTIDOS_SEED, POLITICOS_SEED } from "../../lib/seed-politicos";
import { normalizePartidoId } from "../../lib/partido-estadisticas";
import { resumirGastosAgregables } from "../../lib/gastos-operacionales";
import type { EtlRecord } from "../../lib/data-source";

console.log("Generando estadísticas avanzadas y completas de partidos...");

interface SessionData {
  id: string;
  nombre: string;
  fecha: string;
  periodo: string;
  descripcion: string;
  resultado?: string;
  quorum?: string;
  tipo?: string;
  total_si?: string;
  total_no?: string;
  total_abstencion?: string;
  total_dispensado?: string;
  url?: string;
  fuente?: string;
  url_tramitacion?: string;
  tramite?: string;
}

interface PoliticosVotacionesFile {
  sessions: Record<string, SessionData>;
  votes: Record<string, [string, string][]>;
}

// 1. Cargar politicos-votaciones.json
const polVotPath = path.join(process.cwd(), "data", "politicos-votaciones.json");
const polVotData: PoliticosVotacionesFile = fs.existsSync(polVotPath)
  ? JSON.parse(fs.readFileSync(polVotPath, "utf8"))
  : { sessions: {}, votes: {} };

interface EvidenceSource {
  source?: { key?: string };
  records?: Array<{
    monto_clp?: number;
    monto_total?: number;
    monto?: number;
    periodo?: string;
    fecha?: string;
    item?: string;
    concepto?: string;
  }>;
}

interface SesionRebelde {
  id: string;
  fecha: string;
  descripcion: string;
  tramite?: string;
  url_tramitacion?: string | null;
  votosRebeldesCount: number;
  votosMayoriaCount?: number;
  opcionMayoria?: string;
  rebeldes?: Array<{ politico_id: string; nombre: string; opcion: string }>;
}

// 2. Cargar evidencias de políticos (gastos de Cámara y Senado reales)
const polEvPath = path.join(process.cwd(), "data", "politicos-evidences.json");
if (!fs.existsSync(polEvPath)) {
  throw new Error(`PARTIDOS_EVIDENCE_REQUIRED: falta ${polEvPath}; no se sobrescribirá la proyección con ceros.`);
}
const polEvData: Record<string, EvidenceSource[]> = fs.existsSync(polEvPath)
  ? JSON.parse(fs.readFileSync(polEvPath, "utf8"))
  : {};

console.log(`Cargadas evidencias para ${Object.keys(polEvData).length} parlamentarios.`);

// Map de votos por sesión -> { politicoId: opcion }
const votesBySession: Record<string, Record<string, string>> = {};
for (const [polId, voteList] of Object.entries(polVotData.votes || {})) {
  for (const [sesId, opcion] of voteList) {
    if (!votesBySession[sesId]) votesBySession[sesId] = {};
    votesBySession[sesId][polId] = opcion;
  }
}

// Lista ordenada de sesiones por fecha desc
const sesionesOrdenadas = Object.values(polVotData.sessions || {}).sort((a, b) => {
  const fA = a.fecha || "";
  const fB = b.fecha || "";
  return fB.localeCompare(fA);
});

const stats: Record<string, unknown> = {};

for (const partido of PARTIDOS_SEED) {
  const normId = normalizePartidoId(partido.id);
  const polsPartido = POLITICOS_SEED.filter(
    (p) => normalizePartidoId(p.partido_id ?? "ind") === normId
  );

  // Conteo de votos
  let camAfirmativo = 0, camEnContra = 0, camAbstencion = 0, camNoVota = 0, camDispensado = 0;
  let senAfirmativo = 0, senEnContra = 0, senAbstencion = 0, senNoVota = 0, senDispensado = 0;

  let totalVotosConscientes = 0;
  let totalVotosCoincidentes = 0;
  let totalVotosRebeldes = 0;

  const votacionesPartido: Array<Record<string, unknown>> = [];
  const sesionesRebeldes: SesionRebelde[] = [];
  const asistenciaMap: Record<string, { presentes: number; total: number; fecha: string }> = {};

  for (const ses of sesionesOrdenadas) {
    const sesVotes = votesBySession[ses.id] || {};
    let si = 0, no = 0, abst = 0, noVota = 0, disp = 0;
    const nominales: { politico_id: string; nombre: string; opcion: string }[] = [];

    let countInParty = 0;
    for (const pol of polsPartido) {
      if (ses.fuente === "senado" && pol.cargo !== "Senador") continue;
      if (ses.fuente === "camara" && pol.cargo !== "Diputado") continue;

      countInParty++;
      const opc = sesVotes[pol.id];
      const normOpc = (opc || "No Vota").trim();

      nominales.push({
        politico_id: pol.id,
        nombre: pol.nombre_completo,
        opcion: normOpc,
      });

      if (normOpc === "Afirmativo" || normOpc === "Sí" || normOpc === "A favor") {
        si++;
        if (ses.fuente === "senado") senAfirmativo++; else camAfirmativo++;
      } else if (normOpc === "En Contra" || normOpc === "No") {
        no++;
        if (ses.fuente === "senado") senEnContra++; else camEnContra++;
      } else if (normOpc === "Abstención") {
        abst++;
        if (ses.fuente === "senado") senAbstencion++; else camAbstencion++;
      } else if (normOpc === "Dispensado" || normOpc === "Pareo") {
        disp++;
        if (ses.fuente === "senado") senDispensado++; else camDispensado++;
      } else {
        noVota++;
        if (ses.fuente === "senado") senNoVota++; else camNoVota++;
      }
    }

    if (countInParty > 0) {
      const emitidosSes = si + no + abst;
      const aparicionesSes = countInParty;
      const pctSi = emitidosSes > 0 ? Math.round((si / emitidosSes) * 100) : 0;

      // Calcular disciplina y rebelión en esta sesión
      if (emitidosSes > 0) {
        totalVotosConscientes += emitidosSes;
        const maxOpcion = Math.max(si, no, abst);
        let opcionMayoria = "Afirmativo";
        if (no > si && no >= abst) opcionMayoria = "En Contra";
        else if (abst > si && abst > no) opcionMayoria = "Abstención";

        totalVotosCoincidentes += maxOpcion;
        const rebeldesEnSesion = emitidosSes - maxOpcion;
        totalVotosRebeldes += rebeldesEnSesion;

        if (rebeldesEnSesion > 0) {
          const detalleRebeldes = nominales.filter((n) => {
            if (n.opcion === "No Vota" || n.opcion === "Dispensado" || n.opcion === "Pareo") return false;
            if (opcionMayoria === "Afirmativo") return n.opcion !== "Afirmativo" && n.opcion !== "Sí" && n.opcion !== "A favor";
            if (opcionMayoria === "En Contra") return n.opcion !== "En Contra" && n.opcion !== "No";
            if (opcionMayoria === "Abstención") return n.opcion !== "Abstención";
            return false;
          });

          sesionesRebeldes.push({
            id: ses.id,
            fecha: ses.fecha ? ses.fecha.slice(0, 10) : "2026-08-01",
            descripcion: ses.descripcion || ses.nombre || "Votación de Sala",
            tramite: ses.tramite || "Tramitación en Sala",
            url_tramitacion: ses.url_tramitacion || ses.url || null,
            votosRebeldesCount: rebeldesEnSesion,
            votosMayoriaCount: maxOpcion,
            opcionMayoria,
            rebeldes: detalleRebeldes,
          });
        }
      }

      // Limpiar descripción de sesión
      let descLimpia = ses.descripcion || ses.nombre || "Votación de Sala";
      if (descLimpia === "1-Otros") descLimpia = "Votación de procedimiento de Sala";

      votacionesPartido.push({
        id: ses.id,
        fecha: ses.fecha ? ses.fecha.slice(0, 10) : "2026-08-01",
        descripcion: descLimpia,
        tramite: ses.tramite || "Tramitación en Sala",
        resultado: ses.resultado || (si > no ? "Aprobado" : "Rechazado"),
        si,
        no,
        abst,
        noVota: noVota + disp,
        apariciones: aparicionesSes,
        pctSi,
        url_tramitacion: ses.url_tramitacion || ses.url || null,
        votosNominales: nominales,
      });

      // Registrar asistencia por fecha/sesión para todo el período disponible (Cámara y Senado)
      const fechaKey = ses.fecha ? ses.fecha.slice(0, 10) : "2026-08-01";
      if (!asistenciaMap[fechaKey]) {
        asistenciaMap[fechaKey] = { presentes: 0, total: 0, fecha: fechaKey };
      }
      asistenciaMap[fechaKey].presentes += emitidosSes;
      asistenciaMap[fechaKey].total += aparicionesSes;
    }
  }

  // Serie de asistencia temporal
  const serieAsistencia = Object.entries(asistenciaMap)
    .sort(([fA], [fB]) => fA.localeCompare(fB))
    .map(([fecha, data], index) => {
      const asisPct = data.total > 0 ? Math.round((data.presentes / data.total) * 1000) / 10 : 0;
      return {
        sesion: `${index + 1}`,
        fecha,
        asistencia: asisPct,
        presentes: data.presentes,
        total: data.total,
      };
    });

  // Disciplina general
  const pctDisciplina = totalVotosConscientes > 0
    ? Math.round((totalVotosCoincidentes / totalVotosConscientes) * 1000) / 10
    : 100;
  const pctRebelion = totalVotosConscientes > 0
    ? Math.round((totalVotosRebeldes / totalVotosConscientes) * 1000) / 10
    : 0;

  const topVotosRebeldes = sesionesRebeldes
    .sort((a, b) => b.votosRebeldesCount - a.votosRebeldesCount)
    .slice(0, 3);

  // Gastos del partido
  const gastosPorMesMap: Record<string, number> = {};
  const gastosPorItemMap: Record<string, number> = {};
  const gastosPorPolMap: Record<string, { politico_id: string; nombre: string; cargo: string; total: number }> = {};

  for (const pol of polsPartido) {
    gastosPorPolMap[pol.id] = {
      politico_id: pol.id,
      nombre: pol.nombre_completo,
      cargo: pol.cargo,
      total: 0,
    };
  }

  // Acumular gastos desde las evidencias de cada parlamentario del partido
  for (const pol of polsPartido) {
    const sources = polEvData[pol.id] || [];
    for (const s of sources) {
      if (s.source?.key === "gastos_camara" || s.source?.key === "gastos_senado") {
        const records = (s.records || []).map((record, index) => ({
          ...record,
          id: `${pol.id}-${s.source?.key}-${index}`,
          monto_clp: Number(record.monto_clp ?? record.monto_total ?? record.monto ?? 0),
        })) as EtlRecord[];
        const resumen = resumirGastosAgregables(records);
        for (const mes of resumen.porMes) {
          gastosPorMesMap[mes.periodo] = (gastosPorMesMap[mes.periodo] || 0) + mes.total;
        }
        for (const item of resumen.porItem) {
          gastosPorItemMap[item.item] = (gastosPorItemMap[item.item] || 0) + item.total;
        }
        if (gastosPorPolMap[pol.id]) {
          gastosPorPolMap[pol.id].total += resumen.total;
        }
      }
    }
  }

  const gastosTotal = Object.values(gastosPorMesMap).reduce((a, b) => a + b, 0);
  const gastosPorMes = Object.entries(gastosPorMesMap)
    .sort(([pA], [pB]) => pA.localeCompare(pB))
    .map(([periodo, total]) => ({ periodo, total }));

  const gastosPorItem = Object.entries(gastosPorItemMap)
    .sort(([, tA], [, tB]) => tB - tA)
    .slice(0, 8)
    .map(([item, total]) => ({ item, total }));

  const gastosPorPolitico = Object.values(gastosPorPolMap).sort((a, b) => b.total - a.total);

  // Totales de Cámara y Senado
  const camEmitidos = camAfirmativo + camEnContra + camAbstencion;
  const camApariciones = camEmitidos + camNoVota + camDispensado;
  const camAsistencia = camApariciones > 0 ? (camEmitidos / camApariciones) * 100 : 0;
  const camPctSi = camEmitidos > 0 ? (camAfirmativo / camEmitidos) * 100 : 0;
  const camPctNo = camEmitidos > 0 ? (camEnContra / camEmitidos) * 100 : 0;
  const camPctAbst = camEmitidos > 0 ? (camAbstencion / camEmitidos) * 100 : 0;
  const camPctNoVota = camApariciones > 0 ? (camNoVota / camApariciones) * 100 : 0;

  const senEmitidos = senAfirmativo + senEnContra + senAbstencion;
  const senApariciones = senEmitidos + senNoVota + senDispensado;
  const senAsistencia = senApariciones > 0 ? (senEmitidos / senApariciones) * 100 : 0;
  const senPctSi = senEmitidos > 0 ? (senAfirmativo / senEmitidos) * 100 : 0;
  const senPctNo = senEmitidos > 0 ? (senEnContra / senEmitidos) * 100 : 0;
  const senPctAbst = senEmitidos > 0 ? (senAbstencion / senEmitidos) * 100 : 0;
  const senPctNoVota = senApariciones > 0 ? (senNoVota / senApariciones) * 100 : 0;

  stats[normId] = {
    votosCamara: {
      afirmativo: camAfirmativo,
      enContra: camEnContra,
      abstencion: camAbstencion,
      noVota: camNoVota,
      dispensado: camDispensado,
      apariciones: camApariciones,
      emitidos: camEmitidos,
      asistencia: camAsistencia,
      pctSi: camPctSi,
      pctNo: camPctNo,
      pctAbst: camPctAbst,
      pctNoVota: camPctNoVota,
    },
    votosSenado: {
      afirmativo: senAfirmativo,
      enContra: senEnContra,
      abstencion: senAbstencion,
      noVota: senNoVota,
      dispensado: senDispensado,
      apariciones: senApariciones,
      emitidos: senEmitidos,
      asistencia: senAsistencia,
      pctSi: senPctSi,
      pctNo: senPctNo,
      pctAbst: senPctAbst,
      pctNoVota: senPctNoVota,
    },
    votaciones: votacionesPartido.slice(0, 100),
    asistencia: serieAsistencia,
    disciplina: {
      totalVotosConscientes,
      totalVotosCoincidentes,
      totalVotosRebeldes,
      pctDisciplina,
      pctRebelion,
      topVotosRebeldes,
    },
    gastos: {
      total: gastosTotal,
      porMes: gastosPorMes,
      porItem: gastosPorItem,
      porPolitico: gastosPorPolitico,
    },
  };
}

const outputPath = path.join(process.cwd(), "data", "partidos-stats.json");
fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));

console.log(`Guardado exitosamente en ${outputPath} con ${Object.keys(stats).length} partidos y series completas.`);
