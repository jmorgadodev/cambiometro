import municipalidadesJson from "@/data/municipalidades-data.json";

export interface AlcaldeData {
  nombre: string;
  cargo: string | null;
  estamento: string;
  remuneracion_bruta: number | null;
  remuneracion_liquida: number | null;
  grado_eus: string | null;
  formacion: string | null;
  fecha_ingreso: string | null;
  fuente: string | null;
  periodo?: string | null;
  partido_alcalde?: string | null;
}

export interface PresupuestoSinim {
  cut: string;
  inicial_clp: number | null;
  vigente_clp: number | null;
  gasto_personal_clp: number | null;
  ingresos_propios_clp: number | null;
  ano: number;
}

export interface ResumenPersonal {
  total_funcionarios: number;
  planta: number;
  contrata: number;
  honorarios: number;
  codigo_trabajo_salud_educacion: number;
  masa_mensual_clp: number;
  masa_anual_estimada_clp: number;
  masa_horas_extras_clp: number;
  total_horas_extras_hrs: number;
  registros_observados_count?: number;
  registros_sin_pago_count?: number;
  registros_micro_monto_count?: number;
  registros_cuarentena_v7_count?: number;
  registros_validos_count?: number;
  nota_metodologica?: string | null;
}

export interface TopFuncionarioHorasExtras {
  id: string;
  nombre: string;
  cargo: string;
  horas: number;
  monto: number;
  estamento?: string;
}

export interface TopFuncionarioRemuneracion {
  id: string;
  nombre: string;
  cargo: string | null;
  sueldo_base?: number;
  horas_extras_monto?: number;
  horas_extras_hrs?: number;
  remuneracion_bruta: number;
  remuneracion_liquida: number | null;
  grado_eus?: string | null;
  tipo_contrato?: string | null;
  periodo?: string | null;
  total_contratos_count?: number;
  cargos_consolidados?: string[];
}

export interface AnomaliaIntegridadMunicipal {
  id: string;
  severity: "ALTA";
  validation: "V7";
  violations: Array<"sueldo_mensual" | "horas_extras">;
  source_url: string | null;
  record: {
    nombre_completo?: string;
    remuneracion_bruta_mensual?: number | null;
    horas_extras_mes_anterior?: number | null;
    periodo?: string;
    fuente_periodo?: string;
  };
}

export interface RedesSocialesComunales {
  instagram?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  youtube?: string | null;
}

export interface ConcejalData {
  id?: string;
  nombre: string;
  cargo?: string;
  partido?: string | null;
  pacto?: string | null;
  votos?: number;
  porcentaje_votos?: number;
  dieta_mensual_estimada_clp?: number | null;
  periodo?: string;
}

export interface CompraItemChileCompra {
  titulo: string | null;
  proveedor: string | null;
  monto_clp: number | null;
  fecha: string | null;
  url: string | null;
  ocid: string | null;
}

export interface ProcesoCompraChileCompra {
  id: string;
  ocid_padre: string;
  titulo_proceso: string;
  modalidad: string;
  monto_adjudicado_clp: number;
  proveedor_adjudicado: string;
  fecha_proceso: string;
  url_proceso?: string;
  ordenes_count: number;
  ordenes_compra: CompraItemChileCompra[];
}

export interface ComprasPublicasMuni {
  rut_comprador: string;
  nombre_comprador: string | null;
  monto_total_clp: number | null;
  procesos_count: number | null;
  ordenes_count?: number | null;
  top_compras: CompraItemChileCompra[];
  procesos?: ProcesoCompraChileCompra[];
  distribucion_modalidades?: {
    licitacion_publica_pct: number;
    trato_directo_pct: number;
    convenio_marco_pct: number;
  } | null;
  metodo_enlace: "RUT_EXACTO";
  fuente: "ChileCompra · Estándar OCDS";
  anomalias_integridad: Array<{
    id: string | null;
    severity: "ALTA" | null;
    validation: "V7" | null;
    violations: string[];
    titulo: string | null;
    monto_oficial_clp: number | null;
    fecha: string | null;
    source_url: string | null;
    excluded_from_totals_and_rankings: boolean;
  }>;
}

export interface RadiografiaComunal {
  padron_electoral_servel: number | null;
  participacion_electoral_pct: number | null;
  votos_alcalde_pct: number | null;
  votos_alcalde_total: number | null;
  viviendas_censo_2024: number | null;
  hogares_censo_2024: number | null;
  fuente_electoral: string | null;
  fuente_demografica: string | null;
}

export interface AuditoriaCgrData {
  id: string;
  titulo: string;
  fecha?: string | null;
  url?: string | null;
  tipo?: string | null;
  area?: string | null;
}

export interface MunicipalidadEnriquecida {
  id: string;
  cut: string;
  nombre_comuna: string;
  region: string;
  sitio_web_oficial: string | null;
  sitio_transparencia_activa?: string | null;
  redes_sociales?: RedesSocialesComunales | null;
  tiene_municipalidad_propia: boolean;
  poblacion_censo_2024: number | null;
  superficie_km2?: number | null;
  densidad_hab_km2?: number | null;
  presupuesto_per_capita_clp?: number | null;
  fcm_dependencia_pct?: number | null;
  fcm_ingresos_clp?: number | null;
  ingresos_totales_clp?: number | null;
  alcalde: AlcaldeData | null;
  partido_alcalde: string | null;
  concejales?: ConcejalData[] | null;
  compras_publicas?: ComprasPublicasMuni | null;
  radiografia_comunal?: RadiografiaComunal | null;
  auditorias_cgr?: AuditoriaCgrData[];
  presupuesto: PresupuestoSinim | null;
  resumen_personal: ResumenPersonal | null;
  resumen_personal_por_periodo?: Record<string, ResumenPersonal>;
  top_horas_extras: TopFuncionarioHorasExtras[];
  top_remuneraciones: TopFuncionarioRemuneracion[];
  top_remuneraciones_por_periodo?: Record<string, TopFuncionarioRemuneracion[]>;
  periodo_cplt_reciente?: string | null;
  desfase_meses?: number | null;
  estado_frescura?: "al_dia" | "desfasado" | "sin_datos";
  periodos_disponibles?: Array<{ periodo: string; etiqueta: string; count: number }>;
  anomalias_integridad?: AnomaliaIntegridadMunicipal[];
}

export * from "./municipalidades-list";

const MUNICIPALIDADES_DICT = Object.fromEntries(
  Object.entries(municipalidadesJson as unknown as Record<string, MunicipalidadEnriquecida>).map(([id, municipalidad]) => [
    id,
    municipalidad.compras_publicas?.metodo_enlace === "RUT_EXACTO"
      ? municipalidad
      : { ...municipalidad, compras_publicas: null },
  ]),
) as Record<string, MunicipalidadEnriquecida>;

export function getMunicipalidadData(id: string): MunicipalidadEnriquecida | null {
  return MUNICIPALIDADES_DICT[id] ?? null;
}

export function getAllMunicipalidadesData(): MunicipalidadEnriquecida[] {
  return Object.values(MUNICIPALIDADES_DICT);
}

