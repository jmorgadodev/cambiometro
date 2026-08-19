/**
 * scrapers/infolobby.ts
 * Ingesta de actas de audiencias de lobby registradas en la Ley de Lobby (www.infolobby.cl)
 */

export interface AudienciaLobbyRaw {
  id: string;
  rutSujetoPasivo: string;
  nombreSujetoPasivo: string;
  sujetoActivoNombre: string;
  sujetoActivoRut?: string;
  materia: string;
  fecha: string;
}

export async function fetchAudienciasLobby(fechaDesde: string): Promise<AudienciaLobbyRaw[]> {
  try {
    const res = await fetch(`https://www.infolobby.cl/api/audiencias?desde=${fechaDesde}`, {
      headers: {
        "User-Agent": "TransparenciaChile-Bot/1.0",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`InfoLobby API returned HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { audiencias?: AudienciaLobbyRaw[] };
    return Array.isArray(data.audiencias) ? data.audiencias : [];
  } catch (err) {
    console.error("Error fetching InfoLobby:", err);
    return [];
  }
}
