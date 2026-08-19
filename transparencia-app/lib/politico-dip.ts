import politicosDipData from "@/data/politicos-dip.json";

export interface PoliticoDipInfo {
  politico_id: string;
  nombre_completo: string;
  tiene_declaracion: boolean;
  profesion_oficio_raw: string | null;
  profesion_oficio_display: string;
  formacion_titulos_display: string;
  declaracion_fecha: string | null;
  declaracion_url: string;
}

const dipMap = politicosDipData as unknown as Record<string, PoliticoDipInfo>;

export function getDipParaPolitico(politicoId: string, nombreCompleto?: string): PoliticoDipInfo {
  if (politicoId && dipMap[politicoId]) {
    return dipMap[politicoId];
  }

  const fallbackUrl = nombreCompleto
    ? `https://www.infoprobidad.cl/Resultados?busqueda=${encodeURIComponent(nombreCompleto)}`
    : "https://www.infoprobidad.cl/";

  return {
    politico_id: politicoId,
    nombre_completo: nombreCompleto || "",
    tiene_declaracion: false,
    profesion_oficio_raw: null,
    profesion_oficio_display: "No declarado en DIP",
    formacion_titulos_display: "No declarado en DIP",
    declaracion_fecha: null,
    declaracion_url: fallbackUrl,
  };
}
