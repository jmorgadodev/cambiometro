import { describe, expect, it } from "vitest";
import { parseCamaraRoster, parseSenateRoster } from "../scripts/etl/parliament-rosters.mjs";

describe("nominas parlamentarias oficiales", () => {
  it("lee diputados vigentes con su identificador oficial", () => {
    const records = parseCamaraRoster("<Diputado><DIPID>7</DIPID><Nombre>ANA</Nombre><Apellido_Paterno>PEREZ</Apellido_Paterno><Apellido_Materno>SOTO</Apellido_Materno></Diputado>");
    expect(records[0]).toMatchObject({ entityId: "person-camara-7", name: "ANA PEREZ SOTO", chamber: "camara" });
  });

  it("lee la lista actual del Senado y no los periodos historicos del texto", () => {
    const html = '<a href="/appsenado/index.php?mo=senadores&ac=fichasenador&id=1110" title="Araya Guerrero, Pedro">Araya Guerrero, Pedro</a><td>S: 2022-2030, D: 2010-2014</td>';
    expect(parseSenateRoster(html)).toEqual([{
      entityId: "person-senado-1110",
      name: "Pedro Araya Guerrero",
      chamber: "senado",
      evidenceUrl: "https://tramitacion.senado.cl/appsenado/index.php?mo=senadores&ac=fichasenador&id=1110",
    }]);
  });
});
