/**
 * Reglas comunes de normalización para nóminas de funcionarios.
 *
 * La fuente original nunca se reemplaza: los cambios sólo afectan la vista
 * normalizada y dejan la incidencia junto con el valor original cuando
 * corresponde. Este módulo es compartido por los ingestores central y
 * municipal para evitar que cada ETL aplique reglas distintas.
 */

const PUNCTUATION_PREFIX = /^[.,;:/|_\-]+$/u;
const NUMERIC_PREFIX = /^\d+$/u;

export function normalizeFuncionarioName(rawValue) {
  const original = String(rawValue ?? "").replace(/\s+/g, " ").trim();
  const tokens = original ? original.split(" ") : [];
  const incidencias = [];
  let removedPunctuation = false;
  let removedNumeric = false;

  while (tokens.length > 0 && (PUNCTUATION_PREFIX.test(tokens[0]) || NUMERIC_PREFIX.test(tokens[0]))) {
    if (PUNCTUATION_PREFIX.test(tokens[0])) removedPunctuation = true;
    if (NUMERIC_PREFIX.test(tokens[0])) removedNumeric = true;
    tokens.shift();
  }

  if (removedPunctuation) incidencias.push("nombre_prefijo_invalido");
  if (removedNumeric) incidencias.push("nombre_prefijo_numerico");

  const nombre = tokens.join(" ");
  const alphaTokens = nombre
    .split(" ")
    .map((token) => token.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  if (!nombre) incidencias.push("nombre_vacio");
  else if (alphaTokens.length < 2) incidencias.push("nombre_incompleto");

  return { nombre, original, incidencias };
}

export function normalizeFuncionarioCompensation({ bruto, liquido }) {
  const gross = Number(bruto ?? 0);
  const originalLiquid = Number(liquido ?? 0);
  const liquidMissing = gross > 0 && (!Number.isFinite(originalLiquid) || originalLiquid <= 0);

  return {
    bruto: gross,
    liquido: liquidMissing ? null : originalLiquid,
    liquidoOriginal: liquidMissing ? originalLiquid : undefined,
    incidencia: liquidMissing ? "remuneracion_liquida_no_informada" : null,
  };
}

export function finalizeFuncionarioQuality(nameResult, compensation) {
  const incidencias = [...nameResult.incidencias];
  if (compensation.incidencia) incidencias.push(compensation.incidencia);

  return {
    incidencias,
    calidad_datos: {
      estado: incidencias.length > 0 ? "normalizado" : "original",
      incidencias,
      detalle: incidencias.length > 0
        ? "Se corrigió sólo formato inequívoco de la fuente; el valor líquido cero se conserva como original y se muestra como no informado."
        : "",
    },
  };
}
