/**
 * seed-politicos.ts — BARREL (punto de entrada único, no editar datos aquí).
 * Dataset de Autoridades Políticas de Chile (155 Diputados + 50 Senadores = 205 total, periodo 2026-2030).
 * Los registros de POLITICOS_SEED usan datos reales (ver ./politicos-source.ts: opendata.camara.cl, Wikipedia, bcn.cl).
 * La rama de probidad (scores, causas, auditorías) quedó pendiente: sin fuente pública verificada no se publican
 * cifras inventadas. Los RUT personales son identificadores públicos únicos (InfoProbidad, SERVEL, Transparencia
 * Activa los divulgan) y se publican tal cual cuando la fuente los entrega — son la llave del cruce con
 * funcionarios públicos.
 *
 * Ordenado por rama de la web — cada dominio vive en su módulo:
 *   ./partidos           → Rama Partidos Políticos (PARTIDOS_SEED, Partido, logoParaPartido, PARTIDO_FALLBACK)
 *   ./politicos          → Rama Políticos (POLITICOS_SEED, Politico)
 *   ./scores             → Rama Score de Probidad (SCORES_SEED, ScoreProbidad — vacío hasta ETL con fuente)
 *   ./municipalidades    → Rama Municipalidades (MUNICIPALIDADES_SEED, Municipalidad, getMunicipalidadById)
 *   ./servicios-publicos → Rama Servicios Públicos (SERVICIOS_PUBLICOS_SEED, SUELDO_MINIMO_CHILE_CLP, toSueldosMinimos)
 *   ./funcionarios       → Rama Funcionarios (FUNCIONARIOS_PUBLICOS_SEED, FuncionarioPublico, getFuncionariosPorMunicipalidad)
 *
 * Los datasets grandes no se dividen: ./politicos-source.ts (nómina real 2026-2030) y
 * ./funcionarios-source.ts (nóminas Transparencia Activa) alimentan a los módulos de arriba.
 */

export * from './partidos';
export * from './politicos';
export * from './scores';
export * from './municipalidades';
export * from './servicios-publicos';
export * from './funcionarios';
