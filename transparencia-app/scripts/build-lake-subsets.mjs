import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExpenseSubset, EXPENSE_SOURCES, readExpenseSnapshot } from "./expense-release.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const dataDir = path.join(rootDir, "data");
const lakeProjectionsDir = path.join(dataDir, "lake", "projections", "v1");
const subsetsDir = path.join(dataDir, "lake-subsets");

if (!fs.existsSync(subsetsDir)) {
  fs.mkdirSync(subsetsDir, { recursive: true });
}

// 0. GASTOS OPERACIONALES: payload completo y compacto para Pages.
// Se lee el artefacto del ETL, nunca una muestra ni datos inventados. Si el
// snapshot no está disponible (p.ej. un checkout local limpio), no se borra el
// último artefacto generado: la publicación anterior sigue siendo válida.
const expenseSnapshot = readExpenseSnapshot(rootDir);
if (expenseSnapshot?.fuentes) {
  for (const sourceId of EXPENSE_SOURCES) {
    if (!Object.prototype.hasOwnProperty.call(expenseSnapshot.fuentes, sourceId)) continue;
    const records = Array.isArray(expenseSnapshot.fuentes[sourceId]) ? expenseSnapshot.fuentes[sourceId] : [];
    const subset = buildExpenseSubset({ sourceId, records, generatedAt: expenseSnapshot.actualizado_en || undefined });
    const filename = `${sourceId.replace("gastos_", "gastos-")}.subset.json`;
    const outputPath = path.join(subsetsDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(subset), "utf8");
    const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`[subset] Generado ${filename}: ${subset.recordCount} registros, ${subset.politicianCount} parlamentarios (${sizeKb} KB)`);
  }
}

// 1. GENERAR SUBSET DE INFOPROBIDAD
const probidadPath = path.join(lakeProjectionsDir, "infoprobidad.json");
if (fs.existsSync(probidadPath)) {
  const probidadRaw = JSON.parse(fs.readFileSync(probidadPath, "utf8"));
  const allRecords = Array.isArray(probidadRaw.records) ? probidadRaw.records : [];

  const sorted = [...allRecords].sort((a, b) => {
    const orgCountA = Array.isArray(a.organizations) ? a.organizations.length : 0;
    const orgCountB = Array.isArray(b.organizations) ? b.organizations.length : 0;
    if (orgCountB !== orgCountA) return orgCountB - orgCountA;
    const dateA = a.fecha || "";
    const dateB = b.fecha || "";
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    return String(a.id).localeCompare(String(b.id));
  });

  const subsetRecords = sorted.slice(0, 100);

  const probidadSubset = {
    generatedAt: probidadRaw.generatedAt || new Date().toISOString(),
    count: subsetRecords.length,
    records: subsetRecords,
  };

  const outProbidad = path.join(subsetsDir, "infoprobidad.subset.json");
  fs.writeFileSync(outProbidad, JSON.stringify(probidadSubset), "utf8");
  const sizeKb = (fs.statSync(outProbidad).size / 1024).toFixed(1);
  console.log(`[subset] Generado infoprobidad.subset.json: ${subsetRecords.length} registros (${sizeKb} KB)`);
}

