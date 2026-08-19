/**
 * gobernadores-regionales.ts — Gobernadores regionales de Chile electos en octubre 2024.
 * Mandato: 06-01-2025 a 06-01-2029 (próxima elección regional: octubre 2028 · sin cambio en 2026).
 * Datos verificados contra: Servel (resultados 25-11-2024) + Emol/T13/EL PAÍS (24-25-11-2024) + Wikipedia.
 * Pactos: «Por Chile y sus Regiones» 7 gobernaciones, «Chile Vamos» 6, «Tu Región Radical» 1,
 * independientes fuera de pacto 2 (Orrego, Saffirio).
 */

export interface GobernadorRegional {
  region: string;
  nombre: string;
  partido: string;
  pacto: string;
  resultado2024: string;
  fuente: string;
}

export const GOBERNADORES_REGIONALES: GobernadorRegional[] = [
  { region: "Arica y Parinacota", nombre: "Diego Paco Mamani", partido: "RN", pacto: "Chile Vamos", resultado2024: "54,46 % (73.379 votos) · 2ª vuelta", fuente: "Servel/Emol 25-11-2024 · T13 24-11-2024" },
  { region: "Tarapacá", nombre: "José Miguel Carvajal Gallardo", partido: "Ind. (cupo PPD)", pacto: "Por Chile y sus Regiones", resultado2024: "46,18 % (81.104) · 1ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "Antofagasta", nombre: "Ricardo Díaz Cortés", partido: "Ind. (cupo PPD)", pacto: "Por Chile y sus Regiones", resultado2024: "52,18 % (164.863) · 2ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "Atacama", nombre: "Miguel Vargas Correa", partido: "Ind. (cupo PS)", pacto: "Por Chile y sus Regiones", resultado2024: "54,33 % (96.838) · 2ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "Coquimbo", nombre: "Cristóbal Juliá de la Vega", partido: "Ind. (cupo Evópoli)", pacto: "Chile Vamos", resultado2024: "63,00 % (308.567) · 2ª vuelta", fuente: "Servel/Emol 25-11-2024" },
  { region: "Valparaíso", nombre: "Rodrigo Mundaca Cabrera", partido: "Ind. (cupo FA)", pacto: "Por Chile y sus Regiones", resultado2024: "62,50 % (772.997) · 2ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "Metropolitana", nombre: "Claudio Orrego Larraín", partido: "Independiente", pacto: "Fuera de pacto", resultado2024: "55,03 % (2.516.097) · 2ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "O'Higgins", nombre: "Pablo Silva Amaya", partido: "PS", pacto: "Por Chile y sus Regiones", resultado2024: "54,86 % (353.313) · 2ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "Maule", nombre: "Pedro Álvarez-Salamanca Ramírez", partido: "UDI", pacto: "Chile Vamos", resultado2024: "51,74 % (388.338) · 2ª vuelta", fuente: "Servel/Emol 25-11-2024" },
  { region: "Ñuble", nombre: "Óscar Crisóstomo Llanos", partido: "PS", pacto: "Por Chile y sus Regiones", resultado2024: "41,22 % (136.280) · 1ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "Biobío", nombre: "Sergio Giacaman García", partido: "Ind. (cupo UDI)", pacto: "Chile Vamos", resultado2024: "72,65 % (751.512) · 2ª vuelta", fuente: "Servel/Emol 25-11-2024" },
  { region: "La Araucanía", nombre: "René Saffirio Espinoza", partido: "Independiente (ex DC)", pacto: "Fuera de pacto", resultado2024: "51,67 % (342.092) · 2ª vuelta", fuente: "Servel/Emol 25-11-2024" },
  { region: "Los Ríos", nombre: "Luis Cuvertino Gómez", partido: "PS", pacto: "Por Chile y sus Regiones", resultado2024: "40,86 % (106.022) · 1ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
  { region: "Los Lagos", nombre: "Alejandro Santana Tirachini", partido: "RN", pacto: "Chile Vamos", resultado2024: "51,87 % (258.757) · 2ª vuelta", fuente: "Servel/Emol 25-11-2024" },
  { region: "Aysén", nombre: "Marcelo Santana Vargas", partido: "UDI", pacto: "Chile Vamos", resultado2024: "54,37 % (33.883) · 1ª vuelta", fuente: "Servel/Emol 25-11-2024" },
  { region: "Magallanes", nombre: "Jorge Flies Añón", partido: "Ind. (cupo Partido Radical)", pacto: "Tu Región Radical", resultado2024: "40,84 % (39.160) · 1ª vuelta · reelecto", fuente: "Servel/Emol 25-11-2024" },
];