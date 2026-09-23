type SenateRecord = {
  id: string;
  sourceId: "votaciones_senado";
  kind: "vote";
  occurredAt?: string;
  data: {
    votacion_id: string;
    fecha: string;
    descripcion?: string;
    votos: Array<{ id?: string; nombre?: string; opcion?: string }>;
    [key: string]: unknown;
  };
};

type StaticVoteSnapshot = {
  generatedAt?: string;
  totalSessions?: number;
  sessions: Record<string, Record<string, unknown>>;
  votes: Record<string, Array<[string, string]>>;
};

export function fetchVerifiedSenadoVoteRecords(options?: {
  from?: string;
  to?: string;
  apiUrl?: string;
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): Promise<{
  records: SenateRecord[];
  completePeriods: Array<{ period: string; recordCount: number }>;
}>;

export function mergeSenadoVotesIntoStaticSnapshot(
  snapshot: unknown,
  records: SenateRecord[] | unknown[],
  options?: {
    senators?: Array<{ id: string; cargo: string; nombre_completo: string }>;
    generatedAt?: string;
  },
): {
  snapshot: StaticVoteSnapshot;
  replacedPeriods: string[];
  replacedSessions: number;
  addedSessions: number;
  mappedVotes: number;
  unmatchedVotes: number;
  changed: boolean;
};
