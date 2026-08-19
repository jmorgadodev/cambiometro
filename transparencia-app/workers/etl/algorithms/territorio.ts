/**
 * algorithms/territorio.ts
 * Índice de Complejidad Territorial para ajustar gastos operacionales
 * Basado en la fórmula del blueprint (sección 5.2):
 *   G_c = G_r / I_distrito
 *   I_distrito = 1.0 + (distancia_valparaiso_km / 1000) + (0.2 * num_comunas)
 */

export interface DistritoData {
  id: number;
  nombre: string;
  region: string;
  distancia_valparaiso_km: number;
  num_comunas: number;
}

/**
 * Tabla de distritos electorales con distancias aproximadas a Valparaíso
 * y número de comunas. Fuente: Congreso.cl
 */
export const DISTRITOS: DistritoData[] = [
  // RM — Corta distancia a Valparaíso (~120km)
  { id: 7,  nombre: 'Distrito 7',  region: 'Valparaíso',    distancia_valparaiso_km: 0,    num_comunas: 12 },
  { id: 8,  nombre: 'Distrito 8',  region: 'RM Poniente',   distancia_valparaiso_km: 120,  num_comunas: 9  },
  { id: 9,  nombre: 'Distrito 9',  region: 'RM Centro',     distancia_valparaiso_km: 120,  num_comunas: 10 },
  { id: 10, nombre: 'Distrito 10', region: 'RM Oriente',    distancia_valparaiso_km: 130,  num_comunas: 7  },
  { id: 11, nombre: 'Distrito 11', region: 'RM Sur',        distancia_valparaiso_km: 125,  num_comunas: 11 },
  { id: 12, nombre: 'Distrito 12', region: 'RM Cordillera', distancia_valparaiso_km: 150,  num_comunas: 8  },

  // Zona central
  { id: 13, nombre: 'Distrito 13', region: "O'Higgins",     distancia_valparaiso_km: 175,  num_comunas: 15 },
  { id: 14, nombre: 'Distrito 14', region: 'Maule Norte',   distancia_valparaiso_km: 260,  num_comunas: 12 },
  { id: 15, nombre: 'Distrito 15', region: 'Maule Sur',     distancia_valparaiso_km: 320,  num_comunas: 18 },
  { id: 16, nombre: 'Distrito 16', region: 'Ñuble',         distancia_valparaiso_km: 380,  num_comunas: 21 },

  // Zona norte
  { id: 1,  nombre: 'Distrito 1',  region: 'Arica y Parinacota', distancia_valparaiso_km: 2050, num_comunas: 4  },
  { id: 2,  nombre: 'Distrito 2',  region: 'Tarapacá',     distancia_valparaiso_km: 1800, num_comunas: 7  },
  { id: 3,  nombre: 'Distrito 3',  region: 'Antofagasta',  distancia_valparaiso_km: 1350, num_comunas: 9  },
  { id: 4,  nombre: 'Distrito 4',  region: 'Atacama',      distancia_valparaiso_km: 810,  num_comunas: 9  },
  { id: 5,  nombre: 'Distrito 5',  region: 'Coquimbo Norte', distancia_valparaiso_km: 480, num_comunas: 12 },
  { id: 6,  nombre: 'Distrito 6',  region: 'Coquimbo Sur', distancia_valparaiso_km: 360,  num_comunas: 9  },

  // Zona sur
  { id: 17, nombre: 'Distrito 17', region: 'Biobío Norte',  distancia_valparaiso_km: 460,  num_comunas: 15 },
  { id: 18, nombre: 'Distrito 18', region: 'Biobío Sur',    distancia_valparaiso_km: 510,  num_comunas: 18 },
  { id: 19, nombre: 'Distrito 19', region: 'Araucanía Norte', distancia_valparaiso_km: 660, num_comunas: 16 },
  { id: 20, nombre: 'Distrito 20', region: 'Araucanía Sur',  distancia_valparaiso_km: 730,  num_comunas: 16 },
  { id: 21, nombre: 'Distrito 21', region: 'Los Ríos',      distancia_valparaiso_km: 850,  num_comunas: 12 },
  { id: 22, nombre: 'Distrito 22', region: 'Los Lagos',     distancia_valparaiso_km: 990,  num_comunas: 30 },
  { id: 23, nombre: 'Distrito 23', region: 'Aysén',         distancia_valparaiso_km: 1550, num_comunas: 10 },
  { id: 24, nombre: 'Distrito 24', region: 'Magallanes',    distancia_valparaiso_km: 2050, num_comunas: 11 },
];

/**
 * Calcula el Índice de Complejidad Territorial para un distrito
 * Fórmula: I = 1.0 + (distancia_km / 1000) + (0.2 × num_comunas)
 */
export function calcularIndiceDistrito(distrito: DistritoData): number {
  return (
    1.0 +
    distrito.distancia_valparaiso_km / 1000 +
    0.2 * distrito.num_comunas
  );
}

/**
 * Calcula el gasto ajustado por territorio
 * G_c = G_r / I_distrito
 *
 * @param gasto_bruto - Gasto real reportado
 * @param numero_distrito - Número del distrito electoral
 * @returns Gasto ajustado y el índice aplicado
 */
export function calcularGastoAjustado(
  gasto_bruto: number,
  numero_distrito: number
): { gasto_ajustado: number; indice: number; descripcion: string } {
  const distrito = DISTRITOS.find((d) => d.id === numero_distrito);

  if (!distrito) {
    return {
      gasto_ajustado: gasto_bruto,
      indice: 1.0,
      descripcion: `Distrito ${numero_distrito} no encontrado. Gasto sin ajuste.`,
    };
  }

  const indice = calcularIndiceDistrito(distrito);
  const gasto_ajustado = gasto_bruto / indice;

  return {
    gasto_ajustado: Math.round(gasto_ajustado),
    indice: Math.round(indice * 100) / 100,
    descripcion: `Índice de complejidad territorial: ${indice.toFixed(2)} (${distrito.region}: ${distrito.distancia_valparaiso_km}km de Valparaíso, ${distrito.num_comunas} comunas)`,
  };
}

/**
 * Calcula el percentil de gasto de un político respecto a la media de su zona
 * para determinar el nivel de alerta
 */
export function nivelAlertaGasto(
  gasto_ajustado: number,
  media_nacional_ajustada = 12_000_000
): { nivel: 'ok' | 'warn' | 'alert' | 'danger'; factor: number } {
  const factor = gasto_ajustado / media_nacional_ajustada;

  if (factor > 2.5) return { nivel: 'danger', factor };
  if (factor > 1.75) return { nivel: 'alert', factor };
  if (factor > 1.25) return { nivel: 'warn', factor };
  return { nivel: 'ok', factor };
}
