/**
 * scrapers/congreso-gastos.ts
 * Extracción de gastos operacionales desde la API OpenData del Congreso Nacional
 */

export interface GastoCongresoRaw {
  rutPolítico: string;
  ano: number;
  mes: number;
  categoria: string;
  monto: number;
  concepto: string;
}

export async function fetchGastosCongresoMes(ano: number, mes: number): Promise<GastoCongresoRaw[]> {
  try {
    const res = await fetch(`https://opendata.congreso.cl/api/gastos?ano=${ano}&mes=${mes}`, {
      headers: {
        "User-Agent": "TransparenciaChile-Bot/1.0",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Congreso OpenData returned HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { gastos?: GastoCongresoRaw[] };
    return Array.isArray(data.gastos) ? data.gastos : [];
  } catch (err) {
    console.error("Error fetching Congreso OpenData:", err);
    return [];
  }
}
