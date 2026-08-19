import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { politicoIdFromEntityId } from "./politico-canonical";

describe("experiencia visual de personas", () => {
  const directory = readFileSync(resolve("app/politico/page.tsx"), "utf8") + readFileSync(resolve("components/PoliticosListClient.tsx"), "utf8");
  const entityPage = readFileSync(resolve("app/entidades/[id]/page.tsx"), "utf8");
  const profile = readFileSync(resolve("components/PersonEntityProfile.tsx"), "utf8");
  const searchRoute = readFileSync(resolve("app/api/v1/search/route.ts"), "utf8");
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
    expect(entityPage).toContain('redirect(`/entidades/${id}#${selected.id}`)');
    expect(entityPage).toContain("getEntitiesByIds(counterpartIds)");
    expect(profile).toContain('href={`#${section.id}`}');
    expect(profile).toContain('id="relaciones"');
    expect(profile).toContain('className="person-entity__photo"');
  });

  it("permite encontrar tambien personas historicas de la plataforma canonica", () => {
    expect(searchRoute).toContain("searchEntities(rawQuery");
    expect(searchRoute).toContain("/entidades/${entity.id}");
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
    expect(entityPage).toContain("politicoIdFromEntityId(id)");
    expect(entityPage).toContain("redirect(`/politico/${directPoliticoId}`)");
  });

  it("la página /autoridades redirige permanentemente a /personas?tab=parlamentarios", () => {
    expect(autoridadesPage).toContain("redirect(");
    expect(autoridadesPage).toContain("/personas?tab=parlamentarios");
    expect(autoridadesExplorer).toContain("getPoliticoSlug(pol)");
    expect(autoridadesExplorer).not.toContain("/entidades/person-");
  });
});

