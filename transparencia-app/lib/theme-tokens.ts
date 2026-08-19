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
}

export const LIGHT_TOKENS: ThemeTokens = {
  bg: "#F6F8FB",
  surface: "#FFFFFF",
  surface2: "#F1F5F9",
  border: "#DBE4EE",
  text1: "#0B1526",
  text2: "#3E4C5E",
  text3: "#5A6B7F",
  accent: "#0553B0",
  ok: "#067647",
  okBg: "#E8F7EF",
  bad: "#B42318",
  badBg: "#FEECEA",
  warn: "#A15C07",
  warnBg: "#FFF4E0",
  info: "#175CD3",
  infoBg: "#EFF4FF",
  money: "#067647",
};

export const DARK_TOKENS: ThemeTokens = {
  bg: "#0B1220",
  surface: "#121A2B",
  surface2: "#1B2537",
  border: "#2A3650",
  text1: "#F1F5F9",
  text2: "#C6D2E0",
  text3: "#9AAABF",
  accent: "#4DA3FF",
  ok: "#34D399",
  okBg: "#10281F",
  bad: "#F87171",
  badBg: "#2B1518",
  warn: "#FBBF24",
  warnBg: "#2A2010",
  info: "#60A5FA",
  infoBg: "#14213A",
  money: "#34D399",
};

export function getThemeTokens(themeOrIsDark: boolean | "dark" | "light" = false): ThemeTokens {
  const isDark = typeof themeOrIsDark === "string" ? themeOrIsDark === "dark" : Boolean(themeOrIsDark);
  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}

export function useThemeTokens(): ThemeTokens {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark"
    );
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkDark = () => {
      const darkActive =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setIsDark(darkActive);
    };

    checkDark();

    const observer = new MutationObserver(() => {
      checkDark();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}
