import { describe, expect, it } from "vitest";
import { listEntities, searchEntities, getEntity } from "@/lib/data-platform-v1";

const RUT_PATTERN = /\b\d{1,2}(?:\.\d{3}){2}-[0-9kK]\b/;

function hasRutLikeValue(value: unknown): boolean {
  if (typeof value === "string") return RUT_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(hasRutLikeValue);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasRutLikeValue);
  }
  return false;
}

describe("no-exposición de RUT en API y búsqueda", () => {
  it("ninguna entidad de personas expone RUT en sus identificadores o atributos", () => {
    const persons = listEntities({ kind: "person" }).data;
    expect(persons.length).toBeGreaterThan(0);

    for (const person of persons) {
      const rutIdentifiers = person.identifiers.filter((identifier) =>
        /rut/i.test(identifier.scheme),
      );
      expect(rutIdentifiers, `persona ${person.id} no debe tener identifier de RUT`).toEqual([]);
      const rutAttributes = Object.entries(person.attributes ?? {}).filter(([key, value]) =>
        /rut/i.test(key) || hasRutLikeValue(value),
      );
      expect(rutAttributes, `persona ${person.id} no debe tener atributos con RUT`).toEqual([]);
      expect(person.id).not.toMatch(RUT_PATTERN);
    }
  });

  it("la búsqueda pública no devuelve RUT en entidades de personas", () => {
    for (const query of ["Garcia", "Perez", "a", "Vidal"]) {
      const results = searchEntities(query, 50);
      for (const entity of results.filter((result) => result.kind === "person")) {
        expect(
          hasRutLikeValue(entity),
          `búsqueda "${query}": persona ${entity.id} expone un valor tipo RUT`,
        ).toBe(false);
      }
    }
  });

  it("la ficha de una persona no serializa RUT", () => {
    const persons = listEntities({ kind: "person" }).data;
    const sample = persons[0];
    const entity = getEntity(sample.id);
    expect(entity).toBeDefined();
    expect(hasRutLikeValue(entity)).toBe(false);
  });

  it("las entidades jurídicas conservan RUT solo como identificador público de fuente", () => {
    const legalEntities = listEntities({ kind: "supplier" }).data;
    const withRut = legalEntities.filter((entity) =>
      entity.identifiers.some((identifier) => /rut/i.test(identifier.scheme)),
    );
    for (const entity of withRut) {
      const rutIdentifiers = entity.identifiers.filter((identifier) => /rut/i.test(identifier.scheme));
      expect(rutIdentifiers.length).toBeGreaterThan(0);
      for (const identifier of rutIdentifiers) {
        expect(identifier.isPublic).toBe(true);
        expect(identifier.sourceUrl).toBeTruthy();
      }
    }
  });
});