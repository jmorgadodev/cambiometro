/**
 * lib/movimientos.ts
 * Catálogo canónico de movimientos de altas autoridades generado por el pipeline nocturno (03:00 CLT).
 * Modelo Multifuente: Detección temprana de terceros + Verificación estricta por decreto oficial (Ley Chile / Diario Oficial).
 */

export type MovimientoTipo =
  | "renuncia"
  | "cese"
  | "remocion"
  | "cambio"
  | "cambio-puesto"
  | "enroque"
  | "cambio-mando"
  | "reasuncion"
  | "nombramiento"
  | "designacion"
  | "confirmacion"
  | "creacion"
  | "fallido"
  | "nombramiento-fallido";

export type MovimientoNivelFuente = "oficial" | "semioficial" | "prensa" | "senal_tercero";
export type MovimientoEstado = "verificado" | "verificado_oficial" | "corroborado" | "detectado" | "en_confirmacion";
export type MovimientoMotivoCategoria =
  | "No informado"
  | "Renuncia pedida por el Gobierno"
  | "Remoción"
  | "Contraloría/irregularidad"
  | "Conflictos internos"
  | "Conductas indebidas"
  | "Cambio dentro del gobierno"
  | "Cuestionamiento de gestión"
  | "Fin de período";

export interface MovimientoFuente {
  nivel: MovimientoNivelFuente;
  medio: string;
  url: string;
  fecha: string;
  titulo: string;
}

export interface MovimientoCgrInforme {
  numero: string;
  titulo: string;
  url: string;
}

export interface MovimientoSaliente {
  nombre: string;
  fecha: string;
  fecha_inicio?: string;
  dias_en_cargo?: number | null;
  dias_en_cargo_origen?: "oficial" | "estimado";
  motivo_categoria: MovimientoMotivoCategoria;
  motivo_texto: string;
}

export interface MovimientoEntrante {
  nombre: string;
  fecha: string;
}

export interface Movimiento {
  id: string;
  tipo_evento: MovimientoTipo;
  cargo: string;
  organismo: string;
  ministerio: string;
  region: string;
  salio?: MovimientoSaliente;
  entro?: MovimientoEntrante;
  cgr_informe?: MovimientoCgrInforme;
  dias_en_cargo?: number | null;
  dias_en_cargo_origen?: "oficial" | "estimado";
  decreto_url?: string;
  id_norma?: string;
  decreto_numero?: string;
  detectado_por?: string;
  documento_pendiente?: boolean;
  fuentes: MovimientoFuente[];
  estado: MovimientoEstado;
  fecha_deteccion: string;
  fecha_verificacion: string | null;
  // Campos de compatibilidad
  fecha: string;
  fechaExacta: boolean;
  tipo: MovimientoTipo;
  organo: string;
  saliente?: string;
  entrante?: string;
  motivo: string;
  fuente?: string;
  verificado: boolean;
}

export const MOTIVOS_CATEGORIAS: MovimientoMotivoCategoria[] = [
  "No informado",
  "Renuncia pedida por el Gobierno",
  "Remoción",
  "Contraloría/irregularidad",
  "Conflictos internos",
  "Conductas indebidas",
  "Cambio dentro del gobierno",
  "Cuestionamiento de gestión",
  "Fin de período"
];

export const MOVIMIENTOS_TIPO_LABEL: Record<MovimientoTipo, string> = {
  renuncia: "Renuncia",
  cese: "Cese",
  remocion: "Remoción",
  cambio: "Cambio de puesto",
  "cambio-puesto": "Cambio de puesto",
  enroque: "Enroque",
  "cambio-mando": "Cambio de mando",
  reasuncion: "Reasunción",
  nombramiento: "Nombramiento",
  designacion: "Designación",
  confirmacion: "Confirmación",
  creacion: "Creación",
  fallido: "Nombramiento fallido",
  "nombramiento-fallido": "Nombramiento fallido",
};

export const MOVIMIENTOS_TIPO_COLOR: Record<MovimientoTipo, string> = {
  renuncia: "var(--alert)",
  cese: "var(--alert)",
  remocion: "var(--alert)",
  cambio: "var(--info)",
  "cambio-puesto": "var(--info)",
  enroque: "var(--info)",
  "cambio-mando": "var(--info)",
  reasuncion: "var(--info)",
  nombramiento: "var(--ok)",
  designacion: "var(--ok)",
  confirmacion: "var(--ok)",
  creacion: "var(--ok)",
  fallido: "var(--text-muted)",
  "nombramiento-fallido": "var(--text-muted)",
};

export const MOVIMIENTOS_TIPO_EMOJI: Record<MovimientoTipo, string> = {
  renuncia: "🚪",
  cese: "🚫",
  remocion: "🚫",
  cambio: "🔀",
  "cambio-puesto": "🔀",
  designacion: "✅",
  nombramiento: "✅",
  reasuncion: "🔄",
  confirmacion: "🔒",
  "cambio-mando": "🏛️",
  creacion: "🆕",
  enroque: "🔀",
  fallido: "⚠️",
  "nombramiento-fallido": "⚠️",
};

export const MOVIMIENTOS_PIPELINE_METADATA = {
  last_run: "2026-08-17T03:00:00-04:00",
  frecuencia: "Diario 03:00 CLT",
  conectores: {
  "t1_ley_chile": {
    "nombre": "etl_ley_chile",
    "descripcion": "Decretos de nombramiento, renuncia y remoción indexados con idNorma BCN / Diario Oficial",
    "frecuencia": "Diaria 03:00 CLT",
    "estado": "Conectado y activo"
  },
  "t1_diario_oficial": {
    "nombre": "etl_diario_oficial",
    "descripcion": "Decretos de nombramiento, renuncia y remoción del Diario Oficial de Chile",
    "frecuencia": "Diaria 03:00 CLT",
    "estado": "Conectado y activo"
  }
},
  fuentes_monitoreadas: {
  "t1_oficial": [
    "Ley Chile (Biblioteca del Congreso Nacional - idNorma)",
    "Diario Oficial de Chile (etl_diario_oficial)",
    "Prensa Presidencia",
    "SEGPRES",
    "Contraloría General SIAPER"
  ],
  "t2_semioficial": [
    "CPLT Nóminas Gabinete",
    "InfoProbidad DIPs",
    "InfoLobby"
  ],
  "t3_prensa": [
    "La Tercera",
    "Emol",
    "BioBioChile",
    "CNN Chile",
    "Cooperativa",
    "Chilevisión",
    "T13",
    "renunciaskast.cl (Señal externa de monitoreo)"
  ]
},
  stats: {
  "total_movimientos": 25,
  "verificados": 23,
  "en_confirmacion": 2,
  "ultimos_7_dias": 5,
  "con_cgr_vinculado": 2
}
};

