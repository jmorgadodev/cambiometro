import { normalizeSearchText } from "./data-source";

export interface RemuneracionCruda {
  partida: string;
  organismo: string;
  cargo: string;
  nombre: string;
  bruto_mensual: number;
}

export interface RemuneracionParlamentario {
  cargo: string;
  bruto_mensual: number;
}

interface Registro {
  mes: string;
  congreso: RemuneracionCruda[];
}

import { getKvCache } from "@/lib/db";
import dataRemuneraciones from "@/data/remuneraciones-38bis.json";

let registro: Registro | null = null;

async function leerRegistro(): Promise<Registro | null> {
  if (registro) return registro;
  registro = dataRemuneraciones as Registro;
  return registro;
}

/** Repara nombres del registro dañados por doble codificación (ej. "CLÃˆMENT" -> "CLÈMENT"). */
const MOJIBAKE: ReadonlyArray<readonly [string, string]> = [
  ["Ã‰", "É"],
  ["Ãˆ", "È"],
  ["Ã‘", "Ñ"],
  ["Ã“", "Ó"],
  ["Ãš", "Ú"],
  ["Ã¨", "è"],
  ["Ã©", "é"],
  ["Ã±", "ñ"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã¡", "á"],
  ["Ã¼", "ü"],
  ["Ã", "Á"],
];

function decodificarMojibake(nombre: string): string {
  if (!nombre.includes("Ã")) return nombre;
  let reparado = nombre;
  for (const [origen, destino] of MOJIBAKE) reparado = reparado.split(origen).join(destino);
  return reparado;
}

function tokenizar(nombre: string): string[] {
  return normalizeSearchText(decodificarMojibake(nombre))
    .split(" ")
    .filter((token) => token.length >= 3);
}

/** El registro usa nombre completo (incluye segundo nombre); el seed usa nombre corto. */
function matcheaTokens(politico: string[], registro: string[]): boolean {
  let usados = 0;
  for (const tokenP of politico) {
    const idx = registro.findIndex(
      (tokenR) =>
        tokenR === tokenP ||
        (tokenR.length >= 7 && tokenP.length >= 7 && (tokenR.startsWith(tokenP) || tokenP.startsWith(tokenR))),
    );
    if (idx < 0) return false;
    usados += 1;
  }
  return usados >= 2 && registro.length - politico.length <= 3;
}

const cache = new Map<string, RemuneracionParlamentario | null>();
const porNombre = new Map<string, RemuneracionParlamentario>();

async function indice(): Promise<Map<string, RemuneracionParlamentario>> {
  if (porNombre.size > 0) return porNombre;
  const reg = await leerRegistro();
  if (reg) {
    for (const fila of reg.congreso) {
      const clave = normalizeSearchText(fila.nombre);
      if (clave.length >= 8 && !porNombre.has(clave)) {
        porNombre.set(clave, { cargo: fila.cargo, bruto_mensual: fila.bruto_mensual });
      }
    }
  }
  return porNombre;
}

export async function remuneracionParaPolitico(nombreCompleto: string): Promise<RemuneracionParlamentario | null> {
  const clave = normalizeSearchText(nombreCompleto);
  if (clave.length < 8) return null;
  if (cache.has(clave)) return cache.get(clave) ?? null;
  const exacto = (await indice()).get(clave) ?? null;
  if (exacto) {
    cache.set(clave, exacto);
    return exacto;
  }
  const tokensPolitico = tokenizar(nombreCompleto);
  if (tokensPolitico.length >= 2) {
    const registro = await leerRegistro();
    if (registro) {
      let mejor: RemuneracionParlamentario | null = null;
      for (const fila of registro.congreso) {
        const tokensRegistro = tokenizar(fila.nombre);
        if (matcheaTokens(tokensPolitico, tokensRegistro)) {
          if (!mejor && !duplicadoAmbiguo(tokensPolitico, registro.congreso)) {
            mejor = { cargo: fila.cargo, bruto_mensual: fila.bruto_mensual };
          }
        }
      }
      if (mejor) {
        cache.set(clave, mejor);
        return mejor;
      }
    }
  }
  cache.set(clave, null);
  return null;
}

/** Evita false positives: si otro parlamentario comparte los mismos tokens, no matchear. */
function duplicadoAmbiguo(tokensPolitico: string[], filas: RemuneracionCruda[]): boolean {
  const conTokens = filas.filter((fila) => matcheaTokens(tokensPolitico, tokenizar(fila.nombre)));
  return conTokens.length > 1;
}

export async function mesRemuneraciones(): Promise<string | null> {
  return (await leerRegistro())?.mes ?? null;
}

export const FUENTE_REMUNERACIONES = {
  titulo: "Registro Público · Comisión art. 38 bis (remuneraciones de altas autoridades)",
  url: "https://comision38bis.gob.cl/registro-publico",
};