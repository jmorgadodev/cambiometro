import fs from "fs";
import path from "path";

export interface SinimIndicador {
  code: string;
  label: string;
  kind: string;
  value: number | null;
  monto_clp: number | null;
  unit: string | null;
  period: string | null;
  url: string | null;
}

export interface SinimMunicipio {
  id: string;
  code: string;
  name: string;
  indicators: SinimIndicador[];
}

export interface SinimProyeccion {
  generatedAt: string;
  source: string;
  period: string;
  total: number;
  municipios: SinimMunicipio[];
}

let cached: SinimProyeccion | null = null;

/**
 * Proyección v1 de indicadores municipales SINIM (generada por
 * scripts/build-sinim-v1.mjs desde las particiones del lake). Cobertura completa:
 * 345 municipalidades de Chile (una por comuna con municipio), 9 indicadores
 * financieros (presupuesto inicial/vigente, ingresos, gastos, FCM, transferencias,
 * gastos en personal) y de personal (funcionarios). Alimenta el panel SINIM en la
 * ficha de municipalidad. Carga con fs + cache.
 */
export function leerSinimV1(): SinimProyeccion | null {
  if (cached) return cached;
  try {
    const file = path.join(process.cwd(), "data", "lake", "projections", "v1", "sinim.json");
    cached = JSON.parse(fs.readFileSync(file, "utf8")) as SinimProyeccion;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function sinimParaMunicipio(municipioId: string): SinimMunicipio | null {
  return leerSinimV1()?.municipios.find((mun) => mun.id === municipioId) ?? null;
}

/** Normaliza texto para comparar nombres de comunas eliminando tildes, puntuación y convirtiendo a mayúsculas. */
function normalizarNombre(nombre: string): string {
  return nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca el municipio SINIM cuyo nombre normalizado coincida con el nombre de
 * una comuna de MUNICIPALIDADES_SEED. Permite el join sin mantener un mapa manual
 * de códigos INE.
 */
export function sinimParaComuna(nombreComuna: string): SinimMunicipio | null {
  const municipios = leerSinimV1()?.municipios;
  if (!municipios) return null;
  const target = normalizarNombre(nombreComuna);
  // Coincidencia exacta primero
  const exact = municipios.find((m) => normalizarNombre(m.name) === target);
  if (exact) return exact;
  // Coincidencia por prefijo (ej: "MAIPU" vs "MAIPÚ")
  return municipios.find((m) => {
    const n = normalizarNombre(m.name);
    return n.startsWith(target) || target.startsWith(n);
  }) ?? null;
}