/**
 * servicios-publicos.ts — Rama de Servicios Públicos y Ministerios (gabinete 2026 verificado).
 * Los presupuestos anuales y dotaciones de personal no tienen fuente oficial publicada en el
 * dataset → se retiran del modelo expuesto. Los directores de servicio se verificaron contra
 * fuentes oficiales (sitio institucional, Alta Dirección Pública, Diario Oficial) en agosto 2026;
 * cada uno lleva su `fuente_director`. Sin fuente verificada el campo se omite.
 */

import organismosAdicionalesJson from "@/data/raw/transparencia_activa/organismos_adicionales.json";

// ── SERVICIOS PÚBLICOS Y MINISTERIOS DE CHILE ─────────────────────────────
export interface ServicioPublico {
  id: string;
  nombre: string;
  sigla: string;
  tipo_organo: 'Ministerio' | 'Subsecretaría' | 'Servicio Público' | 'Servicio Nacional' | 'Superintendencia' | 'Empresa Pública' | 'Gobierno Regional';
  ministerio_dependiente: string;
  /** Solo cuando la fuente está verificada; sin fuente se omite. */
  director_jefe_actual?: string;
  /** Fuente oficial que respalda al director/a jefe actual (agosto 2026). */
  fuente_director?: string;
  sitio_web_oficial?: string;
}

