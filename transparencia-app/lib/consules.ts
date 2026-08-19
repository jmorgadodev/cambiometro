/**
 * consules.ts — Cónsules generales de Chile en el exterior (2026, gobierno de J.A. Kast;
 * Cancillería: J.F. Pérez Mackenna). Datos verificados contra:
 * consulado.gob.cl/consulados-en-el-exterior (fichas con «Nombre Cónsul»), chile.gob.cl/<ciudad>,
 * comunicado MINREL 26-05-2026 y registros oficiales (MRE Paraguay, Texas SOS).
 * Solo se listan cónsules con titular confirmado por fuente; los no confirmados quedan fuera.
 */

export interface Consul {
  ciudad: string;
  pais: string;
  nombre: string;
  perfil?: string;
  fuente: string;
}

export const CONSULES: Consul[] = [
  { ciudad: "Buenos Aires", pais: "Argentina", nombre: "Jaqueline Tamara González Meyer", fuente: "consulado.gob.cl/argentina/buenos-aires" },
  { ciudad: "Córdoba", pais: "Argentina", nombre: "José Miguel Vial Franco", perfil: "carrera (Primer Secretario)", fuente: "ficha consular · chile.gob.cl/cordoba" },
  { ciudad: "Mendoza", pais: "Argentina", nombre: "David Quiroga", fuente: "consulado.gob.cl" },
  { ciudad: "Río Gallegos", pais: "Argentina", nombre: "Christian Fernando Blasco Torre", fuente: "consulado.gob.cl" },
  { ciudad: "La Paz", pais: "Bolivia", nombre: "Jorge Roberto Ruiz Piracés", perfil: "carrera (ascendido a Embajador)", fuente: "comunicado MINREL 26-05-2026 · ficha consular" },
  { ciudad: "Santa Cruz", pais: "Bolivia", nombre: "René Fernando Virgilio Rojas Illanes", fuente: "ficha consular" },
  { ciudad: "São Paulo", pais: "Brasil", nombre: "Juan Alonso Gutiérrez López", fuente: "consulado.gob.cl" },
  { ciudad: "Río de Janeiro", pais: "Brasil", nombre: "Marcelo Arturo Flores Aliaga", fuente: "consulado.gob.cl" },
  { ciudad: "Porto Alegre", pais: "Brasil", nombre: "Fernando Rodrigo Berguño de Hurtado", fuente: "ficha consular" },
  { ciudad: "Asunción", pais: "Paraguay", nombre: "Gerardo Esteban Ampuero Lepe", perfil: "carrera", fuente: "chile.gob.cl/asuncion · MRE Paraguay 24-06-2026" },
  { ciudad: "Montevideo", pais: "Uruguay", nombre: "Alejandro Pascual Bravo Fontan", fuente: "consulado.gob.cl" },
  { ciudad: "Lima", pais: "Perú", nombre: "José Luis Briseño Céspedes", fuente: "consulado.gob.cl" },
  { ciudad: "Guayaquil", pais: "Ecuador", nombre: "Juan Antonio Valenzuela Jorquera", fuente: "ficha consular" },
  { ciudad: "Quito", pais: "Ecuador", nombre: "José Cueva Velásquez", perfil: "honorario", fuente: "ficha consular" },
  { ciudad: "Bogotá", pais: "Colombia", nombre: "Patricio Javier Imbert Puelma", fuente: "ficha consular" },
  { ciudad: "Medellín", pais: "Colombia", nombre: "Manuel Molina Aristizábal", perfil: "honorario", fuente: "ficha consular" },
  { ciudad: "Ciudad de México", pais: "México", nombre: "Arturo Héctor Navarro Oyarzún", fuente: "consulado.gob.cl" },
  { ciudad: "Washington D.C.", pais: "EE.UU.", nombre: "Francisco José Montalva Beltrán", perfil: "Sección Consular", fuente: "consulado.gob.cl" },
  { ciudad: "Nueva York", pais: "EE.UU.", nombre: "Felipe Allard Soto", fuente: "consulado.gob.cl" },
  { ciudad: "Los Ángeles", pais: "EE.UU.", nombre: "Francisco Javier Leal Lisboa", fuente: "consulado.gob.cl" },
  { ciudad: "San Francisco", pais: "EE.UU.", nombre: "Patricio Cabezas Logan", fuente: "consulado.gob.cl" },
  { ciudad: "Houston", pais: "EE.UU.", nombre: "Alfredo García Tapia Ibaría", perfil: "Ministro Consejero · Cónsul General", fuente: "chile.gob.cl/houston · Texas SOS · e-Direct 24-03-2026" },
  { ciudad: "Miami", pais: "EE.UU.", nombre: "Daniel Ortiz Pulgar", fuente: "consulado.gob.cl" },
  { ciudad: "Madrid", pais: "España", nombre: "Gonzalo Ignacio Leyseca Astudillo", fuente: "consulado.gob.cl" },
  { ciudad: "Barcelona", pais: "España", nombre: "Eduardo Antonio Silva Besa", fuente: "consulado.gob.cl" },
  { ciudad: "Londres", pais: "Reino Unido", nombre: "Paulina Alejandra Cruz Ártica", perfil: "carrera", fuente: "chile.gob.cl/londres" },
];