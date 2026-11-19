import constructionModules from "@/config/construction-modules.json";

export type SiteModuleStatus = "active" | "construction";

export interface SiteModule {
  id: string;
  label: string;
  fullLabel: string;
  href: string;
  description: string;
  status: SiteModuleStatus;
}

export const ACTIVE_MODULES: readonly SiteModule[] = [
  { id: "camara", label: "Cámara", fullLabel: "Cámara y Senado", href: "/politico", description: "Diputadas, diputados y senadores, con acceso a sus fichas y evidencia pública.", status: "active" },
  { id: "partidos", label: "Partidos", fullLabel: "Partidos y bancadas", href: "/partidos", description: "Composición, escaños, votaciones y cohesión de bancadas.", status: "active" },
  { id: "votaciones", label: "Votaciones", fullLabel: "Votaciones parlamentarias", href: "/votaciones", description: "Decisiones nominales de Cámara y Senado con registro oficial.", status: "active" },
  { id: "movimientos", label: "Movimientos", fullLabel: "Movimientos de autoridades", href: "/movimientos", description: "Renuncias, nombramientos y relevos con estado de confirmación.", status: "active" },
  { id: "metodologia", label: "Metodología", fullLabel: "Metodología", href: "/como-funciona", description: "Cómo recolectamos, validamos, versionamos y publicamos evidencia.", status: "active" },
] as const;

export const CONSTRUCTION_MODULES: readonly SiteModule[] = constructionModules.map(({ id, label, href }) => ({
  id,
  label,
  fullLabel: label,
  href,
  description: "Consulta los avances y datos disponibles; estamos mejorando este módulo.",
  status: "construction" as const,
}));

export function normalizeSitePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return `/${pathname.split("/").filter(Boolean).join("/")}`;
}

export function activeModuleForPath(pathname: string): SiteModule | null {
  const normalized = normalizeSitePath(pathname);
  if (normalized === "/votaciones-destacadas" || normalized.startsWith("/votaciones-destacadas/")) return ACTIVE_MODULES.find(module=>module.id==="votaciones") ?? null;
  return ACTIVE_MODULES.find((module) => normalized === module.href || normalized.startsWith(`${module.href}/`)) ?? null;
}
