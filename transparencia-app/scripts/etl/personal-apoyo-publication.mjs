import { createHash } from "node:crypto";

const DEFAULT_MINIMUMS = { diputados: 100, filasCamara: 500, oficinasSenado: 40, filasSenado: 500 };
const SPANISH_MONTHS = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };

function transparencyPeriodKey(period) {
  const normalized = String(period ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const match = normalized.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/);
  return match ? `${match[2]}-${SPANISH_MONTHS[match[1]]}` : normalized;
}

// La fecha de extracción y el orden no son nuevos pagos. Conserva duplicados,
// valores nulos/cero y todos los campos originales en la huella de contenido.
export function personalApoyoContentChecksum(dataset) {
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
  }
  const content = { ...dataset };
  delete content.generado_en;
  if (content.asignacion_senado_2026) {
    // El HTML puede variar por sesión sin cambiar la regla extraída. No tocar
    // checksums de transferencias acreditadas ni el dataset/evidencia original.
    content.asignacion_senado_2026 = { ...content.asignacion_senado_2026 };
    delete content.asignacion_senado_2026.retrieved_at;
    delete content.asignacion_senado_2026.checksum_sha256;
  }
  return createHash("sha256").update(JSON.stringify(canonical(content))).digest("hex");
}

export function shouldPublishPersonalApoyoCandidate(current, candidate, minimums = DEFAULT_MINIMUMS) {
  validatePersonalApoyoDataset(current, minimums);
  validatePersonalApoyoDataset(candidate, minimums);
  return personalApoyoContentChecksum(current) !== personalApoyoContentChecksum(candidate);
}

export function shouldRefreshPersonalApoyoPages({ contentChanged, staticChanged, pending }) {
  return Boolean(contentChanged || staticChanged || pending);
}

export function personalApoyoDatasetForStaticRelease(current, candidate, contentChanged) {
  return contentChanged ? candidate : current;
}

export function shouldReconcilePersonalApoyoStaticRelease({ contentChanged, pending }) {
  return Boolean(contentChanged || !pending);
}

export function parsePersonalApoyoStaticPublicationResult(output) {
  const match = String(output).match(/\{\s*"action"\s*:\s*"(?:published|unchanged)"[\s\S]*?\n\}/);
  if (!match) throw new Error("PERSONAL_APOYO_STATIC_PUBLICATION_RESULT_INVALID");
  return JSON.parse(match[0]);
}

export function shouldRefreshPersonalApoyo(jobs) {
  const steps = jobs.flatMap((job) => job.steps ?? []).filter((step) => step.name === "Publicar entrada estática validada para Pages");
  if (steps.length !== 1 || !["success", "skipped"].includes(steps[0].conclusion)) throw new Error("PERSONAL_APOYO_PUBLICATION_RESULT_INVALID");
  return steps[0].conclusion === "success";
}

export function mergePersonalApoyoDeputies(previous = {}, refreshed = {}) {
  const result = { ...previous };
  for (const [id, deputy] of Object.entries(refreshed)) {
    const prior = previous[id];
    const next = { ...deputy };
    if ((!deputy?.personal_apoyo || deputy.personal_apoyo.length === 0) && prior?.personal_apoyo?.length > 0) {
      next.personal_apoyo = prior.personal_apoyo;
      next.mes_personal = prior.mes_personal ?? deputy.mes_personal;
    }
    // Una respuesta bloqueada o una página cuyo markup cambió no puede borrar
    // la identidad oficial ya publicada del diputado.
    if (!deputy?.ficha?.region && prior?.ficha?.region) next.ficha = prior.ficha;
    if (prior?.transparencia_camara) {
      const currentCategories = deputy?.transparencia_camara ?? {};
      const mergedCategories = { ...prior.transparencia_camara };
      for (const [category, current] of Object.entries(currentCategories)) {
        if (["available", "empty_confirmed"].includes(current?.status)) {
          const previousCategory = prior.transparencia_camara[category];
          if (current.period || current.periods?.length) {
            const priorPeriods = previousCategory?.periods?.length
              ? previousCategory.periods
              : previousCategory?.period
                ? [{
                    period: previousCategory.period,
                    status: previousCategory.status,
                    rows: previousCategory.rows ?? [],
                    retrieved_at: previousCategory.retrieved_at,
                  }]
                : [];
            const currentPeriods = current.periods?.length
              ? current.periods
              : [{ period: current.period, status: current.status, rows: current.rows ?? [], retrieved_at: current.retrieved_at }];
            const byPeriod = new Map(priorPeriods.map((period) => [period.period, period]));
            for (const period of currentPeriods) byPeriod.set(period.period, period);
            const periods = [...byPeriod.values()];
            periods.sort((left, right) => transparencyPeriodKey(left.period).localeCompare(transparencyPeriodKey(right.period)));
            mergedCategories[category] = { ...current, periods };
          } else {
            mergedCategories[category] = current;
          }
        }
      }
      next.transparencia_camara = mergedCategories;
    }
    result[id] = next;
  }
  return result;
}

export function assertUsableOfficialHtml(body, source = "official") {
  const text = String(body ?? "");
  const blocked = [
    /Attention Required!\s*\|\s*Cloudflare/i,
    /Please enable cookies/i,
    /Sorry, you have been blocked/i,
    /Why have I been blocked\?/i,
    /<title>\s*Just a moment\.\.\./i,
    /__cf_chl|cf-chl-widget|challenge-platform/i,
  ].some((pattern) => pattern.test(text));
  if (blocked) throw new Error(`PERSONAL_APOYO_SOURCE_BLOCKED: ${source}`);
  if (text.trim().length < 256) throw new Error(`PERSONAL_APOYO_SOURCE_EMPTY: ${source}`);
  return text;
}

export function validatePersonalApoyoDataset(dataset, minimums = DEFAULT_MINIMUMS) {
  if (!dataset || typeof dataset !== "object") throw new Error("PERSONAL_APOYO_INVALID");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(String(dataset.generado_en ?? ""))) {
    throw new Error("PERSONAL_APOYO_INVALID_GENERATED_AT");
  }
  const diputados = Object.values(dataset.diputados ?? {});
  const senadores = Object.values(dataset.senadores ?? {});
  const filasCamara = diputados.reduce((total, row) => total + (Array.isArray(row?.personal_apoyo) ? row.personal_apoyo.length : 0), 0);
  const filasSenado = senadores.reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
  if (filasCamara + filasSenado === 0) throw new Error("PERSONAL_APOYO_EMPTY");
  const counts = { diputados: diputados.length, filasCamara, oficinasSenado: senadores.length, filasSenado };
  for (const [key, minimum] of Object.entries(minimums)) {
    if (counts[key] < minimum) throw new Error(`PERSONAL_APOYO_COUNT_BELOW_MINIMUM: ${key}=${counts[key]} < ${minimum}`);
  }
  const serialized = JSON.stringify(dataset);
  if (/"(?:rut|run|domicilio|direccion_particular)"\s*:/i.test(serialized)) {
    throw new Error("PERSONAL_APOYO_PRIVATE_FIELD");
  }
  return {
    ...counts,
    recordCount: filasCamara + filasSenado,
  };
}

export function splitPersonalApoyoJson(json, chunkSize = 80_000) {
  if (typeof json !== "string" || json.length === 0) throw new Error("PERSONAL_APOYO_EMPTY_JSON");
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) throw new Error("PERSONAL_APOYO_INVALID_CHUNK_SIZE");
  const chunks = [];
  for (let offset = 0; offset < json.length; offset += chunkSize) chunks.push(json.slice(offset, offset + chunkSize));
  return chunks;
}
