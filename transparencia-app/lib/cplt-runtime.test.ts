import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("consulta runtime de funcionarios", () => {
  it("lee particiones por organismo y un índice nacional paginado", () => {
    const route = readFileSync(resolve(process.cwd(), "workers/public-api/index.ts"), "utf8");
    expect(route).toContain("search_index.json");
    expect(route).toContain("searchIndex");
    expect(route).toContain("LIMIT ?");
  });

  it("mantiene el cliente de fichas municipales acotado por organismo", () => {
    const client = readFileSync(resolve(process.cwd(), "components/GlobalFuncionariosClient.tsx"), "utf8");
    expect(client).not.toContain('<option value="Todos">Todos los Organismos</option>');
  });
});
