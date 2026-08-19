/**
 * embajadores.ts — Designaciones diplomáticas del Gobierno de Kast (designaciones 2026).
 * Datos verificados contra fuente: Minrel (minrel.gob.cl, notas 01-04/15-04/04-05-2026) y
 * The Clinic (17-06-2026, recuento de las 29 designaciones) · Emol (18-04-2026).
 * Solo se listan destinos confirmados por al menos una de esas fuentes.
 */

export interface Embajador {
  destino: string;
  nombre: string;
  perfil?: "carrera" | "político";
  partido?: string;
  fechaDesignacion?: string;
  fuente: string;
}

export const EMBAJADORES: Embajador[] = [
  { destino: "Argentina", nombre: "Gonzalo Uriarte", perfil: "político", partido: "UDI", fechaDesignacion: "2026-04-01", fuente: "minrel.gob.cl 01-04-2026 · theclinic.cl" },
  { destino: "Estados Unidos", nombre: "Andrés Ergas", perfil: "político", fechaDesignacion: "2026-04-15", fuente: "minrel.gob.cl 15-04-2026 · biobiochile.cl" },
  { destino: "Perú", nombre: "Milenko Skoknic", perfil: "carrera", fechaDesignacion: "2026-04-15", fuente: "minrel.gob.cl 15-04-2026" },
  { destino: "China", nombre: "Alfonso Silva", perfil: "político", fechaDesignacion: "2026-04", fuente: "emol 18-04-2026 · theclinic" },
  { destino: "Brasil", nombre: "Issa Kort", perfil: "político", partido: "UDI", fechaDesignacion: "2026-05-04", fuente: "minrel.gob.cl 04-05-2026" },
  { destino: "Alemania", nombre: "Jorge Sandrock", perfil: "político", fechaDesignacion: "2026-05-04", fuente: "minrel.gob.cl 04-05-2026" },
  { destino: "Francia", nombre: "Raúl Sanhueza", perfil: "político", fechaDesignacion: "2026-05-04", fuente: "minrel.gob.cl 04-05-2026" },
  { destino: "Uruguay", nombre: "Luz Ebensperger", perfil: "político", partido: "UDI", fechaDesignacion: "2026-05-04", fuente: "minrel.gob.cl 04-05-2026" },
  { destino: "Paraguay", nombre: "Hernán Brantes", perfil: "político", fechaDesignacion: "2026-05-04", fuente: "minrel.gob.cl 04-05-2026" },
  { destino: "Costa Rica", nombre: "Ricardo Bosnic", perfil: "carrera", fechaDesignacion: "2026-05-04", fuente: "minrel.gob.cl 04-05-2026" },
  { destino: "México", nombre: "Francisco Chahuán", perfil: "político", partido: "RN", fuente: "theclinic 17-06-2026" },
  { destino: "España", nombre: "Juan Antonio Coloma", perfil: "político", partido: "UDI", fuente: "theclinic 17-06-2026" },
  { destino: "Bélgica", nombre: "Jorge Tarud", perfil: "político", fuente: "theclinic 17-06-2026" },
  { destino: "Israel", nombre: "Gabriel Zaliasnik", perfil: "político", fuente: "theclinic 17-06-2026" },
  { destino: "Santa Sede", nombre: "James Sinclair", perfil: "político", fuente: "theclinic 17-06-2026" },
  { destino: "Austria", nombre: "Harry Jürgensen", perfil: "político", partido: "Republicano", fuente: "theclinic 17-06-2026" },
  { destino: "República Dominicana", nombre: "Germán Becker", perfil: "político", partido: "RN", fuente: "theclinic 17-06-2026" },
  { destino: "Reino Unido", nombre: "Pedro Pablo Silva", perfil: "político", partido: "RN", fuente: "emol 18-04-2026" },
  { destino: "Portugal", nombre: "Miguel Mellado", perfil: "político", partido: "RN", fechaDesignacion: "2026-04-18", fuente: "emol 18-04-2026" },
  { destino: "Bolivia", nombre: "Roberto Ruiz", perfil: "político", fechaDesignacion: "2026-04-18", fuente: "emol 18-04-2026" },
  { destino: "Países Bajos", nombre: "Hernán Bascuñán", perfil: "carrera", fuente: "emol 18-04-2026" },
  { destino: "Cuba", nombre: "Carola Muñoz", perfil: "carrera", fuente: "emol 18-04-2026" },
  { destino: "Ecuador", nombre: "Ricardo Hernández", perfil: "carrera", fuente: "emol 18-04-2026" },
  { destino: "Misión ONU (Nueva York)", nombre: "Roberto Ampuero", perfil: "político", partido: "Evópoli", fuente: "emol 18-04-2026 · theclinic" },
  { destino: "Misión OEA (Washington)", nombre: "José Miguel Castro", perfil: "político", partido: "RN", fuente: "emol 18-04-2026 · theclinic" },
  { destino: "Misión OCDE (París)", nombre: "Juan Manuel Santa Cruz", perfil: "político", partido: "Evópoli", fuente: "emol 18-04-2026 · theclinic" },
  { destino: "Misión Ginebra (ONU)", nombre: "Luis Plaza", perfil: "carrera", fuente: "emol 18-04-2026" },
  { destino: "Misión OMC (Ginebra)", nombre: "Marta Bonet", perfil: "carrera", fuente: "emol 18-04-2026 · theclinic" },
];