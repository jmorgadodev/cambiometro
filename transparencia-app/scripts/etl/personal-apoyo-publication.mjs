const DEFAULT_MINIMUMS = { diputados: 100, filasCamara: 500, oficinasSenado: 40, filasSenado: 500 };

export function mergePersonalApoyoDeputies(previous = {}, refreshed = {}) {
  const result = { ...previous };
  for (const [id, deputy] of Object.entries(refreshed)) {
    if ((!deputy?.personal_apoyo || deputy.personal_apoyo.length === 0) && previous[id]?.personal_apoyo?.length > 0) {
      result[id] = {
        ...deputy,
        personal_apoyo: previous[id].personal_apoyo,
        mes_personal: previous[id].mes_personal ?? deputy.mes_personal,
      };
    } else {
      result[id] = deputy;
    }
  }
  return result;
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
