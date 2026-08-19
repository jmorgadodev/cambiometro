/**
 * workers/etl/scrapers/cplt-transparencia.ts
 * Integrador de Solicitudes y Amparos del Consejo para la Transparencia (CPLT Chile)
 *
 * Conecta con el Portal de Transparencia del Estado (datos.gob.cl / cplt.cl)
 * para medir el nivel de opacidad y tiempos de respuesta de cada organismo público.
 *
 * REGLA DE INTEGRIDAD: mientras no exista un endpoint público acreditado para
 * consultar solicitudes/amparos en vivo, NO se simulan solicitudes: la función
 * retorna [] y queda a la espera de la fuente real. Nada fake llega a D1.
 */

export interface SolicitudCPLT {
  id: string;
  organo_nombre: string;
  numero_solicitud: string;
  fecha_ingreso: string;
  materia_solicitada: string;
  estado: 'Respondida' | 'No Respondida en Plazo' | 'Amparo CPLT';
  dias_atraso: number;
}

export async function fetchSolicitudesCPLTRecientes(): Promise<SolicitudCPLT[]> {
  // Fuente real pendiente. Antes había un "simulador de delta" con solicitudes
  // inventadas hardcodeadas. Nada fake: retorna [] hasta implementar la ingesta real.
  console.warn("[ETL] CPLT: fuente no conectada aún → sin datos (no se inventan solicitudes).");
  return [];
}