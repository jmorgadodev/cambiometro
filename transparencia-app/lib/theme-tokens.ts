"use client";

import { useEffect, useState } from "react";

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text1: string;
  text2: string;
  text3: string;
  accent: string;
  ok: string;
  okBg: string;
  bad: string;
  badBg: string;
  warn: string;
  warnBg: string;
  info: string;
  infoBg: string;
  money: string;
  onAccent: string;
  highlight: string;
  link: string;
  focus: string;
  series: [string, string, string, string, string, string];
}

export type ThemeName = "paper" | "dark" | "night";
export const THEME_ORDER: ThemeName[] = ["paper", "dark", "night"];

export const PAPER_TOKENS: ThemeTokens = {
  bg: "#F6F5F2",
  surface: "#FFFFFF",
  surface2: "#FBFAF8",
  border: "#E4E2DC",
  text1: "#101828",
  text2: "#475467",
  text3: "#475467",
  accent: "#0E7C66",
  ok: "#067647",
  okBg: "#E8F7EF",
  bad: "#B42318",
  badBg: "#FEECEA",
  warn: "#B54708",
  warnBg: "#FFF4E0",
  info: "#0E7C66",
  infoBg: "#E7F3EF",
  money: "#067647",
  onAccent: "#FFFFFF", highlight: "#B45309", link: "#0E7C66", focus: "#0E7C66",
  series: ["#0E7C66", "#B45309", "#7C5CBF", "#A83A5A", "#4E7A27", "#8A6D3B"],
};

export const DARK_TOKENS: ThemeTokens = {
  bg: "#151719", surface: "#1D2023", surface2: "#212428", border: "#2A2E33",
  text1: "#E8E6E1", text2: "#A3A8AD", text3: "#A3A8AD", accent: "#34B39A",
  ok: "#4CC38A", okBg: "#10281F", bad: "#F97066", badBg: "#351A19",
  warn: "#F5A524", warnBg: "#332613", info: "#3FBFA8", infoBg: "#15302B", money: "#4CC38A",
  onAccent: "#0B2A22", highlight: "#E8A33D", link: "#3FBFA8", focus: "#34B39A",
  series: ["#32A58F", "#D18B2C", "#9678D2", "#C65373", "#679D38", "#A58455"],
};

export const NIGHT_TOKENS: ThemeTokens = {
  bg: "#0A0B0B", surface: "#121313", surface2: "#161818", border: "#1F2222",
  text1: "#D6D3CC", text2: "#8B8E89", text3: "#8B8E89", accent: "#2FA08C",
  ok: "#3DA97C", okBg: "#10251E", bad: "#E0655C", badBg: "#2A1514",
  warn: "#D19236", warnBg: "#2A2115", info: "#3AA793", infoBg: "#12231F", money: "#3DA97C",
  onAccent: "#06201B", highlight: "#C98A3D", link: "#3AA793", focus: "#2FA08C",
  series: ["#2EAD97", "#E19D48", "#9B7FDC", "#C95170", "#679D38", "#A48255"],
};

// Compatibility alias for charts and older consumers.
export const LIGHT_TOKENS = PAPER_TOKENS;

export function getThemeTokens(themeOrIsDark: boolean | ThemeName | "light" = "paper"): ThemeTokens {
  if (themeOrIsDark === true || themeOrIsDark === "dark") return DARK_TOKENS;
  if (themeOrIsDark === "night") return NIGHT_TOKENS;
  return PAPER_TOKENS;
}

export function useThemeName(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof document === "undefined") return "paper";
    const value = document.documentElement.getAttribute("data-theme");
    return value === "dark" || value === "night" || value === "paper" ? value : "paper";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const applyTheme = (next: ThemeName) => {
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      setTheme(next);
    };
    const saved = localStorage.getItem("cambiometro-theme");
    const next = saved === "dark" || saved === "night" || saved === "paper" ? saved : "paper";
    applyTheme(next);

    const observer = new MutationObserver(() => {
      const value = document.documentElement.getAttribute("data-theme");
      if (value === "dark" || value === "night" || value === "paper") setTheme(value);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

export function useThemeTokens(): ThemeTokens {
  return getThemeTokens(useThemeName());
}
