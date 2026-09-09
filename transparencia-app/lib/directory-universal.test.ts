import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("directorio universal", () => {
  const client = readFileSync(resolve("components/personas/PersonasUniversalClient.tsx"), "utf8");
  const worker = readFileSync(resolve("workers/public-api/index.ts"), "utf8");

  it("consulta funcionarios nacionales sin obligar a escoger un organismo", () => {
    expect(client).not.toContain('if (organismoFilter === "Todos") {');
    expect(client).toContain("fetch(`/api/funcionarios?");
    expect(worker).toContain("funcionarios_publicos");
    expect(worker).toContain("search_index");
  });

  it("envía las búsquedas sin pestaña a todas las categorías y conserva sus destinos", () => {
    expect(client).toContain('id: "todos" as PersonaTab');
    expect(client).toContain('hasGlobalSearch ? "todos" : "parlamentarios"');
    expect(client).toContain('syncUrl({ tab: "todos", search: value, page: 1 })');
    expect(client).toContain('href={`/politico/${getPoliticoSlug(p.id)}`}');
    expect(client).toContain('href={`/municipalidades/${a.muni_id}`}');
    expect(client).toContain('href={`/servicios-publicos/${aut.id}`}');
    expect(client).toContain('setModalItem({ tipo: "funcionario", data: f })');
  });

  it("mantiene estados de carga, error, vacío y reintento", () => {
    expect(client).toContain("funcionariosError");
    expect(client).toContain("Reintentar consulta");
    expect(client).toContain("No se encontraron funcionarios");
  });
});