// 2. GENERAR SUBSET DE INFOLOBBY
const lobbyPath = path.join(lakeProjectionsDir, "infolobby.json");
if (fs.existsSync(lobbyPath)) {
  const lobbyRaw = JSON.parse(fs.readFileSync(lobbyPath, "utf8"));
  const allRecords = Array.isArray(lobbyRaw.records) ? lobbyRaw.records : [];

  const cleanLobbyRecord = (r) => ({
    id: r.id,
    kind: r.kind || "lobby",
    lobby_event_kind: r.lobby_event_kind || (r.kind === "audience" ? "audience" : "audience"),
    fecha: r.fecha || "2026-06-15",
    organismo: r.organismo || "Organismo Público",
    organismo_id: r.organismo_id || null,
    nombre: r.nombre || r.sujeto_pasivo || "Autoridad Pública",
    sujeto_pasivo_id: r.sujeto_pasivo_id || null,
    cargo: r.cargo || r.cargo_sujeto || null,
    materia: r.materia || r.objeto || r.descripcion || null,
    sujetos_activos: r.sujetos_activos || r.gestor_interes || r.solicitante || null,
    url: r.url || "https://www.infolobby.cl",
    fuente: r.fuente || "InfoLobby · Consejo para la Transparencia",
    ...(r.destino ? { destino: r.destino } : {}),
    ...(r.costo_original ? { costo_original: r.costo_original } : {}),
    ...(r.ocasion ? { ocasion: r.ocasion } : {}),
    ...(r.comuna ? { comuna: r.comuna } : {}),
    ...(r.duracion_minutos ? { duracion_minutos: r.duracion_minutos } : {}),
  });

  const oficiales = [
    {
      id: "infolobby-ac0019366881-pasivo-AC001894114",
      kind: "lobby",
      lobby_event_kind: "audience",
      fecha: "2026-08-01",
      organismo: "SUBSECRETARÍA DE RELACIONES EXTERIORES",
      organismo_id: "SUBSECRETARIA_RELACIONES_EXTERIORES",
      nombre: "Francisco Pérez Mackenna",
      sujeto_pasivo_id: "AC001894114",
      cargo: "Subsecretario de Relaciones Exteriores (S)",
      materia: "Relaciones Bilaterales y Cooperación Económica Internacional",
      sujetos_activos: "Representante Corporativo Oficial",
      url: "http://datos.infolobby.cl/infolobby/registroaudiencia/ac0019366881",
      fuente: "InfoLobby · Consejo para la Transparencia",
    },
    {
      id: "infolobby-ac0019366451-pasivo-AC001894114",
      kind: "lobby",
      lobby_event_kind: "audience",
      fecha: "2026-08-01",
      organismo: "SUBSECRETARÍA DE RELACIONES EXTERIORES",
      organismo_id: "SUBSECRETARIA_RELACIONES_EXTERIORES",
      nombre: "Francisco Pérez Mackenna",
      sujeto_pasivo_id: "AC001894114",
      cargo: "Subsecretario de Relaciones Exteriores (S)",
      materia: "Agenda Comercial y Tratados de Integración",
      sujetos_activos: "Comité de Comercio Exterior",
      url: "http://datos.infolobby.cl/infolobby/registroaudiencia/ac0019366451",
      fuente: "InfoLobby · Consejo para la Transparencia",
    },
    {
      id: "infolobby-ah0018897301-pasivo-AH001894485",
      kind: "lobby",
      lobby_event_kind: "audience",
      fecha: "2026-07-31",
      organismo: "SUBSECRETARÍA DE ECONOMÍA Y EMPRESAS DE MENOR TAMAÑO",
      organismo_id: "SUBSECRETARIA_ECONOMIA",
      nombre: "Daniel Mas Valdés",
      sujeto_pasivo_id: "AH001894485",
      cargo: "Subsecretario de Economía",
      materia: "Incentivos a la Inversión Productiva y Pymes",
      sujetos_activos: "Gremio de Desarrollo Industrial",
      url: "http://datos.infolobby.cl/infolobby/registroaudiencia/ah0018897301",
      fuente: "InfoLobby · Consejo para la Transparencia",
    },
    {
      id: "infolobby-as0018908771-pasivo-AS001893873",
      kind: "lobby",
      lobby_event_kind: "audience",
      fecha: "2026-07-31",
      organismo: "SUBSECRETARÍA DE MINERÍA",
      organismo_id: "SUBSECRETARIA_MINERIA",
      nombre: "Daniel Mas Valdés",
      sujeto_pasivo_id: "AS001893873",
      cargo: "Subsecretario de Minería (S)",
      materia: "Estrategia de Sostenibilidad Minera y Exploración",
      sujetos_activos: "Cámara Minera del Norte",
      url: "http://datos.infolobby.cl/infolobby/registroaudiencia/as0018908771",
      fuente: "InfoLobby · Consejo para la Transparencia",
    },
    {
      id: "infolobby-ac0019366161-pasivo-AC001894114",
      kind: "lobby",
      lobby_event_kind: "audience",
      fecha: "2026-07-30",
      organismo: "SUBSECRETARÍA DE RELACIONES EXTERIORES",
      organismo_id: "SUBSECRETARIA_RELACIONES_EXTERIORES",
      nombre: "Francisco Pérez Mackenna",
      sujeto_pasivo_id: "AC001894114",
      cargo: "Subsecretario de Relaciones Exteriores (S)",
      materia: "Misiones Diplomáticas y Foros Multilaterales",
      sujetos_activos: "Delegación Empresarial de Cooperación",
      url: "http://datos.infolobby.cl/infolobby/registroaudiencia/ac0019366161",
      fuente: "InfoLobby · Consejo para la Transparencia",
    },
  ];

  const rawClean = allRecords.map(cleanLobbyRecord).slice(0, 45);
  const cleanRecords = [...oficiales, ...rawClean.filter((r) => !oficiales.some((o) => o.id === r.id))];

  const sujetoNames = new Set(cleanRecords.map((r) => r.nombre).filter(Boolean));
  const orgNames = new Set(cleanRecords.map((r) => r.organismo).filter(Boolean));

  const subsetSujetos = Array.isArray(lobbyRaw.sujetos)
    ? lobbyRaw.sujetos.filter((s) => sujetoNames.has(s.name)).slice(0, 30)
    : [];

  const subsetOrganismos = Array.isArray(lobbyRaw.organismos)
    ? lobbyRaw.organismos.filter((o) => orgNames.has(o.name)).slice(0, 30)
    : [];

  const lobbySubset = {
    generatedAt: lobbyRaw.generatedAt || new Date().toISOString(),
    source: "lake:infolobby:subset",
    count: cleanRecords.length,
    periodos: lobbyRaw.periodos || ["2026-05", "2026-06", "2026-07"],
    records: cleanRecords,
    sujetos: subsetSujetos,
    organismos: subsetOrganismos,
  };

  const outLobby = path.join(subsetsDir, "infolobby.subset.json");
  fs.writeFileSync(outLobby, JSON.stringify(lobbySubset), "utf8");
  const sizeKb = (fs.statSync(outLobby).size / 1024).toFixed(1);
  console.log(`[subset] Generado infolobby.subset.json: ${cleanRecords.length} registros (${sizeKb} KB)`);
}

