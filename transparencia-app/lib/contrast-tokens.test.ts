import { describe, it, expect } from "vitest";
import { LIGHT_TOKENS, DARK_TOKENS, ThemeTokens } from "./theme-tokens";

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function sRgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * sRgbToLinear(r) + 0.7152 * sRgbToLinear(g) + 0.0722 * sRgbToLinear(b);
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = relativeLuminance(hex1);
  const lum2 = relativeLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("Sistema de Color Transversal — Ratios de Contraste WCAG AA (>= 4.5:1)", () => {
  const checkTokenContrasts = (themeName: string, tokens: ThemeTokens) => {
    describe(`Tema: ${themeName}`, () => {
      it("cumple contraste para --text-1 sobre fondos principales (>= 4.5:1)", () => {
        const ratioSurface = getContrastRatio(tokens.text1, tokens.surface);
        const ratioSurface2 = getContrastRatio(tokens.text1, tokens.surface2);
        const ratioBg = getContrastRatio(tokens.text1, tokens.bg);

        expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
        expect(ratioSurface2).toBeGreaterThanOrEqual(4.5);
        expect(ratioBg).toBeGreaterThanOrEqual(4.5);
      });

      it("cumple contraste para --text-2 sobre fondos principales (>= 4.5:1)", () => {
        const ratioSurface = getContrastRatio(tokens.text2, tokens.surface);
        const ratioSurface2 = getContrastRatio(tokens.text2, tokens.surface2);

        expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
        expect(ratioSurface2).toBeGreaterThanOrEqual(4.5);
      });

      it("cumple contraste para --text-3 sobre fondos principales (>= 4.5:1)", () => {
        const ratioSurface = getContrastRatio(tokens.text3, tokens.surface);
        const ratioSurface2 = getContrastRatio(tokens.text3, tokens.surface2);

        expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
        expect(ratioSurface2).toBeGreaterThanOrEqual(4.5);
      });

      it("cumple contraste para --accent sobre fondos principales (>= 4.5:1)", () => {
        const ratioSurface = getContrastRatio(tokens.accent, tokens.surface);
        expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
      });

      it("cumple contraste para badges semánticos (--ok/--ok-bg, --bad/--bad-bg, --warn/--warn-bg, --info/--info-bg)", () => {
        const ratioOk = getContrastRatio(tokens.ok, tokens.okBg);
        const ratioBad = getContrastRatio(tokens.bad, tokens.badBg);
        const ratioWarn = getContrastRatio(tokens.warn, tokens.warnBg);
        const ratioInfo = getContrastRatio(tokens.info, tokens.infoBg);

        expect(ratioOk).toBeGreaterThanOrEqual(4.5);
        expect(ratioBad).toBeGreaterThanOrEqual(4.5);
        expect(ratioWarn).toBeGreaterThanOrEqual(4.5);
        expect(ratioInfo).toBeGreaterThanOrEqual(4.5);
      });

      it("cumple contraste para --money sobre --surface (>= 4.5:1)", () => {
        const ratioMoney = getContrastRatio(tokens.money, tokens.surface);
        expect(ratioMoney).toBeGreaterThanOrEqual(4.5);
      });
      it("cumple contraste para selectores del drawer (.cruces-drawer-panel, surface2, text1, text2)", () => {
        const ratioDrawerText1 = getContrastRatio(tokens.text1, tokens.surface2);
        const ratioDrawerText2 = getContrastRatio(tokens.text2, tokens.surface2);
        const ratioDrawerAccent = getContrastRatio(tokens.accent, tokens.surface2);

        expect(ratioDrawerText1).toBeGreaterThanOrEqual(4.5);
        expect(ratioDrawerText2).toBeGreaterThanOrEqual(4.5);
        expect(ratioDrawerAccent).toBeGreaterThanOrEqual(4.5);
      });
    });
  };

  checkTokenContrasts("Modo Día (Light)", LIGHT_TOKENS);
  checkTokenContrasts("Modo Oscuro (Dark)", DARK_TOKENS);
});
