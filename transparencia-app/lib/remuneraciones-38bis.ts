import { normalizeSearchText } from "./data-source";

export interface Remuneracion38BisRecord {
  partida: string;
  organismo: string;
  cargo: string;
  nombre: string;
  bruto_mensual: number | null;
}

export interface Remuneracion38BisRelease {
  fuente: string;
  url: string;
  mes: string;
  extraido_en: string;
  filas: number;
  registros?: Remuneracion38BisRecord[];
  /** Compatibilidad con el release parlamentario anterior. */
  congreso?: Remuneracion38BisRecord[];
}

export interface Remuneracion38BisDelta {
  tipo: "entrada" | "salida_observada" | "cambio";
  clave: string;
  nombre: string;
  organismo: string;
  cargo: string;
  brutoAnterior: number | null;
  brutoActual: number | null;
}

export interface Remuneracion38BisComparison {
  estado: "linea_base" | "comparado";
  periodoAnterior: string | null;
  periodoActual: string;
  entradas: Remuneracion38BisDelta[];
  salidasObservadas: Remuneracion38BisDelta[];
  cambios: Remuneracion38BisDelta[];
}

export function getRemuneraciones38BisRows(release: Remuneracion38BisRelease): Remuneracion38BisRecord[] {
  if (Array.isArray(release.registros)) return release.registros;
  return Array.isArray(release.congreso) ? release.congreso : [];
}

export function remuneracion38BisKey(record: Remuneracion38BisRecord): string {
  return [record.nombre, record.organismo, record.cargo]
    .map((value) => normalizeSearchText(value ?? ""))
    .join("|");
}

function deltaFrom(record: Remuneracion38BisRecord, tipo: Remuneracion38BisDelta["tipo"], anterior: number | null): Remuneracion38BisDelta {
  return {
    tipo,
    clave: remuneracion38BisKey(record),
    nombre: record.nombre,
    organismo: record.organismo,
    cargo: record.cargo,
    brutoAnterior: anterior,
    brutoActual: record.bruto_mensual,
  };
}

export function compareRemuneraciones38Bis(
  previous: Remuneracion38BisRelease | null,
  current: Remuneracion38BisRelease,
): Remuneracion38BisComparison {
  const currentRows = getRemuneraciones38BisRows(current);
  if (!previous) {
    return {
      estado: "linea_base",
      periodoAnterior: null,
      periodoActual: current.mes,
      entradas: [],
      salidasObservadas: [],
      cambios: [],
    };
  }

  const previousRows = getRemuneraciones38BisRows(previous);
  const previousByKey = new Map(previousRows.map((row) => [remuneracion38BisKey(row), row]));
  const currentByKey = new Map(currentRows.map((row) => [remuneracion38BisKey(row), row]));
  const entradas: Remuneracion38BisDelta[] = [];
  const cambios: Remuneracion38BisDelta[] = [];

  for (const row of currentRows) {
    const key = remuneracion38BisKey(row);
    const old = previousByKey.get(key);
    if (!old) {
      entradas.push(deltaFrom(row, "entrada", null));
    } else if (old.bruto_mensual !== row.bruto_mensual) {
      cambios.push(deltaFrom(row, "cambio", old.bruto_mensual));
    }
  }

  const salidasObservadas: Remuneracion38BisDelta[] = [];
  for (const row of previousRows) {
    const key = remuneracion38BisKey(row);
    if (!currentByKey.has(key)) {
      salidasObservadas.push(deltaFrom(row, "salida_observada", row.bruto_mensual));
    }
  }

  return {
    estado: "comparado",
    periodoAnterior: previous.mes,
    periodoActual: current.mes,
    entradas,
    salidasObservadas,
    cambios,
  };
}