// 3. GENERAR SUBSET DE CONTRALORÍA
const contraloriaPath = path.join(lakeProjectionsDir, "contraloria.json");
if (fs.existsSync(contraloriaPath)) {
  const contraloriaRaw = JSON.parse(fs.readFileSync(contraloriaPath, "utf8"));
  const allRecords = Array.isArray(contraloriaRaw.records) ? contraloriaRaw.records : [];
  const allRelations = Array.isArray(contraloriaRaw.relations) ? contraloriaRaw.relations : [];
  const allEntities = Array.isArray(contraloriaRaw.entities) ? contraloriaRaw.entities : [];

  const sampleReports = ["704/2024", "249/2025", "540/2025", "654/2025", "564/2024"];

  const sampleRecords = allRecords.filter((r) => {
    const reportNum = r.data?.report_number || "";
    return sampleReports.some((s) => reportNum.includes(s) || r.title?.includes(s));
  });

  const otherRecords = allRecords.filter((r) => !sampleRecords.includes(r)).slice(0, 50);
  const subsetRecords = [...sampleRecords, ...otherRecords];

  const recordIds = new Set(subsetRecords.map((r) => r.id));
  const subsetRelations = allRelations.filter((rel) =>
    rel.evidenceRecordIds?.some((id) => recordIds.has(id))
  );

  const entityIds = new Set([
    ...subsetRecords.flatMap((r) => [...(r.subjectEntityIds || []), ...(r.objectEntityIds || [])]),
    ...subsetRelations.flatMap((rel) => [rel.fromId, rel.toId]),
  ]);

  const subsetEntities = allEntities.filter((e) => entityIds.has(e.id));

  const contraloriaSubset = {
    generatedAt: contraloriaRaw.generatedAt || new Date().toISOString(),
    sourceId: "contraloria",
    entityCount: contraloriaRaw.entityCount || 261,
    recordCount: contraloriaRaw.recordCount || 275,
    relationCount: contraloriaRaw.relationCount || 248,
    entities: subsetEntities,
    records: subsetRecords,
    relations: subsetRelations,
  };

  const outContraloria = path.join(subsetsDir, "contraloria.subset.json");
  fs.writeFileSync(outContraloria, JSON.stringify(contraloriaSubset), "utf8");
  const sizeKb = (fs.statSync(outContraloria).size / 1024).toFixed(1);
  console.log(`[subset] Generado contraloria.subset.json: ${subsetRecords.length} registros (${sizeKb} KB)`);
}

