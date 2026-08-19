import { FUNCIONARIOS_REALES_POR_MUNI } from "@/lib/funcionarios-source";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { SERVICIOS_PUBLICOS_SEED } from "@/lib/servicios-publicos";

export function getPlatformStats() {
  return {
    autoridades: POLITICOS_SEED.length,
    municipalidades: MUNICIPALIDADES_SEED.length,
    funcionarios: Object.values(FUNCIONARIOS_REALES_POR_MUNI).reduce(
      (total, funcionarios) => total + funcionarios.length,
      0,
    ),
    servicios: SERVICIOS_PUBLICOS_SEED.length,
  };
}
