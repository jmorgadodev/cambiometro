import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const dataDir = path.join(rootDir, "data");
const lakeProjectionsDir = path.join(dataDir, "lake", "projections", "v1");
const subsetsDir = path.join(dataDir, "lake-subsets");

if (!fs.existsSync(subsetsDir)) {
  fs.mkdirSync(subsetsDir, { recursive: true });
}

// 1. GENERAR SUBSET DE INFOPROBIDAD (~100 registros reales)
const probidadPath = path.join(lakeProjectionsDir, "infoprobidad.json");
if (fs.existsSync(probidadPath)) {
  const probidadRaw = JSON.parse(fs.readFileSync(probidadPath, "utf8"));
  const allRecords = Array.isArray(probidadRaw.records) ? probidadRaw.records : [];

  // Ordenar de forma determinista: priorizar los que tienen organizaciones vinculadas y fechas recientes
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
} else {
  console.warn(`[subset] Advertencia: no se encontró ${probidadPath}`);
}

// 2. GENERAR SUBSET DE INFOLOBBY (~40 registros reales para << 100 KB)
const lobbyPath = path.join(lakeProjectionsDir, "infolobby.json");
if (fs.existsSync(lobbyPath)) {
  const lobbyRaw = JSON.parse(fs.readFileSync(lobbyPath, "utf8"));
  const allRecords = Array.isArray(lobbyRaw.records) ? lobbyRaw.records : [];

  // Separar y seleccionar representativamente audiencias, viajes y donativos
  const audiences = allRecords.filter((r) => r.lobby_event_kind === "audience" || r.kind === "audience");
  const travels = allRecords.filter((r) => r.lobby_event_kind === "travel" || r.kind === "travel");
  const gifts = allRecords.filter((r) => r.lobby_event_kind === "gift" || r.kind === "gift");
  const others = allRecords.filter((r) => !audiences.includes(r) && !travels.includes(r) && !gifts.includes(r));

  // Priorizar registros con entidades y sujetos
  const scoreRecord = (r) => {
    let score = 0;
    if (Array.isArray(r.entities) && r.entities.length > 0) score += r.entities.length * 2;
    if (r.sujetos_activos) score += 3;
    if (r.materia || r.descripcion) score += 2;
    if (r.organismo) score += 1;
    return score;
  };

  const sortRecords = (list) =>
    [...list].sort((a, b) => {
      const scoreDiff = scoreRecord(b) - scoreRecord(a);
      if (scoreDiff !== 0) return scoreDiff;
      const dateA = a.fecha || "";
      const dateB = b.fecha || "";
      return dateB.localeCompare(dateA);
    });

  const subsetAudiences = sortRecords(audiences).slice(0, 25);
  const subsetTravels = sortRecords(travels).slice(0, 10);
  const subsetGifts = sortRecords(gifts).slice(0, 5);

  const subsetRecords = [
    ...subsetAudiences,
    ...subsetTravels,
    ...subsetGifts,
  ];

  // Sanitizar registros para conservar todos los campos útiles sin anidaciones gigantes redundantes
  const cleanLobbyRecord = (r) => {
    const cleaned = {
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
    };
    if (r.destino) cleaned.destino = r.destino;
    if (r.costo_original) cleaned.costo_original = r.costo_original;
    if (r.ocasion) cleaned.ocasion = r.ocasion;
    if (r.comuna) cleaned.comuna = r.comuna;
    if (r.duracion_minutos) cleaned.duracion_minutos = r.duracion_minutos;
    return cleaned;
  };

  const cleanRecords = subsetRecords.map(cleanLobbyRecord);

  // Extraer sujetos y organismos correspondientes al subset
  const sujetoNames = new Set(cleanRecords.map((r) => r.nombre).filter(Boolean));
  const orgNames = new Set(cleanRecords.map((r) => r.organismo).filter(Boolean));

  const subsetSujetos = Array.isArray(lobbyRaw.sujetos)
    ? lobbyRaw.sujetos.filter((s) => sujetoNames.has(s.name)).slice(0, 25)
    : [];

  const subsetOrganismos = Array.isArray(lobbyRaw.organismos)
    ? lobbyRaw.organismos.filter((o) => orgNames.has(o.name)).slice(0, 25)
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
} else {
  console.warn(`[subset] Advertencia: no se encontró ${lobbyPath}`);
}
