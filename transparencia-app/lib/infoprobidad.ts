import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import infoprobidadStaticJson from "@/data/lake-subsets/infoprobidad.subset.json";

export interface DeclaracionProbidad {
  id: string;
  fecha: string;
  title: string;
  nombre: string;
  organismos: string[];
  url: string;
}

export interface PoliticoProbidadResumen {
  tiene_declaracion: boolean;
  total_declaraciones: number;
  ultima_declaracion: DeclaracionProbidad | null;
  declaraciones: DeclaracionProbidad[];
  estado: "Al día (Vigente)" | "Sin registro reciente";
  url_portal_oficial: string;
}

let cachedRecords: DeclaracionProbidad[] | null = null;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function loadProbidadRecords(): DeclaracionProbidad[] {
  if (cachedRecords) return cachedRecords;

  let rawRecords: Array<{
    id: string;
    fecha?: string;
    title?: string;
    nombre?: string;
    organizations?: Array<{ name?: string }>;
    url?: string;
  }> = [];

  try {
    const fullPath = join(process.cwd(), "data", "lake", "projections", "v1", "infoprobidad.json");
    const subsetPath = join(process.cwd(), "data", "lake-subsets", "infoprobidad.subset.json");
    const probPath = existsSync(fullPath) ? fullPath : subsetPath;
    if (existsSync(probPath)) {
      const raw = JSON.parse(readFileSync(probPath, "utf8"));
      rawRecords = (raw.records || []) as typeof rawRecords;
    }
  } catch {}

  if (rawRecords.length === 0) {
    rawRecords = ((infoprobidadStaticJson as { records?: typeof rawRecords }).records || []) as typeof rawRecords;
  }

  const mapped: DeclaracionProbidad[] = rawRecords.map((r) => ({
    id: r.id,
    fecha: r.fecha || "",
    title: r.title || "Declaración de intereses y patrimonio",
    nombre: r.nombre || "",
    organismos: Array.isArray(r.organizations)
      ? (r.organizations.map((o) => o.name).filter(Boolean) as string[])
      : [],
    url: r.url || "https://www.infoprobidad.cl/",
  }));
  cachedRecords = mapped;
  return mapped;
}

export function infoprobidadParaPolitico(nombreCompleto: string): PoliticoProbidadResumen {
  const records = loadProbidadRecords();
  const normTarget = normalize(nombreCompleto);
  const targetTokens = normTarget.split(/\s+/).filter((t) => t.length > 2);

  const matched = records.filter((r) => {
    if (!r.nombre) return false;
    const normRec = normalize(r.nombre);
    if (normRec.includes(normTarget) || normTarget.includes(normRec)) return true;

    // Check matching by at least 2 tokens (e.g. First name and First surname)
    const recTokens = normRec.split(/\s+/).filter((t) => t.length > 2);
    const shared = targetTokens.filter((t) => recTokens.includes(t));
    return shared.length >= 2 && shared.length >= Math.min(targetTokens.length, 2);
  });

  matched.sort((a, b) => b.fecha.localeCompare(a.fecha));

  const portalSearchUrl = `https://www.infoprobidad.cl/Resultados?busqueda=${encodeURIComponent(nombreCompleto)}`;

  if (matched.length === 0) {
    return {
      tiene_declaracion: false,
      total_declaraciones: 0,
      ultima_declaracion: null,
      declaraciones: [],
      estado: "Sin registro reciente",
      url_portal_oficial: portalSearchUrl,
    };
  }

  return {
    tiene_declaracion: true,
    total_declaraciones: matched.length,
    ultima_declaracion: matched[0],
    declaraciones: matched,
    estado: "Al día (Vigente)",
    url_portal_oficial: matched[0].url || portalSearchUrl,
  };
}
