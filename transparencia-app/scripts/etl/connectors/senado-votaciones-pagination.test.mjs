import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVotacionesSenado } from "./senado-votaciones.mjs";

afterEach(() => vi.unstubAllGlobals());

describe("paginación de votaciones del Senado", () => {
it("conserva PAREO como una categoría distinta de dispensado", async () => {
  vi.stubGlobal("fetch", async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "tramitacion.senado.cl") {
      return new Response(
        "<sesiones><sesion><SESIID>10295</SESIID><FECHAINICIO>Viernes 9 de Octubre de 2026 15:00</FECHAINICIO></sesion></sesiones>",
        { status: 200 },
      );
    }
    if (url.pathname === "/api/votes") {
      return Response.json({ status: "ok", data: { total: 1, data: [{
        ID_VOTACION: 11502, FECHA_VOTACION: "09-10-2026 16:00:00", SI: 0, NO: 0, ABS: 0,
        VOTACIONES: { SI: [], NO: [], ABS: [], PAREO: [{ ID_PARLAMENTARIO: "sen-003", NOMBRE: "Senador Pareado" }], NP: [] },
      }] } });
    }
    if (url.pathname === "/api/sessions/attendance") {
      return Response.json({ status: "ok", data: { DATA: [] } });
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const [row] = await fetchVotacionesSenado({ desde: "2026-10-09", to: "2026-10-09" });
  expect(row.votos).toEqual([{ id: "sen-003", nombre: "Senador Pareado", opcion_valor: "PAREO", opcion: "Pareo" }]);
});

it("solicita el límite explícito y no omite votos cuando la API pagina por defecto", async () => {
  const voteRows = Array.from({ length: 13 }, (_, index) => ({
    ID_VOTACION: 11400 + index,
    FECHA_VOTACION: "06-10-2026 18:28:08",
    TEMA: `Votación ${index + 1}`,
    SI: 5,
    NO: 2,
    ABS: 1,
    VOTACIONES: { SI: [{ ID_PARLAMENTARIO: "sen-001", NOMBRE: "Senador Ejemplo" }], NO: [], ABS: [], PAREO: [], NP: [] },
  }));
  const requests = [];

  vi.stubGlobal("fetch", async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    if (url.hostname === "tramitacion.senado.cl") {
      return new Response(
        "<sesiones><sesion><SESIID>10292</SESIID><FECHAINICIO>Martes 6 de Octubre de 2026 15:00</FECHAINICIO></sesion></sesiones>",
        { status: 200 },
      );
    }
    if (url.pathname === "/api/votes") {
      const returnedRows = url.searchParams.has("limit") ? voteRows : voteRows.slice(0, 10);
      return Response.json({ status: "ok", data: { total: 13, data: returnedRows } });
    }
    if (url.pathname === "/api/sessions/attendance") {
      return Response.json({ data: [], status: "ok", results: 1 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const rows = await fetchVotacionesSenado({ desde: "2026-10-06", to: "2026-10-06" });
  expect(requests.find((url) => url.pathname === "/api/votes")?.searchParams.get("limit")).toBe("100");
  expect(rows).toHaveLength(13);
  expect(rows.every((row) => row.nominal_completeness === "reported_votes_only")).toBe(true);
  expect(rows.every((row) => row.votos.length === 1 && row.votos[0].opcion === "Afirmativo")).toBe(true);
});

it("cuando hay padrón oficial agrega No Vota sólo a presentes con identidad publicada", async () => {
  vi.stubGlobal("fetch", async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "tramitacion.senado.cl") {
      return new Response(
        "<sesiones><sesion><SESIID>10294</SESIID><FECHAINICIO>Jueves 8 de Octubre de 2026 15:00</FECHAINICIO></sesion></sesiones>",
        { status: 200 },
      );
    }
    if (url.pathname === "/api/votes") {
      return Response.json({ status: "ok", data: { total: 1, data: [{
        ID_VOTACION: 11501, FECHA_VOTACION: "08-10-2026 16:00:00", SI: 1, NO: 0, ABS: 0,
        VOTACIONES: { SI: [{ ID_PARLAMENTARIO: "sen-001", NOMBRE: "Senador A" }], NO: [], ABS: [], PAREO: [], NP: [] },
      }] } });
    }
    if (url.pathname === "/api/sessions/attendance") {
      return Response.json({ status: "ok", data: { DATA: [
        { ID_PARLAMENTARIO: "sen-001", NOMBRE: "Senador A", ASISTENCIA: "Asiste" },
        { ID_PARLAMENTARIO: "sen-002", NOMBRE: "Senador B", ASISTENCIA: "Asiste" },
      ] } });
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  const [row] = await fetchVotacionesSenado({ desde: "2026-10-08", to: "2026-10-08" });
  expect(row.nominal_completeness).toBe("attendance_roster_available");
  expect(row.votos.map((vote) => [vote.id, vote.opcion])).toEqual([["sen-001", "Afirmativo"], ["sen-002", "No Vota"]]);
});

it("bloquea la sesión si el API sigue entregando menos filas que su total", async () => {
  const voteRows = Array.from({ length: 10 }, (_, index) => ({
    ID_VOTACION: 11400 + index,
    FECHA_VOTACION: "06-10-2026 18:28:08",
    SI: 5,
    NO: 2,
    ABS: 1,
    VOTACIONES: { SI: [], NO: [], ABS: [], PAREO: [], NP: [] },
  }));
  vi.stubGlobal("fetch", async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "tramitacion.senado.cl") {
      return new Response(
        "<sesiones><sesion><SESIID>10292</SESIID><FECHAINICIO>Martes 6 de Octubre de 2026 15:00</FECHAINICIO></sesion></sesiones>",
        { status: 200 },
      );
    }
    if (url.pathname === "/api/votes") {
      return Response.json({ status: "ok", data: { total: 13, data: voteRows } });
    }
    if (url.pathname === "/api/sessions/attendance") {
      return Response.json({ data: { DATA: [] }, status: "ok" });
    }
    throw new Error(`Unexpected URL: ${url}`);
  });

  await expect(fetchVotacionesSenado({ desde: "2026-10-06", to: "2026-10-06" })).rejects.toThrow("SENADO_SESSION_INCOMPLETE:10292");
});
});
