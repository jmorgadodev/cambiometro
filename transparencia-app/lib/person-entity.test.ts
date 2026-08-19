import { describe, expect, it } from "vitest";
import type { CanonicalEntity, EvidenceRecord, RelationEdge } from "./data-contracts";
import { POLITICOS_SEED } from "./seed-politicos";
import {
  groupPersonEvidence,
  personEntityPresentation,
  personRecordAmountClp,
  summarizePersonRelations,
} from "./person-entity";
import { getPoliticoPath } from "./public-changes";

function record(id: string, kind: EvidenceRecord["kind"]): EvidenceRecord {
  return {
    id,
    kind,
    sourceId: "camara",
    title: id,
    description: null,
    occurredAt: "2026-08-12",
    period: { from: "2026-08-12", to: "2026-08-12", label: "2026-08" },
    subjectEntityIds: ["person-camara-1002"],
    objectEntityIds: ["public-body-camara"],
    amount: null,
    evidence: {
      sourceUrl: "https://example.test/oficial",
      checksumSha256: "abc",
      retrievedAt: "2026-08-13",
      documentPage: null,
    },
    data: {},
  };
}

describe("presentación de una entidad persona", () => {
  it("agrupa toda la evidencia en secciones visibles", () => {
    const sections = groupPersonEvidence([
      record("gasto", "expense"),
      record("lobby", "lobby"),
      record("asistencia", "attendance"),
    ]);

    expect(sections.map((section) => [section.id, section.records.length])).toEqual([
      ["dinero", 1],
      ["lobby", 1],
      ["actividad", 1],
    ]);
  });

  it("resume relaciones repetidas con la misma contraparte", () => {
    const relation = (id: string): RelationEdge => ({
      id,
      fromId: "person-camara-1002",
      predicate: "has_attendance_record",
      toId: "public-body-camara",
      evidenceRecordIds: [id],
      period: { from: "2026-08-12", to: "2026-08-12" },
      reconciliation: { method: "official_id", confidence: 1 },
      disclaimer: "La relación documental no implica irregularidad.",
    });

    expect(
      summarizePersonRelations([relation("uno"), relation("dos")], "person-camara-1002"),
    ).toEqual([
      expect.objectContaining({
        counterpartId: "public-body-camara",
        predicate: "has_attendance_record",
        evidenceCount: 2,
      }),
    ]);
  });

  it("reutiliza la foto verificada de la nómina cuando la identidad coincide", () => {
    const politician = POLITICOS_SEED.find((item) => item.foto_url);
    expect(politician).toBeDefined();
    const entity: CanonicalEntity = {
      id: "person-test",
      kind: "person",
      name: politician!.nombre_completo,
      identifiers: [],
      attributes: {},
      sourceIds: ["camara"],
      updatedAt: "2026-08-13",
    };

    expect(personEntityPresentation(entity)).toMatchObject({
      photoUrl: politician!.foto_url,
      politicianPath: getPoliticoPath(politician!.id),
    });
  });

  it("usa la fotografía oficial de Leonardo con su fuente verificable", () => {
    const entity: CanonicalEntity = {
      id: "person-camara-1002",
      kind: "person",
      name: "Leonardo Soto Ferrada",
      identifiers: [],
      attributes: {},
      sourceIds: ["camara"],
      updatedAt: "2026-08-13",
    };

    expect(personEntityPresentation(entity)).toMatchObject({
      photoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Leonardo_Enrique_Soto_Ferrada_%282022%29.jpg",
      photoSourceUrl: "https://commons.wikimedia.org/wiki/File:Leonardo_Enrique_Soto_Ferrada_(2022).jpg",
    });
  });
  it("muestra montos canonicos antiguos y nuevos sin producir NaN", () => {
    expect(personRecordAmountClp({ ...record("nuevo", "expense"), amount: {
      amountClp: 449171,
      currency: "CLP",
      originalAmount: "449171",
      originalUnit: "pesos",
    } })).toBe(449171);
    expect(personRecordAmountClp({
      ...record("legacy", "expense"),
      amount: { value: 372581, currency: "CLP", unit: "pesos" } as never,
    })).toBe(372581);
  });
});