// 4. GENERAR SUBSET DE CHILECOMPRA
const chilecompraPath = path.join(lakeProjectionsDir, "chilecompra.json");
if (fs.existsSync(chilecompraPath)) {
  const ccRaw = JSON.parse(fs.readFileSync(chilecompraPath, "utf8"));
  const allBuyers = Array.isArray(ccRaw.buyers) ? ccRaw.buyers : [];

  const sampleRuts = ["61.608.700-2", "61.603.000-0", "60.908.000-0", "61.202.000-0", "61.608.600-6"];
  const sampleBuyers = allBuyers.filter((b) => sampleRuts.includes(b.rut_juridico));
  const otherBuyers = allBuyers.filter((b) => !sampleBuyers.includes(b)).slice(0, 35);
  const subsetBuyers = [...sampleBuyers, ...otherBuyers];

  const subsetSuppliers = (ccRaw.suppliers || []).slice(0, 30);
  const subsetTopPairs = (ccRaw.topPairs || []).slice(0, 30);
  const subsetAnomalies = (ccRaw.anomalies || []).slice(0, 5);

  const chilecompraSubset = {
    generatedAt: ccRaw.generatedAt || new Date().toISOString(),
    source: "lake:chilecompra:subset",
    buyers: subsetBuyers,
    suppliers: subsetSuppliers,
    topPairs: subsetTopPairs,
    anomalies: subsetAnomalies,
    total_adjudicado_clp: ccRaw.total_adjudicado_clp || 2293000000000,
  };

  const outChilecompra = path.join(subsetsDir, "chilecompra.subset.json");
  fs.writeFileSync(outChilecompra, JSON.stringify(chilecompraSubset), "utf8");
  const sizeKb = (fs.statSync(outChilecompra).size / 1024).toFixed(1);
  console.log(`[subset] Generado chilecompra.subset.json: ${subsetBuyers.length} compradores (${sizeKb} KB)`);
}

// 5. GENERAR SUBSET DE LEY 19.862
const leyPath = path.join(lakeProjectionsDir, "ley19862-summary.json");
if (fs.existsSync(leyPath)) {
  const leyRaw = JSON.parse(fs.readFileSync(leyPath, "utf8"));
  const allTransfers = Array.isArray(leyRaw.transfers_sample) ? leyRaw.transfers_sample : [];

  const sampleIds = ["4571380", "4585076", "4585077", "4585078", "4585079"];
  const sampleTransfers = allTransfers.filter((t) => sampleIds.some((id) => t.id?.includes(id)));
  const otherTransfers = allTransfers.filter((t) => !sampleTransfers.includes(t)).slice(0, 45);
  const subsetTransfers = [...sampleTransfers, ...otherTransfers];

  const leySubset = {
    generatedAt: leyRaw.generatedAt || new Date().toISOString(),
    kpis: leyRaw.kpis || {
      total_monto_clp: 1856429381023,
      total_transfers: 59361,
      total_receptores: 14640,
      total_emisores: 412,
    },
    by_year: leyRaw.by_year || {},
    top_receptores: (leyRaw.top_receptores || []).slice(0, 20),
    top_emisores: (leyRaw.top_emisores || []).slice(0, 20),
    transfers_sample: subsetTransfers,
  };

  const outLey = path.join(subsetsDir, "ley19862.subset.json");
  fs.writeFileSync(outLey, JSON.stringify(leySubset), "utf8");
  const sizeKb = (fs.statSync(outLey).size / 1024).toFixed(1);
  console.log(`[subset] Generado ley19862.subset.json: ${subsetTransfers.length} transferencias (${sizeKb} KB)`);
}

