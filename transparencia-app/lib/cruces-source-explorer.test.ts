import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("explorador de registros de Cruces", () => {
  const page = readFileSync(resolve("app/cruces/page.tsx"), "utf8");
  const client = readFileSync(resolve("components/cruces/CrucesSourceRecords.tsx"), "utf8");

  it("ofrece acceso paginado a los registros completos por fuente", () => {
    expect(page).toContain("CrucesSourceRecords");
    expect(client).toContain("/api/v1/records");
    expect(client).toContain("source");
    expect(client).toContain("entity_id");
    expect(client).toContain("Página");
    expect(client).toContain("ChileCompra");
    expect(client).toContain("InfoLobby");
  });

  it("explica cada registro con campos legibles y conserva la evidencia oficial", () => {
    expect(client).toContain("recordFacts");
    expect(client).toContain("Fuente oficial");
    expect(client).toContain("Ver datos técnicos");
    expect(client).toContain("Sujeto pasivo");
    expect(client).toContain("Número de informe");
  });
});
