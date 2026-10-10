import test from "node:test";
import assert from "node:assert/strict";
import { fetchVotacionesSenado } from "./senado-votaciones.mjs";

test("solicita el límite explícito y no omite votos cuando la API pagina por defecto", async () => {
  const originalFetch = globalThis.fetch;
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

  globalThis.fetch = async (input) => {
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
  };

  try {
    const rows = await fetchVotacionesSenado({ desde: "2026-10-06", to: "2026-10-06" });
    assert.equal(requests.find((url) => url.pathname === "/api/votes")?.searchParams.get("limit"), "100");
    assert.equal(rows.length, 13);
    assert.equal(rows.every((row) => row.nominal_completeness === "reported_votes_only"), true);
    assert.equal(rows.every((row) => row.votos.length === 1 && row.votos[0].opcion === "Afirmativo"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cuando hay padrón oficial agrega No Vota sólo a presentes con identidad publicada", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
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
  };

  try {
    const [row] = await fetchVotacionesSenado({ desde: "2026-10-08", to: "2026-10-08" });
    assert.equal(row.nominal_completeness, "attendance_roster_available");
    assert.deepEqual(row.votos.map((vote) => [vote.id, vote.opcion]), [["sen-001", "Afirmativo"], ["sen-002", "No Vota"]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bloquea la sesión si el API sigue entregando menos filas que su total", async () => {
  const originalFetch = globalThis.fetch;
  const voteRows = Array.from({ length: 10 }, (_, index) => ({
    ID_VOTACION: 11400 + index,
    FECHA_VOTACION: "06-10-2026 18:28:08",
    SI: 5,
    NO: 2,
    ABS: 1,
    VOTACIONES: { SI: [], NO: [], ABS: [], PAREO: [], NP: [] },
  }));
  globalThis.fetch = async (input) => {
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
  };

  try {
    await assert.rejects(
      fetchVotacionesSenado({ desde: "2026-10-06", to: "2026-10-06" }),
      /SENADO_SESSION_INCOMPLETE:10292/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
