import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { politicoIdFromEntityId } from "./politico-canonical";

describe("experiencia visual de personas", () => {
  const directory = readFileSync(resolve("app/politico/page.tsx"), "utf8") + readFileSync(resolve("components/PoliticosListClient.tsx"), "utf8");
  const entityPage = readFileSync(resolve("app/entidades/[id]/page.tsx"), "utf8");
  const profile = readFileSync(resolve("components/PersonEntityProfile.tsx"), "utf8");
  const searchRoute = readFileSync(resolve("workers/public-api/index.ts"), "utf8");
  const autoridadesPage = readFileSync(resolve("app/autoridades/page.tsx"), "utf8");
  const autoridadesExplorer = readFileSync(resolve("components/AutoridadesExplorer.tsx"), "utf8");

  it("muestra el directorio como tarjetas con fotografías legibles", () => {
    expect(directory).toContain('className="politician-card-grid"');
    expect(directory).toContain('className="politician-card__photo"');
    expect(directory).toContain("width={72}");
    expect(directory).toContain("height={72}");
  });

  it("usa una ficha continua para entidades persona", () => {
    expect(entityPage).toContain("<PersonEntityProfile");
    expect(entityPage).not.toContain("redirect(");
    expect(entityPage).toContain("counterpartNames");
    expect(profile).toContain('href={`#${section.id}`}');
    expect(profile).toContain('id="relaciones"');
    expect(profile).toContain('className="person-entity__photo"');
  });

  it("permite encontrar tambien personas historicas de la plataforma canonica", () => {
    expect(searchRoute).toContain("FROM entities WHERE name LIKE");
    expect(searchRoute).toContain("/entidades/${item.id}");
  });

  it("mapea IDs de entidades parlamentarias directamente a /politico/[id]", () => {
    // Jaime Araya Guerrero (1009)
    const araya = politicoIdFromEntityId("person-camara-1009");
    expect(araya).toBeTruthy();
    expect(araya).toMatch(/^dip-/);

    // Raúl Soto Mardones (1077)
    const soto = politicoIdFromEntityId("person-camara-1077");
    expect(soto).toBeTruthy();
    expect(soto).toMatch(/^dip-/);

    // Redirección en página de entidad
    expect(entityPage).not.toContain("redirect(");
  });

  it("la página /autoridades redirige permanentemente a /personas?tab=parlamentarios", () => {
    expect(autoridadesPage).not.toContain("redirect(");
    expect(readFileSync(resolve("public/_redirects"), "utf8")).toContain("/autoridades /personas?tab=parlamentarios 301");
    expect(readFileSync(resolve("public/_redirects"), "utf8")).toContain("/municipalidades/muni-maipu/ /municipalidades/maipu 301");
    expect(readFileSync(resolve("public/_redirects"), "utf8")).toContain("/politico/dip-031/ /politico/sofia-gonzalez-cortes 301");
    expect(readFileSync(resolve("public/_redirects"), "utf8")).toContain("/partidos/independientes/ /partidos/ind 301");
    expect(readFileSync(resolve("public/_redirects"), "utf8")).toContain("/servicios-publicos/min-interior/ /servicios-publicos/ministerio-del-interior-y-seguridad-publica 301");
    expect(autoridadesExplorer).toContain("getPoliticoSlug(pol)");
    expect(autoridadesExplorer).not.toContain("/entidades/person-");
  });
});

