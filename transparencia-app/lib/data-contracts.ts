export type EntityKind =
  | "person"
  | "public_body"
  | "municipality"
  | "political_party"
  | "legal_entity"
  | "supplier";

export type EvidenceKind =
  | "authority"
  | "purchase"
  | "contract"
  | "expense"
  | "budget_execution"
  | "transfer"
  | "audit"
  | "declaration"
  | "lobby"
  | "vote"
  | "attendance"
  | "remuneration";

export type SourceStatus = "connected" | "partial" | "stale" | "unavailable";

export interface OfficialIdentifier {
  scheme: string;
  value: string;
  isPublic: boolean;
  sourceUrl: string;
}

export interface CanonicalEntity {
  id: string;
  kind: EntityKind;
  name: string;
  identifiers: OfficialIdentifier[];
  attributes: Record<string, string | number | boolean | null>;
  sourceIds: string[];
  updatedAt: string | null;
}

export interface MoneyAmount {
  amountClp: number;
  currency: string;
  originalAmount: string;
  originalUnit: string;
}

export interface EvidenceRecord {
  id: string;
  kind: EvidenceKind;
  sourceId: string;
  title: string;
  description: string | null;
  occurredAt: string | null;
  period: { from: string | null; to: string | null; label: string | null };
  subjectEntityIds: string[];
  objectEntityIds: string[];
  amount: MoneyAmount | null;
  evidence: {
    sourceUrl: string;
    checksumSha256: string | null;
    retrievedAt: string | null;
    documentPage: number | null;
  };
  data: Record<string, unknown>;
}

export interface RelationEdge {
  id: string;
  fromId: string;
  predicate: string;
  toId: string;
  evidenceRecordIds: string[];
  period: { from: string | null; to: string | null };
  reconciliation: {
    method: "official_id" | "territorial_code" | "editorial_review" | "official_infoprobidad_id" | "official_declaration_json" | "official_report_number";
    confidence: number;
  };
  disclaimer: string;
}

export interface SourceManifest {
  id: string;
  label: string;
  organization: string;
  url: string;
  license: string;
  commercialUse: "allowed" | "prohibited" | "unknown";
  expectedCoverage: string;
  foundPeriods: string[];
  lastUpdated: string | null;
  checksumSha256: string | null;
  recordCount: number;
  canonicalCount?: number;
  historicalCount?: number;
  errorCount: number;
  status: SourceStatus;
  statusDetail: string;
  storageTier?: "d1" | "r2";
}

export interface CursorPage<T> {
  data: T[];
  total: number;
  limit: number;
  nextCursor: string | null;
}

export interface CrossEdge {
  relation: RelationEdge;
  fromEntity: CanonicalEntity;
  toEntity: CanonicalEntity;
  evidence: EvidenceRecord[];
  totalAmountClp?: number;
}
