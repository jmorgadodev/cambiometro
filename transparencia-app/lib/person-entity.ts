import type {
  CanonicalEntity,
  EvidenceKind,
  EvidenceRecord,
  RelationEdge,
} from "./data-contracts";
import { POLITICOS_SEED } from "./seed-politicos";
import { getPoliticoSlug } from "./politico-slugs";

export interface PersonEvidenceSection {
  id: "dinero" | "contratos" | "probidad" | "lobby" | "fiscalizaciones" | "actividad";
  label: string;
  description: string;
  records: EvidenceRecord[];
}

export interface PersonRelationSummary {
  counterpartId: string;
  predicate: string;
  evidenceCount: number;
  relationCount: number;
  evidenceRecordIds: string[];
  disclaimer: string;
}

const SECTION_DEFINITIONS: Array<Omit<PersonEvidenceSection, "records"> & { kinds: EvidenceKind[] }> = [
  {
    id: "dinero",
    label: "Dinero público",
    description: "Gastos, compras, transferencias y remuneraciones vinculadas por una fuente oficial.",
    kinds: ["purchase", "expense", "budget_execution", "transfer", "remuneration"],
  },
  {
    id: "contratos",
    label: "Contratos",
    description: "Contratos publicados que identifican a esta persona como sujeto u objeto.",
    kinds: ["contract"],
  },
  {
    id: "probidad",
    label: "Probidad",
    description: "Declaraciones de intereses y patrimonio con respaldo documental.",
    kinds: ["declaration"],
  },
  {
    id: "lobby",
    label: "Lobby",
    description: "Audiencias, viajes y donativos registrados bajo la Ley 20.730.",
    kinds: ["lobby"],
  },
  {
    id: "fiscalizaciones",
    label: "Fiscalizaciones",
    description: "Informes y actuaciones de organismos fiscalizadores.",
    kinds: ["audit"],
  },
  {
    id: "actividad",
    label: "Actividad pública",
    description: "Votaciones, asistencias y mandatos publicados por organismos oficiales.",
    kinds: ["vote", "attendance", "authority"],
  },
];

const VERIFIED_HISTORICAL_PHOTOS: Record<string, { photoUrl: string; sourceUrl: string }> = {
  "person-camara-1002": {
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Leonardo_Enrique_Soto_Ferrada_%282022%29.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Leonardo_Enrique_Soto_Ferrada_(2022).jpg",
  },
};

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function verifiedAttributePhoto(entity: CanonicalEntity) {
  const candidate = entity.attributes.photo_url ?? entity.attributes.photoUrl ?? entity.attributes.image;
  return typeof candidate === "string" && candidate.startsWith("https://upload.wikimedia.org/")
    ? candidate
    : null;
}

export function personEntityPresentation(entity: CanonicalEntity) {
  const historicalPhoto = VERIFIED_HISTORICAL_PHOTOS[entity.id];
  const politician = POLITICOS_SEED.find(
    (item) => normalizeName(item.nombre_completo) === normalizeName(entity.name),
  );
  const rosterPhoto = politician?.foto_url?.startsWith("https://upload.wikimedia.org/")
    ? politician.foto_url
    : null;
  const initials = entity.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es-CL"))
    .join("");

  return {
    photoUrl: verifiedAttributePhoto(entity) ?? historicalPhoto?.photoUrl ?? rosterPhoto,
    photoSourceUrl: historicalPhoto?.sourceUrl ?? null,
    politicianPath: politician ? `/politico/${getPoliticoSlug(politician)}` : null,
    initials: initials || "P",
    role: typeof entity.attributes.role === "string" ? entity.attributes.role : null,
  };
}

export function groupPersonEvidence(records: EvidenceRecord[]): PersonEvidenceSection[] {
  return SECTION_DEFINITIONS
    .map(({ kinds, ...definition }) => ({
      ...definition,
      records: records.filter((record) => kinds.includes(record.kind)),
    }))
    .filter((section) => section.records.length > 0);
}

export function allPersonEvidenceSections(records: EvidenceRecord[]): PersonEvidenceSection[] {
  const populated = new Map(groupPersonEvidence(records).map((section) => [section.id, section.records]));
  return SECTION_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    records: populated.get(definition.id) ?? [],
  }));
}

/** Acepta el contrato canónico actual y la forma legacy aún presente en D1. */
export function personRecordAmountClp(record: EvidenceRecord): number | null {
  if (!record.amount) return null;
  const amount = record.amount as EvidenceRecord["amount"] & { value?: number };
  const value = typeof amount.amountClp === "number" ? amount.amountClp : amount.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function summarizePersonRelations(
  relations: RelationEdge[],
  entityId: string,
): PersonRelationSummary[] {
  const summaries = new Map<string, PersonRelationSummary>();

  for (const relation of relations) {
    const counterpartId = relation.fromId === entityId ? relation.toId : relation.fromId;
    const key = `${counterpartId}\u0000${relation.predicate}`;
    const current = summaries.get(key) ?? {
      counterpartId,
      predicate: relation.predicate,
      evidenceCount: 0,
      relationCount: 0,
      evidenceRecordIds: [],
      disclaimer: relation.disclaimer,
    };
    current.relationCount += 1;
    current.evidenceRecordIds = [
      ...new Set([...current.evidenceRecordIds, ...relation.evidenceRecordIds]),
    ];
    current.evidenceCount = current.evidenceRecordIds.length;
    summaries.set(key, current);
  }

  return [...summaries.values()].sort(
    (a, b) => b.evidenceCount - a.evidenceCount
      || a.counterpartId.localeCompare(b.counterpartId, "es-CL"),
  );
}
