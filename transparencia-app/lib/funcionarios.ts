/**
 * funcionarios.ts — Rama de Funcionarios Públicos.
 * Nóminas reales de Transparencia Activa (portaltransparencia.cl / CPLT).
 *
 * IMPORTANTE: Este módulo es client-safe (forma parte del barrel seed-politicos.ts).
 * NO importar módulos de Node.js (fs, path) aquí.
 * Para acceder a datos del filesystem usar lib/funcionarios-global.ts directamente
 * en Server Components o API Routes.
 */

export type TipoOrganoFuncionario =
  | 'servicio'
  | 'municipalidad'
  | 'congreso'
  | 'ministerio'
  | 'subsecretaria'
  | 'gore'
  | 'empresa_publica'
  | 'servicio_publico'
  | 'Ministerio'
  | 'Subsecretaría'
  | 'Servicio'
  | 'GORE'
  | 'Empresa pública'
  | 'Municipalidad'
  | string;

export interface FuncionarioPublico {
  id: string;
  nombre_completo: string;
  organo_nombre: string;
  organo_tipo: TipoOrganoFuncionario;
  cargo: string;
  estamento: string;
  tipo_contrato: string;
  remuneracion_bruta_mensual: number;
  fecha_ingreso: string;
  horas_extras_mes_anterior: number;
  monto_horas_extras_clp: number;
  foto_url?: string;
  twitter_handle?: string;
  instagram_handle?: string;
  linkedin_url?: string;
  /** Campos adicionales provenientes de Transparencia Activa (portaltransparencia.cl) */
  remuneracion_liquida_mensual?: number;
  grado_eus?: string;
  formacion?: string;
  region?: string;
  asignaciones_especiales_clp?: number;
  rem_adicionales_clp?: number;
  bonos_incentivos_clp?: number;
  derecho_horas_extras?: boolean;
  horas_extras_diurnas_hrs?: number;
  horas_extras_nocturnas_hrs?: number;
  horas_extras_festivas_hrs?: number;
  fecha_termino?: string;
  viaticos_clp?: number;
  observaciones?: string;
  fuente?: string;
  fuente_periodo?: string;
}

export const FUNCIONARIOS_PUBLICOS_SEED: FuncionarioPublico[] = [];

/**
 * Stub client-safe: siempre devuelve vacío.
 * En Server Components usar getGlobalFuncionarios() de lib/funcionarios-global.ts directamente.
 */
export function getFuncionariosPorOrganismo(_organismoId: string): FuncionarioPublico[] {
  return [];
}
