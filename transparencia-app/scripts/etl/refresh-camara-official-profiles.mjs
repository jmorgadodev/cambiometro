import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  appendCamaraRequestHeaders,
  CAMARA_TRANSPARENCY_TIMEOUT_SECONDS,
  parseCamaraDeputyProfile,
} from "./camara-request-headers.mjs";
import { mergeCamaraOfficialProfiles } from "./personal-apoyo-publication.mjs";

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data/personal-apoyo.json");
const SNAPSHOT_PATH = path.join(ROOT, "data/camara-perfiles-oficiales-verificados.json");
const SOURCE_TEMPLATE = "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}";
const CURL = process.platform === "win32" ? "curl.exe" : "curl";
const DEFAULT_PROFILE_BATCH_SIZE = 5;
const MAX_PROFILE_BATCH_SIZE = 10;
const PROFILE_FIELDS = [
  "comunas_distrito", "numero_distrito", "region", "periodo", "periodos",
  "partido", "bancada", "sitio_web", "telefono", "email", "redes", "enlaces_publicos",
];

function requestProfile(id) {
  const args = ["-s", "--compressed", "--max-time", String(CAMARA_TRANSPARENCY_TIMEOUT_SECONDS)];
  appendCamaraRequestHeaders(args);
  const url = SOURCE_TEMPLATE.replace("{id}", encodeURIComponent(id));
  args.push(url);
  const body = execFileSync(CURL, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (/Attention Required!\s*\|\s*Cloudflare|Sorry, you have been blocked|Object moved/i.test(body)) {
    throw new Error("CAMARA_PROFILE_SOURCE_UNAVAILABLE");
  }
  return parseCamaraDeputyProfile(body);
}

function hasProfileEvidence(profile) {
  return Boolean(profile?.comunas_distrito || profile?.region || profile?.numero_distrito
    || profile?.email || profile?.telefono || profile?.sitio_web
    || Object.values(profile?.redes ?? {}).some(Boolean)
    || profile?.periodos?.length);
}

function mergeProfile(previous = {}, current, verifiedAt) {
  const merged = { ...previous };
  for (const field of PROFILE_FIELDS) {
    const value = current[field];
    const present = Array.isArray(value) ? value.length > 0 : value && typeof value === "object" ? Object.keys(value).length > 0 : value !== null && value !== undefined && value !== "";
    if (!present) continue;
    if (field === "redes") merged.redes = { ...(previous.redes ?? {}), ...value };
    else if (field === "enlaces_publicos") {
      const links = new Map([...(previous.enlaces_publicos ?? []), ...value].map((link) => [link.url, link]));
      merged.enlaces_publicos = [...links.values()];
    } else merged[field] = value;
  }
  merged.verified_at = verifiedAt;
  return merged;
}

function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 1)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function selectCamaraProfileBatch(profileIds, { offset = 0, limit = DEFAULT_PROFILE_BATCH_SIZE } = {}) {
  if (!Array.isArray(profileIds) || profileIds.length === 0) throw new Error("CAMARA_PROFILE_IDS_EMPTY");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= profileIds.length) {
    throw new Error("CAMARA_PROFILE_BATCH_OFFSET_INVALID");
  }
  if (limit !== null && (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PROFILE_BATCH_SIZE)) {
    throw new Error("CAMARA_PROFILE_BATCH_LIMIT_INVALID");
  }
  return profileIds.slice(offset, limit === null ? undefined : offset + limit);
}

export async function refreshCamaraOfficialProfiles({ offset = 0, limit = DEFAULT_PROFILE_BATCH_SIZE } = {}) {
  const dataset = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
  const allIds = Object.keys(dataset.diputados ?? {}).sort((a, b) => Number(a) - Number(b));
  const ids = selectCamaraProfileBatch(allIds, { offset, limit });
  const profiles = { ...(snapshot.profiles ?? {}) };
  const failures = [];
  let refreshed = 0;

  console.log(`Lote acotado de perfiles Cámara: ${offset + 1}-${offset + ids.length} de ${allIds.length}.`);

  for (const [index, id] of ids.entries()) {
    let profile = null;
    for (let attempt = 0; attempt < 2 && !profile; attempt += 1) {
      try {
        const candidate = requestProfile(id);
        if (!hasProfileEvidence(candidate)) throw new Error("CAMARA_PROFILE_FIELDS_MISSING");
        profile = mergeProfile(profiles[id], candidate, new Date().toISOString().slice(0, 10));
      } catch (error) {
        if (attempt === 1) failures.push({ id, reason: String(error?.message ?? error).slice(0, 120) });
        else await pause(1000);
      }
    }
    if (profile) {
      profiles[id] = profile;
      refreshed += 1;
    }
    process.stdout.write(`[${index + 1}/${ids.length}] id=${id} ${profile ? "perfil actualizado" : "se conserva el anterior"}\n`);
    await pause(250);
  }

  if (!refreshed) throw new Error("CAMARA_PROFILE_REFRESH_NO_VERIFIED_PROFILES");
  const checkedAt = new Date().toISOString();
  const nextSnapshot = {
    ...snapshot,
    source: SOURCE_TEMPLATE,
    retrievedAt: checkedAt,
    scope: "Perfiles oficiales enlazados por ID de Cámara; sólo campos publicados en cada ficha.",
    profiles,
    refresh: {
      checkedAt,
      attempted: ids.length,
      totalProfiles: allIds.length,
      offset,
      nextOffset: offset + ids.length < allIds.length ? offset + ids.length : null,
      refreshed,
      retainedAfterFailure: failures.length,
      failures,
    },
  };
  const nextDataset = mergeCamaraOfficialProfiles(dataset, profiles, SOURCE_TEMPLATE, checkedAt);
  nextDataset.generado_en = checkedAt;
  nextDataset.fuentes = {
    ...(nextDataset.fuentes ?? {}),
    camara_perfiles_oficiales: {
      url: SOURCE_TEMPLATE,
      nota: `Ficha oficial por ID: comunas, distrito, región, períodos, partido, bancada, contacto y enlaces publicados. Corte verificado ${checkedAt.slice(0, 10)}; respuestas fallidas conservaron el dato anterior.`,
    },
  };

  writeJsonAtomically(SNAPSHOT_PATH, nextSnapshot);
  writeJsonAtomically(DATA_PATH, nextDataset);
  console.log(JSON.stringify({ attempted: ids.length, refreshed, retainedAfterFailure: failures.length, generatedAt: checkedAt }));
  return { attempted: ids.length, refreshed, retainedAfterFailure: failures.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const value = args.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new Error(`CAMARA_PROFILE_${name.toUpperCase()}_INVALID`);
    return Number(value);
  };
  const all = args.includes("--all");
  if (all && args.some((argument) => argument.startsWith("--limit="))) {
    throw new Error("CAMARA_PROFILE_ALL_AND_LIMIT_CONFLICT");
  }
  refreshCamaraOfficialProfiles({
    offset: option("offset", 0),
    limit: all ? null : option("limit", DEFAULT_PROFILE_BATCH_SIZE),
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
