/**
 * gabinete-kast.ts — Ministros de Estado del Gobierno de José Antonio Kast (2026-2030).
 * Solo datos con fuente (gob.cl oficial, prensa con fecha). Regla: donde hubo cambio
 * se registra al titular vigente (post ajuste del 19-05-2026) y el movimiento en «nota».
 *
 * Gabinete vigente (post 19-05-2026, 22 ministros con 3 biministros):
 *  - Interior · SEGEGOB → Claudio Alvarado (biministro, vocero)
 *  - Seguridad Pública → Martín Arrau (tras salida de Trinidad Steinert)
 *  - Economía · Minería → Daniel Mas (biministro desde el 11-03)
 *  - MOP · MTT → Louis de Grange (biministro tras el ajuste)
 *
 * Fuentes principales:
 *  - T13 / La Tercera (19-05-2026): «Así quedó conformado el nuevo gabinete»
 *  - Emol / BioBioChile / ADN Radio (20-01 a 29-07-2026): designaciones y confirmaciones
 *  - Ministerios: hacienda.cl, defensa.cl, midesof.gob.cl, mintrab.gob.cl, minsal.cl,
 *    minagri.gob.cl, energia.gob.cl, mma.gob.cl, cultura.gob.cl, bienesnacionales.cl
 */

export interface Ministro {
  ministerio: string;
  nombre: string;
  partido: string;
  fuente: string;
  nota?: string;
}

export const GABINETE_KAST: Ministro[] = [
  { ministerio: "Interior y Seguridad Pública", nombre: "Claudio Alvarado Andrade", partido: "UDI", fuente: "interior.gob.cl / BCN (D.S. N° 1 de 11-03-2026)", nota: "biministro Interior · SEGEGOB y vocero de gobierno tras la salida de Mara Sedini" },
  { ministerio: "Secretaría General de Gobierno (SEGEGOB)", nombre: "Claudio Alvarado Andrade", partido: "UDI", fuente: "segegob.cl / BCN (D.S. N° 189 de 19-05-2026)", nota: "biministro Interior · SEGEGOB y vocero de gobierno tras la salida de Mara Sedini (19-05-2026)" },
  { ministerio: "Seguridad Pública", nombre: "Martín Arrau García-Huidobro", partido: "Republicano", fuente: "La Tercera 19-05-2026", nota: "asume tras la remoción de Trinidad Steinert (19-05)" },
  { ministerio: "Economía, Fomento y Turismo", nombre: "Daniel Mas Valdés", partido: "Independiente", fuente: "T13 / Emol 20-01-2026", nota: "biministro de Economía y Minería" },
  { ministerio: "Minería", nombre: "Daniel Mas Valdés", partido: "Independiente", fuente: "T13 / Emol 20-01-2026", nota: "biministro; asumió por el diseño original del gabinete" },
  { ministerio: "Obras Públicas (MOP)", nombre: "Louis de Grange Concha", partido: "Independiente", fuente: "T13 19-05-2026", nota: "biministro MOP · MTT desde el 19-05 (vacante por traspaso de Arrau)" },
  { ministerio: "Transportes y Telecomunicaciones (MTT)", nombre: "Louis de Grange Concha", partido: "Independiente", fuente: "T13 19-05-2026", nota: "biministro MOP · MTT" },
  { ministerio: "Relaciones Exteriores", nombre: "José Francisco Pérez Mackenna", partido: "—", fuente: "es.wikipedia.org (Anexo gabinete 2026) · T13 19-05-2026", nota: "ministro desde 11-03-2026" },
  { ministerio: "Defensa Nacional", nombre: "Fernando Barros Tocornal", partido: "—", fuente: "defensa.cl (biografía ministro) 11-03-2026", nota: "abogado, socio fundador de Barros & Errázuriz" },
  { ministerio: "Hacienda", nombre: "Jorge Antonio Quiroz Castro", partido: "Independiente", fuente: "hacienda.cl 11-03-2026", nota: "" },
  { ministerio: "Secretaría General de la Presidencia (SEGPRES)", nombre: "José García Ruminot", partido: "RN", fuente: "T13 19-05-2026", nota: "" },
  { ministerio: "Justicia y Derechos Humanos", nombre: "Juan Rabat Celis", partido: "Independiente", fuente: "es.wikipedia.org (Anexo gabinete 2026)", nota: "" },
  { ministerio: "Trabajo y Previsión Social", nombre: "Tomás Andrés Rau Binder", partido: "Independiente", fuente: "mintrab.gob.cl 09-07-2026", nota: "" },
  { ministerio: "Desarrollo Social y Familia", nombre: "María Jesús Wulf Le May", partido: "PRCh", fuente: "midesof.gob.cl 11-03-2026", nota: "" },
  { ministerio: "Educación", nombre: "María Paz Arzola González", partido: "Independiente", fuente: "mineduc.cl 11-03-2026", nota: "" },
  { ministerio: "Salud", nombre: "May Paulina Chomali Garib", partido: "Independiente", fuente: "minsal.cl 11-03-2026", nota: "hermana del cardenal Fernando Chomali" },
  { ministerio: "Vivienda y Urbanismo", nombre: "Iván Slavko Poduje Capdeville", partido: "Independiente", fuente: "minvu.cl 11-03-2026", nota: "" },
  { ministerio: "Agricultura", nombre: "Jaime Campos Quiroga", partido: "PR", fuente: "minagri.gob.cl 16-03-2026 · Emol 20-06-2026", nota: "segundo periodo en la cartera" },
  { ministerio: "Energía", nombre: "Ximena Rincón González", partido: "Demócratas", fuente: "energia.gob.cl 11-03-2026", nota: "ex senadora y ex ministra (periodos anteriores)" },
  { ministerio: "Medio Ambiente", nombre: "Francisca Ignacia Toledo Echegaray", partido: "Independiente", fuente: "mma.gob.cl 30-03-2026 · La Tercera 21-01-2026", nota: "" },
  { ministerio: "Culturas, las Artes y el Patrimonio", nombre: "Francisco Undurraga Gazitúa", partido: "Evópoli", fuente: "cultura.gob.cl (página oficial ministro)", nota: "" },
  { ministerio: "Deporte", nombre: "Natalia Duco Soler", partido: "Independiente", fuente: "BioBioChile / Emol 20-01-2026", nota: "ex atleta olímpica (4 JJ.OO.)" },
  { ministerio: "Mujer y Equidad de Género", nombre: "Judith Makarena Marín Morales", partido: "PSC", fuente: "ADN Radio 20-01-2026", nota: "secretaria general del PSC" },
  { ministerio: "Ciencia, Tecnología, Conocimiento e Innovación", nombre: "Ximena Fabiola Lincolao Pilquián", partido: "Independiente", fuente: "es.wikipedia.org (Anexo gabinete 2026) · T13 19-05-2026", nota: "" },
  { ministerio: "Bienes Nacionales", nombre: "María Catalina Parot Donoso", partido: "Evópoli", fuente: "bienesnacionales.cl 11-03-2026", nota: "reincidente en la cartera (2010-2012)" },
];
