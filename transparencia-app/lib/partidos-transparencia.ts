/**
 * partidos-transparencia.ts — Registro y trazabilidad de Transparencia Institucional de Partidos,
 * Transferencias de Parlamentarios y Cruces de Datos Oficiales (Ronda 4).
 * 
 * Anclas oficiales:
 * - Ley 19.862 (Registro Central de Colaboradores del Estado y Transferencias de Fondos Públicos)
 * - Ley 20.880 / InfoProbidad / CGR (Declaraciones de Patrimonio e Intereses)
 * - Ley 20.900 / DFL 4 Ley 18.603 / SERVEL (Financiamiento Público Trimestral a Partidos)
 * - Padrón Electoral y Estadísticas de Afiliados a Partidos Políticos del SERVEL
 * - Contraloría General de la República (CGR BIFAPortal)
 * - ChileCompra / Mercado Público (OCDS / Contratos)
 * - InfoLobby (Ley 20.730 / Consejo para la Transparencia)
 */

export interface DirectivaPartido {
  presidente: string;
  secretario_general: string;
  declaracion_patrimonio_url: string;
  fuente_declaracion: string;
}

export interface FinanciamientoPublicoPartido {
  norma_legal: string;
  resolucion_servel: string;
  recibe_aporte_trimestral: boolean;
  monto_anual_referencia_clp: number | null;
  fuente_resolucion_url: string;
}

export interface PadronAfiliadosPartido {
  total_afiliados: number;
  fecha_corte: string;
  fuente_padron_url: string;
}

export interface PartidoTransparenciaOficial {
  partido_id: string;
  sigla: string;
  nombre_oficial: string;
  directiva: DirectivaPartido;
  financiamiento_publico: FinanciamientoPublicoPartido;
  padron_afiliados: PadronAfiliadosPartido;
}

export interface TransferenciaParlamentarioRef {
  politico_id: string;
  nombre_completo: string;
  cargo: string;
  partido_sigla: string;
  tipo_declaracion: string;
  organismo_revisor: string;
  url_declaracion_oficial: string;
  monto_declarado_clp: number | null;
  detalle_financiamiento: string;
}

export interface CruceAuditoriaRef {
  id: string;
  numero_informe: string;
  entidad: string;
  tipo: string;
  fecha: string;
  url_oficial: string;
}

export interface CruceChileCompraRef {
  rut_juridico: string;
  organismo_comprador?: string;
  monto_total_clp: number;
  procesos: number;
  fuente_url: string;
}

export interface CruceInfoLobbyRef {
  id: string;
  fecha: string;
  organismo: string;
  sujeto_pasivo: string;
  cargo: string;
  url_audiencia: string;
}

export interface CruceLey19862Ref {
  id: string;
  fecha: string;
  emitter_name: string;
  emitter_rut: string;
  receiver_name: string;
  receiver_rut: string;
  monto_clp: number;
  url_transferencia: string;
}

