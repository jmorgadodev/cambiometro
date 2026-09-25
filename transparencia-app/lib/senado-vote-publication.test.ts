import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fetchVotacionesSenado } from "../scripts/etl/connectors/senado-votaciones.mjs";
import { existingSenateVoteIdsFromProjection } from "../scripts/etl/senado-votaciones-release.mjs";
import { senateVotePublicationReady } from "../scripts/etl/senate-vote-publication.mjs";

afterEach(() => vi.unstubAllGlobals());
describe("publicación incremental de Senado", () => {
  it("extrae y normaliza los IDs de las votaciones senatoriales del artefacto público hidratado", () => {
    expect(existingSenateVoteIdsFromProjection({ votes: {
      "sen-001": [["senado-vot-11341", "Afirmativo"], ["11342", "Negativo"]],
      "dip-001": [["senado-vot-99999", "Afirmativo"]],
      "sen-002": [["senado-vot-11341", "Afirmativo"]],
    } })).toEqual(["11341", "11342"]);
    expect(existingSenateVoteIdsFromProjection(null)).toEqual([]);
  });
  it("omite escrituras y reconstrucciones locales cuando no existen novedades", () => {
    const localTask = readFileSync("scripts/etl-senado-votaciones-local.ps1", "utf8");
    const noNewsGuard = localTask.indexOf("if (-not $publish)");
    expect(noNewsGuard).toBeGreaterThanOrEqual(0);
    expect(localTask).toContain("sin novedades verificadas; R2 queda intacto");

    for (const command of ["data:lake", "data:publish", "data:build:subsets", "data:publish:static"]) {
      const writeIndex = localTask.indexOf(`"${command}"`);
      expect(writeIndex, `${command} debe estar protegido por el guard de novedades`).toBeGreaterThan(noNewsGuard);
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
  it("acepta la respuesta oficial de una sesión sin votaciones", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("sesiones.php")
      ? new Response("<sesiones><sesion><SESIID>10260</SESIID><FECHAINICIO>Miércoles 9 de Septiembre de 2026 12:15</FECHAINICIO></sesion></sesiones>")
      : url.includes("/api/votes") ? Response.json({ status: "ok", data: { total: 0, data: "" } })
      : Response.json({ data: { DATA: [] } })));
    expect(await fetchVotacionesSenado({ desde: "2026-09-01", to: "2026-09-17" })).toEqual([]);
  });
  it("no bloquea el ETL si una sesión con votos ya publicados falla sólo en asistencia", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("sesiones.php")
      ? new Response("<sesiones><sesion><SESIID>10277</SESIID><FECHAINICIO>Martes 22 de Septiembre de 2026 16:00</FECHAINICIO></sesion></sesiones>")
      : url.includes("/api/votes") ? Response.json({ status: "ok", data: { total: 1, data: [{
        ID_VOTACION: 11341,
        FECHA_VOTACION: "22-09-2026",
        VOTACIONES: { SI: [{ ID_PARLAMENTARIO: 1, NOMBRE: "Senadora", APELLIDO_PATERNO: "Prueba" }] },
        SI: 1,
        NO: 0,
        ABS: 0,
      }] } })
      : new Response("Forbidden", { status: 403 })));

    const votes = await fetchVotacionesSenado({
      legislatura: 374,
      desde: "2026-09-22",
      to: "2026-09-22",
      existingVoteIds: ["11341"],
    } as never);

    expect(votes).toEqual([]);
  });
  it("mantiene bloqueada una sesión con votos nuevos si no se puede validar la asistencia", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("sesiones.php")
      ? new Response("<sesiones><sesion><SESIID>10279</SESIID><FECHAINICIO>Jueves 24 de Septiembre de 2026 16:00</FECHAINICIO></sesion></sesiones>")
      : url.includes("/api/votes") ? Response.json({ status: "ok", data: { total: 1, data: [{
        ID_VOTACION: 11355,
        FECHA_VOTACION: "24-09-2026",
        VOTACIONES: { SI: [{ ID_PARLAMENTARIO: 1, NOMBRE: "Senadora", APELLIDO_PATERNO: "Prueba" }] },
        SI: 1,
        NO: 0,
        ABS: 0,
      }] } })
      : Response.json({ data: { DATA: null } })));

    await expect(fetchVotacionesSenado({
      legislatura: 374,
      desde: "2026-09-24",
      to: "2026-09-24",
      existingVoteIds: ["11341"],
    } as never)).rejects.toThrow("SENADO_SESSION_INCOMPLETE:10279");
  });
  it("no requiere asistencia para una sesión oficial que no tiene votaciones", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("sesiones.php")
      ? new Response("<sesiones><sesion><SESIID>10260</SESIID><FECHAINICIO>Miércoles 9 de Septiembre de 2026 12:15</FECHAINICIO></sesion></sesiones>")
      : url.includes("/api/votes") ? Response.json({ status: "ok", data: { total: 0, data: "" } })
      : new Response("Forbidden", { status: 403 })));

    await expect(fetchVotacionesSenado({ desde: "2026-09-01", to: "2026-09-17" })).resolves.toEqual([]);
  });
  it("no asigna No Vota a senadores ausentes", async () => {
    const staticBuilder = readFileSync("scripts/ingest-votaciones-full.mjs", "utf8");
    expect(staticBuilder).not.toContain('ASISTENCIA !== "Inasiste"');
    expect(staticBuilder).toContain("attendedSession(att)");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("sesiones.php")
      ? new Response("<sesiones><sesion><SESIID>10273</SESIID><FECHAINICIO>Miércoles 9 de Septiembre de 2026 16:18</FECHAINICIO></sesion></sesiones>")
      : url.includes("/api/votes") ? Response.json({ data: { data: [{ ID_VOTACION: 1, FECHA_VOTACION: "09-09-2026", VOTACIONES: {}, SI: 0, NO: 0 }] } })
      : Response.json({ data: { DATA: [{ ID_PARLAMENTARIO: 1, NOMBRE: "Presente", ASISTENCIA: "Asiste" }, { ID_PARLAMENTARIO: 2, NOMBRE: "Ausente", ASISTENCIA: "Ausente" }, { ID_PARLAMENTARIO: 3, NOMBRE: "Desconocido", ASISTENCIA: "" }] } })));
    const votes = await fetchVotacionesSenado({ desde: "2026-09-01", to: "2026-09-17" });
    expect(votes[0].votos).toEqual([{ id: "1", nombre: "Presente", opcion_valor: "NP", opcion: "No Vota" }]);
  });
});
