/**
 * scrapers/infoprobidad.ts
 * Módulo de extracción e ingesta desde la API pública de InfoProbidad (www.infoprobidad.cl)
 * Extrae declaraciones patrimoniales (DIP) y calcula hashes para detectar cambios
 */

export interface DeclaracionProbidadRaw {
  id: string;
  rut: string;
  nombre: string;
  fechaDeclaracion: string;
  inmuebles: Array<{ direccion: string; avaluo: number }>;
  vehiculos: Array<{ marca: string; modelo: number; avaluo: number }>;
  sociedades: Array<{ razonSocial: string; porcentaje: number }>;
  pasivos: Array<{ acreedor: string; monto: number }>;
}

export async function fetchInfoProbidadRecientes(): Promise<DeclaracionProbidadRaw[]> {
  try {
    const res = await fetch("https://www.infoprobidad.cl/api/declaraciones/recientes", {
      headers: {
        "User-Agent": "TransparenciaChile-Bot/1.0 (+https://transparencia.impulsacv.cl)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`InfoProbidad API returned HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { declaraciones?: DeclaracionProbidadRaw[] };
    return Array.isArray(data.declaraciones) ? data.declaraciones : [];
  } catch (err) {
    console.error("Error fetching InfoProbidad:", err);
    return [];
  }
}
