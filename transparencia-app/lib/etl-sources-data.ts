import healthRaw from "@/data/etl/source-health.json";

export interface EtlSourceInfo {
  id: string;
  name: string;
  organization: string;
  category: "personal" | "finanzas" | "compras" | "probidad" | "parlamento" | "municipios";
  frequency: string;
  lastUpdated: string;
  lastUpdatedRelative: string;
  recordCount: number;
  canonicalCount: number;
  historicalCount: number;
  financialAmountClp?: number;
  status: "operational" | "updated" | "official_lag";
  statusText: string;
  officialUrl: string;
  description: string;
  keyFields: string[];
  viewLink: string;
  viewLabel: string;
}

const CANONICAL_COUNTS: Record<string, number> = {
  cplt: 1203287,
  dipres: 15689,
  ley19862: 59361,
  chilecompra: 74142,
  infolobby: 60523,
  infoprobidad: 15331,
  sinim: 3105,
  contraloria: 291,
  camara: 19025,
  senado: 8138,
  servel: 23894,
  personal_apoyo: 4092,
  ine: 346,
};

const HISTORICAL_COUNTS: Record<string, number> = {
  cplt: 1218136,
  dipres: 15689,
  ley19862: 59361,
  chilecompra: 888693,
  infolobby: 60523,
  infoprobidad: 15331,
  sinim: 3105,
  contraloria: 291,
  camara: 19025,
  senado: 8138,
  servel: 23894,
  personal_apoyo: 4092,
  ine: 346,
};

type HealthKey = keyof typeof healthRaw.sources | "personal_apoyo" | "ine";
type Descriptor = Omit<EtlSourceInfo, "recordCount" | "canonicalCount" | "historicalCount" | "financialAmountClp" | "lastUpdated" | "lastUpdatedRelative" | "status" | "statusText"> & { health: HealthKey };
const dateLabel = (value: string) => `Corte ${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(value))}`;