// ─── 1. MUESTRA OFICIAL DE 5 PARTIDOS POLÍTICOS ──────────────────────────────
export const PARTIDOS_TRANSPARENCIA_MUESTRA: Record<string, PartidoTransparenciaOficial> = {
  rn: {
    partido_id: "rn",
    sigla: "RN",
    nombre_oficial: "Renovación Nacional",
    directiva: {
      presidente: "Rodrigo Galilea Vial",
      secretario_general: "Andrea Balladares Fuentes",
      declaracion_patrimonio_url: "https://www.infoprobidad.cl/Resultados?busqueda=Rodrigo%20Galilea",
      fuente_declaracion: "InfoProbidad · Contraloría General de la República (Ley 20.880 / Ley 19.862)",
    },
    financiamiento_publico: {
      norma_legal: "Ley 20.900 / DFL 4 Ley 18.603",
      resolucion_servel: "Resolución SERVEL Aporte Fiscal Trimestral a Partidos Políticos",
      recibe_aporte_trimestral: true,
      monto_anual_referencia_clp: 1450000000,
      fuente_resolucion_url: "https://www.servel.cl/aportes-trimestrales-a-partidos-politicos/",
    },
    padron_afiliados: {
      total_afiliados: 38412,
      fecha_corte: "31-12-2025",
      fuente_padron_url: "https://www.servel.cl/estadisticas-de-afiliados-a-partidos-politicos/",
    },
  },
  udi: {
    partido_id: "udi",
    sigla: "UDI",
    nombre_oficial: "Unión Demócrata Independiente",
    directiva: {
      presidente: "Guillermo Ramírez Diez",
      secretario_general: "Juan Antonio Coloma Álamos",
      declaracion_patrimonio_url: "https://www.infoprobidad.cl/Resultados?busqueda=Guillermo%20Ramirez",
      fuente_declaracion: "InfoProbidad · Contraloría General de la República (Ley 20.880 / Ley 19.862)",
    },
    financiamiento_publico: {
      norma_legal: "Ley 20.900 / DFL 4 Ley 18.603",
      resolucion_servel: "Resolución SERVEL Aporte Fiscal Trimestral a Partidos Políticos",
      recibe_aporte_trimestral: true,
      monto_anual_referencia_clp: 1380000000,
      fuente_resolucion_url: "https://www.servel.cl/aportes-trimestrales-a-partidos-politicos/",
    },
    padron_afiliados: {
      total_afiliados: 33218,
      fecha_corte: "31-12-2025",
      fuente_padron_url: "https://www.servel.cl/estadisticas-de-afiliados-a-partidos-politicos/",
    },
  },
  ppd: {
    partido_id: "ppd",
    sigla: "PPD",
    nombre_oficial: "Partido por la Democracia",
    directiva: {
      presidente: "Jaime Quintana Leal",
      secretario_general: "José Toro Kemp",
      declaracion_patrimonio_url: "https://www.infoprobidad.cl/Resultados?busqueda=Jaime%20Quintana",
      fuente_declaracion: "InfoProbidad · Contraloría General de la República (Ley 20.880 / Ley 19.862)",
    },
    financiamiento_publico: {
      norma_legal: "Ley 20.900 / DFL 4 Ley 18.603",
      resolucion_servel: "Resolución SERVEL Aporte Fiscal Trimestral a Partidos Políticos",
      recibe_aporte_trimestral: true,
      monto_anual_referencia_clp: 720000000,
      fuente_resolucion_url: "https://www.servel.cl/aportes-trimestrales-a-partidos-politicos/",
    },
    padron_afiliados: {
      total_afiliados: 27304,
      fecha_corte: "31-12-2025",
      fuente_padron_url: "https://www.servel.cl/estadisticas-de-afiliados-a-partidos-politicos/",
    },
  },
  pc: {
    partido_id: "pc",
    sigla: "PCCh",
    nombre_oficial: "Partido Comunista de Chile",
    directiva: {
      presidente: "Lautaro Carmona Soto",
      secretario_general: "Bárbara Figueroa Sandoval",
      declaracion_patrimonio_url: "https://www.infoprobidad.cl/Resultados?busqueda=Lautaro%20Carmona",
      fuente_declaracion: "InfoProbidad · Contraloría General de la República (Ley 20.880 / Ley 19.862)",
    },
    financiamiento_publico: {
      norma_legal: "Ley 20.900 / DFL 4 Ley 18.603",
      resolucion_servel: "Resolución SERVEL Aporte Fiscal Trimestral a Partidos Políticos",
      recibe_aporte_trimestral: true,
      monto_anual_referencia_clp: 910000000,
      fuente_resolucion_url: "https://www.servel.cl/aportes-trimestrales-a-partidos-politicos/",
    },
    padron_afiliados: {
      total_afiliados: 45719,
      fecha_corte: "31-12-2025",
      fuente_padron_url: "https://www.servel.cl/estadisticas-de-afiliados-a-partidos-politicos/",
    },
  },
  pnl: {
    partido_id: "pnl",
    sigla: "PNL",
    nombre_oficial: "Partido Nacional Libertario",
    directiva: {
      presidente: "Johannes Kaiser Barents-Von Hohenhagen",
      secretario_general: "Ángel Soto",
      declaracion_patrimonio_url: "https://www.infoprobidad.cl/Resultados?busqueda=Johannes%20Kaiser",
      fuente_declaracion: "InfoProbidad · Contraloría General de la República (Ley 20.880 / Ley 19.862)",
    },
    financiamiento_publico: {
      norma_legal: "Ley 20.900 / DFL 4 Ley 18.603",
      resolucion_servel: "— (Sin asignación ordinaria previa de aporte trimestral)",
      recibe_aporte_trimestral: false,
      monto_anual_referencia_clp: null,
      fuente_resolucion_url: "https://www.servel.cl/aportes-trimestrales-a-partidos-politicos/",
    },
    padron_afiliados: {
      total_afiliados: 4150,
      fecha_corte: "31-12-2025",
      fuente_padron_url: "https://www.servel.cl/estadisticas-de-afiliados-a-partidos-politicos/",
    },
  },
};

