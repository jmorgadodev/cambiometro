import { describe, expect, it } from "vitest";
import { createEntitySeoMetadata, getPublicLegalRut } from "./entity-seo-metadata";

describe("SEO y presentación de identificadores de entidades", () => {
  const supplier = {
    id: "provider-966893109",
    kind: "supplier" as const,
    name: "Proveedor de prueba SpA",
    identifiers: [{ scheme: "CL-RUT", value: "966893109", isPublic: true, sourceUrl: "https://example.test/official" }],
    attributes: {},
    sourceIds: ["chilecompra"],
    updatedAt: null,
  };

  it("formatea el RUT oficial público para distinguir la ficha en resultados de búsqueda", () => {
    expect(getPublicLegalRut(supplier)).toBe("96.689.310-9");
    expect(createEntitySeoMetadata(supplier).title).toContain("96.689.310-9");
    expect(createEntitySeoMetadata(supplier).description).toContain("Proveedor de prueba SpA");
  });

  it("reconoce los identificadores públicos reales de ChileCompra", () => {
    const buyer = {
      ...supplier,
      id: "public-body-chilecompra-rut-690713004",
      kind: "public_body" as const,
      identifiers: [{ scheme: "CHILECOMPRA-RUT", value: "69.071.300-4", isPublic: true, sourceUrl: "https://example.test/official" }],
    };
    const provider = {
      ...supplier,
      id: "provider-chilecompra-legal-cl-966893109",
      identifiers: [{ scheme: "CL-MP", value: "legal-cl-966893109", isPublic: true, sourceUrl: "https://example.test/official" }],
    };
    const opaqueProvider = {
      ...supplier,
      identifiers: [{ scheme: "CL-MP", value: "provider-opaque-12345678", isPublic: true, sourceUrl: "https://example.test/official" }],
    };

    expect(getPublicLegalRut(buyer)).toBe("69.071.300-4");
    expect(getPublicLegalRut(provider)).toBe("96.689.310-9");
    expect(getPublicLegalRut(opaqueProvider)).toBeNull();
  });

  it("no publica RUN personales ni identificadores no públicos en los metadatos", () => {
    const person = {
      ...supplier,
      kind: "person" as const,
      identifiers: [{ scheme: "CL-RUN", value: "12.345.678-5", isPublic: true, sourceUrl: "https://example.test/source" }],
    };
    const privateCompany = {
      ...supplier,
      identifiers: [{ scheme: "CL-RUT", value: "96.689.310-9", isPublic: false, sourceUrl: "https://example.test/private" }],
    };

    expect(getPublicLegalRut(person)).toBeNull();
    expect(createEntitySeoMetadata(person).title).not.toContain("12.345.678-5");
    expect(getPublicLegalRut(privateCompany)).toBeNull();
    expect(createEntitySeoMetadata(privateCompany).description).not.toContain("96.689.310-9");
  });
});
