import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("consulta runtime de funcionarios", () => {
  it("lee la particion del organismo y no el indice nacional completo", () => {
    const route = readFileSync(resolve(process.cwd(), "app/api/funcionarios/route.ts"), "utf8");
    expect(route).toContain("administrationId}.json");
    expect(route).not.toContain("search_index.json");
  });

  it("exige seleccionar un organismo para proteger la memoria del Worker", () => {
    const client = readFileSync(resolve(process.cwd(), "components/GlobalFuncionariosClient.tsx"), "utf8");
    expect(client).not.toContain('<option value="Todos">Todos los Organismos</option>');
  });
});
