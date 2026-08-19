/**
 * lib/diccionario-cruces.ts
 *
 * Módulo canónico de traducción y formateo para cruces, relaciones y entidades.
 * Seguro para uso en Server Components (RSC) y Client Components.
 */

export const DICCIONARIO_CRUCES_ES: Record<string, string> = {
  audited: "Auditado / fiscalizado por",
  WAS_AUDITED_BY: "Auditado / fiscalizado por",
  HAS_AUDIT_FROM: "Auditoría de",
  audit: "Auditado / fiscalizado por",
  filed_declaration_with: "Presentó declaración patrimonial ante",
  HAS_DECLARATION: "Presentó declaración patrimonial ante",
  paid_declaration_with: "Actualizó declaración patrimonial ante",
  declared_legal_interest: "Declaró interés legal en",
  DECLARED_LEGAL_INTEREST: "Declaró interés legal en",
  declared_interest: "Declaró interés legal en",
  DECLARED_INTEREST: "Declaró interés legal en",
  has_interest: "Declaró interés legal en",
  participated_in_lobby_meeting: "Participó en audiencia de lobby con",
  HAD_LOBBY_MEETING_WITH: "Participó en audiencia de lobby con",
  has_lobby_record: "Participó en audiencia de lobby con",
  LOBBY_CONTACT: "Contacto de lobby con",
  awarded_contract_from: "Se adjudicó contrato de",
  contracted_with: "Se adjudicó contrato de",
  HAS_CONTRACT_WITH: "Contrato vigente con",
  PURCHASED_FROM: "Compró a",
  purchased_from: "Compró a",
  awarded_to: "Adjudicó contrato a",
  received_transfer_from: "Recibió transferencia de",
  RECEIVED_TRANSFER_FROM: "Recibió transferencia de",
  MADE_TRANSFER_TO: "Transfirió fondos a",
  transferred_to: "Transfirió fondos a",
  member_of: "Miembro de",
  IS_MEMBER_OF: "Miembro de",
  employed_by: "Contratado por",
  WORKS_AT: "Contratado por",
  holds_mandate_in: "Ejerce cargo en",
  holds_office: "Ejerce cargo en",
  LEADS: "Dirige",
  voted_on_bill: "Votó sobre",
  VOTED_ON_BILL: "Votó sobre",
  awarded_contract: "Se adjudicó contrato de",
  AWARDED_CONTRACT: "Se adjudicó contrato de",
  has_vote_record: "Votó en proyecto en",
  VOTED_ON: "Votó en proyecto en",
  voted_in: "Votó en",
  cast_vote: "Emitió voto en",
  has_attendance_record: "Registro de asistencia en",
  has_expense_record: "Rendición de gastos ante",
  CONNECTED_VIA: "Relacionado documentalmente con",
  has_evidence: "Vínculo documental con",
};

export const ENTIDAD_TIPO_ES: Record<string, string> = {
  public_body: "Organismo público",
  PUBLIC_BODY: "Organismo público",
  government_agency: "Organismo público",
  service: "Servicio público",
  SERVICE: "Servicio público",
  ministry: "Ministerio",
  MINISTRY: "Ministerio",
  regional_government: "Gobierno regional",
  REGIONAL_GOVERNMENT: "Gobierno regional",
  municipality: "Municipalidad",
  MUNICIPALITY: "Municipalidad",
  person: "Persona natural",
  PERSON: "Persona natural",
  persona_natural: "Persona natural",
  PERSONA_NATURAL: "Persona natural",
  politician: "Autoridad / Político",
  POLITICIAN: "Autoridad / Político",
  company: "Empresa",
  COMPANY: "Empresa",
  supplier: "Proveedor",
  SUPPLIER: "Proveedor",
  legal_entity: "Persona jurídica / Entidad privada",
  LEGAL_ENTITY: "Persona jurídica / Entidad privada",
  persona_juridica: "Persona jurídica / Entidad privada",
  PERSONA_JURIDICA: "Persona jurídica / Entidad privada",
  foundation: "Fundación / ONG",
  FOUNDATION: "Fundación / ONG",
  cooperative: "Cooperativa",
  COOPERATIVE: "Cooperativa",
  political_party: "Partido político",
  POLITICAL_PARTY: "Partido político",
};

