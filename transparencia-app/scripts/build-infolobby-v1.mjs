/**
 * Proyección v1: registros InfoLobby (particiones del lake) para la evidencia
 * del político y las tablas de /cruces. Salida:
 * data/lake/projections/v1/infolobby.json
 *
 * Del registro completo (data) se proyecta un registro por sujeto pasivo y
 * evento, con los campos que consume la app (ficha del político: tipo, fecha,
 * organismo, materia/detalle, costo; /cruces: agregados por sujeto y
 * organismo). Tolera dos shapes en el lake:
 *  - CSV trimestral (lobby_event_kind: audience/travel/gift, sujeto_pasivo)
 *  - legacy SPARQL (audiencias sin pasivos: materia + sujetos_activos)
 *
 * Uso: node scripts/build-infolobby-v1.mjs [--output ...]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lakeRoot = join(root, "data", "lake");
const outputPath = resolve(argument("--output") ?? join(lakeRoot, "projections", "v1", "infolobby.json"));
if (!outputPath.startsWith(`${lakeRoot}${sep}`)) throw new Error("INVALID_OUTPUT_PATH");

const catalogPath = join(lakeRoot, "catalog", "v1", "manifest.json");
const generatedAt = existsSync(catalogPath)
  ? JSON.parse(readFileSync(catalogPath, "utf8")).generatedAt ?? new Date().toISOString()
  : new Date().toISOString();
const partitions = existsSync(catalogPath)
  ? (JSON.parse(readFileSync(catalogPath, "utf8")).partitions ?? []).filter((partition) => partition.id.startsWith("infolobby/"))
  : [];

function partitionRecords(partition) {
  const partitionDir = join(lakeRoot, "partitions", partition.id);
  if (!existsSync(partitionDir)) return [];
  let recordsFile = null;
  const partitionManifestPath = join(partitionDir, "manifest.json");
  if (existsSync(partitionManifestPath)) {
    const partitionManifest = JSON.parse(readFileSync(partitionManifestPath, "utf8"));
    const artifactKey = partitionManifest?.artifacts?.[0]?.key;
    if (artifactKey) recordsFile = basename(artifactKey);
  }
  if (!recordsFile) return [];
  const dataFile = join(partitionDir, recordsFile);
  if (!existsSync(dataFile)) return [];
  let content;
  try {
    content = gunzipSync(readFileSync(dataFile)).toString("utf8");
  } catch {
    return [];
  }
  const records = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return records;
}

function initials(row) {
  const id = String(row.id ?? "").trim();
  return id || null;
}

const records = [];
const periodos = new Set();
const sujetos = new Map();
const organismos = new Map();

function sujetoKey(value) {
  return String(value ?? "").toLocaleLowerCase("es-CL").trim();
}

function pushSujeto(id, name, cargo, eventKind, organismoId, organismoName) {
  const key = sujetoKey(id) || sujetoKey(name);
  if (!key || !name) return;
  const existing = sujetos.get(key) ?? {
    id: id || null,
    name,
    cargo: cargo ?? null,
    audiencias: 0,
    viajes: 0,
    donativos: 0,
    total: 0,
    organismos: new Map(),
  };
  existing.name = name;
  if (cargo) existing.cargo = cargo;
  existing[eventKind] += 1;
  existing.total += 1;
  if (organismoId || organismoName) {
    const orgKey = sujetoKey(organismoId) || sujetoKey(organismoName);
    if (orgKey) existing.organismos.set(orgKey, organismoName ?? organismoId ?? "Organismo");
  }
  sujetos.set(key, existing);
}

function pushOrganismo(id, name, eventKind, sujetoName) {
  const key = sujetoKey(id) || sujetoKey(name);
  if (!key || !name) return;
  const existing = organismos.get(key) ?? {
    id: id || null,
    name,
    audiencias: 0,
    viajes: 0,
    donativos: 0,
    total: 0,
    sujetos: new Map(),
  };
  existing.name = name;
  existing[eventKind] += 1;
  existing.total += 1;
  if (sujetoName) {
    const sKey = sujetoKey(sujetoName);
    if (sKey) existing.sujetos.set(sKey, (existing.sujetos.get(sKey) ?? 0) + 1);
  }
  organismos.set(key, existing);
}

for (const partition of partitions) {
  for (const raw of partitionRecords(partition)) {
    const data = raw.data ?? {};
    const eventKind = ["audience", "travel", "gift"].includes(data.lobby_event_kind) ? data.lobby_event_kind : null;
    const id = initials(raw) ?? initials(data) ?? String(data.id ?? "");
    const fecha = String(data.fecha ?? "").slice(0, 10);
    periodos.add(fecha.slice(0, 7));
    const base = {
      id,
      kind: "lobby",
      ...(eventKind ? { lobby_event_kind: eventKind } : {}),
      fecha: fecha || null,
      organismo: data.organismo ?? null,
      organismo_id: data.organismo_id ?? null,
      url: data.url ?? raw.evidence?.sourceUrl ?? null,
      fuente: data.fuente ?? "InfoLobby · Consejo para la Transparencia (ley 20.730)",
      subject_entity_ids: data.subject_entity_ids ?? [],
      object_entity_ids: data.object_entity_ids ?? [],
      entities: data.entities ?? [],
    };

    if (eventKind === "audience") {
      const pasivos = Array.isArray(data.sujetos_pasivos) ? data.sujetos_pasivos : [];
      const activos = (Array.isArray(data.sujetos_activos) ? data.sujetos_activos : [])
        .map((row) => String(row?.activo ?? row?.nombre ?? "").trim()).filter(Boolean);
      const materia = (Array.isArray(data.detalle) ? data.detalle[0]?.materia : null)
        ?? (typeof data.materia === "string" ? data.materia : null);
      if (pasivos.length === 0) {
        records.push({
          ...base,
          materia,
          sujetos_activos: activos.length ? activos.join(" · ") : (typeof data.sujetos_activos === "string" ? data.sujetos_activos : null),
          modalidad: data.modalidad ?? null,
          comuna: data.comuna ?? null,
          duracion_minutos: data.duracion_minutos ?? null,
        });
        continue;
      }
      for (const pasivo of pasivos) {
        const nombre = String(pasivo?.pasivo ?? "").replace(/\s+/g, " ").trim();
        if (!nombre) continue;
        records.push({
          ...base,
          id: `${id}-pasivo-${String(pasivo?.codigoPasivo ?? "").trim()}`,
          nombre,
          cargo: pasivo?.cargo ?? null,
          sujeto_pasivo_id: pasivo?.codigoPasivo ?? null,
          materia,
          sujetos_activos: activos.length ? activos.join(" · ") : null,
          modalidad: data.modalidad ?? null,
          comuna: data.comuna ?? null,
          duracion_minutos: data.duracion_minutos ?? null,
        });
        pushSujeto(pasivo?.codigoPasivo, nombre, pasivo?.cargo, "audiencias", data.organismo_id, data.organismo);
        pushOrganismo(data.organismo_id, data.organismo, "audiencias", nombre);
      }
      continue;
    }

    if (eventKind === "travel") {
      records.push({
        ...base,
        nombre: data.sujeto_pasivo ?? null,
        sujeto_pasivo_id: data.sujeto_pasivo_id ?? null,
        cargo: data.cargo ?? null,
        fecha_termino: String(data.fecha_termino ?? "").slice(0, 10) || null,
        destino: data.destino ?? null,
        descripcion: data.descripcion ?? null,
        costo_original: data.costo_original ?? null,
        financistas: data.financistas ?? null,
      });
      pushSujeto(data.sujeto_pasivo_id, data.sujeto_pasivo, data.cargo, "viajes", data.organismo_id, data.organismo);
      pushOrganismo(data.organismo_id, data.organismo, "viajes", data.sujeto_pasivo);
      continue;
    }

    if (eventKind === "gift") {
      records.push({
        ...base,
        nombre: data.sujeto_pasivo ?? null,
        sujeto_pasivo_id: data.sujeto_pasivo_id ?? null,
        cargo: data.cargo ?? null,
        descripcion: data.descripcion ?? null,
        ocasion: data.ocasion ?? null,
      });
      pushSujeto(data.sujeto_pasivo_id, data.sujeto_pasivo, data.cargo, "donativos", data.organismo_id, data.organismo);
      pushOrganismo(data.organismo_id, data.organismo, "donativos", data.sujeto_pasivo);
      continue;
    }

    records.push({
      ...base,
      materia: data.materia ?? null,
      sujetos_activos: typeof data.sujetos_activos === "string" ? data.sujetos_activos : null,
      asistentes: typeof data.asistentes === "string" ? data.asistentes : null,
    });
  }
}

records.sort((a, b) => String(a.fecha ?? "") < String(b.fecha ?? "") ? 1 : (String(a.fecha ?? "") > String(b.fecha ?? "") ? -1 : String(a.id).localeCompare(String(b.id))));

const out = {
  generatedAt,
  source: "lake:infolobby",
  count: records.length,
  periodos: [...periodos].sort(),
  records,
  sujetos: [...sujetos.values()].map((sujeto) => ({
    ...sujeto,
    organismos: [...sujeto.organismos.entries()].map(([key, name]) => ({ id: key, name })).sort((a, b) => a.name.localeCompare(b.name, "es-CL")),
  })).sort((a, b) => b.total - a.total),
  organismos: [...organismos.values()].map((organismo) => ({
    ...organismo,
    sujetos: [...organismo.sujetos.entries()].map(([key, count]) => ({ name: key, count })).sort((a, b) => b.count - a.count),
  })).sort((a, b) => b.total - a.total),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(out));
console.log(`[infolobby-v1] ${records.length} registros proyectados (${partitions.length} particiones, sujetos en ${out.sujetos.length}, organismos en ${out.organismos.length}) → ${outputPath}`);