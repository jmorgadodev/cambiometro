export interface LandingSourceSnapshot {
  id: string;
  recordCount: number;
  status: string;
  generatedAt: string | null;
}

export interface LandingSummary {
  schemaVersion: 1;
  generatedAt: string | null;
  dataUpdatedAt: string | null;
  sourceCount: number;
  totalSourceRecords: number;
  sources: LandingSourceSnapshot[];
  movements: {
    total: number;
    lastSuccessAt: string | null;
    lastEventDate: string | null;
  };
  canonical: {
    records: number;
    entities: number;
    relations: number;
    votes: number;
    cutoff: string;
  };
}

type SourceHealth = {
  generatedAt?: string | null;
  sources?: Record<string, {
    recordCount?: number;
    status?: string;
    generatedAt?: string | null;
  }>;
};

type MovementsPayload = {
  movimientos?: unknown[];
  last_success_at?: string | null;
  last_event_date?: string | null;
};

type GlobalKpis = {
  registros_canonicos?: number;
  entidades?: number;
  relaciones?: number;
  votaciones?: number;
  corte?: string;
};

function validDate(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

function latestDate(values: Array<string | null | undefined>): string | null {
  const valid = values.filter((value): value is string => Boolean(validDate(value)));
  if (!valid.length) return null;
  return valid.sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

export function buildLandingSummary({
  sourceHealth,
  movements,
  globalKpis,
  transferRelease,
}: {
  sourceHealth: SourceHealth;
  movements: MovementsPayload;
  globalKpis: GlobalKpis;
  transferRelease?: {
    totalRows: number;
    generatedAt: string | null;
  };
}): LandingSummary {
  const effectiveTransferRelease = transferRelease ?? {
    totalRows: 59361,
    generatedAt: "2026-08-24T13:52:22.514Z",
  };
  const sources = Object.entries(sourceHealth.sources ?? {})
    .map(([id, source]) => {
      const isTransferRelease = id === "ley19862";
      const recordCount = isTransferRelease
        ? effectiveTransferRelease.totalRows
        : Number.isSafeInteger(source.recordCount) && (source.recordCount ?? 0) >= 0
        ? source.recordCount ?? 0
        : 0;
      return {
        id,
        recordCount,
        status: source.status ?? "unknown",
        generatedAt: isTransferRelease ? effectiveTransferRelease.generatedAt : validDate(source.generatedAt),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  const lastSuccessAt = validDate(movements.last_success_at);
  const lastEventDate = validDate(movements.last_event_date);
  const generatedAt = latestDate([sourceHealth.generatedAt, ...sources.map((source) => source.generatedAt)]);

  return {
    schemaVersion: 1,
    generatedAt,
    dataUpdatedAt: latestDate([generatedAt, lastSuccessAt]),
    sourceCount: sources.filter((source) => source.recordCount > 0).length,
    totalSourceRecords: sources.reduce((total, source) => total + source.recordCount, 0),
    sources,
    movements: {
      total: Array.isArray(movements.movimientos) ? movements.movimientos.length : 0,
      lastSuccessAt,
      lastEventDate,
    },
    canonical: {
      records: Number.isSafeInteger(globalKpis.registros_canonicos) ? globalKpis.registros_canonicos ?? 0 : 0,
      entities: Number.isSafeInteger(globalKpis.entidades) ? globalKpis.entidades ?? 0 : 0,
      relations: Number.isSafeInteger(globalKpis.relaciones) ? globalKpis.relaciones ?? 0 : 0,
      votes: Number.isSafeInteger(globalKpis.votaciones) ? globalKpis.votaciones ?? 0 : 0,
      cutoff: globalKpis.corte ?? "Sin corte publicado",
    },
  };
}

export function sourceKeyForHomeSource(sourceId: string): string | null {
  const keys: Record<string, string> = {
    etl_cplt_transparencia_activa: "cplt",
    etl_dipres_presupuestos: "dipres",
    etl_ley_19862_transferencias: "ley19862",
    etl_chilecompra_ocds: "chilecompra",
    etl_infolobby_plataforma: "infolobby",
    etl_infoprobidad_declaraciones: "infoprobidad",
    etl_sinim_subdere: "sinim",
    etl_ine_censo_2024: "ine",
    etl_contraloria_auditorias: "contraloria",
    etl_camara_diputados: "camara",
    etl_senado_republica: "senado",
    etl_servel_electoral: "servel",
  };
  return keys[sourceId] ?? null;
}
