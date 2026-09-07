/**
 * Normalización de presentación para nóminas de funcionarios.
 *
 * La fuente oficial permanece intacta. Estas reglas sólo corrigen errores de
 * formato inequívocos para lectura y dejan una marca de trazabilidad en cada
 * fila afectada. No se infieren nombres, apellidos ni remuneraciones.
 */

export type FuncionarioDataIssue =
  | "nombre_prefijo_invalido"
  | "nombre_prefijo_numerico"
  | "nombre_incompleto"
  | "nombre_vacio"
  | "remuneracion_liquida_no_informada";

export interface FuncionarioDataQuality {
  estado: "original" | "normalizado";
  incidencias: FuncionarioDataIssue[];
  detalle: string;
}

export type FuncionarioQualityFilter = "Todos" | "corregidos" | "observados";

const FORMAT_ISSUES = new Set<FuncionarioDataIssue>([
  "nombre_prefijo_invalido",
  "nombre_prefijo_numerico",
  "nombre_incompleto",
  "nombre_vacio",
]);

export function matchesFuncionarioQuality(record: { calidad_datos?: FuncionarioDataQuality }, filter: FuncionarioQualityFilter) {
  if (filter === "Todos") return true;
  const issues = record.calidad_datos?.incidencias ?? [];
  if (filter === "corregidos") return issues.some((issue) => FORMAT_ISSUES.has(issue));
  return issues.some((issue) => !FORMAT_ISSUES.has(issue));
}

type PublicRecord = Record<string, unknown>;

function cleanWhitespace(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isPunctuationPrefix(token: string) {
  return /^[.,;:/|_\-]+$/u.test(token);
}

function isNumericPrefix(token: string) {
  return /^\d+$/u.test(token);
}

function countNameTokens(value: string) {
  return value
    .split(" ")
    .map((token) => token.replace(/[^\p{L}]/gu, ""))
    .filter((token) => token.length > 0).length;
}

function issueDetail(issues: FuncionarioDataIssue[]) {
  const messages: Record<FuncionarioDataIssue, string> = {
    nombre_prefijo_invalido: "Se retiró un signo aislado al inicio del nombre.",
    nombre_prefijo_numerico: "Se retiró un número aislado al inicio del nombre.",
    nombre_incompleto: "La fuente no entrega suficientes palabras para identificar el nombre completo.",
    nombre_vacio: "La fuente no entregó un nombre legible.",
    remuneracion_liquida_no_informada: "La fuente informó 0 o vacío para el líquido; se muestra como no informado y se conserva el valor original.",
  };
  return issues.map((issue) => messages[issue]).join(" ");
}

export function normalizeFuncionarioRecord<T extends object>(record: T): T & {
  nombre_completo: string;
  nombre_completo_original?: string;
  remuneracion_liquida_mensual?: number | null;
  remuneracion_liquida_mensual_original?: number | null;
  calidad_datos: FuncionarioDataQuality;
} {
  const source = record as PublicRecord;
  const originalName = cleanWhitespace(source.nombre_completo);
  const tokens = originalName ? originalName.split(" ") : [];
  const issues: FuncionarioDataIssue[] = [];
  let removedPunctuation = false;
  let removedNumeric = false;

  while (tokens.length > 0 && (isPunctuationPrefix(tokens[0]) || isNumericPrefix(tokens[0]))) {
    if (isPunctuationPrefix(tokens[0])) removedPunctuation = true;
    if (isNumericPrefix(tokens[0])) removedNumeric = true;
    tokens.shift();
  }

  if (removedPunctuation) issues.push("nombre_prefijo_invalido");
  if (removedNumeric) issues.push("nombre_prefijo_numerico");

  const nombreCompleto = tokens.join(" ");
  if (!nombreCompleto) issues.push("nombre_vacio");
  else if (countNameTokens(nombreCompleto) < 2) issues.push("nombre_incompleto");

  const bruto = Number(source.remuneracion_bruta_mensual ?? 0);
  const liquidValue = source.remuneracion_liquida_mensual;
  const existingOriginalLiquid = source.remuneracion_liquida_mensual_original;
  const hasLiquidValue = liquidValue !== undefined && liquidValue !== null && String(liquidValue).trim() !== "";
  const numericLiquid = hasLiquidValue ? Number(liquidValue) : null;
  const liquidNumber = Number(numericLiquid ?? 0);
  const liquidMissing = bruto > 0 && (!hasLiquidValue || !Number.isFinite(liquidNumber) || liquidNumber <= 0);
  if (liquidMissing) issues.push("remuneracion_liquida_no_informada");

  const normalizedRecord = {
    ...record,
    nombre_completo: nombreCompleto,
    ...(nombreCompleto !== originalName ? { nombre_completo_original: originalName } : {}),
    ...(liquidMissing ? {
      remuneracion_liquida_mensual: null,
      remuneracion_liquida_mensual_original: hasLiquidValue && numericLiquid !== null
        ? numericLiquid
        : existingOriginalLiquid == null ? liquidValue : Number(existingOriginalLiquid),
    } : {}),
    calidad_datos: {
      estado: issues.length > 0 ? "normalizado" : "original",
      incidencias: issues,
      detalle: issueDetail(issues),
    },
  } as T & {
    nombre_completo: string;
    nombre_completo_original?: string;
    remuneracion_liquida_mensual?: number | null;
    remuneracion_liquida_mensual_original?: number | null;
    calidad_datos: FuncionarioDataQuality;
  };

  return normalizedRecord;
}
