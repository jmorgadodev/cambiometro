import { createHash } from "node:crypto";
import { parseCpltHeader, scanCpltCell } from "./cplt-personal.mjs";

const MONTHS = new Map([
  ["enero", 1], ["febrero", 2], ["marzo", 3], ["abril", 4], ["mayo", 5], ["junio", 6],
  ["julio", 7], ["agosto", 8], ["septiembre", 9], ["setiembre", 9], ["octubre", 10],
  ["noviembre", 11], ["diciembre", 12],
]);

function text(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function normalized(value) { return text(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(); }
function titleCase(value) {
  return text(value).toLowerCase().split(/\s+/).filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function numberCl(value) {
  const raw = text(value);
  if (!raw) return 0;
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  const canonical = comma > dot ? raw.replace(/\./g, "").replace(",", ".")
    : dot > comma && raw.split(".").at(-1)?.length === 3 ? raw.replace(/\./g, "") : raw.replace(/,/g, "");
  const result = Number(canonical.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(result) ? result : 0;
}
function dateCl(value) {
  const raw = text(value).slice(0, 10);
  let match = raw.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

export function parseCentralHonorarioRow({ line, headerLine, sourceUrl, maxPeriod = null }) {
  if (!line || !headerLine || !sourceUrl) throw new Error("CENTRAL_HONORARIO_INPUT_INVALID");
  const header = headerLine instanceof Map ? headerLine : parseCpltHeader(headerLine);
  const read = (...names) => scanCpltCell(line, header, ...names);
  const year = Number(read("anyo", "año"));
  const month = MONTHS.get(normalized(read("mes"))) ?? Number(read("mes"));
  const organism = text(read("organismo_nombre", "organismo nombre"));
  const organismCode = text(read("organismo_codigo"));
  const rawName = [read("nombres"), read("paterno"), read("materno")].map(text).filter(Boolean).join(" ");
  const rawRole = text(read("descripcion_funcion", "tipo cargo", "tipo_cargo"));
  const gross = numberCl(read("remuneracionbruta_mensual", "remuneracionbruta"));
  const liquidOriginal = numberCl(read("remuliquida_mensual"));
  if (!Number.isInteger(year) || year < 2024 || !month || !organism || !rawName || !rawRole) return null;
  if (gross <= 0 && liquidOriginal <= 0) return null;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  if (maxPeriod && period > String(maxPeriod)) return null;
  const name = titleCase(rawName);
  const role = titleCase(rawRole);
  const sourceKey = [read("idPagina"), organismCode, period, normalized(rawName), normalized(rawRole), gross, liquidOriginal].join("|");
  const id = `func-central-honorarios-${createHash("sha256").update(sourceKey).digest("hex").slice(0, 16)}`;
  const officialLink = text(read("enlace"));
  return {
    id, nombre_completo: name, nombre_completo_original: rawName, organo_nombre: organism,
    organo_codigo: organismCode || null, organo_tipo: "servicio_publico", cargo: role,
    tipo_contrato: "Honorarios", source_scope: "organismos_centrales",
    remuneracion_bruta_mensual: gross, remuneracion_liquida_mensual: liquidOriginal > 0 ? liquidOriginal : null,
    remuneracion_liquida_mensual_original: liquidOriginal, tipo_pago: text(read("tipo_pago")) || null,
    num_cuotas: numberCl(read("num_cuotas")) || null, fecha_publicacion: dateCl(read("fecha_publicacion")),
    fecha_ingreso: dateCl(read("fecha_ingreso")), fecha_termino: dateCl(read("fecha_termino")),
    funcion: rawRole, formacion: text(read("tipo_calificacionp")) || null, region: text(read("region")) || null,
    unidad_monetaria: text(read("tipo unidad monetaria")) || null, observaciones: text(read("observaciones")) || null,
    fuente: sourceUrl, url: /^https?:\/\//i.test(officialLink) ? officialLink : sourceUrl, fuente_periodo: period,
  };
}
