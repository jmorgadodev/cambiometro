/**
 * lib/estamentos-format.ts
 * Normalización y mapeo de nombres cortos para categorías y estamentos municipales
 * con asignación de colores y formateo visual amigable.
 */

export interface EstamentoStyle {
  label: string;
  original: string;
  bg: string;
  text: string;
  border: string;
  colorHex: string;
}

const ESTAMENTO_DICTIONARY: Array<{ pattern: RegExp; short: string; family: "directivo" | "profesional" | "salud" | "tecnico" | "administrativo" | "auxiliar" | "educacion" | "general" }> = [
  {
    pattern: /M[EÉ]DICOS?\s*CIRUJANOS?|FARMAC[EÉ]UTIC|QU[IÍ]MICOFARMAC|BIOQU[IÍ]MIC|CIRUJANOODENTISTAS?|ODONT[OÓ]LOG/i,
    short: "Médicos y Salud",
    family: "salud",
  },
  {
    pattern: /T[EÉ]CNICOS?\s*DE\s*NIVEL\s*SUPERIOR/i,
    short: "Técnico Nivel Superior",
    family: "tecnico",
  },
  {
    pattern: /T[EÉ]CNICOS?\s*(?:DE\s*)?SALUD/i,
    short: "Técnicos de Salud",
    family: "salud",
  },
  {
    pattern: /PROFESIONALES?\s*(?:DE\s*LA\s*)?SALUD/i,
    short: "Profesionales de Salud",
    family: "salud",
  },
  {
    pattern: /PROFESIONALES?\s*(?:DE\s*LA\s*)?EDUCACI[OÓ]N|DOCENTES?/i,
    short: "Docentes y Educación",
    family: "educacion",
  },
  {
    pattern: /ASISTENTES?\s*(?:DE\s*LA\s*)?EDUCACI[OÓ]N/i,
    short: "Asistentes Educación",
    family: "educacion",
  },
  {
    pattern: /ADMINISTRATIVOS?\s*(?:DE\s*)?SALUD/i,
    short: "Administrativos Salud",
    family: "salud",
  },
  {
    pattern: /AUXILIARES?\s*(?:DE\s*)?SALUD/i,
    short: "Auxiliares de Salud",
    family: "salud",
  },
  {
    pattern: /^DIRECTIVOS?$|^ALCALD[IÍ]A?$|^JEFATURAS?$/i,
    short: "Directivo / Jefatura",
    family: "directivo",
  },
  {
    pattern: /^PROFESIONAL(?:ES)?$/i,
    short: "Profesional",
    family: "profesional",
  },
  {
    pattern: /^T[EÉ]CNICO(?:S)?$/i,
    short: "Técnico",
    family: "tecnico",
  },
  {
    pattern: /^ADMINISTRATIVO(?:S)?$/i,
    short: "Administrativo",
    family: "administrativo",
  },
  {
    pattern: /^AUXILIAR(?:ES)?$/i,
    short: "Auxiliar / Servicios",
    family: "auxiliar",
  },
];

const FAMILY_COLORS: Record<string, { bg: string; text: string; border: string; colorHex: string }> = {
  salud: {
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#10b981",
    border: "rgba(16, 185, 129, 0.3)",
    colorHex: "#10b981",
  },
  directivo: {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#f59e0b",
    border: "rgba(245, 158, 11, 0.3)",
    colorHex: "#f59e0b",
  },
  profesional: {
    bg: "rgba(56, 189, 248, 0.12)",
    text: "#38bdf8",
    border: "rgba(56, 189, 248, 0.3)",
    colorHex: "#38bdf8",
  },
  tecnico: {
    bg: "rgba(168, 85, 247, 0.12)",
    text: "#c084fc",
    border: "rgba(168, 85, 247, 0.3)",
    colorHex: "#a855f7",
  },
  administrativo: {
    bg: "rgba(99, 102, 241, 0.12)",
    text: "#818cf8",
    border: "rgba(99, 102, 241, 0.3)",
    colorHex: "#6366f1",
  },
  auxiliar: {
    bg: "rgba(148, 163, 184, 0.12)",
    text: "#94a3b8",
    border: "rgba(148, 163, 184, 0.3)",
    colorHex: "#94a3b8",
  },
  educacion: {
    bg: "rgba(236, 72, 153, 0.12)",
    text: "#f472b6",
    border: "rgba(236, 72, 153, 0.3)",
    colorHex: "#ec4899",
  },
  general: {
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#cbd5e1",
    border: "rgba(100, 116, 139, 0.3)",
    colorHex: "#64748b",
  },
};

/**
 * Normaliza y formatea una categoría/estamento oficial a su versión corta y estilizada.
 */
export function formatEstamentoCorto(estamentoRaw?: string | null): EstamentoStyle {
  const original = (estamentoRaw ?? "").trim();
  if (!original) {
    return {
      label: "General",
      original: "No especificado",
      ...FAMILY_COLORS.general,
    };
  }

  for (const item of ESTAMENTO_DICTIONARY) {
    if (item.pattern.test(original)) {
      return {
        label: item.short,
        original,
        ...FAMILY_COLORS[item.family],
      };
    }
  }

  // Fallback: truncar inteligentemente a máximo 26 caracteres si es muy largo
  const label = original.length > 26 ? `${original.slice(0, 24)}…` : original;
  return {
    label,
    original,
    ...FAMILY_COLORS.general,
  };
}

/**
 * Retorna las iniciales (2 letras) de un nombre de persona.
 */
export function getInitials(name?: string | null): string {
  if (!name) return "FP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Estilos para pastillas de tipo de contrato.
 */
export function formatTipoContrato(tipo?: string | null): { label: string; bg: string; text: string; border: string } {
  const t = (tipo ?? "").trim().toLowerCase();
  if (t.includes("planta")) {
    return {
      label: "Planta",
      bg: "rgba(59, 130, 246, 0.12)",
      text: "#60a5fa",
      border: "rgba(59, 130, 246, 0.3)",
    };
  }
  if (t.includes("contrata")) {
    return {
      label: "Contrata",
      bg: "rgba(139, 92, 246, 0.12)",
      text: "#a78bfa",
      border: "rgba(139, 92, 246, 0.3)",
    };
  }
  if (t.includes("honorario")) {
    return {
      label: "Honorarios",
      bg: "rgba(245, 158, 11, 0.12)",
      text: "#fbbf24",
      border: "rgba(245, 158, 11, 0.3)",
    };
  }
  if (t.includes("codigo") || t.includes("código") || t.includes("trabajo")) {
    return {
      label: "Cód. Trabajo",
      bg: "rgba(16, 185, 129, 0.12)",
      text: "#34d399",
      border: "rgba(16, 185, 129, 0.3)",
    };
  }
  return {
    label: tipo || "Contrato",
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#94a3b8",
    border: "rgba(100, 116, 139, 0.3)",
  };
}