// ─── 2. MUESTRA DE 10 PARLAMENTARIOS CON DECLARACIONES Y TRANSFERENCIAS ───────
export const TRANSFERENCIAS_PARLAMENTARIOS_MUESTRA: TransferenciaParlamentarioRef[] = [
  {
    politico_id: "dip-johannes-kaiser",
    nombre_completo: "Johannes Kaiser Barents-Von Hohenhagen",
    cargo: "Diputado",
    partido_sigla: "PNL",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Johannes%20Kaiser",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y registro de aportes electorales",
  },
  {
    politico_id: "dip-tomas-de-rementeria",
    nombre_completo: "Tomás De Rementería Venegas",
    cargo: "Diputado",
    partido_sigla: "PS",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Tomas%20De%20Rementeria",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "dip-vlado-mirosevic",
    nombre_completo: "Vlado Mirosevic Verdugo",
    cargo: "Diputado",
    partido_sigla: "PL",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Vlado%20Mirosevic",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "dip-gonzalo-winter",
    nombre_completo: "Gonzalo Winter Etcheberry",
    cargo: "Diputado",
    partido_sigla: "FA",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Gonzalo%20Winter",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "dip-diego-schalper",
    nombre_completo: "Diego Schalper Sepúlveda",
    cargo: "Diputado",
    partido_sigla: "RN",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Diego%20Schalper",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "dip-guillermo-ramirez",
    nombre_completo: "Guillermo Ramírez Diez",
    cargo: "Diputado",
    partido_sigla: "UDI",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Guillermo%20Ramirez",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "sen-jaime-quintana",
    nombre_completo: "Jaime Quintana Leal",
    cargo: "Senador",
    partido_sigla: "PPD",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Jaime%20Quintana",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "sen-rodrigo-galilea",
    nombre_completo: "Rodrigo Galilea Vial",
    cargo: "Senador",
    partido_sigla: "RN",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Rodrigo%20Galilea",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "dip-daniel-manouchehri",
    nombre_completo: "Daniel Manouchehri Moghadam Kashan Lobos",
    cargo: "Diputado",
    partido_sigla: "PS",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Daniel%20Manouchehri",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
  {
    politico_id: "dip-karol-cariola",
    nombre_completo: "Karol Cariola Oliva",
    cargo: "Diputada",
    partido_sigla: "PC",
    tipo_declaracion: "Declaración de Intereses y Patrimonio / Rendición SERVEL",
    organismo_revisor: "CGR · CPLT · SERVEL",
    url_declaracion_oficial: "https://www.infoprobidad.cl/Resultados?busqueda=Karol%20Cariola",
    monto_declarado_clp: null,
    detalle_financiamiento: "Declaración jurada de patrimonio e intereses Ley 20.880 y rendición electoral",
  },
];

// ─── 3. ANCLAS DE CRUCES DE DATOS (MUESTRAS DE 5 POR FUENTE) ─────────────────
export const CRUCES_CGR_MUESTRA: CruceAuditoriaRef[] = [
  {
    id: "contraloria-cgr-audit-2024-704-02b47712b982b04d",
    numero_informe: "704/2024",
    entidad: "MUNICIPALIDAD DE CHILLAN",
    tipo: "Informe/Oficio de Seguimiento",
    fecha: "2026-07-30",
    url_oficial: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme?docIdcm=1ab8376ca4b3c4fd53dc753f5af3575d",
  },
  {
    id: "contraloria-cgr-audit-2025-249-2aca1db8ae5502cd",
    numero_informe: "249/2025",
    entidad: "DELEGACION PRESIDENCIAL PROVINCIAL DE ITATA",
    tipo: "Informe/Oficio de Seguimiento",
    fecha: "2026-07-30",
    url_oficial: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme?docIdcm=92ef58e0bb8f4b7163215151a742b39f",
  },
  {
    id: "contraloria-cgr-audit-2025-540-4a766417fc86e1c3",
    numero_informe: "540/2025",
    entidad: "CARABINEROS DE CHILE",
    tipo: "Informe de Investigación Especial",
    fecha: "2026-07-30",
    url_oficial: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme?docIdcm=8b269eb5e9201268ad2e876f89d1ae25",
  },
  {
    id: "contraloria-cgr-audit-2025-654-1501a471c96b5374",
    numero_informe: "654/2025",
    entidad: "MUNICIPALIDAD DE ANTOFAGASTA",
    tipo: "Informe/Oficio de Seguimiento",
    fecha: "2026-07-30",
    url_oficial: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme?docIdcm=d93d00d345276cbd77843edbddc21759",
  },
  {
    id: "contraloria-cgr-audit-2024-564-c2db6a896e8a992c",
    numero_informe: "564/2024",
    entidad: "MUNICIPALIDAD DE SAN CARLOS",
    tipo: "Informe/Oficio de Seguimiento",
    fecha: "2026-07-29",
    url_oficial: "https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newDetalleInforme?docIdcm=bd1dda7bfcfc4c6315c275581597b084",
  },
];

export const CRUCES_CHILECOMPRA_MUESTRA: CruceChileCompraRef[] = [
  {
    rut_juridico: "61.608.700-2",
    organismo_comprador: "SUBSECRETARÍA DE SALUD PÚBLICA",
    monto_total_clp: 1267154645025,
    procesos: 966,
    fuente_url: "https://datos.mercadopublico.cl/",
  },
  {
    rut_juridico: "61.603.000-0",
    organismo_comprador: "FONDO NACIONAL DE SALUD (FONASA)",
    monto_total_clp: 345667590259,
    procesos: 351,
    fuente_url: "https://datos.mercadopublico.cl/",
  },
  {
    rut_juridico: "60.908.000-0",
    organismo_comprador: "JUNTA NACIONAL DE AUXILIO ESCOLAR Y BECAS (JUNAEB)",
    monto_total_clp: 320132779279,
    procesos: 348,
    fuente_url: "https://datos.mercadopublico.cl/",
  },
  {
    rut_juridico: "61.202.000-0",
    organismo_comprador: "DIRECCIÓN GENERAL DE OBRAS PÚBLICAS (MOP)",
    monto_total_clp: 260206344550,
    procesos: 9179,
    fuente_url: "https://datos.mercadopublico.cl/",
  },
  {
    rut_juridico: "61.608.600-6",
    organismo_comprador: "CENTRAL DE ABASTECIMIENTO DEL S.N.S.S. (CENABAST)",
    monto_total_clp: 100516673983,
    procesos: 90,
    fuente_url: "https://datos.mercadopublico.cl/",
  },
];

export const CRUCES_INFOLOBBY_MUESTRA: CruceInfoLobbyRef[] = [
  {
    id: "infolobby-ac0019366881-pasivo-AC001894114",
    fecha: "2026-07-09",
    organismo: "SUBSECRETARÍA DE RELACIONES EXTERIORES",
    sujeto_pasivo: "Francisco Pérez Mackenna",
    cargo: "Ministro",
    url_audiencia: "http://datos.infolobby.cl/infolobby/registroaudiencia/ac0019366881",
  },
  {
    id: "infolobby-ac0019366451-pasivo-AC001894114",
    fecha: "2026-07-07",
    organismo: "SUBSECRETARÍA DE RELACIONES EXTERIORES",
    sujeto_pasivo: "Francisco Pérez Mackenna",
    cargo: "Ministro",
    url_audiencia: "http://datos.infolobby.cl/infolobby/registroaudiencia/ac0019366451",
  },
  {
    id: "infolobby-ah0018897301-pasivo-AH001894485",
    fecha: "2026-03-18",
    organismo: "SUBSECRETARÍA DE ECONOMÍA",
    sujeto_pasivo: "Daniel Mas Valdés",
    cargo: "Ministro",
    url_audiencia: "http://datos.infolobby.cl/infolobby/registroaudiencia/ah0018897301",
  },
  {
    id: "infolobby-as0018908771-pasivo-AS001893873",
    fecha: "2026-03-13",
    organismo: "SUBSECRETARÍA DE MINERÍA",
    sujeto_pasivo: "Daniel Mas Valdés",
    cargo: "Ministro",
    url_audiencia: "http://datos.infolobby.cl/infolobby/registroaudiencia/as0018908771",
  },
  {
    id: "infolobby-ac0019366161-pasivo-AC001894114",
    fecha: "2026-07-07",
    organismo: "SUBSECRETARÍA DE RELACIONES EXTERIORES",
    sujeto_pasivo: "Francisco Pérez Mackenna",
    cargo: "Ministro",
    url_audiencia: "http://datos.infolobby.cl/infolobby/registroaudiencia/ac0019366161",
  },
];

export const CRUCES_LEY19862_MUESTRA: CruceLey19862Ref[] = [
  {
    id: "ley-19862-transfer-4571380",
    fecha: "2026-01-02",
    emitter_name: "MUNICIPALIDAD DE ANDACOLLO",
    emitter_rut: "69.040.400-1",
    receiver_name: "AGRUPACION DEPORTIVA COLOCOLINA DE ANDACOLLO",
    receiver_rut: "65.046.576-8",
    monto_clp: 2000000,
    url_transferencia: "https://registros19862.gob.cl/transferencia/4571380",
  },
  {
    id: "ley-19862-transfer-4585076",
    fecha: "2026-01-02",
    emitter_name: "SUBSECRETARÍA DE TRANSPORTES",
    emitter_rut: "61.979.750-7",
    receiver_name: "VIÑA BUS S.A.",
    receiver_rut: "76.449.230-7",
    monto_clp: 347920910,
    url_transferencia: "https://registros19862.gob.cl/transferencia/4585076",
  },
  {
    id: "ley-19862-transfer-4585077",
    fecha: "2026-01-02",
    emitter_name: "SUBSECRETARÍA DE TRANSPORTES",
    emitter_rut: "61.979.750-7",
    receiver_name: "TRANSPORTES SOL Y MAR S.A.",
    receiver_rut: "76.415.210-7",
    monto_clp: 198329345,
    url_transferencia: "https://registros19862.gob.cl/transferencia/4585077",
  },
  {
    id: "ley-19862-transfer-4585078",
    fecha: "2026-01-02",
    emitter_name: "SUBSECRETARÍA DE TRANSPORTES",
    emitter_rut: "61.979.750-7",
    receiver_name: "VIÑA BUS S.A.",
    receiver_rut: "76.449.230-7",
    monto_clp: 176656174,
    url_transferencia: "https://registros19862.gob.cl/transferencia/4585078",
  },
  {
    id: "ley-19862-transfer-4585079",
    fecha: "2026-01-02",
    emitter_name: "SUBSECRETARÍA DE TRANSPORTES",
    emitter_rut: "61.979.750-7",
    receiver_name: "BUSES DEL GRAN VALPARAISO S.A",
    receiver_rut: "76.465.310-6",
    monto_clp: 219462458,
    url_transferencia: "https://registros19862.gob.cl/transferencia/4585079",
  },
];

export function getPartidoTransparencia(partidoId: string): PartidoTransparenciaOficial | null {
  const norm = partidoId.toLowerCase().trim();
  return PARTIDOS_TRANSPARENCIA_MUESTRA[norm] ?? null;
}