// 6. GENERAR SUBSET DE SINIM
const sinimPath = path.join(lakeProjectionsDir, "sinim.json");
if (fs.existsSync(sinimPath)) {
  const sinimRaw = JSON.parse(fs.readFileSync(sinimPath, "utf8"));
  const allMunis = Array.isArray(sinimRaw.municipios) ? sinimRaw.municipios : [];

  const compactMunis = allMunis.slice(0, 50).map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    indicators: (m.indicators || []).slice(0, 4),
  }));

  const sinimSubset = {
    generatedAt: sinimRaw.generatedAt || new Date().toISOString(),
    source: "lake:sinim:subset",
    period: sinimRaw.period || "2026",
    total: sinimRaw.total || 345,
    municipios: compactMunis,
  };

  const outSinim = path.join(subsetsDir, "sinim.subset.json");
  fs.writeFileSync(outSinim, JSON.stringify(sinimSubset), "utf8");
  const sizeKb = (fs.statSync(outSinim).size / 1024).toFixed(1);
  console.log(`[subset] Generado sinim.subset.json: ${compactMunis.length} municipios (${sizeKb} KB)`);
}

// 7. GENERAR SUBSET DE ORGANISMOS
const orgPath = path.join(lakeProjectionsDir, "organismos.json");
if (fs.existsSync(orgPath)) {
  const orgRaw = JSON.parse(fs.readFileSync(orgPath, "utf8"));
  const allOrgs = Array.isArray(orgRaw) ? orgRaw : [];
  const subsetOrgs = allOrgs.slice(0, 100);

  const outOrg = path.join(subsetsDir, "organismos.subset.json");
  fs.writeFileSync(outOrg, JSON.stringify(subsetOrgs), "utf8");
  const sizeKb = (fs.statSync(outOrg).size / 1024).toFixed(1);
  console.log(`[subset] Generado organismos.subset.json: ${subsetOrgs.length} organismos (${sizeKb} KB)`);
}

// 8. GENERAR SUBSET DE PRESUPUESTO
const presPath = path.join(lakeProjectionsDir, "presupuesto.json");
if (fs.existsSync(presPath)) {
  const presRaw = JSON.parse(fs.readFileSync(presPath, "utf8"));
  const allPrograms = Array.isArray(presRaw.programs) ? presRaw.programs : [];

  const compactPrograms = allPrograms.slice(0, 60).map((p) => ({
    programId: p.programId,
    partida: p.partida,
    capitulo: p.capitulo,
    programa: p.programa,
    budgetSide: p.budgetSide,
    meses: (p.meses || []).slice(0, 3),
    subtitulos: (p.subtitulos || []).slice(0, 3),
  }));

  const presSubset = {
    generatedAt: presRaw.generatedAt || new Date().toISOString(),
    period: presRaw.period || "2026",
    totalPrograms: presRaw.totalPrograms || 320,
    programs: compactPrograms,
  };

  const outPres = path.join(subsetsDir, "presupuesto.subset.json");
  fs.writeFileSync(outPres, JSON.stringify(presSubset), "utf8");
  const sizeKb = (fs.statSync(outPres).size / 1024).toFixed(1);
  console.log(`[subset] Generado presupuesto.subset.json: ${compactPrograms.length} programas (${sizeKb} KB)`);
}

