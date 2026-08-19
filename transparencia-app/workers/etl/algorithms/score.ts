/**
 * algorithms/score.ts
 * Cálculo del Score de Probidad Unificado (Mejora M1)
 * Score 0-100 donde 100 = máxima probidad
 *
 * Componentes (peso igual 25% cada uno):
 *   1. Score Asistencia    → % asistencia a sesiones
 *   2. Score Gastos        → Gasto ajustado vs media nacional
 *   3. Score Patrimonio    → Variaciones patrimoniales atípicas
 *   4. Score Banderas Rojas → Penalización por alertas activas
 */

export interface DatosParaScore {
  // Asistencia
  sesiones_asistidas: number;
  sesiones_totales: number;

  // Gastos
  gasto_ajustado_promedio: number;        // Promedio mensual ajustado
  media_nacional_ajustada?: number;       // Default: $12M

  // Patrimonio
  variacion_patrimonial_porcentaje: number; // % de cambio vs declaración anterior
  cambios_declarados: number;               // Cuántas veces modificó la DIP

  // Alertas
  alertas_criticas: number;
  alertas_altas: number;
  alertas_medias: number;
  incoherencias_rrss: number;
  entidades_con_nepotismo: number;
}

export interface ScoreDetalado {
  score_total: number;
  score_asistencia: number;
  score_gastos: number;
  score_patrimonio: number;
  score_banderas_rojas: number;
  breakdown: Record<string, string>;
}

/**
 * Calcula el score de asistencia (0-100)
 * 100% asistencia = 100 puntos; cada punto de inasistencia reduce el score
 */
function calcularScoreAsistencia(asistidas: number, totales: number): number {
  if (totales === 0) return 50; // Sin datos

  const porcentaje = (asistidas / totales) * 100;

  // Escala: 100% → 100pts, 90% → 80pts, 75% → 50pts, <60% → <20pts
  if (porcentaje >= 95) return 100;
  if (porcentaje >= 90) return 85;
  if (porcentaje >= 80) return 70;
  if (porcentaje >= 70) return 50;
  if (porcentaje >= 60) return 30;
  return Math.max(0, porcentaje - 20);
}

/**
 * Calcula el score de gastos (0-100)
 * Un gasto ajustado igual a la media nacional = 60 puntos (línea base)
 * Menor que la media = mejor score; mayor = penalización proporcional
 */
function calcularScoreGastos(
  gasto_ajustado: number,
  media = 12_000_000
): number {
  const ratio = gasto_ajustado / media;

  if (ratio <= 0.5) return 100;
  if (ratio <= 0.75) return 90;
  if (ratio <= 1.0) return 75;
  if (ratio <= 1.25) return 60;
  if (ratio <= 1.5) return 45;
  if (ratio <= 2.0) return 25;
  if (ratio <= 2.5) return 10;
  return 0;
}

/**
 * Calcula el score de patrimonio (0-100)
 * Variaciones atípicas (>30% en un año) reducen el score
 */
function calcularScorePatrimonio(
  variacion_porcentaje: number,
  cambios_declarados: number
): number {
  let score = 100;

  // Penalizar por variación atípica
  const variacion_abs = Math.abs(variacion_porcentaje);
  if (variacion_abs > 100) score -= 60;
  else if (variacion_abs > 50) score -= 40;
  else if (variacion_abs > 30) score -= 20;
  else if (variacion_abs > 15) score -= 10;

  // Penalizar por modificaciones frecuentes de la DIP (posible ocultamiento)
  if (cambios_declarados > 5) score -= 20;
  else if (cambios_declarados > 3) score -= 10;
  else if (cambios_declarados > 1) score -= 5;

  return Math.max(0, score);
}

/**
 * Calcula el score de banderas rojas (0-100)
 * Cada alerta activa penaliza el score en función de su gravedad
 */
function calcularScoreBanderasRojas(
  alertas_criticas: number,
  alertas_altas: number,
  alertas_medias: number,
  incoherencias: number,
  nepotismo: number
): number {
  let penalizacion = 0;

  penalizacion += alertas_criticas * 30;    // Crítica: -30 c/u
  penalizacion += alertas_altas * 15;       // Alta: -15 c/u
  penalizacion += alertas_medias * 8;       // Media: -8 c/u
  penalizacion += incoherencias * 10;       // Incoherencia RRSS: -10 c/u
  penalizacion += nepotismo * 20;           // Nepotismo: -20 c/u

  return Math.max(0, 100 - penalizacion);
}

/**
 * Calcula el Score de Probidad Unificado
 * Media ponderada de los 4 componentes (25% cada uno)
 */
export function calcularScoreProbidad(datos: DatosParaScore): ScoreDetalado {
  const score_asistencia = calcularScoreAsistencia(
    datos.sesiones_asistidas,
    datos.sesiones_totales
  );

  const score_gastos = calcularScoreGastos(
    datos.gasto_ajustado_promedio,
    datos.media_nacional_ajustada
  );

  const score_patrimonio = calcularScorePatrimonio(
    datos.variacion_patrimonial_porcentaje,
    datos.cambios_declarados
  );

  const score_banderas_rojas = calcularScoreBanderasRojas(
    datos.alertas_criticas,
    datos.alertas_altas,
    datos.alertas_medias,
    datos.incoherencias_rrss,
    datos.entidades_con_nepotismo
  );

  // Media ponderada igualitaria (25% cada componente)
  const score_total = Math.round(
    (score_asistencia + score_gastos + score_patrimonio + score_banderas_rojas) / 4
  );

  return {
    score_total,
    score_asistencia: Math.round(score_asistencia),
    score_gastos: Math.round(score_gastos),
    score_patrimonio: Math.round(score_patrimonio),
    score_banderas_rojas: Math.round(score_banderas_rojas),
    breakdown: {
      asistencia: `${Math.round((datos.sesiones_asistidas / datos.sesiones_totales) * 100)}% presencia (${datos.sesiones_asistidas}/${datos.sesiones_totales} sesiones)`,
      gastos: `Gasto ajustado: $${datos.gasto_ajustado_promedio.toLocaleString('es-CL')} vs media $${(datos.media_nacional_ajustada ?? 12_000_000).toLocaleString('es-CL')}`,
      patrimonio: `Variación: ${datos.variacion_patrimonial_porcentaje > 0 ? '+' : ''}${datos.variacion_patrimonial_porcentaje.toFixed(1)}% en declaración más reciente`,
      alertas: `${datos.alertas_criticas} críticas + ${datos.alertas_altas} altas + ${datos.incoherencias_rrss} incoherencias + ${datos.entidades_con_nepotismo} relaciones con nepotismo`,
    },
  };
}

/**
 * Etiqueta descriptiva del score para UI
 */
export function etiquetaScore(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Probidad Alta',    color: '#10B981' };
  if (score >= 60) return { label: 'Probidad Media',   color: '#F59E0B' };
  if (score >= 40) return { label: 'Alerta Moderada',  color: '#EA580C' };
  return              { label: 'Riesgo Alto',          color: '#EF4444' };
}
