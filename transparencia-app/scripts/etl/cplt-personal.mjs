import { createHash } from "node:crypto";

const MONTHS = new Map([
  ["enero", 1], ["febrero", 2], ["marzo", 3], ["abril", 4], ["mayo", 5], ["junio", 6],
  ["julio", 7], ["agosto", 8], ["septiembre", 9], ["setiembre", 9], ["octubre", 10],
  ["noviembre", 11], ["diciembre", 12],
]);

function normalized(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function numberCl(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  const canonical = comma > dot
    ? text.replace(/\./g, "").replace(",", ".")
    : dot > comma && text.split(".").at(-1)?.length === 3
      ? text.replace(/\./g, "")
      : text.replace(/,/g, "");
  const parsed = Number(canonical.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateCl(value) {
  const text = String(value ?? "").trim().slice(0, 10);
  let match = text.match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function monthNumber(value) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) return parsed;
  return MONTHS.get(normalized(value)) ?? 0;
}

export function parseCpltHeader(line) {
  const indexes = new Map();
  String(line).split(";").forEach((name, index) => indexes.set(normalized(name), index));
  return indexes;
}

function cell(columns, header, ...names) {
  for (const name of names) {
    const index = header.get(normalized(name));
    if (index !== undefined) return String(columns[index] ?? "").trim();
  }
  return "";
}

export function getCpltCell(line, header, ...names) {
  return cell(String(line).split(";"), header, ...names);
}

export function parseCpltColumns(line) {
  return String(line).split(";");
}

export function getCpltColumn(columns, header, ...names) {
  return cell(columns, header, ...names);
}

export function parseCpltIdentity({ line, columns: inputColumns = null, header, tipo, organismoId }) {
  const columns = inputColumns ?? String(line).split(";");
  const year = Number(cell(columns, header, "anyo", "año"));
  const month = monthNumber(cell(columns, header, "mes"));
  if (!Number.isInteger(year) || year < 2024 || month === 0) return null;
  const rawName = [cell(columns, header, "nombres"), cell(columns, header, "paterno"), cell(columns, header, "materno")].filter(Boolean).join(" ");
  const rawCargo = cell(columns, header, "tipo cargo", "descripcion_funcion", "descripcion funcion");
  if (!rawName || !rawCargo) return null;
  return {
    stableKey: [organismoId, normalized(tipo), normalized(rawName).replace(/\s+/g, " "), normalized(rawCargo).replace(/\s+/g, " ")].join("|"),
    period: `${year}-${String(month).padStart(2, "0")}`,
  };
}

export function createCpltRecordId(stableKey) {
  const suffix = createHash("sha256").update(stableKey).digest("hex").slice(0, 16);
  const [organismoId, tipo] = stableKey.split("|", 2);
  return `func-${organismoId}-${tipo}-${suffix}`;
}

export function parseCpltRecord({ line, columns: inputColumns = null, header, tipo, organismoId, sourceUrl, deferId = false }) {
  if (!(header instanceof Map) || !organismoId || !sourceUrl) throw new Error("CPLT_INVALID_PARSER_INPUT");
  const columns = inputColumns ?? String(line).split(";");
  const identity = parseCpltIdentity({ columns, header, tipo, organismoId });
  if (!identity) return null;

  const nombre = titleCase([
    cell(columns, header, "nombres"),
    cell(columns, header, "paterno"),
    cell(columns, header, "materno"),
  ].filter(Boolean).join(" "));
  const cargo = titleCase(cell(columns, header, "tipo cargo", "descripcion_funcion", "descripcion funcion"));
  if (!nombre || !cargo) return null;

  const stableKey = identity.stableKey;
  const officialLink = cell(columns, header, "enlace");
  const recordUrl = /^https:\/\//i.test(officialLink) ? officialLink : sourceUrl;
  const extraDay = numberCl(cell(columns, header, "horas extra diurnas"));
  const extraNight = numberCl(cell(columns, header, "horas extra nocturnas"));
  const extraHoliday = numberCl(cell(columns, header, "horas extra festivas"));

  return {
    id: deferId ? "" : createCpltRecordId(stableKey),
    ...(deferId ? { _stableKey: stableKey } : {}),
    nombre_completo: nombre,
    organo_nombre: cell(columns, header, "organismo_nombre", "organismo nombre"),
    organo_tipo: organismoId.startsWith("muni-") ? "municipalidad" : "servicio_publico",
    cargo,
    estamento: titleCase(cell(columns, header, "tipo estamento")) || tipo,
    tipo_contrato: tipo,
    remuneracion_bruta_mensual: numberCl(cell(columns, header, "remuneracionbruta_mensual", "remuneracionbruta")),
    remuneracion_liquida_mensual: numberCl(cell(columns, header, "remuliquida_mensual")),
    fecha_ingreso: dateCl(cell(columns, header, "fecha_ingreso")),
    fecha_termino: dateCl(cell(columns, header, "fecha_termino")),
    horas_extras_diurnas_hrs: extraDay,
    horas_extras_nocturnas_hrs: extraNight,
    horas_extras_festivas_hrs: extraHoliday,
    horas_extras_mes_anterior: extraDay + extraNight + extraHoliday,
    monto_horas_extras_clp: numberCl(cell(columns, header, "pago extra diurnas"))
      + numberCl(cell(columns, header, "pago extra nocturnas"))
      + numberCl(cell(columns, header, "pago extra festivas")),
    grado_eus: cell(columns, header, "grado_eus"),
    formacion: titleCase(cell(columns, header, "tipo_calificacionp")),
    region: cell(columns, header, "region"),
    asignaciones_especiales_clp: 0,
    rem_adicionales_clp: numberCl(cell(columns, header, "remu_adicional")),
    bonos_incentivos_clp: numberCl(cell(columns, header, "remu_bonoin")),
    derecho_horas_extras: normalized(cell(columns, header, "horasextra")) === "si",
    viaticos_clp: numberCl(cell(columns, header, "viaticos")),
    observaciones: cell(columns, header, "observaciones"),
    fuente: sourceUrl,
    url: recordUrl,
    fuente_periodo: identity.period,
  };
}
