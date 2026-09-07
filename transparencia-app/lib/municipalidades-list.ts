import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  periodo_nomina?: string | null;
  desfase_meses?: number | null;
  estado_frescura?: "al_dia" | "desfasado" | "sin_datos";
  auditorias_cgr_count?: number;
}

let municipalidadesListJson: unknown = [];
try {
  municipalidadesListJson = JSON.parse(
    readFileSync(join(process.cwd(), "data", "municipalidades-list.json"), "utf8"),
  );
} catch {
  // El build estático provee el catálogo; los consumidores de slices no lo cargan en el navegador.
}

export const MUNICIPALIDADES_LIST = municipalidadesListJson as MunicipalidadListItem[];

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
  const alDiaCount = all.filter((m) => m.estado_frescura === "al_dia").length;
  const desfasadoCount = all.filter((m) => m.estado_frescura === "desfasado").length;
  const sinDatosCount = all.filter((m) => m.estado_frescura === "sin_datos" || !m.estado_frescura).length;

  return {
    totalComunas: all.length,
    conAlcaldeCount: conAlcalde.length,
    conPresupuestoCount: conPresupuesto.length,
    totalPresupuestoVigente,
    totalFuncionarios,
    totalMasaMensual,
    alDiaCount,
    desfasadoCount,
    sinDatosCount,
  };
}

