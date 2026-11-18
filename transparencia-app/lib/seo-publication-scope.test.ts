import { describe, expect, it } from "vitest";
import { constructionRobots, constructionHeaderRules, isConstructionRoute } from "../scripts/seo-publication-scope.mjs";
describe("SEO de áreas en construcción", () => {
  it("cubre URLs raíz y fichas profundas sin bloquear nombres parecidos o las fichas activas", () => {
    expect(isConstructionRoute("/municipalidades/maipu/?q=a")).toBe(true);
    expect(isConstructionRoute("/personas")).toBe(true);
    expect(isConstructionRoute("/personas-extra")).toBe(false);
    expect(isConstructionRoute("/politico/carlos-bianchi-chelech/")).toBe(false);
  });
  it("sustituye instrucciones index heredadas y agrega noindex si faltaba", () => {
    for (const html of ['<head><meta name="robots" content="index, follow"></head>', '<head><meta content="index" name="googlebot"></head>', '<head></head>']) {
      expect(constructionRobots(html)).toContain('content="noindex, follow"');
      expect(constructionRobots(html)).not.toContain('content="index');
    }
  });
  it("publica el bloqueo también en headers HTTP de raíz y descendientes", () => {
    expect(constructionHeaderRules()).toContain("/municipalidades/*\n  X-Robots-Tag: noindex, follow");
    expect(constructionHeaderRules()).not.toContain("/politico");
  });
});
