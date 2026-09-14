import { describe, expect, it } from "vitest";
import {
  normalizeMovementPersonName,
  normalizeMovementRecord,
  normalizeMovementRelease,
  validateMovementNormalization,
} from "../movimientos-normalization.mjs";

describe("normalización auditable de movimientos", () => {
  it("normaliza acentos y mayúsculas sin reemplazar el nombre original", () => {
    const person = normalizeMovementPersonName("María Paz Ríos Lama");
    expect(person.nombreOriginal).toBe("María Paz Ríos Lama");
    expect(person.nombreNormalizado).toBe("maria paz rios lama");
    expect(person.personKey).toContain("maria");
  });

  it("conserva saliente, entrante, fuente oficial y la fila completa", () => {
    const original = {
      id: "mov-test-1",
      tipo_evento: "nombramiento",
      cargo: "Subsecretaria de Deportes",
      organismo: "Ministerio del Deporte",
      fecha: "2026-08-26",
      salio: { nombre: "Persona Saliente" },
      entro: { nombre: "María Paz Ríos Lama" },
      decreto_url: "https://www.bcn.cl/leychile/navegar?idNorma=1",
      fuentes: [{ nivel: "oficial", url: "https://www.gob.cl/noticias/" }],
      estado: "verificado",
    };
    const normalized = normalizeMovementRecord(original, { releaseId: "movimientos-test" });
    expect(normalized.recordId).toBe("mov-test-1");
    expect(normalized.personas.entrante.nombreNormalizado).toBe("maria paz rios lama");
    expect(normalized.officialUrls).toHaveLength(2);
    expect(normalized.original).toBe(original);
    expect(normalized.qualityObservations).toEqual([]);
  });

  it("marca un documento pendiente sin convertirlo en movimiento verificado", () => {
    const normalized = normalizeMovementRecord({
      id: "mov-test-2",
      fecha: "2026-08-27",
      cargo: "Ministro",
      organismo: "Presidencia",
      estado: "en_confirmacion",
      documento_pendiente: true,
      fuentes: [{ nivel: "prensa", url: "https://example.test/noticia" }],
    });
    expect(normalized.estadoRegistro).toBe("en_confirmacion");
    expect(normalized.qualityObservations).toContain("documento_pendiente");
    expect(normalized.qualityObservations).toContain("fuente_oficial_ausente");
  });

  it("rechaza ids repetidos en un release normalizado", () => {
    const release = normalizeMovementRelease({
      checksum_sha256: "a".repeat(64),
      movimientos: [
        { id: "mov-1", estado: "verificado", fecha: "2026-01-01" },
        { id: "mov-1", estado: "verificado", fecha: "2026-01-02" },
      ],
    });
    expect(() => validateMovementNormalization(release)).toThrow("MOVIMIENTOS_NORMALIZED_DUPLICATE_ID");
  });
});