export function traducirPredicado(rawPredicate?: string): string {
  if (!rawPredicate) return "Vínculo documental oficial";
  if (DICCIONARIO_CRUCES_ES[rawPredicate]) return DICCIONARIO_CRUCES_ES[rawPredicate];
  const cleaned = rawPredicate.toLowerCase().replace(/_/g, " ").trim();
  if (DICCIONARIO_CRUCES_ES[cleaned]) return DICCIONARIO_CRUCES_ES[cleaned];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function traducirTipoEntidad(rawKind?: string): string {
  if (!rawKind) return "Entidad pública";
  if (ENTIDAD_TIPO_ES[rawKind]) return ENTIDAD_TIPO_ES[rawKind];
  const cleaned = rawKind.toLowerCase().replace(/_/g, " ").trim();
  if (ENTIDAD_TIPO_ES[cleaned]) return ENTIDAD_TIPO_ES[cleaned];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function formatearFuenteYConfianza(
  sourceId?: string,
  reconciliationMethod?: string,
  confidenceScore?: number
): {
  nombre: string;
  detalle: string;
  fuenteNombre: string;
  fuenteOrigen: string;
  metodoTexto: string;
  confianzaPct: string;
  confianzaColor: string;
  esOficial: boolean;
} {
  const src = (sourceId || "").toLowerCase();
  let fuenteNombre = "Fuente Oficial del Estado";
  let fuenteOrigen = "Portal de Transparencia de Chile";

  if (src.includes("contraloria") || src.includes("cgr")) {
    fuenteNombre = "Contraloría General de la República";
    fuenteOrigen = "Portal de Control y Auditorías Públicas";
  } else if (src.includes("infolobby") || src.includes("lobby")) {
    fuenteNombre = "Consejo para la Transparencia · InfoLobby";
    fuenteOrigen = "Plataforma Ley del Lobby (Ley 20.730)";
  } else if (src.includes("chilecompra") || src.includes("mercadopublico")) {
    fuenteNombre = "Dirección de Compras Públicas · ChileCompra";
    fuenteOrigen = "MercadoPúblico.cl · Contratación del Estado";
  } else if (src.includes("infoprobidad") || src.includes("cplt")) {
    fuenteNombre = "CPLT & Contraloría · InfoProbidad";
    fuenteOrigen = "Declaraciones de Intereses y Patrimonio (Ley 20.880)";
  } else if (src.includes("ley-19862") || src.includes("transferencias")) {
    fuenteNombre = "Ministerio de Hacienda · Ley 19.862";
    fuenteOrigen = "Registro Central de Colaboradores del Estado";
  } else if (src.includes("camara") || src.includes("congreso") || src.includes("senado")) {
    fuenteNombre = "Congreso Nacional de Chile";
    fuenteOrigen = "Cámara de Diputadas y Diputados / Senado";
  }

  let metodoTexto = "Identificador oficial (RUT / OCID / Rol)";
  const method = (reconciliationMethod || "").toLowerCase();
  if (method.includes("rut") || method.includes("official_id")) {
    metodoTexto = "Identificador oficial único (RUT / Identificador de Ley)";
  } else if (method.includes("name_exact") || method.includes("editorial")) {
    metodoTexto = "Conciliación editorial por denominación canónica exacta";
  } else if (method.includes("pattern") || method.includes("deterministic")) {
    metodoTexto = "Cruce determinístico por código de proceso público";
  }

  const score = confidenceScore ?? 1.0;
  const confianzaPct = `${Math.round(score * 100)}%`;
  let confianzaColor = "var(--ok)";
  if (score < 0.8) confianzaColor = "var(--warn)";
  if (score < 0.5) confianzaColor = "var(--error)";

  return {
    nombre: fuenteNombre,
    detalle: `${metodoTexto} · ${confianzaPct}`,
    fuenteNombre,
    fuenteOrigen,
    metodoTexto,
    confianzaPct,
    confianzaColor,
    esOficial: true,
  };
}

export function formatNombreInstitucional(rawName?: string): { display: string; raw?: string } {
  if (!rawName) return { display: "Entidad pública" };
  const raw = rawName.trim();

  // Abreviaciones y reemplazos institucionales específicos
  const REEMPLAZOS: Record<string, string> = {
    "DIRECCION DE CONTABILIDAD Y FINANZAS - MOP": "Dirección de Contabilidad y Finanzas (DCYF) · MOP",
    "DIRECCION DE CONTABILIDAD Y FINANZAS (DCYF)": "Dirección de Contabilidad y Finanzas (DCYF) · MOP",
    "DIRECCION GENERAL DE OBRAS PUBLICAS": "Dirección General de Obras Públicas (DGOP) · MOP",
    "DIRECCION DE VIALIDAD": "Dirección de Vialidad · MOP",
    "DIRECCION DE OBRAS HIDRAULICAS": "Dirección de Obras Hidráulicas · MOP",
    "CENTRAL DE ABASTECIMIENTO DEL SISTEMA NACIONAL DE SERVICIO DE SALUD": "Central de Abastecimiento del SNSS (CENABAST)",
    "SUBSECRETARIA DE SALUD PUBLICA": "Subsecretaría de Salud Pública · MINSAL",
    "SUBSECRETARIA DE REDES ASISTENCIALES": "Subsecretaría de Redes Asistenciales · MINSAL",
    "JUNTA NACIONAL DE AUXILIO ESCOLAR Y BECAS": "Junta Nacional de Auxilio Escolar y Becas (JUNAEB)",
    "SERVICIO DE IMPUESTOS INTERNOS": "Servicio de Impuestos Internos (SII)",
    "TESORERIA GENERAL DE LA REPUBLICA": "Tesorería General de la República (TGR)",
    "I MUNICIPALIDAD DE SANTIAGO": "Ilustre Municipalidad de Santiago",
    "I MUNICIPALIDAD DE PROVIDENCIA": "Ilustre Municipalidad de Providencia",
    "I MUNICIPALIDAD DE LAS CONDES": "Ilustre Municipalidad de Las Condes",
    "I MUNICIPALIDAD DE MAIPU": "Ilustre Municipalidad de Maipú",
    "I MUNICIPALIDAD DE PUENTE ALTO": "Ilustre Municipalidad de Puente Alto",
    "I MUNICIPALIDAD DE VALPARAISO": "Ilustre Municipalidad de Valparaíso",
    "I MUNICIPALIDAD DE CONCEPCION": "Ilustre Municipalidad de Concepción",
    "I MUNICIPALIDAD DE VIÑA DEL MAR": "Ilustre Municipalidad de Viña del Mar",
    "I MUNICIPALIDAD DE ANTOFAGASTA": "Ilustre Municipalidad de Antofagasta",
    "I MUNICIPALIDAD DE TEMUCO": "Ilustre Municipalidad de Temuco",
  };

  const upper = raw.toUpperCase();
  for (const [pattern, target] of Object.entries(REEMPLAZOS)) {
    if (upper === pattern || upper.includes(pattern)) {
      return { display: target, raw };
    }
  }

  // Si está en mayúsculas sostenidas, convertir a Title Case
  if (raw === raw.toUpperCase() && raw.length > 3) {
    const minorWords = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "por", "para", "con", "a", "e", "o", "u"]);
    const titleCased = raw
      .toLowerCase()
      .split(/\s+/)
      .map((word, idx) => {
        if (idx > 0 && minorWords.has(word)) return word;
        if (word === "dcyf") return "(DCYF)";
        if (word === "mop") return "MOP";
        if (word === "minsal") return "MINSAL";
        if (word === "gore") return "GORE";
        if (word === "sii") return "SII";
        if (word === "cgr") return "CGR";
        if (word === "cplt") return "CPLT";
        if (word === "eirl" || word === "e.i.r.l.") return "E.I.R.L.";
        if (word === "sa" || word === "s.a.") return "S.A.";
        if (word === "spa" || word === "s.p.a.") return "SpA";
        if (word === "ltda" || word === "ltda.") return "Ltda.";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
    return { display: titleCased, raw };
  }

  return { display: raw, raw };
}

