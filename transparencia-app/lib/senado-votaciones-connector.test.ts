import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchVotacionesSenado } from "../scripts/etl/connectors/senado-votaciones.mjs";

const attendedVoter = {
  ID_PARLAMENTARIO: "11",
  NOMBRE: "ANA",
  APELLIDO_PATERNO: "PEREZ",
  APELLIDO_MATERNO: "ROJAS",
  ASISTENCIA: "Asiste",
};

const attendedWithoutVote = {
  ID_PARLAMENTARIO: "12",
  NOMBRE: "JUAN",
  APELLIDO_PATERNO: "GONZALEZ",
  APELLIDO_MATERNO: "DIAZ",
  ASISTENCIA: "Asiste",
};

const absent = {
  ID_PARLAMENTARIO: "13",
  NOMBRE: "MARIA",
  APELLIDO_PATERNO: "SOTO",
  APELLIDO_MATERNO: "LEIVA",
  ASISTENCIA: "Inasiste",
};

afterEach(() => vi.restoreAllMocks());

describe("conector de votaciones del Senado", () => {
  it("conserva votos oficiales y agrega NP sólo a asistentes sin voto publicado", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("sesiones.php")) {
        return new Response(`
          <sesiones>
            <sesion>
              <SESIID>9001</SESIID>
              <NUMERO>12</NUMERO>
              <FECHAINICIO>Miércoles 9 de Septiembre de 2026 10:00</FECHAINICIO>
            </sesion>
          </sesiones>
        `, { status: 200 });
      }
      if (url.includes("/api/votes")) {
        return Response.json({ data: { data: [{
          ID_VOTACION: 77,
          FECHA_VOTACION: "2026-09-09",
          TEMA: "Proyecto de prueba",
          SI: 1,
          NO: 0,
          ABS: 0,
          PAREO: 0,
          VOTACIONES: { SI: [attendedVoter], NO: [], ABS: [], PAREO: [], NP: [] },
        }] } });
      }
      if (url.includes("/api/sessions/attendance")) {
        return Response.json({ data: { DATA: [attendedVoter, attendedWithoutVote, absent] } });
      }
      throw new Error(`URL inesperada en prueba: ${url}`);
    });

    const [vote] = await fetchVotacionesSenado({ legislatura: 374, desde: "2026-09-01", to: "2026-09-30" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(vote).toMatchObject({
      id: "sen-vot-77",
      fecha: "2026-09-09",
      resultado: "Aprobado",
      total_si: "1",
    });
    expect(vote.votos).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "11", nombre: "ANA PEREZ ROJAS", opcion_valor: "SI" }),
      expect.objectContaining({ id: "12", nombre: "JUAN GONZALEZ DIAZ", opcion_valor: "NP" }),
    ]));
    expect(vote.votos).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "13" }),
    ]));
  });
});