export const MOVIMIENTOS: Movimiento[] = [
  {
    "id": "mov-038",
    "tipo_evento": "renuncia",
    "cargo": "Secretario Regional Ministerial de Transportes de Valparaíso",
    "organismo": "SEREMI de Transportes y Telecomunicaciones de Valparaíso",
    "ministerio": "Ministerio de Transportes y Telecomunicaciones",
    "region": "Región de Valparaíso",
    "salio": {
      "nombre": "Benjamín Silva Álvarez",
      "fecha": "2026-08-15",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Conflictos internos",
      "motivo_texto": "Presentó su renuncia al cargo aduciendo discrepancias en el diseño de bases de licitación del transporte metropolitano regional.",
      "dias_en_cargo": 157,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Claudia Lagos Oteíza (Subrogante)",
      "fecha": "2026-08-15"
    },
    "decreto_url": "https://www.mtt.gob.cl/noticias/renuncia-seremi-transportes-valparaiso-agosto-2026",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Ministerio de Transportes y Telecomunicaciones",
        "url": "https://www.mtt.gob.cl/noticias/renuncia-seremi-transportes-valparaiso-agosto-2026",
        "fecha": "2026-08-15",
        "titulo": "Resolución MTT N° 630: Acepta renuncia voluntaria de SEREMI de Transportes de Valparaíso"
      },
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/region-de-valparaiso/valparaiso/2026/08/15/renuncia-seremi-transportes-valparaiso.shtml",
        "fecha": "2026-08-15",
        "titulo": "SEREMI de Transportes de Valparaíso presenta su renuncia al cargo"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-08-15T12:00:00-04:00",
    "fecha_verificacion": "2026-08-15T17:30:00-04:00",
    "dias_en_cargo": 157,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-08-15",
    "fechaExacta": true,
    "tipo": "renuncia",
    "organo": "SEREMI de Transportes y Telecomunicaciones de Valparaíso",
    "saliente": "Benjamín Silva Álvarez",
    "entrante": "Claudia Lagos Oteíza (Subrogante)",
    "motivo": "Presentó su renuncia al cargo aduciendo discrepancias en el diseño de bases de licitación del transporte metropolitano regional.",
    "fuente": "Ministerio de Transportes y Telecomunicaciones (2026-08-15) · BioBioChile (2026-08-15)",
    "verificado": true
  },
  {
    "id": "mov-036",
    "tipo_evento": "remocion",
    "cargo": "Delegado Presidencial Regional de Atacama",
    "organismo": "Delegación Presidencial Regional de Atacama",
    "ministerio": "Ministerio del Interior y Seguridad Pública",
    "region": "Región de Atacama",
    "salio": {
      "nombre": "Rodrigo Urrejola Silva",
      "fecha": "2026-08-14",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Renuncia pedida por el Gobierno",
      "motivo_texto": "El Ministerio del Interior solicitó la renuncia al delegado presidencial tras controversias de coordinación en materia de orden público regional y desacuerdos con autoridades comunales.",
      "dias_en_cargo": 156,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Carla Guaita Carrizo (Delegada Presidencial Regional Titular)",
      "fecha": "2026-08-14"
    },
    "decreto_url": "https://www.interior.gob.cl/noticias/2026/08/14/designacion-nueva-delegada-presidencial-atacama",
    "decreto_numero": "Decreto Interior N° 412/2026",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Ministerio del Interior (Decreto Supremo Diario Oficial)",
        "url": "https://www.interior.gob.cl/noticias/2026/08/14/designacion-nueva-delegada-presidencial-atacama",
        "fecha": "2026-08-14",
        "titulo": "Decreto Interior N° 412/2026: Nombra Delegada Presidencial Regional de Atacama"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/interior-pide-renuncia-a-delegado-presidencial-de-atacama-rodrigo-urrejola/20260814/",
        "fecha": "2026-08-14",
        "titulo": "Ministerio del Interior solicita renuncia al delegado presidencial de Atacama Rodrigo Urrejola"
      },
      {
        "nivel": "prensa",
        "medio": "Cooperativa",
        "url": "https://cooperativa.cl/noticias/pais/region-de-atacama/gobierno-remueve-a-delegado-presidencial-de-atacama-rodrigo-urrejola/2026-08-14/142010.html",
        "fecha": "2026-08-14",
        "titulo": "Gobierno remueve a delegado presidencial de Atacama Rodrigo Urrejola y nombra a Carla Guaita"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-08-14T10:15:00-04:00",
    "fecha_verificacion": "2026-08-14T16:00:00-04:00",
    "dias_en_cargo": 156,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-08-14",
    "fechaExacta": true,
    "tipo": "remocion",
    "organo": "Delegación Presidencial Regional de Atacama",
    "saliente": "Rodrigo Urrejola Silva",
    "entrante": "Carla Guaita Carrizo (Delegada Presidencial Regional Titular)",
    "motivo": "El Ministerio del Interior solicitó la renuncia al delegado presidencial tras controversias de coordinación en materia de orden público regional y desacuerdos con autoridades comunales.",
    "fuente": "Ministerio del Interior (Decreto Supremo Diario Oficial) (2026-08-14) · La Tercera (2026-08-14) · Cooperativa (2026-08-14)",
    "verificado": true
  },
  {
    "id": "mov-035",
    "tipo_evento": "renuncia",
    "cargo": "Subsecretaria del Deporte",
    "organismo": "Subsecretaría del Deporte",
    "ministerio": "Ministerio del Deporte",
    "region": "Región Metropolitana de Santiago",
    "salio": {
      "nombre": "Natalia Duco Soler",
      "fecha": "2026-08-13",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Cuestionamiento de gestión",
      "motivo_texto": "Presentó su renuncia al cargo tras observaciones parlamentarias sobre ritmo de ejecución presupuestaria en recintos deportivos y diferencias de criterio con la conducción ministerial.",
      "dias_en_cargo": 155,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Galo Lara Correa (Subrogante)",
      "fecha": "2026-08-13"
    },
    "decreto_url": "https://www.bcn.cl/leychile/navegar?idNorma=1215432",
    "id_norma": "1215432",
    "decreto_numero": "D.S. N° 84 MINDEP",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Ley Chile / BCN - Diario Oficial",
        "url": "https://www.bcn.cl/leychile/navegar?idNorma=1215432",
        "fecha": "2026-08-13",
        "titulo": "Decreto Supremo N° 84 MINDEP: Acepta renuncia voluntaria de Subsecretaria del Deporte y designa subrogancia"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/natalia-duco-presenta-renuncia-como-subsecretaria-del-deporte/20260814/",
        "fecha": "2026-08-14",
        "titulo": "Natalia Duco presenta su renuncia como subsecretaria del Deporte tras reparos en gestión presupuestaria"
      },
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/nacional/chile/2026/08/14/renuncia-subsecretaria-deporte-natalia-duco.shtml",
        "fecha": "2026-08-14",
        "titulo": "Gobierno acepta renuncia de Natalia Duco a la Subsecretaría del Deporte"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-08-13T11:30:00-04:00",
    "fecha_verificacion": "2026-08-13T15:45:00-04:00",
    "dias_en_cargo": 155,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-08-13",
    "fechaExacta": true,
    "tipo": "renuncia",
    "organo": "Subsecretaría del Deporte",
    "saliente": "Natalia Duco Soler",
    "entrante": "Galo Lara Correa (Subrogante)",
    "motivo": "Presentó su renuncia al cargo tras observaciones parlamentarias sobre ritmo de ejecución presupuestaria en recintos deportivos y diferencias de criterio con la conducción ministerial.",
    "fuente": "Ley Chile / BCN - Diario Oficial (2026-08-13) · La Tercera (2026-08-14) · BioBioChile (2026-08-14)",
    "verificado": true
  },
  {
    "id": "mov-037",
    "tipo_evento": "designacion",
    "cargo": "Directora Nacional del Servicio Nacional del Patrimonio Cultural (SERPAT)",
    "organismo": "Servicio Nacional del Patrimonio Cultural",
    "ministerio": "Ministerio de las Culturas, las Artes y el Patrimonio",
    "region": "Nacional",
    "salio": {
      "nombre": "Nélida Pozo Kudo",
      "fecha": "2026-08-12",
      "fecha_inicio": "2023-08-01",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Conclusión de período estatutario y concurso de Alta Dirección Pública.",
      "dias_en_cargo": 1107,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Paulina Soto Labbé",
      "fecha": "2026-08-12"
    },
    "decreto_url": "https://www.cultura.gob.cl/noticias/nombramiento-nueva-directora-serpat-agosto-2026",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Servicio Civil / Ministerio de las Culturas",
        "url": "https://www.cultura.gob.cl/noticias/nombramiento-nueva-directora-serpat-agosto-2026",
        "fecha": "2026-08-12",
        "titulo": "Resolución Exenta N° 852: Nombra Directora Nacional del SERPAT"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/cultura/noticia/paulina-soto-asume-direccion-del-servicio-nacional-del-patrimonio/20260812/",
        "fecha": "2026-08-12",
        "titulo": "Paulina Soto asume como nueva Directora Nacional del Servicio Nacional del Patrimonio Cultural"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-08-12T09:30:00-04:00",
    "fecha_verificacion": "2026-08-12T14:15:00-04:00",
    "dias_en_cargo": 1107,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-08-12",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Servicio Nacional del Patrimonio Cultural",
    "saliente": "Nélida Pozo Kudo",
    "entrante": "Paulina Soto Labbé",
    "motivo": "Conclusión de período estatutario y concurso de Alta Dirección Pública.",
    "fuente": "Servicio Civil / Ministerio de las Culturas (2026-08-12) · La Tercera (2026-08-12)",
    "verificado": true
  },
  {
    "id": "mov-042",
    "tipo_evento": "designacion",
    "cargo": "Embajador de Chile en los Estados Unidos",
    "organismo": "Embajada de Chile en Washington D.C.",
    "ministerio": "Ministerio de Relaciones Exteriores (MINREL)",
    "region": "Internacional",
    "salio": {
      "nombre": "Juan Gabriel Valdés Soublette",
      "fecha": "2026-08-10",
      "fecha_inicio": "2022-04-01",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Término de misión diplomática y recambio de representación diplomática en el exterior.",
      "dias_en_cargo": 1592,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Rodrigo Yáñez Benítez",
      "fecha": "2026-08-10"
    },
    "decreto_url": "https://www.minrel.gob.cl/noticias/designacion-nuevo-embajador-eeuu-agosto-2026",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Ministerio de Relaciones Exteriores (Comunicado y Decreto)",
        "url": "https://www.minrel.gob.cl/noticias/designacion-nuevo-embajador-eeuu-agosto-2026",
        "fecha": "2026-08-10",
        "titulo": "MINREL: Gobierno de los Estados Unidos otorga beneplácito a nuevo Embajador de Chile"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/rodrigo-yanez-nuevo-embajador-de-chile-en-estados-unidos/20260810/",
        "fecha": "2026-08-10",
        "titulo": "Ex subsecretario Rodrigo Yáñez asume como nuevo embajador de Chile en Washington"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-08-10T10:00:00-04:00",
    "fecha_verificacion": "2026-08-10T15:00:00-04:00",
    "dias_en_cargo": 1592,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-08-10",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Embajada de Chile en Washington D.C.",
    "saliente": "Juan Gabriel Valdés Soublette",
    "entrante": "Rodrigo Yáñez Benítez",
    "motivo": "Término de misión diplomática y recambio de representación diplomática en el exterior.",
    "fuente": "Ministerio de Relaciones Exteriores (Comunicado y Decreto) (2026-08-10) · La Tercera (2026-08-10)",
    "verificado": true
  },
  {
    "id": "mov-041",
    "tipo_evento": "renuncia",
    "cargo": "Secretario Regional Ministerial de Educación del Biobío",
    "organismo": "SEREMI de Educación del Biobío",
    "ministerio": "Ministerio de Educación",
    "region": "Región del Biobío",
    "salio": {
      "nombre": "Carlos Vega Santander",
      "fecha": "2026-08-05",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Cuestionamiento de gestión",
      "motivo_texto": "Presentó su renuncia tras críticas de gremios de profesores y alcaldes por la asignación de fondos de emergencia para infraestructura escolar en la provincia de Arauco.",
      "dias_en_cargo": 147,
      "dias_en_cargo_origen": "estimado"
    },
    "entro": {
      "nombre": "Marcela Saavedra Rivas (Subrogante)",
      "fecha": "2026-08-05"
    },
    "detectado_por": "renunciaskast.cl / BioBioChile",
    "fuentes": [
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/nacional/region-del-bio-bio/2026/08/05/renuncia-seremi-educacion-biobio.shtml",
        "fecha": "2026-08-05",
        "titulo": "Renuncia Seremi de Educación del Biobío tras discrepancias por fondos de emergencia escolar"
      },
      {
        "nivel": "prensa",
        "medio": "Cooperativa",
        "url": "https://cooperativa.cl/noticias/pais/region-del-biobio/educacion/seremi-de-educacion-del-biobio-presenta-su-renuncia-al-cargo/2026-08-05/112000.html",
        "fecha": "2026-08-05",
        "titulo": "Seremi de Educación del Biobío presentó renuncia indeclinable"
      }
    ],
    "estado": "en_confirmacion",
    "fecha_deteccion": "2026-08-05T11:00:00-04:00",
    "fecha_verificacion": null,
    "dias_en_cargo": 147,
    "dias_en_cargo_origen": "estimado",
    "documento_pendiente": false,
    "fecha": "2026-08-05",
    "fechaExacta": true,
    "tipo": "renuncia",
    "organo": "SEREMI de Educación del Biobío",
    "saliente": "Carlos Vega Santander",
    "entrante": "Marcela Saavedra Rivas (Subrogante)",
    "motivo": "Presentó su renuncia tras críticas de gremios de profesores y alcaldes por la asignación de fondos de emergencia para infraestructura escolar en la provincia de Arauco.",
    "fuente": "BioBioChile (2026-08-05) · Cooperativa (2026-08-05)",
    "verificado": false
  },
  {
    "id": "mov-044",
    "tipo_evento": "cambio",
    "cargo": "Coordinadora de Finanzas Internacionales y Macroeconomía",
    "organismo": "Ministerio de Hacienda",
    "ministerio": "Ministerio de Hacienda",
    "region": "Nacional",
    "salio": {
      "nombre": "Andrés Sansone",
      "fecha": "2026-07-23",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Cambio dentro del gobierno",
      "motivo_texto": "Reasignación de funciones en la coordinación macroeconómica y de deuda pública del Ministerio de Hacienda.",
      "dias_en_cargo": 134,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Carola Moreno",
      "fecha": "2026-07-23"
    },
    "decreto_url": "https://www.bcn.cl/leychile/navegar?idNorma=1214890",
    "id_norma": "1214890",
    "decreto_numero": "D.S. N° 312 Hacienda",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Ley Chile / BCN - Diario Oficial",
        "url": "https://www.bcn.cl/leychile/navegar?idNorma=1214890",
        "fecha": "2026-07-23",
        "titulo": "Decreto Supremo N° 312 Hacienda: Designa Coordinadora de Finanzas Internacionales"
      },
      {
        "nivel": "prensa",
        "medio": "Emol",
        "url": "https://www.emol.com/noticias/Economia/2026/07/23/1136450/ajustes-ministerio-hacienda.html",
        "fecha": "2026-07-23",
        "titulo": "Hacienda anuncia ajuste en coordinación de finanzas internacionales y equipo asesor"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-07-23T10:00:00-04:00",
    "fecha_verificacion": "2026-07-23T14:30:00-04:00",
    "dias_en_cargo": 134,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-07-23",
    "fechaExacta": true,
    "tipo": "cambio",
    "organo": "Ministerio de Hacienda",
    "saliente": "Andrés Sansone",
    "entrante": "Carola Moreno",
    "motivo": "Reasignación de funciones en la coordinación macroeconómica y de deuda pública del Ministerio de Hacienda.",
    "fuente": "Ley Chile / BCN - Diario Oficial (2026-07-23) · Emol (2026-07-23)",
    "verificado": true
  },
  {
    "id": "mov-039",
    "tipo_evento": "remocion",
    "cargo": "Secretario Regional Ministerial de Salud de Antofagasta",
    "organismo": "SEREMI de Salud de Antofagasta",
    "ministerio": "Ministerio de Salud",
    "region": "Región de Antofagasta",
    "salio": {
      "nombre": "Alberto Godoy Muñoz",
      "fecha": "2026-07-20",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Contraloría/irregularidad",
      "motivo_texto": "Removido del cargo tras auditoría especial de la Contraloría Regional de Antofagasta (SIAPER) que detectó irregularidades en contrataciones directas.",
      "dias_en_cargo": 131,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Javiera Meneses Castro",
      "fecha": "2026-07-22"
    },
    "cgr_informe": {
      "numero": "INF-CGR-SIAPER-ANT-042/2026",
      "titulo": "Auditoría especial a adquisiciones y deber de probidad en SEREMI Salud Antofagasta",
      "url": "https://www.contraloria.cl/pdf/informe-siaper-seremi-salud-antofagasta-2026.pdf"
    },
    "decreto_url": "https://www.diariooficial.cl/decreto-salud-remocion-seremi-antofagasta-2026",
    "decreto_numero": "D.S. Salud N° 489",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Contraloría General de la República (SIAPER)",
        "url": "https://www.contraloria.cl/pdf/informe-siaper-seremi-salud-antofagasta-2026.pdf",
        "fecha": "2026-07-20",
        "titulo": "Informe SIAPER N° 42/2026: Auditoría especial a adquisiciones y deber de probidad en SEREMI Salud Antofagasta"
      },
      {
        "nivel": "oficial",
        "medio": "Diario Oficial de la República de Chile",
        "url": "https://www.diariooficial.cl/decreto-salud-remocion-seremi-antofagasta-2026",
        "fecha": "2026-07-22",
        "titulo": "Decreto Supremo Salud N° 489: Remueve a don Alberto Godoy y nombra Secretaria Regional Ministerial"
      },
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/nacional/region-de-antofagasta/2026/07/20/remueven-seremi-salud-antofagasta-contraloria.shtml",
        "fecha": "2026-07-20",
        "titulo": "Gobierno remueve a Seremi de Salud de Antofagasta tras informe reservado de Contraloría"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-07-20T11:00:00-04:00",
    "fecha_verificacion": "2026-07-22T08:30:00-04:00",
    "dias_en_cargo": 131,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-07-20",
    "fechaExacta": true,
    "tipo": "remocion",
    "organo": "SEREMI de Salud de Antofagasta",
    "saliente": "Alberto Godoy Muñoz",
    "entrante": "Javiera Meneses Castro",
    "motivo": "Removido del cargo tras auditoría especial de la Contraloría Regional de Antofagasta (SIAPER) que detectó irregularidades en contrataciones directas.",
    "fuente": "Contraloría General de la República (SIAPER) (2026-07-20) · Diario Oficial de la República de Chile (2026-07-22) · BioBioChile (2026-07-20)",
    "verificado": true
  },
  {
    "id": "mov-043",
    "tipo_evento": "remocion",
    "cargo": "Gobernador Regional de Valparaíso (Suspensión e Interinato)",
    "organismo": "Gobierno Regional de Valparaíso",
    "ministerio": "Gobierno Regional (Descentralizado)",
    "region": "Región de Valparaíso",
    "salio": {
      "nombre": "Rodrigo Mundaca Cabrera",
      "fecha": "2026-07-01",
      "fecha_inicio": "2021-07-14",
      "motivo_categoria": "Contraloría/irregularidad",
      "motivo_texto": "Suspensión temporal del cargo decretada por el TRICEL tras dictamen sancionatorio de la Contraloría General de la República por convenios regionales observados.",
      "dias_en_cargo": 1813,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Natalia Silva Echeverría (Gobernadora Suplente)",
      "fecha": "2026-07-01"
    },
    "cgr_informe": {
      "numero": "INF-CGR-SIAPER-VAL-019/2026",
      "titulo": "Dictamen Final N° 19/2026 sobre Responsabilidad Administrativa en Convenios del GORE Valparaíso",
      "url": "https://www.contraloria.cl/pdf/informe-siaper-gore-valparaiso-2026.pdf"
    },
    "decreto_url": "https://www.contraloria.cl/pdf/informe-siaper-gore-valparaiso-2026.pdf",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Contraloría General de la República (SIAPER)",
        "url": "https://www.contraloria.cl/pdf/informe-siaper-gore-valparaiso-2026.pdf",
        "fecha": "2026-07-01",
        "titulo": "Dictamen SIAPER N° 19/2026: Medidas disciplinarias en convenios del GORE Valparaíso"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/tricel-suspende-a-gobernador-mundaca-tras-dictamen-de-contraloria/20260701/",
        "fecha": "2026-07-01",
        "titulo": "TRICEL suspende de funciones a gobernador regional de Valparaíso tras dictamen de CGR"
      },
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/region-de-valparaiso/valparaiso/2026/07/01/suspension-gobernador-mundaca.shtml",
        "fecha": "2026-07-01",
        "titulo": "Consejo Regional de Valparaíso ratifica a gobernadora suplente tras fallo"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-07-01T12:00:00-04:00",
    "fecha_verificacion": "2026-07-01T17:00:00-04:00",
    "dias_en_cargo": 1813,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-07-01",
    "fechaExacta": true,
    "tipo": "remocion",
    "organo": "Gobierno Regional de Valparaíso",
    "saliente": "Rodrigo Mundaca Cabrera",
    "entrante": "Natalia Silva Echeverría (Gobernadora Suplente)",
    "motivo": "Suspensión temporal del cargo decretada por el TRICEL tras dictamen sancionatorio de la Contraloría General de la República por convenios regionales observados.",
    "fuente": "Contraloría General de la República (SIAPER) (2026-07-01) · La Tercera (2026-07-01) · BioBioChile (2026-07-01)",
    "verificado": true
  },
  {
    "id": "mov-040",
    "tipo_evento": "renuncia",
    "cargo": "Delegado Presidencial Provincial de Cordillera",
    "organismo": "Delegación Presidencial Provincial de Cordillera",
    "ministerio": "Ministerio del Interior y Seguridad Pública",
    "region": "Región Metropolitana de Santiago",
    "salio": {
      "nombre": "Gonzalo Montero Viveros",
      "fecha": "2026-06-30",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Cambio dentro del gobierno",
      "motivo_texto": "Deja la delegación provincial para asumir como jefe de gabinete en la Subsecretaría del Interior.",
      "dias_en_cargo": 111,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Mónica Gallardo Paredes",
      "fecha": "2026-06-30"
    },
    "decreto_url": "https://www.interior.gob.cl/noticias/2026/06/30/nombramiento-delegada-provincial-cordillera",
    "decreto_numero": "Decreto Interior N° 388",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Ministerio del Interior (Decreto Supremo)",
        "url": "https://www.interior.gob.cl/noticias/2026/06/30/nombramiento-delegada-provincial-cordillera",
        "fecha": "2026-06-30",
        "titulo": "Decreto Interior N° 388: Nombra Delegada Presidencial Provincial de Cordillera"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/recambio-en-delegacion-provincial-de-cordillera/20260630/",
        "fecha": "2026-06-30",
        "titulo": "Recambio en delegación provincial de Cordillera: Montero asume rol clave en Interior"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-06-30T10:00:00-04:00",
    "fecha_verificacion": "2026-06-30T16:00:00-04:00",
    "dias_en_cargo": 111,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-06-30",
    "fechaExacta": true,
    "tipo": "renuncia",
    "organo": "Delegación Presidencial Provincial de Cordillera",
    "saliente": "Gonzalo Montero Viveros",
    "entrante": "Mónica Gallardo Paredes",
    "motivo": "Deja la delegación provincial para asumir como jefe de gabinete en la Subsecretaría del Interior.",
    "fuente": "Ministerio del Interior (Decreto Supremo) (2026-06-30) · La Tercera (2026-06-30)",
    "verificado": true
  },
  {
    "id": "mov-031",
    "tipo_evento": "remocion",
    "cargo": "Ministra Secretaria General de Gobierno",
    "organismo": "Ministerio Secretaría General de Gobierno",
    "ministerio": "Ministerio Secretaría General de Gobierno (SEGEGOB)",
    "region": "Nacional",
    "salio": {
      "nombre": "Mara Sedini Viancos",
      "fecha": "2026-05-19",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Conflictos internos",
      "motivo_texto": "Salida del gabinete ministerial por discrepancias de coordinación comunicacional estratégica en el comité político.",
      "dias_en_cargo": 69,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Claudio Alvarado Andrade (Biministro Interior · SEGEGOB)",
      "fecha": "2026-05-19"
    },
    "decreto_url": "https://prensa.presidencia.cl/comunicados/ajuste-gabinete-mayo-2026",
    "decreto_numero": "D.S. N° 189 de Presidencia",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Presidencia de la República (Decreto Supremo)",
        "url": "https://prensa.presidencia.cl/comunicados/ajuste-gabinete-mayo-2026",
        "fecha": "2026-05-19",
        "titulo": "Decreto Supremo N° 189: Acepta renuncia de doña Mara Sedini y encomienda SEGEGOB al Ministro del Interior"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/primer-ajuste-de-gabinete-de-kast-salida-de-mara-sedini-y-trinidad-steinert/20260519/",
        "fecha": "2026-05-19",
        "titulo": "Primer ajuste de gabinete de Kast: Mara Sedini deja la vocería y Alvarado asume biministerio"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-05-19T14:30:00-04:00",
    "fecha_verificacion": "2026-05-19T18:00:00-04:00",
    "dias_en_cargo": 69,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-05-19",
    "fechaExacta": true,
    "tipo": "remocion",
    "organo": "Ministerio Secretaría General de Gobierno",
    "saliente": "Mara Sedini Viancos",
    "entrante": "Claudio Alvarado Andrade (Biministro Interior · SEGEGOB)",
    "motivo": "Salida del gabinete ministerial por discrepancias de coordinación comunicacional estratégica en el comité político.",
    "fuente": "Presidencia de la República (Decreto Supremo) (2026-05-19) · La Tercera (2026-05-19)",
    "verificado": true
  },
  {
    "id": "mov-032",
    "tipo_evento": "remocion",
    "cargo": "Ministra de Seguridad Pública",
    "organismo": "Ministerio de Seguridad Pública",
    "ministerio": "Ministerio de Seguridad Pública",
    "region": "Nacional",
    "salio": {
      "nombre": "Trinidad Steinert",
      "fecha": "2026-05-19",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Cuestionamiento de gestión",
      "motivo_texto": "Steinert deja la cartera tras anuncio de interpelación parlamentaria y cuestionamientos por incompatibilidades.",
      "dias_en_cargo": 69,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Martín Arrau García-Huidobro",
      "fecha": "2026-05-19"
    },
    "decreto_url": "https://prensa.presidencia.cl/comunicados/ajuste-gabinete-mayo-2026-seguridad",
    "decreto_numero": "D.S. N° 190 de Presidencia",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Presidencia de la República (Decreto Supremo)",
        "url": "https://prensa.presidencia.cl/comunicados/ajuste-gabinete-mayo-2026-seguridad",
        "fecha": "2026-05-19",
        "titulo": "Decreto Supremo N° 190: Nombra a don Martín Arrau como Ministro de Seguridad Pública"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/martin-arrau-asume-seguridad-publica-tras-salida-de-steinert/20260519/",
        "fecha": "2026-05-19",
        "titulo": "Martín Arrau deja Obras Públicas y asume como nuevo ministro de Seguridad Pública"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-05-19T14:35:00-04:00",
    "fecha_verificacion": "2026-05-19T18:15:00-04:00",
    "dias_en_cargo": 69,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-05-19",
    "fechaExacta": true,
    "tipo": "remocion",
    "organo": "Ministerio de Seguridad Pública",
    "saliente": "Trinidad Steinert",
    "entrante": "Martín Arrau García-Huidobro",
    "motivo": "Steinert deja la cartera tras anuncio de interpelación parlamentaria y cuestionamientos por incompatibilidades.",
    "fuente": "Presidencia de la República (Decreto Supremo) (2026-05-19) · La Tercera (2026-05-19)",
    "verificado": true
  },
  {
    "id": "mov-033",
    "tipo_evento": "cambio",
    "cargo": "Ministro de Obras Públicas",
    "organismo": "Ministerio de Obras Públicas",
    "ministerio": "Ministerio de Obras Públicas (MOP)",
    "region": "Nacional",
    "salio": {
      "nombre": "Martín Arrau García-Huidobro",
      "fecha": "2026-05-19",
      "fecha_inicio": "2026-03-11",
      "motivo_categoria": "Cambio dentro del gobierno",
      "motivo_texto": "Deja Obras Públicas para asumir la conducción del Ministerio de Seguridad Pública.",
      "dias_en_cargo": 69,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Louis de Grange Concha (Biministro MTT · MOP)",
      "fecha": "2026-05-19"
    },
    "decreto_url": "https://prensa.presidencia.cl/comunicados/ajuste-gabinete-mayo-2026-mop",
    "decreto_numero": "D.S. N° 191 de Presidencia",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Presidencia de la República (Decreto Supremo)",
        "url": "https://prensa.presidencia.cl/comunicados/ajuste-gabinete-mayo-2026-mop",
        "fecha": "2026-05-19",
        "titulo": "Decreto Supremo N° 191: Encomienda Ministerio de Obras Públicas al Ministro de Transportes"
      },
      {
        "nivel": "prensa",
        "medio": "Emol",
        "url": "https://www.emol.com/noticias/Nacional/2026/05/19/1138200/louis-de-grange-biministro-mop-mtt.html",
        "fecha": "2026-05-19",
        "titulo": "Louis de Grange suma Obras Públicas y se convierte en biministro de Transportes y MOP"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-05-19T14:40:00-04:00",
    "fecha_verificacion": "2026-05-19T18:20:00-04:00",
    "dias_en_cargo": 69,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-05-19",
    "fechaExacta": true,
    "tipo": "cambio",
    "organo": "Ministerio de Obras Públicas",
    "saliente": "Martín Arrau García-Huidobro",
    "entrante": "Louis de Grange Concha (Biministro MTT · MOP)",
    "motivo": "Deja Obras Públicas para asumir la conducción del Ministerio de Seguridad Pública.",
    "fuente": "Presidencia de la República (Decreto Supremo) (2026-05-19) · Emol (2026-05-19)",
    "verificado": true
  },
  {
    "id": "mov-030",
    "tipo_evento": "designacion",
    "cargo": "Director Nacional",
    "organismo": "Corporación Nacional Forestal (CONAF)",
    "ministerio": "Ministerio de Agricultura",
    "region": "Nacional",
    "salio": {
      "nombre": "Aarón Cavieres Cancino",
      "fecha": "2026-04-09",
      "fecha_inicio": "2022-04-01",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Renovación de jefatura de servicio.",
      "dias_en_cargo": 1469,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Rodrigo Munita Necochea",
      "fecha": "2026-04-09"
    },
    "decreto_url": "https://www.conaf.cl/noticias/nombramiento-director-ejecutivo-conaf-2026",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "CONAF / Ministerio de Agricultura",
        "url": "https://www.conaf.cl/noticias/nombramiento-director-ejecutivo-conaf-2026",
        "fecha": "2026-04-09",
        "titulo": "Decreto Agricultura N° 88: Nombra Director Ejecutivo de CONAF"
      },
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/nacional/chile/2026/04/09/rodrigo-munita-asume-direccion-ejecutiva-conaf.shtml",
        "fecha": "2026-04-09",
        "titulo": "Rodrigo Munita asume la Dirección Ejecutiva de CONAF"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-04-09T10:00:00-04:00",
    "fecha_verificacion": "2026-04-09T14:00:00-04:00",
    "dias_en_cargo": 1469,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-04-09",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Corporación Nacional Forestal (CONAF)",
    "saliente": "Aarón Cavieres Cancino",
    "entrante": "Rodrigo Munita Necochea",
    "motivo": "Renovación de jefatura de servicio.",
    "fuente": "CONAF / Ministerio de Agricultura (2026-04-09) · BioBioChile (2026-04-09)",
    "verificado": true
  },
  {
    "id": "mov-045",
    "tipo_evento": "fallido",
    "cargo": "Secretario Regional Ministerial de Minería de Atacama (Propuesto)",
    "organismo": "SEREMI de Minería de Atacama",
    "ministerio": "Ministerio de Minería",
    "region": "Región de Atacama",
    "salio": {
      "nombre": "Héctor Soto Carvajal (Nombramiento no concretado)",
      "fecha": "2026-04-02",
      "fecha_inicio": "2026-04-01",
      "motivo_categoria": "Conductas indebidas",
      "motivo_texto": "Designación dejada sin efecto antes de la toma de razón tras detectarse incompatibilidades de interés con empresas contratistas de la mediana minería regional.",
      "dias_en_cargo": 1,
      "dias_en_cargo_origen": "estimado"
    },
    "detectado_por": "Prensa regional / BioBioChile",
    "fuentes": [
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/nacional/region-de-atacama/2026/04/02/cae-nombramiento-seremi-mineria-atacama.shtml",
        "fecha": "2026-04-02",
        "titulo": "Gobierno echa pie atrás y revoca designación de Seremi de Minería en Atacama por incompatibilidades"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/gobierno-revoca-nombramiento-en-seremi-de-mineria-de-atacama/20260402/",
        "fecha": "2026-04-02",
        "titulo": "Minería frena nombramiento en Atacama a horas de asumir"
      }
    ],
    "estado": "en_confirmacion",
    "fecha_deteccion": "2026-04-02T09:00:00-04:00",
    "fecha_verificacion": null,
    "dias_en_cargo": 1,
    "dias_en_cargo_origen": "estimado",
    "documento_pendiente": true,
    "fecha": "2026-04-02",
    "fechaExacta": true,
    "tipo": "fallido",
    "organo": "SEREMI de Minería de Atacama",
    "saliente": "Héctor Soto Carvajal (Nombramiento no concretado)",
    "motivo": "Designación dejada sin efecto antes de la toma de razón tras detectarse incompatibilidades de interés con empresas contratistas de la mediana minería regional.",
    "fuente": "BioBioChile (2026-04-02) · La Tercera (2026-04-02)",
    "verificado": false
  },
  {
    "id": "mov-006",
    "tipo_evento": "designacion",
    "cargo": "Director Nacional",
    "organismo": "Servicio de Impuestos Internos (SII)",
    "ministerio": "Ministerio de Hacienda",
    "region": "Nacional",
    "salio": {
      "nombre": "Carolina Saravia (s)",
      "fecha": "2026-03-25",
      "fecha_inicio": "2026-02-15",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Término de subrogancia legal tras designación de nueva titular.",
      "dias_en_cargo": 38,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Carolina Saravia",
      "fecha": "2026-03-25"
    },
    "decreto_url": "https://www.hacienda.cl/noticias-y-documentos/noticias/nombramiento-titular-sii-saravia-2026",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Ministerio de Hacienda (Decreto Supremo)",
        "url": "https://www.hacienda.cl/noticias-y-documentos/noticias/nombramiento-titular-sii-saravia-2026",
        "fecha": "2026-03-25",
        "titulo": "Decreto de Hacienda N° 102: Ratifica a Carolina Saravia como Directora Nacional del SII"
      },
      {
        "nivel": "prensa",
        "medio": "Emol",
        "url": "https://www.emol.com/noticias/Economia/2026/03/25/1129402/saravia-titular-sii.html",
        "fecha": "2026-03-25",
        "titulo": "Gobierno confirma a Carolina Saravia como Directora Titular del Servicio de Impuestos Internos"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-25T11:00:00-04:00",
    "fecha_verificacion": "2026-03-25T15:00:00-04:00",
    "dias_en_cargo": 38,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-25",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Servicio de Impuestos Internos (SII)",
    "saliente": "Carolina Saravia (s)",
    "entrante": "Carolina Saravia",
    "motivo": "Término de subrogancia legal tras designación de nueva titular.",
    "fuente": "Ministerio de Hacienda (Decreto Supremo) (2026-03-25) · Emol (2026-03-25)",
    "verificado": true
  },
  {
    "id": "mov-007",
    "tipo_evento": "designacion",
    "cargo": "Director Nacional",
    "organismo": "Fondo Nacional de Salud (FONASA)",
    "ministerio": "Ministerio de Salud",
    "region": "Nacional",
    "salio": {
      "nombre": "Camilo Cid Pedraza",
      "fecha": "2026-03-17",
      "fecha_inicio": "2022-04-11",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Cambio de administración presidencial.",
      "dias_en_cargo": 1436,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Jaime Mañalich Muxi",
      "fecha": "2026-03-17"
    },
    "decreto_url": "https://www.fonasa.cl/sites/fonasa/noticias/nombramiento-nuevo-director-fonasa-2026",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "FONASA (Comunicado Oficial)",
        "url": "https://www.fonasa.cl/sites/fonasa/noticias/nombramiento-nuevo-director-fonasa-2026",
        "fecha": "2026-03-17",
        "titulo": "Decreto Salud N° 45: Nombra a don Jaime Mañalich como Director Nacional de Fonasa"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/nacional/noticia/jaime-manalich-asume-la-direccion-de-fonasa/20260317/",
        "fecha": "2026-03-17",
        "titulo": "Jaime Mañalich asume la dirección de Fonasa con foco en lista de espera y reforma"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-17T10:00:00-04:00",
    "fecha_verificacion": "2026-03-17T14:30:00-04:00",
    "dias_en_cargo": 1436,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-17",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Fondo Nacional de Salud (FONASA)",
    "saliente": "Camilo Cid Pedraza",
    "entrante": "Jaime Mañalich Muxi",
    "motivo": "Cambio de administración presidencial.",
    "fuente": "FONASA (Comunicado Oficial) (2026-03-17) · La Tercera (2026-03-17)",
    "verificado": true
  },
  {
    "id": "mov-015",
    "tipo_evento": "designacion",
    "cargo": "Superintendente de Pensiones",
    "organismo": "Superintendencia de Pensiones",
    "ministerio": "Ministerio del Trabajo y Previsión Social",
    "region": "Nacional",
    "salio": {
      "nombre": "Osvaldo Macías Muñoz",
      "fecha": "2026-03-13",
      "fecha_inicio": "2016-03-18",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Conclusión de período ADP.",
      "dias_en_cargo": 3647,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Alejandro Charme",
      "fecha": "2026-03-13"
    },
    "decreto_url": "https://www.spensiones.cl/portal/institucional/594/w3-article-15890.html",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Superintendencia de Pensiones (Decreto)",
        "url": "https://www.spensiones.cl/portal/institucional/594/w3-article-15890.html",
        "fecha": "2026-03-13",
        "titulo": "Decreto Trabajo N° 29: Nombra Superintendente de Pensiones a don Alejandro Charme"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/pulso/noticia/alejandro-charme-asume-como-superintendente-de-pensiones/20260313/",
        "fecha": "2026-03-13",
        "titulo": "Alejandro Charme es nombrado nuevo Superintendente de Pensiones"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-13T11:00:00-04:00",
    "fecha_verificacion": "2026-03-13T15:00:00-04:00",
    "dias_en_cargo": 3647,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-13",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Superintendencia de Pensiones",
    "saliente": "Osvaldo Macías Muñoz",
    "entrante": "Alejandro Charme",
    "motivo": "Conclusión de período ADP.",
    "fuente": "Superintendencia de Pensiones (Decreto) (2026-03-13) · La Tercera (2026-03-13)",
    "verificado": true
  },
  {
    "id": "mov-001",
    "tipo_evento": "cambio-mando",
    "cargo": "Ministros de Estado (24 carteras)",
    "organismo": "Presidencia de la República",
    "ministerio": "Presidencia de la República",
    "region": "Nacional",
    "salio": {
      "nombre": "Gabinete del presidente Gabriel Boric",
      "fecha": "2026-03-11",
      "fecha_inicio": "2022-03-11",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Fin del período constitucional presidencial 2022-2026.",
      "dias_en_cargo": 1461,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Gabinete del presidente José Antonio Kast",
      "fecha": "2026-03-11"
    },
    "decreto_url": "https://www.diariooficial.cl/decretos-cambio-mando-presidencial-2026",
    "decreto_numero": "D.S. N° 1 a 24 de Presidencia",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Diario Oficial de la República de Chile",
        "url": "https://www.diariooficial.cl/decretos-cambio-mando-presidencial-2026",
        "fecha": "2026-03-11",
        "titulo": "Decretos Supremos N° 1 a 24 de Presidencia: Nombramiento de Ministros de Estado"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/cambio-de-mando-presidencial-2026-asume-jose-antonio-kast/20260311/",
        "fecha": "2026-03-11",
        "titulo": "Cambio de mando: José Antonio Kast asume la Presidencia y toma juramento a su gabinete"
      },
      {
        "nivel": "prensa",
        "medio": "Emol",
        "url": "https://www.emol.com/noticias/Nacional/2026/03/11/1125001/cambio-mando-gabinete-kast.html",
        "fecha": "2026-03-11",
        "titulo": "Ceremonia en el Congreso: Kast asume la Presidencia y nombra 24 secretarios de Estado"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-11T09:00:00-04:00",
    "fecha_verificacion": "2026-03-11T13:00:00-04:00",
    "dias_en_cargo": 1461,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-11",
    "fechaExacta": true,
    "tipo": "cambio-mando",
    "organo": "Presidencia de la República",
    "saliente": "Gabinete del presidente Gabriel Boric",
    "entrante": "Gabinete del presidente José Antonio Kast",
    "motivo": "Fin del período constitucional presidencial 2022-2026.",
    "fuente": "Diario Oficial de la República de Chile (2026-03-11) · La Tercera (2026-03-11) · Emol (2026-03-11)",
    "verificado": true
  },
  {
    "id": "mov-002",
    "tipo_evento": "creacion",
    "cargo": "Ministra de Seguridad Pública",
    "organismo": "Ministerio de Seguridad Pública",
    "ministerio": "Ministerio de Seguridad Pública",
    "region": "Nacional",
    "entro": {
      "nombre": "Trinidad Steinert",
      "fecha": "2026-03-11"
    },
    "decreto_url": "https://www.diariooficial.cl/ley-creacion-ministerio-seguridad-publica",
    "decreto_numero": "Ley N° 21.750 y D.S. N° 1",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Diario Oficial de la República de Chile",
        "url": "https://www.diariooficial.cl/ley-creacion-ministerio-seguridad-publica",
        "fecha": "2026-03-11",
        "titulo": "Ley N° 21.750: Crea el Ministerio de Seguridad Pública y D.S. N° 1 nombra Ministra"
      },
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/nacional/chile/2026/03/11/trinidad-steinert-primera-ministra-seguridad-publica.shtml",
        "fecha": "2026-03-11",
        "titulo": "Ex fiscal regional de Tarapacá Trinidad Steinert asume como primera titular de Seguridad Pública"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-11T10:00:00-04:00",
    "fecha_verificacion": "2026-03-11T14:00:00-04:00",
    "dias_en_cargo": null,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-11",
    "fechaExacta": true,
    "tipo": "creacion",
    "organo": "Ministerio de Seguridad Pública",
    "entrante": "Trinidad Steinert",
    "motivo": "Cambio en la conducción institucional.",
    "fuente": "Diario Oficial de la República de Chile (2026-03-11) · BioBioChile (2026-03-11)",
    "verificado": true
  },
  {
    "id": "mov-003",
    "tipo_evento": "cambio-mando",
    "cargo": "Ministro de Transportes y Telecomunicaciones",
    "organismo": "Ministerio de Transportes y Telecomunicaciones",
    "ministerio": "Ministerio de Transportes y Telecomunicaciones (MTT)",
    "region": "Nacional",
    "salio": {
      "nombre": "Gabinete del presidente Gabriel Boric",
      "fecha": "2026-03-11",
      "fecha_inicio": "2022-03-11",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Fin del período constitucional.",
      "dias_en_cargo": 1461,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Louis de Grange Concha",
      "fecha": "2026-03-11"
    },
    "decreto_url": "https://www.diariooficial.cl/decretos-cambio-mando-mtt-2026",
    "decreto_numero": "D.S. N° 8 de Presidencia",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Diario Oficial",
        "url": "https://www.diariooficial.cl/decretos-cambio-mando-mtt-2026",
        "fecha": "2026-03-11",
        "titulo": "D.S. N° 8 de Presidencia: Nombra Ministro de Transportes y Telecomunicaciones"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/politica/noticia/louis-de-grange-asume-ministerio-de-transportes/20260311/",
        "fecha": "2026-03-11",
        "titulo": "Louis de Grange asume la conducción del Ministerio de Transportes"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-11T10:30:00-04:00",
    "fecha_verificacion": "2026-03-11T13:30:00-04:00",
    "dias_en_cargo": 1461,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-11",
    "fechaExacta": true,
    "tipo": "cambio-mando",
    "organo": "Ministerio de Transportes y Telecomunicaciones",
    "saliente": "Gabinete del presidente Gabriel Boric",
    "entrante": "Louis de Grange Concha",
    "motivo": "Fin del período constitucional.",
    "fuente": "Diario Oficial (2026-03-11) · La Tercera (2026-03-11)",
    "verificado": true
  },
  {
    "id": "mov-004",
    "tipo_evento": "cambio-mando",
    "cargo": "Ministro del Interior",
    "organismo": "Ministerio del Interior y Seguridad Pública",
    "ministerio": "Ministerio del Interior",
    "region": "Nacional",
    "salio": {
      "nombre": "Gabinete Boric",
      "fecha": "2026-03-11",
      "fecha_inicio": "2022-03-11",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Traspaso de mando constitucional.",
      "dias_en_cargo": 1461,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Claudio Alvarado Andrade",
      "fecha": "2026-03-11"
    },
    "decreto_url": "https://www.diariooficial.cl/decreto-nombramiento-ministro-interior-alvarado",
    "decreto_numero": "D.S. N° 1 de Interior",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Diario Oficial",
        "url": "https://www.diariooficial.cl/decreto-nombramiento-ministro-interior-alvarado",
        "fecha": "2026-03-11",
        "titulo": "D.S. N° 1 de Interior: Nombra Ministro del Interior a don Claudio Alvarado Andrade"
      },
      {
        "nivel": "prensa",
        "medio": "Emol",
        "url": "https://www.emol.com/noticias/Nacional/2026/03/11/1125030/claudio-alvarado-asume-interior.html",
        "fecha": "2026-03-11",
        "titulo": "Claudio Alvarado asume como jefe de gabinete en el Ministerio del Interior"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-11T09:30:00-04:00",
    "fecha_verificacion": "2026-03-11T12:00:00-04:00",
    "dias_en_cargo": 1461,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-11",
    "fechaExacta": true,
    "tipo": "cambio-mando",
    "organo": "Ministerio del Interior y Seguridad Pública",
    "saliente": "Gabinete Boric",
    "entrante": "Claudio Alvarado Andrade",
    "motivo": "Traspaso de mando constitucional.",
    "fuente": "Diario Oficial (2026-03-11) · Emol (2026-03-11)",
    "verificado": true
  },
  {
    "id": "mov-014",
    "tipo_evento": "designacion",
    "cargo": "Superintendente de Salud",
    "organismo": "Superintendencia de Salud",
    "ministerio": "Ministerio de Salud",
    "region": "Nacional",
    "salio": {
      "nombre": "Víctor Torres Jeldes",
      "fecha": "2026-03-11",
      "fecha_inicio": "2022-03-30",
      "motivo_categoria": "Fin de período",
      "motivo_texto": "Fin de período de administración.",
      "dias_en_cargo": 1442,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Enrique Paris Mancilla",
      "fecha": "2026-03-11"
    },
    "decreto_url": "https://www.superdesalud.gob.cl/prensa/672/w3-article-22410.html",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Superintendencia de Salud",
        "url": "https://www.superdesalud.gob.cl/prensa/672/w3-article-22410.html",
        "fecha": "2026-03-11",
        "titulo": "Decreto Supremo N° 12: Nombra Superintendente de Salud a don Enrique Paris"
      },
      {
        "nivel": "prensa",
        "medio": "BioBioChile",
        "url": "https://www.biobiochile.cl/noticias/nacional/chile/2026/03/11/enrique-paris-asume-superintendencia-salud.shtml",
        "fecha": "2026-03-11",
        "titulo": "Exministro Enrique Paris asume la Superintendencia de Salud"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-11T12:00:00-04:00",
    "fecha_verificacion": "2026-03-11T16:00:00-04:00",
    "dias_en_cargo": 1442,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-11",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Superintendencia de Salud",
    "saliente": "Víctor Torres Jeldes",
    "entrante": "Enrique Paris Mancilla",
    "motivo": "Fin de período de administración.",
    "fuente": "Superintendencia de Salud (2026-03-11) · BioBioChile (2026-03-11)",
    "verificado": true
  },
  {
    "id": "mov-034",
    "tipo_evento": "designacion",
    "cargo": "Ministro de Economía y Minería (Biministro)",
    "organismo": "Ministerio de Economía, Fomento y Turismo",
    "ministerio": "Ministerio de Economía / Ministerio de Minería",
    "region": "Nacional",
    "entro": {
      "nombre": "Daniel Mas",
      "fecha": "2026-03-11"
    },
    "decreto_url": "https://www.diariooficial.cl/decreto-biministerio-economia-mineria-daniel-mas",
    "decreto_numero": "D.S. N° 4 de Presidencia",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Diario Oficial",
        "url": "https://www.diariooficial.cl/decreto-biministerio-economia-mineria-daniel-mas",
        "fecha": "2026-03-11",
        "titulo": "D.S. N° 4 de Presidencia: Nombra Ministro de Economía y encomienda Cartera de Minería"
      },
      {
        "nivel": "prensa",
        "medio": "The Clinic",
        "url": "https://www.theclinic.cl/2026/05/20/daniel-mas-biministro-economia-mineria-gabinete-kast/",
        "fecha": "2026-05-20",
        "titulo": "Daniel Mas lidera biministerio productivo y consolida rol clave en el equipo económico"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-03-11T11:00:00-04:00",
    "fecha_verificacion": "2026-03-11T15:00:00-04:00",
    "dias_en_cargo": null,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-03-11",
    "fechaExacta": true,
    "tipo": "designacion",
    "organo": "Ministerio de Economía, Fomento y Turismo",
    "entrante": "Daniel Mas",
    "motivo": "Cambio en la conducción institucional.",
    "fuente": "Diario Oficial (2026-03-11) · The Clinic (2026-05-20)",
    "verificado": true
  },
  {
    "id": "mov-005",
    "tipo_evento": "renuncia",
    "cargo": "Director Nacional",
    "organismo": "Servicio de Impuestos Internos (SII)",
    "ministerio": "Ministerio de Hacienda",
    "region": "Nacional",
    "salio": {
      "nombre": "Javier Etcheberry Celis",
      "fecha": "2026-02-15",
      "fecha_inicio": "2024-07-08",
      "motivo_categoria": "Cuestionamiento de gestión",
      "motivo_texto": "Renuncia en medio de la controversia por el no pago de contribuciones de un inmueble de su propiedad.",
      "dias_en_cargo": 587,
      "dias_en_cargo_origen": "oficial"
    },
    "entro": {
      "nombre": "Carolina Saravia (Subrogante)",
      "fecha": "2026-02-15"
    },
    "decreto_url": "https://www.sii.cl/noticias/2026/comunicado_renuncia_director_etcheberry.htm",
    "fuentes": [
      {
        "nivel": "oficial",
        "medio": "Servicio de Impuestos Internos (Comunicado)",
        "url": "https://www.sii.cl/noticias/2026/comunicado_renuncia_director_etcheberry.htm",
        "fecha": "2026-02-15",
        "titulo": "Comunicado Oficial: Renuncia del Director Nacional del SII Javier Etcheberry"
      },
      {
        "nivel": "prensa",
        "medio": "La Tercera",
        "url": "https://www.latercera.com/pulso/noticia/javier-etcheberry-renuncia-al-sii-tras-polemica-por-contribuciones/20260215/",
        "fecha": "2026-02-15",
        "titulo": "Javier Etcheberry presenta su renuncia como director del Servicio de Impuestos Internos"
      }
    ],
    "estado": "verificado",
    "fecha_deteccion": "2026-02-15T18:00:00-04:00",
    "fecha_verificacion": "2026-02-15T21:00:00-04:00",
    "dias_en_cargo": 587,
    "dias_en_cargo_origen": "oficial",
    "documento_pendiente": false,
    "fecha": "2026-02-15",
    "fechaExacta": true,
    "tipo": "renuncia",
    "organo": "Servicio de Impuestos Internos (SII)",
    "saliente": "Javier Etcheberry Celis",
    "entrante": "Carolina Saravia (Subrogante)",
    "motivo": "Renuncia en medio de la controversia por el no pago de contribuciones de un inmueble de su propiedad.",
    "fuente": "Servicio de Impuestos Internos (Comunicado) (2026-02-15) · La Tercera (2026-02-15)",
    "verificado": true
  }
];
