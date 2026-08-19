import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { leerInfoProbidadV1 } from "./infoprobidad-lake";
import { leerInfoLobbyV1 } from "./infolobby";

describe("Subsets reales del Lake de Datos", () => {
  const rootDir = process.cwd();
  const subsetsDir = path.join(rootDir, "data", "lake-subsets");
  const probidadFile = path.join(subsetsDir, "infoprobidad.subset.json");
  const lobbyFile = path.join(subsetsDir, "infolobby.subset.json");

  it("el subset de InfoProbidad existe, es menor a 100 KB y contiene registros reales válidos", () => {
    expect(fs.existsSync(probidadFile)).toBe(true);
    const stat = fs.statSync(probidadFile);
    expect(stat.size).toBeLessThan(100 * 1024);

    const json = JSON.parse(fs.readFileSync(probidadFile, "utf8"));
    expect(json.records.length).toBeGreaterThanOrEqual(50);
    expect(json.records[0]).toHaveProperty("id");
    expect(json.records[0]).toHaveProperty("nombre");
    expect(json.records[0]).toHaveProperty("fecha");
  });

  it("el subset de InfoLobby existe, es menor a 100 KB y contiene registros reales válidos", () => {
    expect(fs.existsSync(lobbyFile)).toBe(true);
    const stat = fs.statSync(lobbyFile);
    expect(stat.size).toBeLessThan(100 * 1024);

    const json = JSON.parse(fs.readFileSync(lobbyFile, "utf8"));
    expect(json.records.length).toBeGreaterThanOrEqual(30);
    expect(json.records[0]).toHaveProperty("id");
    expect(json.records[0]).toHaveProperty("fecha");
    expect(json.records[0]).toHaveProperty("organismo");
  });

  it("los loaders del lago resuelven proyecciones reales con fallback transparente", () => {
    const probidad = leerInfoProbidadV1();
    expect(probidad).not.toBeNull();
    expect(probidad?.records.length).toBeGreaterThan(0);

    const lobby = leerInfoLobbyV1();
    expect(lobby).not.toBeNull();
    expect(lobby?.records.length).toBeGreaterThan(0);
  });
});
