/**
 * politicos.ts — Rama Políticos (diputados + senadores 2026-2030).
 * Datos reales desde ./politicos-source.ts (opendata.camara.cl, Wikipedia, bcn.cl).
 * Solo se exponen campos con fuente: nombre, cargo, partido, distrito, nacimiento, votos,
 * militancias y profesión cuando la fuente la provee. Los RUT no son publicados por las
 * fuentes oficiales → no se incluyen ni se muestran. Formación sin fuente → se omite (nada inventado).
 */

import { POLITICOS_SEED as POLITICOS_REALES } from './politicos-source';
import FOTOS_POLITICOS from '../data/politicos-fotos.json';
import { PARTIDOS_SEED, logoParaPartido, PARTIDO_FALLBACK } from './partidos';

export interface Politico {
  id: string;
  nombre_completo: string;
  cargo: 'Diputado' | 'Senador';
  partido_id: string;
  distrito_region: string;
  numero_distrito?: number;
  foto_url?: string;
  twitter_handle?: string;
  fecha_nacimiento?: string;
  lugar_nacimiento?: string;
  profesion?: string;
  estudios?: string[];
  votos_2025?: number;
  porcentaje_votos?: number;
  coalicion?: string;
  partido_electoral?: string;
  circunscripcion?: number;
  militancias?: {
    desde?: string;
    hasta?: string;
    partido_id: string;
    partido_nombre: string;
    nota?: string;
  }[];
  fuente?: string;
}

// Fotos reales desde Wikipedia (retratos subidos por el propio Congreso Nacional y CC), con
// validación estricta de identidad (apellidos + descripción chilena) en scripts/fetch-fotos-politicos.mjs.
// Los id sin foto confiable quedan fuera del mapa → la app usa el avatar del partido (nada inventado).
const fotosPorId: Record<string, string> = FOTOS_POLITICOS as Record<string, string>;

export const POLITICOS_SEED: Politico[] = POLITICOS_REALES.map((politico) => {
  // Solo formación real (profesión con fuente bcn.cl / Wikipedia); sin estudios inventados.
  const estudios = politico.profesion ? [politico.profesion] : undefined;
  return {
    ...politico,
    estudios,
    foto_url: politico.foto_url ?? fotosPorId[politico.id] ?? avatarParaPolitico(politico),
  };
});

// Avatar determinista para cada parlamentario: usa el emblema del partido (escudo) en vez
// de iniciales del nombre, para que todas las vistas muestren la identidad del partido.
// Las fuentes oficiales (opendata.camara.cl) no exponen fotos por API; el emblema local
// es estable y se reemplaza por foto real cuando la fuentel la provea.
function avatarParaPolitico(pol: Politico): string {
  const partido = PARTIDOS_SEED.find((p) => p.id === pol.partido_id);
  return partido?.logo_url ?? logoParaPartido({ ...PARTIDO_FALLBACK });
}
