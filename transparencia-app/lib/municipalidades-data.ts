import municipalidadesJson from "@/data/municipalidades-data.json";

export interface AlcaldeData {
  nombre: string;
  cargo: string;
  estamento: string;
  remuneracion_bruta: number;
  remuneracion_liquida: number;
  grado_eus: string;
  formacion: string | null;
  fecha_ingreso: string;
  fuente: string;
  periodo?: string;
  partido_alcalde?: string | null;
}

export interface PresupuestoSinim {
  cut: string;
  inicial_clp: number;
  vigente_clp: number;
  gasto_personal_clp: number;
  ingresos_propios_clp: number;
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
  cargo: string;
  sueldo_base?: number;
  horas_extras_monto?: number;
  horas_extras_hrs?: number;
  remuneracion_bruta: number;
  remuneracion_liquida: number;
  grado_eus?: string;
  tipo_contrato?: string;
  periodo?: string;
  total_contratos_count?: number;
  cargos_consolidados?: string[];
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
  titulo: string;
  proveedor: string;
  monto_clp: number;
  fecha: string;
  url: string;
  ocid: string;
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
  nombre_comprador: string;
  monto_total_clp: number;
  procesos_count: number;
  ordenes_count?: number;
  top_compras: CompraItemChileCompra[];
  procesos?: ProcesoCompraChileCompra[];
  distribucion_modalidades?: {
    licitacion_publica_pct: number;
    trato_directo_pct: number;
    convenio_marco_pct: number;
  };
}

export interface RadiografiaComunal {
  padron_electoral_servel: number;
  participacion_electoral_pct: number;
  votos_alcalde_pct: number;
  votos_alcalde_total: number;
  viviendas_censo_2024: number;
  hogares_censo_2024: number;
  fuente_electoral: string;
  fuente_demografica: string;
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
  top_horas_extras: TopFuncionarioHorasExtras[];
  top_remuneraciones: TopFuncionarioRemuneracion[];
}

export * from "./municipalidades-list";

const MUNICIPALIDADES_DICT = municipalidadesJson as unknown as Record<string, MunicipalidadEnriquecida>;

export function getMunicipalidadData(id: string): MunicipalidadEnriquecida | null {
  return MUNICIPALIDADES_DICT[id] ?? null;
}

export function getAllMunicipalidadesData(): MunicipalidadEnriquecida[] {
  return Object.values(MUNICIPALIDADES_DICT);
}

