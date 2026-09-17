import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fetchVotacionesSenado } from "../scripts/etl/connectors/senado-votaciones.mjs";
import { senateVotePublicationReady } from "../scripts/etl/senate-vote-publication.mjs";

afterEach(() => vi.unstubAllGlobals());
describe("publicación incremental de Senado", () => {
  it("omite todas las escrituras y reconstrucciones cuando no existen novedades", () => {
    const workflow = readFileSync("../.github/workflows/etl-senado-votaciones.yml", "utf8");
    expect(workflow).toContain("senateVotePublicationReady");
    for (const name of ["Construir y publicar lake de Senado", "Actualizar cache estático incremental del Senado", "Construir subsets estáticos", "Publicar entradas estáticas de Parlamento"]) {
      const step = workflow.split(`- name: ${name}`)[1]?.split("- name:")[0];
      expect(step).toContain("if: steps.ingest.outputs.publish == 'true'");
    }
  });
  it("no publica una consulta válida sin novedades", () => {
    expect(senateVotePublicationReady({ errores: [], votaciones_senado_ingresadas: 0 })).toBe(false);
    expect(senateVotePublicationReady({ errores: [], votaciones_senado_ingresadas: 29 })).toBe(true);
    expect(() => senateVotePublicationReady({ errores: ["HTTP 403"], votaciones_senado_ingresadas: 0 })).toThrow();
    expect(() => senateVotePublicationReady({})).toThrow();
  });
  it("rechaza HTML en lugar de un listado XML, no lo trata como ausencia de sesiones", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Access denied</html>")));
    await expect(fetchVotacionesSenado({ desde: "2026-09-14", to: "2026-09-17" })).rejects.toThrow("SENADO_SESSION_SCHEMA");
  });
  it("acepta el listado oficial válido sin sesiones en el rango", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<?xml version='1.0'?><sesiones><sesion><SESIID>10273</SESIID><FECHAINICIO>Miércoles 9 de Septiembre de 2026 16:18</FECHAINICIO></sesion></sesiones>")));
    expect(await fetchVotacionesSenado({ desde: "2026-09-14", to: "2026-09-17" })).toEqual([]);
  });
  it("no publica un período parcial cuando una sesión devuelve esquema inválido", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("sesiones.php")
      ? new Response("<?xml version='1.0'?><sesiones><sesion><SESIID>10273</SESIID><FECHAINICIO>Miércoles 9 de Septiembre de 2026 16:18</FECHAINICIO></sesion></sesiones>")
      : Response.json({ data: {} })));
    await expect(fetchVotacionesSenado({ desde: "2026-09-01", to: "2026-09-17" })).rejects.toThrow("SENADO_SESSION_INCOMPLETE");
  });
});
