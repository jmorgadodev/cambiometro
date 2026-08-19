/**
 * gabinete-boric.ts — Serie histórica 2022-2026 (gabinete del Presidente Gabriel Boric).
 * Datos verificados: Anexo "Gabinetes ministeriales del gobierno de Gabriel Boric" (Wikipedia),
 * con fcha de cada nombramiento/cambio de ministerio. Sirve para comparar con el gabinete
 * actual de Kast. Solo se incluyen los 24 ministerios y sus cambios confirmados.
 */

export interface MinistroHistorico {
  ministerio: string;
  nombre: string;
  partido?: string;
  desde: string;
  hasta: string;
}

export const GABINETE_BORIC: MinistroHistorico[] = [
  { ministerio: "Interior", nombre: "Izkia Siches Pastén", partido: "Ind.", desde: "2022-03-11", hasta: "2022-09-06" },
  { ministerio: "Interior", nombre: "Carolina Tohá Morales", partido: "PPD", desde: "2022-09-06", hasta: "2025-03-04" },
  { ministerio: "Interior", nombre: "Álvaro Elizalde Soto", partido: "PS", desde: "2025-03-04", hasta: "2026-03-11" },
  { ministerio: "Seguridad Pública", nombre: "Luis Cordero Vega", partido: "Ind.", desde: "2025-04-01", hasta: "2026-03-11" },
  { ministerio: "Relaciones Exteriores", nombre: "Antonia Urrejola Noguera", partido: "Ind.-PS", desde: "2022-03-11", hasta: "2023-03-10" },
  { ministerio: "Relaciones Exteriores", nombre: "Alberto van Klaveren Stork", partido: "Ind.-PPD", desde: "2023-03-10", hasta: "2026-03-11" },
  { ministerio: "Defensa", nombre: "Maya Fernández Allende", partido: "PS", desde: "2022-03-11", hasta: "2025-03-10" },
  { ministerio: "Defensa", nombre: "Adriana Delpiano Puelma", partido: "PPD", desde: "2025-03-10", hasta: "2026-03-11" },
  { ministerio: "Hacienda", nombre: "Mario Marcel Cullell", partido: "Ind.-PS", desde: "2022-03-11", hasta: "2025-08-21" },
  { ministerio: "Hacienda", nombre: "Nicolás Grau Veloso", partido: "FA", desde: "2025-08-21", hasta: "2026-03-11" },
  { ministerio: "SEGPRES", nombre: "Giorgio Jackson Drago", partido: "RD", desde: "2022-03-11", hasta: "2022-09-06" },
  { ministerio: "SEGPRES", nombre: "Ana Lya Uriarte Rodríguez", partido: "PS", desde: "2022-09-06", hasta: "2023-04-19" },
  { ministerio: "SEGPRES", nombre: "Álvaro Elizalde Soto", partido: "PS", desde: "2023-04-19", hasta: "2025-03-04" },
  { ministerio: "SEGPRES", nombre: "Macarena Lobos Palacios", partido: "Ind.", desde: "2025-03-10", hasta: "2026-03-11" },
  { ministerio: "SEGEGOB", nombre: "Camila Vallejo Dowling", partido: "PCCh", desde: "2022-03-11", hasta: "2024-12-23" },
  { ministerio: "SEGEGOB", nombre: "Aisén Etcheverry Escudero (s)", partido: "FA", desde: "2024-12-23", hasta: "2025-07-09" },
  { ministerio: "SEGEGOB", nombre: "Camila Vallejo Dowling", partido: "PCCh", desde: "2025-07-09", hasta: "2026-03-11" },
  { ministerio: "Economía", nombre: "Nicolás Grau Veloso", partido: "FA", desde: "2022-03-11", hasta: "2025-08-21" },
  { ministerio: "Economía", nombre: "Álvaro García Hurtado", partido: "PPD", desde: "2025-08-21", hasta: "2026-03-11" },
  { ministerio: "Desarrollo Social", nombre: "Jeanette Vega Morales", partido: "PPD", desde: "2022-03-11", hasta: "2022-08-25" },
  { ministerio: "Desarrollo Social", nombre: "Giorgio Jackson Drago", partido: "RD", desde: "2022-09-06", hasta: "2023-08-11" },
  { ministerio: "Desarrollo Social", nombre: "Javiera Toro Cáceres", partido: "FA", desde: "2023-08-16", hasta: "2026-03-11" },
  { ministerio: "Educación", nombre: "Marco Antonio Ávila Lavanal", partido: "RD", desde: "2022-03-11", hasta: "2023-08-16" },
  { ministerio: "Educación", nombre: "Nicolás Cataldo Astorga", partido: "PCCh", desde: "2023-08-16", hasta: "2026-03-11" },
  { ministerio: "Justicia", nombre: "Marcela Ríos Tobar", partido: "CS", desde: "2022-03-11", hasta: "2023-01-07" },
  { ministerio: "Justicia", nombre: "Luis Cordero Vega", partido: "Ind.", desde: "2023-01-11", hasta: "2024-10-17" },
  { ministerio: "Justicia", nombre: "Jaime Gajardo Falcón", partido: "PCCh", desde: "2024-10-17", hasta: "2026-03-11" },
  { ministerio: "Trabajo", nombre: "Jeannette Jara Román", partido: "PCCh", desde: "2022-03-11", hasta: "2025-04-07" },
  { ministerio: "Trabajo", nombre: "Giorgio Boccardo Bosoni", partido: "FA", desde: "2025-04-08", hasta: "2026-03-11" },
  { ministerio: "Obras Públicas", nombre: "Juan Carlos García Pérez de Arce", partido: "PL", desde: "2022-03-11", hasta: "2023-03-10" },
  { ministerio: "Obras Públicas", nombre: "Jessica López Saffie", partido: "PS", desde: "2023-03-10", hasta: "2026-03-11" },
  { ministerio: "Salud", nombre: "María Begoña Yarza Sáez", partido: "Ind.", desde: "2022-03-11", hasta: "2022-09-06" },
  { ministerio: "Salud", nombre: "Ximena Aguilera Sanhueza", partido: "Ind.", desde: "2022-09-06", hasta: "2026-03-11" },
  { ministerio: "Vivienda", nombre: "Carlos Montes Cisternas", partido: "PS", desde: "2022-03-11", hasta: "2026-03-11" },
  { ministerio: "Agricultura", nombre: "Esteban Valenzuela Van Treek", partido: "FRVS", desde: "2022-03-11", hasta: "2025-08-20" },
  { ministerio: "Agricultura", nombre: "Ignacia Fernández Gatica", partido: "Ind.", desde: "2025-08-21", hasta: "2026-03-11" },
  { ministerio: "Minería", nombre: "Marcela Hernando Pérez", partido: "PR", desde: "2022-03-11", hasta: "2023-08-16" },
  { ministerio: "Minería", nombre: "Aurora Williams Baussa", partido: "PR", desde: "2023-08-16", hasta: "2026-03-11" },
  { ministerio: "Transportes", nombre: "Juan Carlos Muñoz Abogabir", partido: "Ind.", desde: "2022-03-11", hasta: "2026-03-11" },
  { ministerio: "Bienes Nacionales", nombre: "Javiera Toro Cáceres", partido: "COM", desde: "2022-03-11", hasta: "2023-08-16" },
  { ministerio: "Bienes Nacionales", nombre: "Marcela Sandoval Osorio", partido: "FA", desde: "2023-08-16", hasta: "2025-01-06" },
  { ministerio: "Bienes Nacionales", nombre: "Francisco Figueroa Cerda", partido: "FA", desde: "2025-01-09", hasta: "2026-03-11" },
  { ministerio: "Energía", nombre: "Claudio Huepe Minoletti", partido: "CS", desde: "2022-03-11", hasta: "2022-09-06" },
  { ministerio: "Energía", nombre: "Diego Pardow Lorenzo", partido: "FA", desde: "2022-09-06", hasta: "2025-10-16" },
  { ministerio: "Energía", nombre: "Álvaro García Hurtado", partido: "PPD", desde: "2025-10-16", hasta: "2026-03-11" },
  { ministerio: "Medio Ambiente", nombre: "Maisa Rojas Corradi", partido: "Ind.-FA", desde: "2022-03-11", hasta: "2026-03-11" },
  { ministerio: "Deporte", nombre: "Alexandra Benado Vergara", partido: "Ind.", desde: "2022-03-11", hasta: "2023-03-10" },
  { ministerio: "Deporte", nombre: "Jaime Pizarro Herrera", partido: "Ind.", desde: "2023-03-10", hasta: "2026-03-11" },
  { ministerio: "Mujer", nombre: "Antonia Orellana Guarello", partido: "FA", desde: "2022-03-11", hasta: "2026-03-11" },
  { ministerio: "Culturas", nombre: "Julieta Brodsky Hernández", partido: "CS", desde: "2022-03-11", hasta: "2023-03-10" },
  { ministerio: "Culturas", nombre: "Jaime de Aguirre Höffa", partido: "Ind.", desde: "2023-03-10", hasta: "2023-08-16" },
  { ministerio: "Culturas", nombre: "Carolina Arredondo Marzán", partido: "Ind.-PPD", desde: "2023-08-16", hasta: "2026-03-11" },
  { ministerio: "Ciencia", nombre: "Flavio Salazar Onfray", partido: "PCCh", desde: "2022-03-11", hasta: "2022-09-06" },
  { ministerio: "Ciencia", nombre: "Silvia Díaz Acosta", partido: "Ind.-PPD", desde: "2022-09-06", hasta: "2023-03-10" },
  { ministerio: "Ciencia", nombre: "Aisén Etcheverry Escudero", partido: "FA", desde: "2023-03-10", hasta: "2025-07-22" },
  { ministerio: "Ciencia", nombre: "Aldo Valle Acevedo", partido: "Ind.", desde: "2025-07-22", hasta: "2026-03-11" },
];