const descriptors: Descriptor[] = [
  { health: "cplt", id: "etl_cplt_transparencia_activa", name: "Transparencia Activa CPLT", organization: "Consejo para la Transparencia (CPLT)", category: "personal", frequency: "Mensual", officialUrl: "https://www.consejotransparencia.cl/datos-abiertos/", description: "Nóminas oficiales publicadas por los organismos con cobertura disponible en el corte local.", keyFields: ["RUT", "Nombre", "Cargo", "Remuneración"], viewLink: "/funcionarios", viewLabel: "Ver buscador de funcionarios →" },
  { health: "dipres", id: "etl_dipres_presupuestos", name: "Ley de Presupuestos de la Nación", organization: "Dirección de Presupuestos (DIPRES)", category: "finanzas", frequency: "Mensual", officialUrl: "https://www.dipres.gob.cl/598/w3-propertyvalue-15199.html", description: "Programas presupuestarios oficiales disponibles en la proyección DIPRES.", keyFields: ["Partida", "Capítulo", "Programa", "Vigente", "Ejecutado"], viewLink: "/servicios-publicos", viewLabel: "Ver presupuesto por ministerios →" },
  { health: "ley19862", id: "etl_ley_19862_transferencias", name: "Registro Central de Colaboradores (Ley 19.862)", organization: "Ministerio de Hacienda", category: "finanzas", frequency: "Mensual", officialUrl: "https://www.registros19862.gob.cl/", description: "Transferencias oficiales presentes en los períodos descargados y declarados por la proyección.", keyFields: ["Folio", "RUT receptor", "Emisor", "Monto"], viewLink: "/transferencias", viewLabel: "Ver dashboard de transferencias →" },
  { health: "chilecompra", id: "etl_chilecompra_ocds", name: "ChileCompra / MercadoPúblico OCDS", organization: "Dirección ChileCompra", category: "compras", frequency: "Mensual", officialUrl: "https://datos-abiertos.chilecompra.cl/", description: "Procesos y adjudicaciones oficiales OCDS presentes en el lake local.", keyFields: ["OCID", "Comprador", "Proveedor", "Monto"], viewLink: "/cruces", viewLabel: "Ver compras en explorador de cruces →" },
  { health: "infolobby", id: "etl_infolobby_plataforma", name: "Plataforma InfoLobby", organization: "Consejo para la Transparencia", category: "probidad", frequency: "Diaria", officialUrl: "https://www.infolobby.cl/", description: "Audiencias y registros oficiales disponibles en el corte local.", keyFields: ["Autoridad", "Institución", "Materia", "Fecha"], viewLink: "/cruces#lobby-publico", viewLabel: "Ver audiencias en explorador →" },
  { health: "infoprobidad", id: "etl_infoprobidad_declaraciones", name: "Declaraciones de Intereses y Patrimonio", organization: "Contraloría General de la República · CPLT", category: "probidad", frequency: "Por declaración", officialUrl: "https://www.declaracionjurada.cl/", description: "Declaraciones oficiales disponibles en el corte local.", keyFields: ["Declarante", "Cargo", "Institución", "Fecha"], viewLink: "/personas", viewLabel: "Ver declaraciones de autoridades →" },
  { health: "sinim", id: "etl_sinim_subdere", name: "Sistema Nacional de Información Municipal (SINIM)", organization: "SUBDERE", category: "municipios", frequency: "Anual", officialUrl: "http://www.sinim.gov.cl/", description: "Indicadores municipales oficiales disponibles; la cobertura faltante se conserva como ausencia.", keyFields: ["CUT", "Comuna", "Indicador", "Valor"], viewLink: "/municipalidades", viewLabel: "Ver comparador municipal →" },
  { health: "ine", id: "etl_ine_censo_2024", name: "INE Censo 2024 (Población y Demografía)", organization: "Instituto Nacional de Estadísticas (INE)", category: "municipios", frequency: "Censal / Definitiva", officialUrl: "https://censo2024.ine.gob.cl/resultados/", description: "Población censada, hogares y viviendas de las 346 comunas de Chile con trazabilidad a la cartografía oficial del INE.", keyFields: ["CUT", "Comuna", "Población", "Viviendas", "Hogares"], viewLink: "/municipalidades", viewLabel: "Ver fichas comunales con demografía →" },
  { health: "contraloria", id: "etl_contraloria_auditorias", name: "Informes de Auditoría CGR", organization: "Contraloría General de la República", category: "probidad", frequency: "Continua", officialUrl: "https://www.contraloria.cl/web/cgr/informes-de-auditoria", description: "Informes y hallazgos oficiales descargados en el corte local.", keyFields: ["Informe", "Entidad", "Materia", "Fecha"], viewLink: "/cruces#fiscalizacion", viewLabel: "Ver fiscalizaciones en explorador →" },
  { health: "camara", id: "etl_camara_diputados", name: "Cámara de Diputadas y Diputados", organization: "Congreso Nacional", category: "parlamento", frequency: "Por publicación", officialUrl: "https://opendata.camara.cl/", description: "Registros oficiales de actividad y gastos presentes en el lake.", keyFields: ["Diputado", "Sesión", "Voto", "Gasto"], viewLink: "/politico", viewLabel: "Ver análisis de diputados →" },
  { health: "senado", id: "etl_senado_republica", name: "Senado de la República", organization: "Congreso Nacional", category: "parlamento", frequency: "Por publicación", officialUrl: "https://www.senado.cl/transparencia/datos-abiertos", description: "Registros oficiales de actividad y gastos presentes en el lake.", keyFields: ["Senador", "Sesión", "Voto", "Gasto"], viewLink: "/politico", viewLabel: "Ver análisis de senadores →" },
  { health: "servel", id: "etl_servel_electoral", name: "SERVEL (Resultados Electorales)", organization: "Servicio Electoral de Chile", category: "parlamento", frequency: "Por elección", officialUrl: "https://www.servel.cl/resultados-electorales/", description: "Resultados electorales oficiales presentes en el lake.", keyFields: ["Candidato", "Votos", "Partido", "Pacto"], viewLink: "/partidos", viewLabel: "Ver partidos y escaños →" },
];

export const ETL_SOURCES_DATA: EtlSourceInfo[] = descriptors.map(({ health, ...descriptor }) => {
  const state = health === "personal_apoyo" ? null : healthRaw.sources[health as keyof typeof healthRaw.sources];
  const canonicalCount = CANONICAL_COUNTS[health] ?? state?.recordCount ?? 0;
  const historicalCount = HISTORICAL_COUNTS[health] ?? state?.recordCount ?? canonicalCount;
  const generatedAt = state?.generatedAt ?? "2026-08-21T10:02:59.458Z";
  const financialAmountClp = state && "financialAmountClp" in state && typeof state.financialAmountClp === "number"
    ? state.financialAmountClp
    : undefined;

  return {
    ...descriptor,
    recordCount: canonicalCount,
    canonicalCount,
    historicalCount,
    ...(financialAmountClp !== undefined ? { financialAmountClp } : {}),
    lastUpdated: generatedAt,
    lastUpdatedRelative: dateLabel(generatedAt),
    status: state?.status === "complete" ? "operational" : "official_lag",
    statusText: state?.status === "complete" ? "Cobertura completa" : "Conectada · cobertura parcial declarada",
  };
});

export const ETL_MUNICIPAL_COVERAGE = {
  covered: healthRaw.sources.sinim.coverageCount,
  total: healthRaw.sources.sinim.coverageUniverse,
};
