import { describe, it, expect } from "vitest";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = luminance(r1, g1, b1);
  const lum2 = luminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("WCAG AA Contrast Ratio Tests (Modo Día)", () => {
  const surface = "#FFFFFF";
  const surface2 = "#F1F5F9";
  const bg = "#F6F8FB";

  const lightTokens = {
    "--text-1": "#0B1526",
    "--text-2": "#3E4C5E",
    "--text-3": "#5A6B7F",
    "--accent": "#0553B0",
    "--ok": "#067647",
    "--bad": "#B42318",
    "--warn": "#A15C07",
    "--info": "#175CD3",
    "--money": "#067647",
  };

  const badgePairs = [
    { name: "OK Badge", fg: "#067647", bg: "#E8F7EF" },
    { name: "BAD Badge", fg: "#B42318", bg: "#FEECEA" },
    { name: "WARN Badge", fg: "#A15C07", bg: "#FFF4E0" },
    { name: "INFO Badge", fg: "#175CD3", bg: "#EFF4FF" },
  ];

  it("All text tokens have WCAG AA contrast >= 4.5:1 against #FFFFFF surface", () => {
    for (const [token, hex] of Object.entries(lightTokens)) {
      const ratio = contrastRatio(hex, surface);
      expect(ratio, `Token ${token} (${hex}) on ${surface} ratio ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("All text tokens have WCAG AA contrast >= 4.5:1 against #F6F8FB page background", () => {
    for (const [token, hex] of Object.entries(lightTokens)) {
      const ratio = contrastRatio(hex, bg);
      expect(ratio, `Token ${token} (${hex}) on ${bg} ratio ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("All text tokens have WCAG AA contrast >= 4.5:1 against #F1F5F9 surface-2", () => {
    for (const [token, hex] of Object.entries(lightTokens)) {
      const ratio = contrastRatio(hex, surface2);
      expect(ratio, `Token ${token} (${hex}) on ${surface2} ratio ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("All semantic badge pairs have WCAG AA contrast >= 4.5:1 between fg and bg", () => {
    for (const pair of badgePairs) {
      const ratio = contrastRatio(pair.fg, pair.bg);
      expect(ratio, `Badge ${pair.name} (${pair.fg} on ${pair.bg}) ratio ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
