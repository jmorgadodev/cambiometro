/**
 * Catálogo Oficial y Verificado de Redes Sociales y Sitios Web Municipales.
 * 
 * Regla R10 / Auditoría Periodística (Ronda 3):
 * - Los links deben provenir exclusivamente de fuentes oficiales primarias (sitio web oficial municipal, footer institucional o Contraloría/InfoProbidad).
 * - Cuentas no oficiales, fan pages o handles inferidos quedan estrictamente prohibidos (marcar como null / sin cuenta oficial).
 */

export interface MuniRRSSInfo {
  sitio_web_oficial: string | null;
  redes_sociales: {
    facebook?: string | null;
    instagram?: string | null;
    twitter?: string | null;
    youtube?: string | null;
    whatsapp?: string | null;
    fuente_verificacion: string;
  } | null;
  alcalde_oficial?: {
    nombre: string;
    partido: string;
    fuente: string;
  } | null;
  nota_territorial?: string | null;
}

export const VERIFIED_MUNICIPALIDADES_RRSS: Record<string, MuniRRSSInfo> = {
  "muni-maipu": {
    sitio_web_oficial: "https://www.municipalidadmaipu.cl",
    redes_sociales: {
      facebook: "https://www.facebook.com/maipu.cl",
      instagram: "https://www.instagram.com/maipu.cl",
      twitter: "https://x.com/MaipuCL",
      youtube: "https://www.youtube.com/@MunicipalidaddeMaipu",
      whatsapp: "https://api.whatsapp.com/send/?phone=56963006199",
      fuente_verificacion: "Sitio oficial municipalidadmaipu.cl / InfoProbidad (Canal Institucional)",
    },
    alcalde_oficial: {
      nombre: "Tomas Vodanovic Escudero",
      partido: "Frente Amplio",
      fuente: "Servel / CPLT Transparencia Activa",
    },
  },
  "muni-santiago": {
    sitio_web_oficial: "https://www.munistgo.cl",
    redes_sociales: {
      facebook: "https://www.facebook.com/munistgo",
      instagram: "https://www.instagram.com/munistgo",
      twitter: "https://x.com/Muni_Stgo",
      youtube: "https://www.youtube.com/c/MuniStgoVideos",
      fuente_verificacion: "Sitio oficial munistgo.cl (footer) / InfoProbidad",
    },
    alcalde_oficial: {
      nombre: "Mario Guillermo Desbordes Jimenez",
      partido: "Renovación Nacional",
      fuente: "Servel / CPLT Transparencia Activa",
    },
  },
  "muni-lascondes": {
    sitio_web_oficial: "https://www.lascondes.cl",
    redes_sociales: {
      facebook: "https://www.facebook.com/munilascondes/",
      instagram: "https://www.instagram.com/munilascondes/",
      twitter: "https://x.com/muni_lascondes",
      youtube: "https://www.youtube.com/@lascondesmuni",
      fuente_verificacion: "Sitio oficial lascondes.cl (footer) / InfoProbidad",
    },
    alcalde_oficial: {
      nombre: "Catalina San Martín Cavada",
      partido: "Independiente",
      fuente: "Servel Elecciones Municipales 2024 / BCN",
    },
  },
  "muni-antofagasta": {
    sitio_web_oficial: "https://www.municipalidadantofagasta.cl",
    redes_sociales: {
      facebook: "https://www.facebook.com/Municipalidad.Antofagasta",
      instagram: "https://www.instagram.com/antofagastamuni/",
      twitter: "https://x.com/AntofagastaMuni",
      youtube: "https://www.youtube.com/user/Antofagastamuni",
      fuente_verificacion: "Sitio oficial municipalidadantofagasta.cl (footer) / InfoProbidad",
    },
    alcalde_oficial: {
      nombre: "Sacha Razmilic Burgos",
      partido: "Evolución Política",
      fuente: "Servel Elecciones Municipales 2024 / BCN",
    },
  },
  "muni-puntaarenas": {
    sitio_web_oficial: "https://www.puntaarenas.cl",
    redes_sociales: {
      facebook: "https://www.facebook.com/munipuntaarenas",
      instagram: "https://www.instagram.com/munipuntaarenas",
      twitter: "https://x.com/MuniPuntaArenas",
      youtube: "https://www.youtube.com/@munipuntaarenas",
      fuente_verificacion: "Sitio oficial puntaarenas.cl / InfoProbidad",
    },
    alcalde_oficial: {
      nombre: "Claudio Radonich Jiménez",
      partido: "Renovación Nacional",
      fuente: "Servel Elecciones Municipales 2024 / BCN",
    },
  },
  "muni-antartica": {
    sitio_web_oficial: null,
    redes_sociales: null,
    alcalde_oficial: null,
    nota_territorial: "Comuna de la Provincia Antártica Chilena sin municipalidad propia; es administrada legal y territorialmente por la Municipalidad de Cabo de Hornos.",
  },
};

/**
 * Obtiene la información oficial verificada de RRSS y sitio web para una municipalidad.
 */
export function getVerifiedMuniRRSS(muniId: string): MuniRRSSInfo | null {
  return VERIFIED_MUNICIPALIDADES_RRSS[muniId] ?? null;
}
