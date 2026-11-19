import { readFileSync } from "node:fs";

export const constructionRoutes = JSON.parse(readFileSync(new URL("../config/construction-modules.json", import.meta.url), "utf8")).map(({ href }) => href);

const progressSubroutes = ["/votaciones/comisiones"];

export function isConstructionRoute(route) {
  const normalized = route.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return [...constructionRoutes, ...progressSubroutes].some((prefix) => normalized === prefix || normalized.startsWith(prefix + "/"));
}

export function constructionRobots(html) {
  const robots = /<meta\b(?=[^>]*\bname=["'](?:robots|googlebot)["'])[^>]*>/gi;
  const result = html.replace(robots, '<meta name="robots" content="noindex, follow"/>');
  return robots.test(html) ? result : result.replace("</head>", '<meta name="robots" content="noindex, follow"/></head>');
}

export function constructionHeaderRules() {
  return [...constructionRoutes, ...progressSubroutes].flatMap((route) => [route, route + "/*"]).map((route) => route + "\n  X-Robots-Tag: noindex, follow\n").join("\n");
}
