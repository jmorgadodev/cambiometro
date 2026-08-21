/**
 * Score de probidad. R10: permanece vacío hasta que todas sus dimensiones
 * tengan evidencia oficial y una metodología auditable de composición.
 */
export interface ScoreProbidad {
  id: string;
  politico_id: string;
  score_total: number | null;
  score_asistencia: number | null;
  score_gastos: number | null;
  score_patrimonio: number | null;
  score_banderas_rojas: number | null;
  total_alertas_criticas: number | null;
  total_alertas_altas: number | null;
  total_incoherencias: number | null;
  entidades_con_nepotismo: number | null;
  porcentaje_asistencia: number | null;
  sesiones_asistidas?: number | null;
  sesiones_totales?: number | null;
  dispensas_licencias?: number | null;
  gasto_bruto_mensual: number | null;
  gasto_ajustado_mensual: number | null;
  fecha_calculo: string;
  version_algoritmo: string;
}

export const SCORES_SEED: ScoreProbidad[] = [];
