import { readFileSync } from "node:fs";
import { join } from "node:path";

type Calendar = { entries: Array<{ workflow: string; cronUtc: string | null; local: string; status?: string }> };
// Servidor: el calendario vive fuera de la raíz de Turbopack de la aplicación.
// Si falta en un paquete aislado, se declara desconocido; no se usa una copia antigua.
function readCalendar(): Calendar {
  try {
    const value = JSON.parse(readFileSync(join(process.cwd(), "..", ".github", "etl-calendar.json"), "utf8"));
    return Array.isArray(value.entries) ? value as Calendar : { entries: [] };
  } catch { return { entries: [] }; }
}
const calendar = readCalendar();

export interface SourceAutomation {
  mode: "paused" | "scheduled" | "local-only" | "manual" | "mixed" | "unknown";
  label: string;
  detail: string;
}

// Ejecutores principales del alcance público. La reconciliación histórica manual
// no convierte una extracción diaria en manual ni acredita frescura del dato.
const workflows: Record<string, string[]> = {
  "transparencia-activa": ["etl-cplt.yml"],
  chilecompra: ["etl-chilecompra.yml"],
  "ley-19862": ["etl-ley-19862.yml"],
  dipres: ["etl-dipres.yml"], sinim: ["etl-sinim.yml"],
  infolobby: ["etl-infolobby-scheduled.yml"], infoprobidad: ["etl-infoprobidad.yml"],
  contraloria: ["etl-contraloria.yml"],
  camara: ["etl-daily.yml", "etl-camara-votaciones.yml"],
  "personal-apoyo": ["etl-personal-apoyo.yml", "etl-personal-apoyo-senado.yml"],
  senado: ["etl-expenses.yml"],
  gastos_senado: ["etl-expenses.yml"],
  "remuneraciones-38bis": ["etl-remuneraciones-38bis.yml"], servel: ["etl-servel.yml"],
};

export function sourceAutomation(sourceId: string, input: Calendar = calendar): SourceAutomation {
  const ids = workflows[sourceId];
  const entries = ids?.map(id => input.entries.find(entry => entry.workflow === id));
  if (!entries?.length || entries.some(entry => !entry)) return { mode: "unknown", label: "Programación no documentada", detail: "Consultar el corte publicado; no se presume actualización automática." };
  if (sourceId === "senado") return {
    mode: "mixed", label: "Programación por componente",
    detail: "El calendario documenta los gastos; las votaciones requieren comprobar su ejecutor local. La programación no acredita una ejecución correcta ni un corte más reciente.",
  };
  const modes = entries.map(entry => entry!.status === "paused" ? "paused" : entry!.cronUtc ? "scheduled" : /^Local-only:/i.test(entry!.local) ? "local-only" : "manual");
  const mode = new Set(modes).size === 1 ? modes[0] : "mixed";
  const labels = { paused: "Actualización automática pausada", scheduled: "Actualización automática programada", "local-only": "Extracción local programada", manual: "Actualización manual", mixed: "Programación por componente" };
  return { mode, label: labels[mode], detail: mode === "paused" ? "Se conserva el último corte publicado. La ejecución manual sigue disponible." : "La programación no acredita una ejecución correcta ni un corte más reciente." };
}
