import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..");

describe("Ficha móvil: compartir en X, nombre y tarjetas", () => {
  const cssContent = readFileSync(join(projectRoot, "app", "globals.css"), "utf8");
  const shareBtnContent = readFileSync(join(projectRoot, "components", "ShareButton.tsx"), "utf8");
  const headerContent = readFileSync(join(projectRoot, "components", "PoliticoScoreHeader.tsx"), "utf8");
  const personalContent = readFileSync(join(projectRoot, "components", "PersonalApoyoMensual.tsx"), "utf8");
  const pageContent = readFileSync(join(projectRoot, "app", "politico", "[id]", "page.tsx"), "utf8");

  describe("Fix 1: Compartir en X (Twitter) con texto enriquecido completo", () => {
    it("incluye el intent de X con parámetro text y url codificados", () => {
      expect(shareBtnContent).toContain("https://twitter.com/intent/tweet?text=");
      expect(shareBtnContent).toContain("encodedText");
      expect(shareBtnContent).toContain("encodedUrl");
    });

    it("utiliza Web Share API con title, text y url", () => {
      expect(shareBtnContent).toContain("navigator.share");
      expect(shareBtnContent).toContain("text: fullShareText");
      expect(shareBtnContent).toContain("url: shareUrl");
    });

    it("formatea el texto de compartir con el patrón oficial de El Cambiómetro", () => {
      // Formato: {Nombre} ({partido}) · {cargo} por {región} — asistencia {X}%, votaciones y rendiciones en El Cambiómetro
      expect(headerContent).toContain("shareText = `${data.nombre_completo}${partidoTxt} · ${data.cargo}${regionTxt} — asistencia ${data.pctAsistencia}%, votaciones y rendiciones en El Cambiómetro`");
    });
  });

  describe("Fix 2: Botón Compartir con texto blanco de alto contraste", () => {
    it("posee clase .share-btn--primary con color blanco #ffffff y font-weight 700", () => {
      expect(cssContent).toContain(".share-btn--primary");
      expect(cssContent).toContain("color: #ffffff");
      expect(cssContent).toContain("font-weight: 700");
    });

    it("asegura que el icono SVG herede el color blanco", () => {
      expect(cssContent).toContain(".share-btn--primary svg");
      expect(cssContent).toContain("stroke: #ffffff");
    });

    it("cumple con tap target mínimo de 44px", () => {
      expect(cssContent).toContain(".share-btn");
      expect(cssContent).toContain("min-height: 44px");
      expect(cssContent).toContain("min-width: 44px");
    });
  });

  describe("Fix 3: Nombre completo sin partir palabras en pantallas móviles", () => {
    it("define .politico-header-title con word-break normal y sin hyphens", () => {
      expect(cssContent).toContain(".politico-header-title");
      expect(cssContent).toContain("word-break: normal");
      expect(cssContent).toContain("overflow-wrap: normal");
      expect(cssContent).toContain("hyphens: none");
    });

    it("en pantallas < 480px despliega el nombre a ancho completo bajo la foto", () => {
      expect(cssContent).toContain("@media (max-width: 479px)");
      expect(cssContent).toContain(".politico-header-flex");
      expect(cssContent).toContain("flex-direction: column");
      expect(cssContent).toContain(".politico-header-actions-mobile");
    });

    it("Header component utiliza la estructura responsive", () => {
      expect(headerContent).toContain("politico-header-flex");
      expect(headerContent).toContain("politico-header-top");
      expect(headerContent).toContain("politico-header-main");
      expect(headerContent).toContain("politico-header-title");
    });
  });

  describe("Fix 4: Cifras y métricas sin desborde en tarjetas", () => {
    it(".stat-tile__value tiene tamaño adaptativo clamp y no desborda", () => {
      expect(cssContent).toContain(".stat-tile__value");
      expect(cssContent).toContain("clamp(");
      expect(cssContent).toContain("overflow-wrap: normal");
      expect(cssContent).toContain("white-space: nowrap");
    });

    it("PersonalApoyoMensual implementa stat-grid y stat-tile con clamp", () => {
      expect(personalContent).toContain("stat-grid");
      expect(personalContent).toContain("stat-tile");
      expect(personalContent).toContain("clamp(");
    });

    it("Sueldo oficial y gastos en ficha implementan clamp responsive", () => {
      expect(pageContent).toContain("clamp(");
      expect(pageContent).toContain("overflowWrap: \"normal\"");
    });
  });
});
