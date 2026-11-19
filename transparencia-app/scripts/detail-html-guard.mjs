import { isConstructionRoute } from "./seo-publication-scope.mjs";

export function assertHtmlIsUsable(html, expectedName, label) {
  const forbidden = ["This page couldn't load", "Application error", "Político no encontrado", "Municipalidad No Encontrada"];
  const invalid = forbidden.filter((marker) => html.includes(marker));
  if (invalid.length) throw new Error(`DETAIL_HTML_INVALID: ${label}: ${invalid.join(", ")}`);
  const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (!heading) throw new Error(`DETAIL_H1_MISSING: ${label}`);
  const text = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "")
    .replace(/&#(?:x([a-f0-9]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10)))
    .replace(/&(?:apos|#39);/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
  if (isConstructionRoute("/" + label.replace(/^\/+/, ""))) {
    const progressNotice = html.match(/<section\b[^>]*aria-label="Aviso de apartado en desarrollo"[^>]*>([\s\S]*?)<\/section>/i)?.[1];
    if (!progressNotice?.replace(/<[^>]+>/g, "").includes("está en construcción")) throw new Error(`DETAIL_CONSTRUCTION_NOTICE_MISSING: ${label}`);
    if (!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html)) throw new Error(`DETAIL_CONSTRUCTION_INDEXABLE: ${label}`);
  }
  if (!text.includes(expectedName)) throw new Error(`DETAIL_NAME_MISSING: ${label}: ${expectedName}`);
}
