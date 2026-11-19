import { latestPublishedPeriod } from "./month-periods";

export interface AuthoritySection { id: string; href: string; label: string; description: string; aliases: readonly string[] }
const sections: AuthoritySection[] = [
  { id: "resumen", href: "#resumen-ficha", label: "Resumen", description: "Lo esencial y sus períodos", aliases: [] },
  { id: "gastos", href: "#seccion-gastos", label: "Gastos rendidos", description: "Meses, categorías e ítems", aliases: [] },
  { id: "personal", href: "#seccion-asesores", label: "Personal y asesores", description: "Nóminas e importes publicados", aliases: [] },
  { id: "asesorias", href: "#asesorias-externas", label: "Asesorías externas", description: "Contratos y períodos", aliases: [] },
  { id: "dieta", href: "#dieta-parlamentaria", label: "Dieta y períodos", description: "Referencia oficial y componentes", aliases: ["costo-mensual"] },
  { id: "votaciones", href: "#seccion-votaciones", label: "Votaciones", description: "Historial y votos emitidos", aliases: [] },
  { id: "eleccion", href: "#seccion-electoral", label: "Elección 2025", description: "Resultados publicados", aliases: [] },
  { id: "antecedentes", href: "#seccion-trayectoria", label: "Antecedentes", description: "Timeline, militancias y declaración", aliases: ["declaracion-probidad", "seccion-lobby", "bloque-formacion-dip", "chip-profesion-bcn", "camara-historical-title", "enlace-infoprobidad-oficial"] },
  { id: "fuentes", href: "#fuentes-ficha", label: "Fuentes y alcance", description: "Procedencia y límites de lectura", aliases: [] },
];

export function authoritySections({hasElectionData,hasExternalAdvisories=false}:{hasElectionData:boolean;hasExternalAdvisories?:boolean}): AuthoritySection[] {
  return sections.filter(s => (s.id !== "eleccion" || hasElectionData) && (s.id !== "asesorias" || hasExternalAdvisories));
}
export function resolveAuthoritySection(hash:string,available:readonly AuthoritySection[]):AuthoritySection {
  let anchor="";try { anchor=decodeURIComponent(hash.replace(/^#/,"")); } catch { /* Un hash ajeno no impide consultar la ficha. */ }
  return available.find(s => s.href.slice(1) === anchor || s.aliases.includes(anchor)) ?? available[0];
}

export function latestProfileAmount(months: readonly ({periodo:string} & Partial<Record<"gastos"|"personal"|"asesorias",number|null>>)[],component:"gastos"|"personal"|"asesorias"):{amount:number|null;period:string|null} {
  const valid=months.filter(m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m.periodo) && typeof m[component] === "number" && Number.isSafeInteger(m[component]));
  const period=latestPublishedPeriod(valid.map(m=>m.periodo));
  const month=valid.find(m=>m.periodo===period);
  return {amount:month?.[component]??null,period:month?period:null};
}