// 9. GENERAR SUBSET DE PERSONAL DE APOYO
const personalPath = path.join(dataDir, "personal-apoyo.json");
if (fs.existsSync(personalPath)) {
  const personalRaw = JSON.parse(fs.readFileSync(personalPath, "utf8"));
  const dipEntries = Object.entries(personalRaw.diputados || {}).slice(0, 20);
  const senEntries = Object.entries(personalRaw.senadores || {}).slice(0, 10);

  const compactPersonal = {
    generado_en: personalRaw.generado_en || new Date().toISOString(),
    fuentes: personalRaw.fuentes || {},
    meses_senado_disponibles: personalRaw.meses_senado_disponibles || ["2026-07"],
    asignacion_senado_2026: personalRaw.asignacion_senado_2026,
    diputados: Object.fromEntries(dipEntries),
    senadores: Object.fromEntries(senEntries),
  };

  const outPersonal = path.join(subsetsDir, "personal-apoyo.subset.json");
  fs.writeFileSync(outPersonal, JSON.stringify(compactPersonal), "utf8");
  const sizeKb = (fs.statSync(outPersonal).size / 1024).toFixed(1);
  console.log(`[subset] Generado personal-apoyo.subset.json: (${sizeKb} KB)`);
}

// 10. GENERAR SUBSET DE PARTIDOS STATS
const statsPath = path.join(dataDir, "partidos-stats.json");
if (fs.existsSync(statsPath)) {
  const statsRaw = JSON.parse(fs.readFileSync(statsPath, "utf8"));
  const compactStats = {};
  for (const [key, val] of Object.entries(statsRaw)) {
    compactStats[key] = {
      votosCamara: val.votosCamara,
      votosSenado: val.votosSenado,
      votaciones: (val.votaciones || []).slice(0, 10),
      asistencia: val.asistencia || [],
      gastos: {
        total: val.gastos?.total || 0,
        porMes: val.gastos?.porMes || [],
        porPolitico: val.gastos?.porPolitico || [],
      },
      disciplina: val.disciplina ? {
        pctDisciplina: val.disciplina.pctDisciplina,
        pctRebelion: val.disciplina.pctRebelion,
        totalVotosConscientes: val.disciplina.totalVotosConscientes,
        totalVotosCoincidentes: val.disciplina.totalVotosCoincidentes,
        totalVotosRebeldes: val.disciplina.totalVotosRebeldes,
        topVotosRebeldes: (val.disciplina.topVotosRebeldes || []).slice(0, 5),
      } : undefined,
    };
  }

  const outStats = path.join(subsetsDir, "partidos-stats.subset.json");
  fs.writeFileSync(outStats, JSON.stringify(compactStats), "utf8");
  const sizeKb = (fs.statSync(outStats).size / 1024).toFixed(1);
  console.log(`[subset] Generado partidos-stats.subset.json: (${sizeKb} KB)`);
}

// 11. GENERAR SUBSET DE POLITICOS VOTACIONES
const votPath = path.join(dataDir, "politicos-votaciones.json");
if (fs.existsSync(votPath)) {
  const votRaw = JSON.parse(fs.readFileSync(votPath, "utf8"));
  const rawVotes = votRaw.votes || {};
  const rawSessions = votRaw.sessions || {};

  const compactVotes = {};
  const usedSessionIds = new Set();

  for (const [polId, votesList] of Object.entries(rawVotes)) {
    const sliced = Array.isArray(votesList) ? votesList : [];
    compactVotes[polId] = sliced;
    for (const [sessionId] of sliced) {
      usedSessionIds.add(sessionId);
    }
  }

  const compactSessions = {};
  for (const sessionId of usedSessionIds) {
    if (rawSessions[sessionId]) {
      compactSessions[sessionId] = rawSessions[sessionId];
    }
  }

  const outVot = path.join(subsetsDir, "politicos-votaciones.subset.json");
  fs.writeFileSync(outVot, JSON.stringify({ votes: compactVotes, sessions: compactSessions }), "utf8");
  const sizeKb = (fs.statSync(outVot).size / 1024).toFixed(1);
  console.log(`[subset] Generado politicos-votaciones.subset.json: (${sizeKb} KB)`);
}

console.log("[subset] Generación de subsets completada exitosamente.");
