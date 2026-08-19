/**
 * subsecretarios.ts — Subsecretarios del Gobierno de José Antonio Kast (2026-2030).
 * Datos verificados contra fuente: Emol / EL PAÍS Chile / ADN Radio / CNN Chile / La Tercera, 07-02-2026
 * (presentación de la "segunda línea" en el Hotel Radisson Blu por la OPE).
 * La Subsecretaría de Fuerzas Armadas quedó sin titular anunciado en esa fecha y fue cubierta
 * después: general (r) Christian Bolívar Romero, anunciado por la OPE el 23-02-2026 (La Tercera)
 * y nombrado por Decreto Nº 39/2026. 41 cargos, 100 % con titular y fuente.
 */

export interface Subsecretario {
  ministerio: string;
  subsecretaria: string;
  nombre: string;
  partido?: string;
  nota?: string;
}

export const SUBSECRETARIOS: Subsecretario[] = [
  { ministerio: "Interior", subsecretaria: "Subsecretaría del Interior", nombre: "Máximo Pavez", partido: "UDI", nota: "ex subsecretario de Segpres con Piñera II" },
  { ministerio: "Interior", subsecretaria: "Subsecretaría de Desarrollo Regional (SUBDERE)", nombre: "Sebastián Figueroa", partido: "Republicano", nota: "economista del núcleo de Kast" },
  { ministerio: "Hacienda", subsecretaria: "Subsecretaría de Hacienda", nombre: "Juan Pablo Rodríguez", nota: "abogado y académico" },
  { ministerio: "Hacienda", subsecretaria: "Dirección de Presupuestos (DIPRES)", nombre: "José Pablo Gómez", nota: "ex gerente corporativo de ENAP; ex Superintendencia de Salud" },
  { ministerio: "Justicia y DDHH", subsecretaria: "Subsecretaría de Justicia", nombre: "Luis Alejandro Silva", partido: "Republicano", nota: "ex consejero constitucional" },
  { ministerio: "Justicia y DDHH", subsecretaria: "Subsecretaría de Derechos Humanos", nombre: "Pablo Mira", nota: "asesor de la Convención Constitucional" },
  { ministerio: "Educación", subsecretaria: "Subsecretaría de Educación", nombre: "Daniel Rodríguez", nota: "geógrafo" },
  { ministerio: "Educación", subsecretaria: "Subsecretaría de Educación Parvularia", nombre: "María Cristina Tupper", nota: "ingeniera comercial PUC" },
  { ministerio: "Educación", subsecretaria: "Subsecretaría de Educación Superior", nombre: "Fernanda Valdés", nota: "profesora básica y doctora en Humanidades" },
  { ministerio: "Defensa", subsecretaria: "Subsecretaría de Defensa Nacional", nombre: "Rodrigo Álvarez", nota: "ex Vicealmirante de la Armada" },
  { ministerio: "Defensa", subsecretaria: "Subsecretaría de Fuerzas Armadas", nombre: "Christian Marcelo Bolívar Romero", partido: "Independiente", nota: "general (r) del Ejército, ~40 años de servicio; anunciado por la OPE 23-02-2026, Decreto Nº 39/2026; ex COT y ex director de la Academia de Guerra" },
  { ministerio: "Agricultura", subsecretaria: "Subsecretaría de Agricultura", nombre: "Francesco Venezian", nota: "ex seremi de Agricultura (2012-2014)" },
  { ministerio: "Bienes Nacionales", subsecretaria: "Subsecretaría de Bienes Nacionales", nombre: "Javier Peró", nota: "director de la ANIR" },
  { ministerio: "Ciencia", subsecretaria: "Subsecretaría de Ciencia, Tecnología, Conocimiento e Innovación", nombre: "Rafael Araos", nota: "ex jefe de Epidemiología del Minsal" },
  { ministerio: "Culturas y Patrimonio", subsecretaria: "Subsecretaría de las Culturas y las Artes", nombre: "Carlos Lobos", nota: "ex subsecretario de Cultura 2012-2014" },
  { ministerio: "Culturas y Patrimonio", subsecretaria: "Subsecretaría de Patrimonio Cultural", nombre: "Emilio de la Cerda", nota: "ex subsecretario de Patrimonio 2018-2022" },
  { ministerio: "Deporte", subsecretaria: "Subsecretaría del Deporte", nombre: "Andrés Otero", nota: "ex subsecretario del Deporte 2018-2022" },
  { ministerio: "Desarrollo Social", subsecretaria: "Subsecretaría de Servicios Sociales", nombre: "Alejandro Fernández", nota: "ex director ejecutivo del IES" },
  { ministerio: "Desarrollo Social", subsecretaria: "Subsecretaría de la Niñez", nombre: "Marcelo Sánchez", nota: "ex director de Sercotec" },
  { ministerio: "Desarrollo Social", subsecretaria: "Subsecretaría de Evaluación Social", nombre: "Gabriel Ugarte", nota: "investigador del CEP" },
  { ministerio: "Economía", subsecretaria: "Subsecretaría de Economía y Empresas de Menor Tamaño", nombre: "Karl Franz Koehler", nota: "socio de Dentons Chile" },
  { ministerio: "Economía", subsecretaria: "Subsecretaría de Turismo", nombre: "María Paz Lagos", nota: "periodista y ex subdirectora del Sernam" },
  { ministerio: "Economía", subsecretaria: "Subsecretaría de Pesca y Acuicultura", nombre: "Osvaldo Urrutia", nota: "abogado y doctor en Derecho" },
  { ministerio: "Energía", subsecretaria: "Subsecretaría de Energía", nombre: "Hugo Briones", nota: "ingeniero civil electricista" },
  { ministerio: "Medio Ambiente", subsecretaria: "Subsecretaría del Medio Ambiente", nombre: "José Ignacio Vial", nota: "ex abogado de la Fiscalía de la SMA" },
  { ministerio: "Minería", subsecretaria: "Subsecretaría de Minería", nombre: "Álvaro González", partido: "Republicano", nota: "abogado" },
  { ministerio: "Mujer", subsecretaria: "Subsecretaría de la Mujer y la Equidad de Género", nombre: "Daniela Castro", nota: "abogada" },
  { ministerio: "Obras Públicas", subsecretaria: "Subsecretaría de Obras Públicas", nombre: "Nicolás Balmaceda", nota: "abogado" },
  { ministerio: "Relaciones Exteriores", subsecretaria: "Subsecretaría de Relaciones Exteriores", nombre: "Patricio Torres", nota: "académico y ex diplomático" },
  { ministerio: "Relaciones Exteriores", subsecretaria: "Subsecretaría de Relaciones Económicas Internacionales", nombre: "Paula Estévez", nota: "ex jefa del Dpto. Internacional de Energía" },
  { ministerio: "Salud", subsecretaria: "Subsecretaría de Salud Pública", nombre: "Alejandra Pizarro", nota: "médica y máster en Epidemiología" },
  { ministerio: "Salud", subsecretaria: "Subsecretaría de Redes Asistenciales", nombre: "Julio Montt", nota: "médico pediatra" },
  { ministerio: "SEGEGOB", subsecretaria: "Subsecretaría General de Gobierno", nombre: "José Francisco Lagos", nota: "ex jefe de asesores de Redes Asistenciales" },
  { ministerio: "SEGPRES", subsecretaria: "Subsecretaría General de la Presidencia", nombre: "Constanza Castillo", partido: "RN", nota: "cientista política" },
  { ministerio: "Seguridad Pública", subsecretaria: "Subsecretaría de Seguridad Pública", nombre: "Andrés Jouannet", partido: "Amarillos", nota: "ex diputado por La Araucanía" },
  { ministerio: "Seguridad Pública", subsecretaria: "Subsecretaría de Prevención del Delito", nombre: "Ana Victoria Quintana", nota: "ex fiscal adjunta de la Fiscalía RM Sur" },
  { ministerio: "Trabajo", subsecretaria: "Subsecretaría del Trabajo", nombre: "Gustavo Rosende", nota: "abogado" },
  { ministerio: "Trabajo", subsecretaria: "Subsecretaría de Previsión Social", nombre: "María Elisa Cabezón", nota: "abogada" },
  { ministerio: "Transportes", subsecretaria: "Subsecretaría de Transportes", nombre: "Martín Mackenna", nota: "abogado" },
  { ministerio: "Transportes", subsecretaria: "Subsecretaría de Telecomunicaciones", nombre: "Romina Garrido", nota: "abogada, presidenta de la Comisión de la Ley de Protección de Datos" },
  { ministerio: "Vivienda", subsecretaria: "Subsecretaría de Vivienda y Urbanismo", nombre: "Natalia Aguilar", nota: "ingeniera" },
];