import sourceStatusRaw from "@/data/raw/transparencia_activa/service-source-status.json";
import sourceCatalogRaw from "@/data/data-quality-sources.json";

export type ServiceDataState = "publicado" | "historico" | "no_publicado" | "no_enlazado";

export interface ServiceDataEvidence {
  estado: ServiceDataState;
  etiqueta: string;
  motivo: string;
  fuenteOficial?: string;
  ultimaActualizacion?: string;
  organismoId?: string;
  fuente?: string;
  periodoFuente?: string;
  frecuenciaFuente?: string;
  desfaseFuente?: string;
  registrosFuente?: number;
  registrosConsultables?: number | null;
}

export interface ServiceDataCoverage {
  presupuesto: ServiceDataEvidence;
  personal: ServiceDataEvidence;
  compras: ServiceDataEvidence;
  lobby: ServiceDataEvidence;
  contraloria: ServiceDataEvidence;
}

interface ServiceSourceStatus {
  organismoId?: string;
  fuenteOficial?: string;
  fuentesRelacionadas?: string[];
  ultimaActualizacion?: string;
  estado?: ServiceDataState;
  motivo?: string;
}

const sourceStatus = sourceStatusRaw as Record<string, ServiceSourceStatus>;

interface SourceCatalogEntry {
  id?: string;
  label?: string;
  officialUrl?: string;
  frequency?: string;
  period?: string;
  lag?: string;
  canonicalCount?: number;
  queryableCount?: number | null;
}

const sourceCatalog = sourceCatalogRaw as SourceCatalogEntry[];

const MODULE_SOURCE_IDS = {
  presupuesto: "dipres",
  personal: "transparencia-activa",
  compras: "chilecompra",
  lobby: "infolobby",
  contraloria: "contraloria",
} as const;

type CoverageModule = keyof typeof MODULE_SOURCE_IDS;

function getSourceCatalogEntry(module: CoverageModule): SourceCatalogEntry | null {
  const sourceId = MODULE_SOURCE_IDS[module];
  return sourceCatalog.find((source) => source.id === sourceId) ?? null;
}

function attachSourceMetadata(evidence: ServiceDataEvidence, module: CoverageModule): ServiceDataEvidence {
  const source = getSourceCatalogEntry(module);
  if (!source) return evidence;

  return {
    ...evidence,
    fuente: evidence.fuente ?? source.label,
    fuenteOficial: evidence.fuenteOficial ?? source.officialUrl,
    periodoFuente: source.period,
    frecuenciaFuente: source.frequency,
    desfaseFuente: source.lag,
    registrosFuente: source.canonicalCount,
    registrosConsultables: source.queryableCount,
  };
}

const NO_PUBLICADO: ServiceDataEvidence = {
  estado: "no_publicado",
  etiqueta: "No publicado",
  motivo: "No hay un registro vigente en el release consultado; no equivale a cero.",
};

const NO_ENLAZADO: ServiceDataEvidence = {
  estado: "no_enlazado",
  etiqueta: "Sin enlace verificable",
  motivo: "El dataset relacionado existe, pero no se pudo conciliar este organismo con un identificador oficial exacto.",
};

export function getServiceSourceStatus(id: string): ServiceSourceStatus | null {
  return sourceStatus[id] ?? null;
}

function cloneEvidence(evidence: ServiceDataEvidence): ServiceDataEvidence {
  return { ...evidence };
}

export function buildServiceDataCoverage(input: {
  id: string;
  presupuesto: boolean;
  personal: boolean;
  compras: boolean;
  lobby: boolean;
  contraloria: boolean;
}): ServiceDataCoverage {
  const explicitSource = getServiceSourceStatus(input.id);
  const historicalPersonal: ServiceDataEvidence | null = explicitSource?.estado === "historico"
    ? {
        estado: "historico",
        etiqueta: "Corte histórico",
        motivo: explicitSource.motivo ?? "La fuente oficial disponible es histórica y no se presenta como vigencia actual.",
        fuenteOficial: explicitSource.fuenteOficial,
        ultimaActualizacion: explicitSource.ultimaActualizacion,
        organismoId: explicitSource.organismoId,
      }
    : null;

  return {
    presupuesto: attachSourceMetadata(input.presupuesto
      ? {
          estado: "publicado",
          etiqueta: "Publicado",
          motivo: "Existe una partida o capítulo DIPRES enlazado al organismo.",
        }
      : {
          estado: "no_publicado",
          etiqueta: "Sin partida individual",
          motivo: "No existe una partida DIPRES individual enlazada; el gasto puede estar agregado en la partida del organismo tutelar.",
        }, "presupuesto"),
    personal: attachSourceMetadata(input.personal
      ? {
          estado: "publicado",
          etiqueta: "Publicado",
          motivo: "La proyección canónica contiene una dotación de personal con origen en el release disponible.",
        }
      : historicalPersonal ?? cloneEvidence(NO_PUBLICADO),
      "personal"),
    compras: attachSourceMetadata(input.compras
      ? {
          estado: "publicado",
          etiqueta: "Publicado",
          motivo: "Existe una conciliación RUT exacta con el release OCDS de ChileCompra.",
        }
      : cloneEvidence(NO_ENLAZADO), "compras"),
    lobby: attachSourceMetadata(input.lobby
      ? {
          estado: "publicado",
          etiqueta: "Publicado",
          motivo: "Existen audiencias o menciones documentales enlazadas a este organismo.",
        }
      : cloneEvidence(NO_PUBLICADO), "lobby"),
    contraloria: attachSourceMetadata(input.contraloria
      ? {
          estado: "publicado",
          etiqueta: "Publicado",
          motivo: "Existen auditorías de Contraloría enlazadas al organismo.",
        }
      : cloneEvidence(NO_PUBLICADO), "contraloria"),
  };
}

export function summarizeServiceCoverage(rows: Array<{ cobertura: ServiceDataCoverage }>) {
  const modules = ["presupuesto", "personal", "compras", "lobby", "contraloria"] as const;
  return Object.fromEntries(modules.map((module) => {
    const values = rows.map((row) => row.cobertura[module]);
    return [module, {
      total: values.length,
      publicado: values.filter((value) => value.estado === "publicado").length,
      historico: values.filter((value) => value.estado === "historico").length,
      noPublicado: values.filter((value) => value.estado === "no_publicado").length,
      noEnlazado: values.filter((value) => value.estado === "no_enlazado").length,
    }];
  }));
}
