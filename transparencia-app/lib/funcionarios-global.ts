import 'server-only';
import fs from 'fs';
import path from 'path';
import { FuncionarioPublico } from './funcionarios';


// URL base de GitHub Releases para los datos de CPLT
// El tag se actualiza mensualmente por el workflow etl.yml
const CPLT_RELEASES_BASE = 'https://github.com/jmorgadodev/transparencia.impulsacv.cl/releases/latest/download';
const FUNCIONARIOS_REMOTE_URL = `${CPLT_RELEASES_BASE}/funcionarios_nacional.json`;

// Caché en memoria para no repetir la descarga en cada request
let globalFuncionariosCache: FuncionarioPublico[] | null = null;

import { getFallbackFuncionarios } from './funcionarios-fallback';

/**
 * Carga todos los funcionarios.
 * - En desarrollo local: lee de data/raw/transparencia_activa/ si existe.
 * - En producción (Cloudflare/Vercel): usa getFallbackFuncionarios() o descarga desde GitHub Releases.
 * Utiliza caché en memoria para ser instantáneo tras la primera carga.
 */
export function getGlobalFuncionarios(): FuncionarioPublico[] {
  if (globalFuncionariosCache) {
    return globalFuncionariosCache;
  }

  // En producción (o build), evitar tracear cientos de MB de JSONs raw
  if (process.env.NODE_ENV === "production") {
    globalFuncionariosCache = getFallbackFuncionarios("Todos");
    return globalFuncionariosCache;
  }

  // Intentar carga local en desarrollo (dev o post-ETL local)
  try {
    const rawFolder = ['data', 'raw', 'transparencia_activa'];
    const dir = path.join(process.cwd(), ...rawFolder);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const mapDeduplicado = new Map<string, FuncionarioPublico>();

      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('organismos_adicionales')) {
          const filePath = path.join(dir, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(data) as FuncionarioPublico[];
          for (let i = 0; i < parsed.length; i++) {
            const f = parsed[i];
            const key = `${f.nombre_completo}|${f.organo_nombre}|${f.tipo_contrato}`;
            mapDeduplicado.set(key, f);
          }
        }
      }

      if (mapDeduplicado.size > 0) {
        const all = Array.from(mapDeduplicado.values());
        all.sort((a, b) => b.remuneracion_bruta_mensual - a.remuneracion_bruta_mensual);
        globalFuncionariosCache = all;
        return all;
      }
    }
  } catch {
    // Fallback silencioso
  }

  globalFuncionariosCache = getFallbackFuncionarios("Todos");
  return globalFuncionariosCache;
}

// Categorías extraídas individualmente por el ETL
const CATEGORIES = ['planta', 'contrata', 'honorarios', 'codigotrabajo'];

/**
 * Versión async que descarga desde GitHub Releases si no hay datos locales.
 * Usar en API Routes de Next.js (app/api/*).
 */
export async function getGlobalFuncionariosAsync(): Promise<FuncionarioPublico[]> {
  if (globalFuncionariosCache && globalFuncionariosCache.length > 0) {
    return globalFuncionariosCache;
  }

  // Intentar local primero
  const local = getGlobalFuncionarios();
  if (local.length > 0) return local;

  // Descargar desde GitHub Releases en paralelo
  try {
    const fetchPromises = CATEGORIES.map(cat => {
      const url = `${CPLT_RELEASES_BASE}/funcionarios_${cat}.json`;
      console.log(`[API] Descargando ${url}...`);
      return fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 }
      }).then(async r => {
        if (!r.ok) {
          console.warn(`[WARN] Categoría remota ${cat} no disponible (${r.status})`);
          return [];
        }
        return r.json() as Promise<FuncionarioPublico[]>;
      }).catch(e => {
        console.warn(`[WARN] Falló descarga de ${cat}:`, e);
        return [];
      });
    });

    const results = await Promise.all(fetchPromises);
    const mapDeduplicado = new Map<string, FuncionarioPublico>();
    
    for (const arr of results) {
      for (const f of arr) {
        const key = `${f.nombre_completo}|${f.organo_nombre}|${f.tipo_contrato}`;
        mapDeduplicado.set(key, f);
      }
    }
    
    const all = Array.from(mapDeduplicado.values());
    all.sort((a, b) => b.remuneracion_bruta_mensual - a.remuneracion_bruta_mensual);
    globalFuncionariosCache = all;
    console.log(`[API] Caché global construida (GitHub Releases paralelos): ${all.length} funcionarios.`);
    return all;
  } catch (error) {
    console.error('[ERROR] No se pudo descargar desde GitHub Releases:', error);
    return [];
  }
}

export interface PaginatedResponse {
  data: FuncionarioPublico[];
  total: number;
  page: number;
  totalPages: number;
}

export function searchGlobalFuncionarios(
  query: string,
  muniId: string,
  contrato: string,
  estamento: string,
  sortBy: string,
  page: number,
  limit: number = 24
): PaginatedResponse {
  const all = getGlobalFuncionarios();

  let filtered = all;

  // 1. Filtro por búsqueda de texto
  if (query && query.trim() !== '') {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(f => 
      f.nombre_completo.toLowerCase().includes(q) || 
      f.cargo.toLowerCase().includes(q)
    );
  }

  // 2. Filtro por Municipalidad / Organismo
  if (muniId && muniId !== 'Todos') {
    filtered = filtered.filter(f => f.id.includes(muniId));
  }

  // 3. Filtro por tipo_contrato
  if (contrato && contrato !== 'Todos') {
    filtered = filtered.filter(f => f.tipo_contrato === contrato);
  }

  // 4. Filtro por estamento
  if (estamento && estamento !== 'Todos') {
    filtered = filtered.filter(f => f.estamento === estamento);
  }

  // 5. Ordenamiento
  if (sortBy === 'sueldo_desc') {
    filtered = [...filtered].sort((a, b) => b.remuneracion_bruta_mensual - a.remuneracion_bruta_mensual);
  } else if (sortBy === 'horas_extras_desc') {
    filtered = [...filtered].sort((a, b) => (b.horas_extras_mes_anterior || 0) - (a.horas_extras_mes_anterior || 0));
  } else if (sortBy === 'nombre_asc') {
    filtered = [...filtered].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
  }

  // 6. Paginación
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedData = filtered.slice(start, start + limit);

  return {
    data: paginatedData,
    total,
    page,
    totalPages
  };
}