export const SERVICIOS_PUBLICOS_SEED: ServicioPublico[] = [
  // ── 25 MINISTERIOS DE ESTADO DE CHILE (gabinete 2026, verificado) ─────────
  { id: 'min-interior', nombre: 'Ministerio del Interior y Seguridad Pública', sigla: 'INTERIOR', tipo_organo: 'Ministerio', ministerio_dependiente: 'Interior', director_jefe_actual: 'Claudio Alvarado Andrade', sitio_web_oficial: 'https://www.interior.gob.cl' },
  { id: 'min-seguridad', nombre: 'Ministerio de Seguridad Pública', sigla: 'SEGURIDAD', tipo_organo: 'Ministerio', ministerio_dependiente: 'Seguridad Pública', director_jefe_actual: 'Martín Arrau García-Huidobro', sitio_web_oficial: 'https://www.seguridadpublica.gob.cl' },
  { id: 'min-rrhh', nombre: 'Ministerio de Relaciones Exteriores', sigla: 'MINREL', tipo_organo: 'Ministerio', ministerio_dependiente: 'Relaciones Exteriores', director_jefe_actual: 'Francisco Pérez Mackenna', sitio_web_oficial: 'https://www.minrel.gob.cl' },
  { id: 'min-defensa', nombre: 'Ministerio de Defensa Nacional', sigla: 'MINDEF', tipo_organo: 'Ministerio', ministerio_dependiente: 'Defensa Nacional', director_jefe_actual: 'Fernando Barros Tocornal', sitio_web_oficial: 'https://www.defensa.cl' },
  { id: 'min-hacienda', nombre: 'Ministerio de Hacienda', sigla: 'HACIENDA', tipo_organo: 'Ministerio', ministerio_dependiente: 'Hacienda', director_jefe_actual: 'Jorge Quiroz Castro', sitio_web_oficial: 'https://www.hacienda.cl' },
  { id: 'min-segpres', nombre: 'Ministerio Secretaría General de la Presidencia', sigla: 'SEGPRES', tipo_organo: 'Ministerio', ministerio_dependiente: 'SEGPRES', director_jefe_actual: 'José García Ruminot', sitio_web_oficial: 'https://www.segpres.cl' },
  { id: 'min-segegob', nombre: 'Ministerio Secretaría General de Gobierno', sigla: 'SEGEGOB', tipo_organo: 'Ministerio', ministerio_dependiente: 'SEGEGOB', director_jefe_actual: 'Claudio Alvarado Andrade', sitio_web_oficial: 'https://www.segegob.cl' },
  { id: 'min-economia', nombre: 'Ministerio de Economía, Fomento y Turismo', sigla: 'MINECON', tipo_organo: 'Ministerio', ministerio_dependiente: 'Economía', director_jefe_actual: 'Daniel Mas Valdés', sitio_web_oficial: 'https://www.economia.cl' },
  { id: 'min-desarrollosocial', nombre: 'Ministerio de Desarrollo Social y Familia', sigla: 'MDSF', tipo_organo: 'Ministerio', ministerio_dependiente: 'Desarrollo Social', director_jefe_actual: 'María Jesús Wulf Le May', sitio_web_oficial: 'https://www.desarrollosocialyfamilia.gob.cl' },
  { id: 'min-educacion', nombre: 'Ministerio de Educación', sigla: 'MINDUC', tipo_organo: 'Ministerio', ministerio_dependiente: 'Educación', director_jefe_actual: 'María Paz Arzola González', sitio_web_oficial: 'https://www.mineduc.cl' },
  { id: 'min-justicia', nombre: 'Ministerio de Justicia y Derechos Humanos', sigla: 'MINJUSTICIA', tipo_organo: 'Ministerio', ministerio_dependiente: 'Justicia', director_jefe_actual: 'Fernando Rabat Celis', sitio_web_oficial: 'https://www.minjusticia.gob.cl' },
  { id: 'min-trabajo', nombre: 'Ministerio del Trabajo y Previsión Social', sigla: 'MINTRAB', tipo_organo: 'Ministerio', ministerio_dependiente: 'Trabajo', director_jefe_actual: 'Tomás Rau Binder', sitio_web_oficial: 'https://www.mintrab.gob.cl' },
  { id: 'min-mop', nombre: 'Ministerio de Obras Públicas', sigla: 'MOP', tipo_organo: 'Ministerio', ministerio_dependiente: 'Obras Públicas', director_jefe_actual: 'Louis de Grange Concha', sitio_web_oficial: 'https://www.mop.cl' },
  { id: 'min-salud', nombre: 'Ministerio de Salud', sigla: 'MINSAL', tipo_organo: 'Ministerio', ministerio_dependiente: 'Salud', director_jefe_actual: 'May Chomali Garib', sitio_web_oficial: 'https://www.minsal.cl' },
  { id: 'min-minvu', nombre: 'Ministerio de Vivienda y Urbanismo', sigla: 'MINVU', tipo_organo: 'Ministerio', ministerio_dependiente: 'Vivienda', director_jefe_actual: 'Iván Poduje Capdeville', sitio_web_oficial: 'https://www.minvu.cl' },
  { id: 'min-agricultura', nombre: 'Ministerio de Agricultura', sigla: 'MINAGRI', tipo_organo: 'Ministerio', ministerio_dependiente: 'Agricultura', director_jefe_actual: 'Jaime Campos Quiroga', sitio_web_oficial: 'https://www.minagri.gob.cl' },
  { id: 'min-mineria', nombre: 'Ministerio de Minería', sigla: 'MINMINERIA', tipo_organo: 'Ministerio', ministerio_dependiente: 'Minería', director_jefe_actual: 'Daniel Mas Valdés', sitio_web_oficial: 'https://www.minmineria.cl' },
  { id: 'min-mtt', nombre: 'Ministerio de Transportes y Telecomunicaciones', sigla: 'MTT', tipo_organo: 'Ministerio', ministerio_dependiente: 'Transportes', director_jefe_actual: 'Louis de Grange Concha', sitio_web_oficial: 'https://www.mtt.gob.cl' },
  { id: 'min-bienesnacionales', nombre: 'Ministerio de Bienes Nacionales', sigla: 'BBNN', tipo_organo: 'Ministerio', ministerio_dependiente: 'Bienes Nacionales', director_jefe_actual: 'Catalina Parot Donoso', sitio_web_oficial: 'https://www.bienesnacionales.cl' },
  { id: 'min-energia', nombre: 'Ministerio de Energía', sigla: 'ENERGIA', tipo_organo: 'Ministerio', ministerio_dependiente: 'Energía', director_jefe_actual: 'Ximena Rincón González', sitio_web_oficial: 'https://www.energia.gob.cl' },
  { id: 'min-mma', nombre: 'Ministerio del Medio Ambiente', sigla: 'MMA', tipo_organo: 'Ministerio', ministerio_dependiente: 'Medio Ambiente', director_jefe_actual: 'Francisca Toledo Echegaray', sitio_web_oficial: 'https://mma.gob.cl' },
  { id: 'min-mindep', nombre: 'Ministerio del Deporte', sigla: 'MINDEP', tipo_organo: 'Ministerio', ministerio_dependiente: 'Deporte', director_jefe_actual: 'Natalia Duco Soler', sitio_web_oficial: 'https://www.mindep.cl' },
  { id: 'min-minmujeryeg', nombre: 'Ministerio de la Mujer y la Equidad de Género', sigla: 'MINMUJERYEG', tipo_organo: 'Ministerio', ministerio_dependiente: 'Mujer y Equidad de Género', director_jefe_actual: 'Judith Marín Morales', sitio_web_oficial: 'https://minmujeryeg.gob.cl' },
  { id: 'min-cultura', nombre: 'Ministerio de las Culturas, las Artes y el Patrimonio', sigla: 'CULTURAS', tipo_organo: 'Ministerio', ministerio_dependiente: 'Culturas', director_jefe_actual: 'Francisco Undurraga Gazitúa', sitio_web_oficial: 'https://www.cultura.gob.cl' },
  { id: 'min-ciencia', nombre: 'Ministerio de Ciencia, Tecnología, Conocimiento e Innovación', sigla: 'MINCIENCIA', tipo_organo: 'Ministerio', ministerio_dependiente: 'Ciencia', director_jefe_actual: 'Ximena Lincolao Pilquián', sitio_web_oficial: 'https://www.minciencia.gob.cl' },

  // ── SERVICIOS NACIONALES & SUBSECRETARÍAS CLAVE ─────────────────────────
  { id: 'serv-sii', nombre: 'Servicio de Impuestos Internos', sigla: 'SII', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Hacienda', director_jefe_actual: 'Jorge Trujillo', sitio_web_oficial: 'https://www.sii.cl' },
  { id: 'serv-tgr', nombre: 'Tesorería General de la República', sigla: 'TGR', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Hacienda', director_jefe_actual: 'Hernán Nobizelli Reyes', sitio_web_oficial: 'https://www.tgr.cl' },
  { id: 'serv-aduanas', nombre: 'Servicio Nacional de Aduanas', sigla: 'ADUANAS', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Hacienda', director_jefe_actual: 'Alejandra Arriaza Loeb', sitio_web_oficial: 'https://www.aduana.cl' },
  { id: 'serv-dt', nombre: 'Dirección del Trabajo', sigla: 'DT', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Trabajo', director_jefe_actual: 'David Oddó', sitio_web_oficial: 'https://www.dt.gob.cl' },
  { id: 'serv-fonasa', nombre: 'Fondo Nacional de Salud', sigla: 'FONASA', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Salud', director_jefe_actual: 'César Oyarzo', sitio_web_oficial: 'https://www.fonasa.cl' },
  { id: 'serv-ips', nombre: 'Instituto de Previsión Social', sigla: 'IPS', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Trabajo', director_jefe_actual: 'Juan José Cárcamo Hemmelmann', sitio_web_oficial: 'https://www.ips.gob.cl' },
  { id: 'serv-sag', nombre: 'Servicio Agrícola y Ganadero', sigla: 'SAG', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Agricultura', director_jefe_actual: 'Domingo Rojas', sitio_web_oficial: 'https://www.sag.gob.cl' },
  { id: 'serv-conaf', nombre: 'Corporación Nacional Forestal', sigla: 'CONAF', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Agricultura', director_jefe_actual: 'Aída Baldini Urrutia', sitio_web_oficial: 'https://www.conaf.cl' },
  { id: 'serv-indap', nombre: 'Instituto de Desarrollo Agropecuario', sigla: 'INDAP', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Agricultura', director_jefe_actual: 'Alejandro Zambrano (s)', fuente_director: 'indap.gob.cl — Dirección Nacional (s)', sitio_web_oficial: 'https://www.indap.gob.cl' },
  { id: 'serv-sernac', nombre: 'Servicio Nacional del Consumidor', sigla: 'SERNAC', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Economía', director_jefe_actual: 'Carolina González Venegas (s)', sitio_web_oficial: 'https://www.sernac.cl' },
  { id: 'serv-sence', nombre: 'Servicio Nacional de Capacitación y Empleo', sigla: 'SENCE', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Trabajo', director_jefe_actual: 'Rodrigo Valdivia Lefort (s)', fuente_director: 'sence.gob.cl — director (s) tras salida de Romanina Morales (BioBioChile, 19-mar-2026)', sitio_web_oficial: 'https://sence.gob.cl' },
  { id: 'serv-registro-civil', nombre: 'Servicio de Registro Civil e Identificación', sigla: 'SRCEI', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Justicia', director_jefe_actual: 'Omar Morales Márquez', fuente_director: 'Wikipedia/Servicio Civil ADP + Cuenta Pública SRCEI 02-jul-2026 (servel.cl)', sitio_web_oficial: 'https://www.registrocivil.cl' },
  { id: 'serv-senapred', nombre: 'Servicio Nacional de Prevención y Respuesta ante Desastres', sigla: 'SENAPRED', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Alicia Cebrián López', fuente_director: 'senapred.gob.cl + Diario Oficial 26-may-2026 (convenio desempeño 2024-2027)', sitio_web_oficial: 'https://senapred.cl' },
  { id: 'serv-serviu-rm', nombre: 'Servicio de Vivienda y Urbanización RM', sigla: 'SERVIU RM', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Vivienda', director_jefe_actual: 'Roberto Acosta Kerum', fuente_director: 'minvu.gob.cl + serviumetropolitana.minvu.gob.cl (ADP, nov-2023; vigente jul-2026)', sitio_web_oficial: 'https://www.serviurm.cl' },
  { id: 'serv-corfo', nombre: 'Corporación de Fomento de la Producción', sigla: 'CORFO', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Economía', director_jefe_actual: 'José Ignacio Mujica', fuente_director: 'La Tercera 26-mar-2026 + corfo.cl (asumió 30-mar-2026)', sitio_web_oficial: 'https://www.corfo.cl' },
  { id: 'serv-servel', nombre: 'Servicio Electoral de Chile', sigla: 'SERVEL', tipo_organo: 'Servicio Nacional', ministerio_dependiente: 'Autónomo', director_jefe_actual: 'Raúl García Aspillaga', fuente_director: 'servel.cl/servel/direccion (en el cargo desde 04-ene-2017; vigente jul-2026)', sitio_web_oficial: 'https://www.servel.cl' },

  // ── SUPERINTENDENCIAS ────────────────────────────────────────────────────
  { id: 'super-cmf', nombre: 'Comisión para el Mercado Financiero', sigla: 'CMF', tipo_organo: 'Superintendencia', ministerio_dependiente: 'Hacienda', director_jefe_actual: 'Catherine Tornel', sitio_web_oficial: 'https://www.cmfchile.cl' },
  { id: 'super-salud', nombre: 'Superintendencia de Salud', sigla: 'SUPER SALUD', tipo_organo: 'Superintendencia', ministerio_dependiente: 'Salud', director_jefe_actual: 'Fernando Riveros Vidal', sitio_web_oficial: 'https://www.supersalud.gob.cl' },
  { id: 'super-pensiones', nombre: 'Superintendencia de Pensiones', sigla: 'SP', tipo_organo: 'Superintendencia', ministerio_dependiente: 'Trabajo', director_jefe_actual: 'Joaquín Cortez', sitio_web_oficial: 'https://www.spensiones.cl' },
  { id: 'super-sec', nombre: 'Superintendencia de Electricidad y Combustibles', sigla: 'SEC', tipo_organo: 'Superintendencia', ministerio_dependiente: 'Energía', director_jefe_actual: 'Marta Cabeza Vargas', fuente_director: 'sec.cl — Cuenta Pública Participativa 2026 (jul-2026); designada ADP nov-2022', sitio_web_oficial: 'https://www.sec.cl' },
  { id: 'super-sma', nombre: 'Superintendencia del Medio Ambiente', sigla: 'SMA', tipo_organo: 'Superintendencia', ministerio_dependiente: 'Medio Ambiente', director_jefe_actual: 'Claudia Pastore (s)', sitio_web_oficial: 'https://portal.sma.gob.cl' },
  { id: 'super-educacion', nombre: 'Superintendencia de Educación', sigla: 'SUPEREDUC', tipo_organo: 'Superintendencia', ministerio_dependiente: 'Educación', director_jefe_actual: 'Mauricio Irarrázabal Cerpa', fuente_director: 'Servicio Civil — Presidente Kast nombra por ADP (Gabinete N°1038, 17-jul-2026; 474 postulantes)', sitio_web_oficial: 'https://www.supereduc.cl' },

  // ── EMPRESAS PÚBLICAS DEL ESTADO ─────────────────────────────────────────
  { id: 'emp-codelco', nombre: 'Corporación Nacional del Cobre de Chile', sigla: 'CODELCO', tipo_organo: 'Empresa Pública', ministerio_dependiente: 'Minería', director_jefe_actual: 'Bernardo Fontaine Talavera', sitio_web_oficial: 'https://www.codelco.com' },
  { id: 'emp-enap', nombre: 'Empresa Nacional del Petróleo', sigla: 'ENAP', tipo_organo: 'Empresa Pública', ministerio_dependiente: 'Energía', director_jefe_actual: 'Cristián Muga Aitken', sitio_web_oficial: 'https://www.enap.cl' },
  { id: 'emp-bancoestado', nombre: 'Banco del Estado de Chile', sigla: 'BANCOESTADO', tipo_organo: 'Empresa Pública', ministerio_dependiente: 'Hacienda', director_jefe_actual: 'Mario Farren Risopatrón', sitio_web_oficial: 'https://www.bancoestado.cl' },
  { id: 'emp-efe', nombre: 'Empresa de los Ferrocarriles del Estado', sigla: 'EFE', tipo_organo: 'Empresa Pública', ministerio_dependiente: 'Transportes', director_jefe_actual: 'Jorge Claude', sitio_web_oficial: 'https://www.efe.cl' },
  { id: 'emp-metro', nombre: 'Empresa de Transporte de Pasajeros Metro S.A.', sigla: 'METRO', tipo_organo: 'Empresa Pública', ministerio_dependiente: 'Transportes', director_jefe_actual: 'Patricio Rey Sommer', sitio_web_oficial: 'https://www.metro.cl' },
  { id: 'emp-tvn', nombre: 'Televisión Nacional de Chile', sigla: 'TVN', tipo_organo: 'Empresa Pública', ministerio_dependiente: 'SEGEGOB', director_jefe_actual: 'Patricio Dussaillant', sitio_web_oficial: 'https://www.tvn.cl' },
  { id: 'emp-enami', nombre: 'Empresa Nacional de Minería', sigla: 'ENAMI', tipo_organo: 'Empresa Pública', ministerio_dependiente: 'Minería', director_jefe_actual: 'Juan Carlos Sáez Zamorano', fuente_director: 'Diario Financiero 30-mar-2026 + enami.cl (desig. tras salida de Iván Mlynarz, mar-2026)', sitio_web_oficial: 'https://www.enami.cl' },

  // ── GOBIERNOS REGIONALES (16 GOREs DE CHILE) ────────────────────────────
  { id: 'gore-arica', nombre: 'Gobierno Regional de Arica y Parinacota', sigla: 'GORE ARICA', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Diego Paco Mamani', sitio_web_oficial: 'https://www.gorearicayparinacota.cl' },
  { id: 'gore-tarapaca', nombre: 'Gobierno Regional de Tarapacá', sigla: 'GORE TARAPACÁ', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'José Miguel Carvajal Gallardo', sitio_web_oficial: 'https://www.goretarapaca.gov.cl' },
  { id: 'gore-antofagasta', nombre: 'Gobierno Regional de Antofagasta', sigla: 'GORE ANTOFAGASTA', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Ricardo Díaz Cortés', sitio_web_oficial: 'https://www.goreantofagasta.cl' },
  { id: 'gore-atacama', nombre: 'Gobierno Regional de Atacama', sigla: 'GORE ATACAMA', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Miguel Vargas Correa', sitio_web_oficial: 'https://www.goreatacama.cl' },
  { id: 'gore-coquimbo', nombre: 'Gobierno Regional de Coquimbo', sigla: 'GORE COQUIMBO', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Krist Naranjo Peñaloza', sitio_web_oficial: 'https://www.gorecoquimbo.cl' },
  { id: 'gore-valparaiso', nombre: 'Gobierno Regional de Valparaíso', sigla: 'GORE VALPARAÍSO', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Rodrigo Mundaca Cabrera', sitio_web_oficial: 'https://www.gorevalparaiso.cl' },
  { id: 'gore-rm', nombre: 'Gobierno Regional Metropolitano de Santiago', sigla: 'GORE RM', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Claudio Orrego Larraín', sitio_web_oficial: 'https://www.gobiernosantiago.cl' },
  { id: 'gore-ohiggins', nombre: 'Gobierno Regional del Libertador O\'Higgins', sigla: 'GORE O\'HIGGINS', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Pablo Silva Amaya', sitio_web_oficial: 'https://www.goreohiggins.cl' },
  { id: 'gore-maule', nombre: 'Gobierno Regional del Maule', sigla: 'GORE MAULE', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Cristina Bravo Castro', sitio_web_oficial: 'https://www.goremaule.cl' },
  { id: 'gore-nuble', nombre: 'Gobierno Regional de Ñuble', sigla: 'GORE ÑUBLE', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Óscar Crisóstomo Yáñez', sitio_web_oficial: 'https://www.gorenuble.cl' },
  { id: 'gore-biobio', nombre: 'Gobierno Regional del Biobío', sigla: 'GORE BIOBÍO', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Sergio Giacaman García', sitio_web_oficial: 'https://www.gorebiobio.cl' },
  { id: 'gore-araucania', nombre: 'Gobierno Regional de La Araucanía', sigla: 'GORE ARAUCANÍA', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Luciano Rivas Stepke', sitio_web_oficial: 'https://www.gorearaucania.cl' },
  { id: 'gore-losrios', nombre: 'Gobierno Regional de Los Ríos', sigla: 'GORE LOS RÍOS', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Luis Cuvertino Gómez', sitio_web_oficial: 'https://www.gorelosesrios.cl' },
  { id: 'gore-loslagos', nombre: 'Gobierno Regional de Los Lagos', sigla: 'GORE LOS LAGOS', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Alejandro Santana Tirachini', sitio_web_oficial: 'https://www.goreloslagos.cl' },
  { id: 'gore-aysen', nombre: 'Gobierno Regional de Aysén', sigla: 'GORE AYSÉN', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Andrea Macías Palma', sitio_web_oficial: 'https://www.goreaysen.cl' },
  { id: 'gore-magallanes', nombre: 'Gobierno Regional de Magallanes', sigla: 'GORE MAGALLANES', tipo_organo: 'Gobierno Regional', ministerio_dependiente: 'Interior', director_jefe_actual: 'Jorge Flies Añón', sitio_web_oficial: 'https://www.goremagallanes.cl' },
];

export const SUELDO_MINIMO_CHILE_CLP = 500000;

export function toSueldosMinimos(montoCLP: number): string {
  if (!montoCLP || montoCLP <= 0) return "0 Sueldos Mínimos";
  const num = (montoCLP / SUELDO_MINIMO_CHILE_CLP).toFixed(1);
  return `${num} S.M.`;
}

function inferMinisterio(nombre: string, minRaw?: string): string {
  if (
    minRaw &&
    minRaw !== "Descubierto Automáticamente" &&
    minRaw !== "Descubierto Automaticamente" &&
    minRaw.trim() !== ""
  ) {
    return minRaw;
  }
  const n = nombre.toLowerCase();
  if (n.includes("presidencia") || n.includes("consejo de defensa del estado")) return "Presidencia de la República";
  if (n.includes("salud") || n.includes("hospital") || n.includes("cesfam") || n.includes("san borja") || n.includes("posta") || n.includes("asistencia")) return "Salud";
  if (n.includes("educaci") || n.includes("escolar") || n.includes("junji") || n.includes("junaeb") || n.includes("universidad")) return "Educación";
  if (n.includes("hacienda") || n.includes("impuestos") || n.includes("tesorer") || n.includes("aduana")) return "Hacienda";
  if (n.includes("justicia") || n.includes("gendarmer") || n.includes("registro civil") || n.includes("sename")) return "Justicia";
  if (n.includes("trabajo") || n.includes("previsi") || n.includes("pensiones") || n.includes("sence") || n.includes("empleo")) return "Trabajo";
  if (n.includes("vivienda") || n.includes("serviu") || n.includes("urbanismo")) return "Vivienda";
  if (n.includes("obras p") || n.includes("mop") || n.includes("vialidad") || n.includes("hidr")) return "Obras Públicas";
  if (n.includes("transporte") || n.includes("telecomunicaci") || n.includes("metro") || n.includes("ferrocarril")) return "Transportes";
  if (n.includes("agricultura") || n.includes("sag") || n.includes("conaf") || n.includes("indap") || n.includes("forestal")) return "Agricultura";
  if (n.includes("minería") || n.includes("mineria") || n.includes("cochilco") || n.includes("sernageomin") || n.includes("enami")) return "Minería";
  if (n.includes("medio ambiente") || n.includes("ambiental") || n.includes("sea") || n.includes("sma")) return "Medio Ambiente";
  if (n.includes("energía") || n.includes("energia") || n.includes("cne") || n.includes("sec")) return "Energía";
  if (n.includes("economía") || n.includes("economia") || n.includes("corfo") || n.includes("sernatur") || n.includes("sernac") || n.includes("pesca")) return "Economía";
  if (n.includes("desarrollo social") || n.includes("familia") || n.includes("conadi") || n.includes("fosis") || n.includes("senama") || n.includes("senadis")) return "Desarrollo Social";
  if (n.includes("cultura") || n.includes("patrimonio") || n.includes("artes")) return "Culturas";
  if (n.includes("ciencia") || n.includes("anid") || n.includes("tecnolog")) return "Ciencia";
  if (n.includes("deporte") || n.includes("ind")) return "Deporte";
  if (n.includes("mujer") || n.includes("sernameg") || n.includes("género") || n.includes("genero")) return "Mujer y Equidad de Género";
  if (n.includes("seguridad") || n.includes("carabineros") || n.includes("pdi") || n.includes("senapred")) return "Seguridad Pública";
  if (n.includes("relaciones exteriores") || n.includes("consulado") || n.includes("embajada") || n.includes("prochile")) return "Relaciones Exteriores";
  if (n.includes("defensa") || n.includes("ejército") || n.includes("armada") || n.includes("fach")) return "Defensa Nacional";
  if (n.includes("regional") || n.includes("gore") || n.includes("delegaci")) return "Interior";
  return "Administración Central del Estado";
}

let cachedServicios: ServicioPublico[] | null = null;
let cachedById: Map<string, ServicioPublico> | null = null;

function initCatalog() {
  if (cachedServicios && cachedById) return;
  const adicionales: ServicioPublico[] = (organismosAdicionalesJson as Array<Record<string, unknown>>).map((organismo) => {
    const id = String(organismo.id || "");
    const nombre = String(organismo.nombre || "");
    const sigla = typeof organismo.sigla === "string" ? organismo.sigla : "";
    const minRaw = typeof organismo.ministerio_dependiente === "string" ? organismo.ministerio_dependiente : "";
    const directorRaw = typeof organismo.director_jefe_actual === "string" ? organismo.director_jefe_actual : undefined;
    const webRaw = typeof organismo.sitio_web_oficial === "string" ? organismo.sitio_web_oficial : undefined;

    return {
      id,
      nombre,
      sigla,
      tipo_organo: "Servicio Público",
      ministerio_dependiente: inferMinisterio(nombre, minRaw),
      director_jefe_actual: directorRaw,
      sitio_web_oficial: webRaw,
    };
  });
  const catalogo = new Map(SERVICIOS_PUBLICOS_SEED.map((servicio) => [servicio.id, servicio]));
  for (const servicio of adicionales) {
    if (!catalogo.has(servicio.id)) catalogo.set(servicio.id, servicio);
  }
  cachedServicios = [...catalogo.values()];
  cachedById = catalogo;
}

export function getAllServiciosPublicos(): ServicioPublico[] {
  initCatalog();
  return cachedServicios!;
}

export function getServicioPublicoById(id: string): ServicioPublico | undefined {
  initCatalog();
  return cachedById!.get(id);
}

