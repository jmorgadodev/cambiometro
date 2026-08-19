/**
 * delegados-presidenciales.ts — Delegados presidenciales regionales del Gobierno de Kast (2026-2030).
 * Datos verificados contra fuente: Emol / EL PAÍS Chile / ADN Radio / La Tercera / Radio Maray, 07-02-2026.
 * Los 16 delegados asumieron el 11-03-2026 con el cambio de mando.
 */

export interface DelegadoPresidencial {
  region: string;
  nombre: string;
  partido?: string;
  nota?: string;
}

export const DELEGADOS_PRESIDENCIALES: DelegadoPresidencial[] = [
  { region: "Arica y Parinacota", nombre: "Cristián Sayes", partido: "RN", nota: "ingeniero comercial, ex seremi de Economía" },
  { region: "Tarapacá", nombre: "Adriana Tapia", partido: "UDI", nota: "médica cirujana, ex directora del Servicio de Salud de Iquique" },
  { region: "Antofagasta", nombre: "Katherine López", partido: "UDI", nota: "administradora pública, ex gobernadora provincial" },
  { region: "Atacama", nombre: "Sofía Cid", partido: "Republicano", nota: "ingeniera comercial, ex diputada" },
  { region: "Coquimbo", nombre: "Víctor Pino", partido: "Demócratas", nota: "ingeniero comercial, ex diputado" },
  { region: "Valparaíso", nombre: "Manuel Millones", nota: "ex consejero regional" },
  { region: "Metropolitana", nombre: "Germán Codina", nota: "administrador público, ex alcalde de Puente Alto (ex RN)" },
  { region: "O'Higgins", nombre: "Susana Pinto", partido: "UDI", nota: "ingeniera en administración de empresas" },
  { region: "Maule", nombre: "Juan Eduardo Prieto", nota: "ingeniero comercial, ex intendente y ex delegado (2020-2022)" },
  { region: "Ñuble", nombre: "Diego Sepúlveda", partido: "Republicano", nota: "abogado" },
  { region: "Biobío", nombre: "Julio Anativia", partido: "RN", nota: "abogado, ex gobernador de Concepción" },
  { region: "La Araucanía", nombre: "Francisco Ljubetic", nota: "abogado, ex fiscal regional" },
  { region: "Los Ríos", nombre: "Vicky Carrasco", partido: "Republicano", nota: "asistente social, ex concejala de Valdivia" },
  { region: "Los Lagos", nombre: "Cristián Palma", partido: "Republicano", nota: "médico psiquiatra" },
  { region: "Aysén", nombre: "Luz María Vicuña", partido: "RN", nota: "abogada, secretaria ejecutiva del CORE" },
  { region: "Magallanes", nombre: "Ericka Farías", nota: "abogada, ex gobernadora provincial" },
];