import municipalidadesListJson from "@/data/municipalidades-list.json";

export interface MunicipalidadListItem {
  id: string;
  cut: string;
  nombre_comuna: string;
  region: string;
  tiene_municipalidad_propia: boolean;
  poblacion_censo_2024: number | null;
  presupuesto_per_capita_clp?: number | null;
  fcm_dependencia_pct?: number | null;
  partido_alcalde: string | null;
  alcalde: {
    nombre: string;
    partido_alcalde?: string | null;
  } | null;
  presupuesto: {
    vigente_clp: number | null;
  } | null;
  resumen_personal: {
    total_funcionarios: number;
    masa_mensual_clp: number;
  } | null;
  auditorias_cgr_count?: number;
}

const rawList = ((municipalidadesListJson as unknown as Record<string, unknown>)?.default ?? municipalidadesListJson);
export const MUNICIPALIDADES_LIST = (Array.isArray(rawList) ? rawList : []) as MunicipalidadListItem[];

export function getMunicipalidadesList(): MunicipalidadListItem[] {
  return MUNICIPALIDADES_LIST;
}

export function getMunicipalidadesStats() {
  const all = MUNICIPALIDADES_LIST;
  const conAlcalde = all.filter((m) => m.alcalde !== null);
  const conPresupuesto = all.filter((m) => (m.presupuesto?.vigente_clp ?? 0) > 0);
  const totalPresupuestoVigente = all.reduce((sum, m) => sum + (m.presupuesto?.vigente_clp ?? 0), 0);
  const totalFuncionarios = all.reduce((sum, m) => sum + (m.resumen_personal?.total_funcionarios ?? 0), 0);
  const totalMasaMensual = all.reduce((sum, m) => sum + (m.resumen_personal?.masa_mensual_clp ?? 0), 0);

  return {
    totalComunas: all.length,
    conAlcaldeCount: conAlcalde.length,
    conPresupuestoCount: conPresupuesto.length,
    totalPresupuestoVigente,
    totalFuncionarios,
    totalMasaMensual,
  };
}
