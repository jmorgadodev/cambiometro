import { describe, expect, it } from "vitest";
import {
  buildCamaraAttendanceUrl,
  buildCamaraSessionsUrl,
  fetchCamaraAttendance,
  normalizeCamaraAttendance,
  parseCamaraAttendanceXml,
  parseCamaraSessionsXml,
} from "../scripts/etl/connectors/camara-attendance.mjs";

const sessionsXml = `<?xml version="1.0" encoding="utf-8"?>
<SesionesSalaColeccion xmlns="http://opendata.camara.cl/camaradiputados/v1">
  <Sesion><Id>4808</Id><Numero>51</Numero><FechaInicio>2026-08-04T19:01:28</FechaInicio><FechaTermino>2026-08-04T20:04:29</FechaTermino><Tipo Valor="2">Especial</Tipo><Estado Valor="1">Celebrada</Estado></Sesion>
  <Sesion><Id>4809</Id><Numero>52</Numero><FechaInicio>2026-08-05T10:02:55</FechaInicio><FechaTermino>2026-08-05T14:04:27</FechaTermino><Tipo Valor="1">Ordinaria</Tipo><Estado Valor="1">Celebrada</Estado></Sesion>
  <Sesion><Id>4810</Id><Numero>53</Numero><FechaInicio>2026-08-10T17:00:00</FechaInicio><FechaTermino>2026-08-10T19:00:00</FechaTermino><Tipo Valor="1">Ordinaria</Tipo><Estado Valor="0">Citada</Estado></Sesion>
</SesionesSalaColeccion>`;

function attendanceXml(sessionId = 4809, deputyId = 803) {
  const date = sessionId === 4808 ? "2026-08-04" : "2026-08-05";
  const number = sessionId === 4808 ? 51 : 52;
  return `<?xml version="1.0" encoding="utf-8"?>
  <SesionSala xmlns="http://opendata.camara.cl/camaradiputados/v1">
    <Id>${sessionId}</Id><Numero>${number}</Numero><FechaInicio>${date}T10:02:55</FechaInicio><FechaTermino>${date}T14:04:27</FechaTermino><Tipo Valor="1">Ordinaria</Tipo><Estado Valor="1">Celebrada</Estado>
    <ListadoAsistencia>
      <Asistencia><TipoAsistencia Valor="1">Asiste</TipoAsistencia><Diputado><Id>${deputyId}</Id><Nombre>René</Nombre><ApellidoPaterno>Alinco</ApellidoPaterno><ApellidoMaterno>Bustos</ApellidoMaterno></Diputado></Asistencia>
      <Asistencia><TipoAsistencia Valor="0">No Asiste</TipoAsistencia><Justificacion Valor="19"><Nombre>Licencia médica (Art. 42)</Nombre><RebajaAsistencia>true</RebajaAsistencia><RebajaQuorum>false</RebajaQuorum></Justificacion><Diputado><Id>1015</Id><Nombre>Jorge</Nombre><ApellidoPaterno>Brito</ApellidoPaterno><ApellidoMaterno>Hasbún</ApellidoMaterno></Diputado></Asistencia>
    </ListadoAsistencia>
  </SesionSala>`;
}

describe("conector oficial de asistencia de la Cámara", () => {
  it("construye URLs del servicio WSSala con parámetros validados", () => {
    expect(buildCamaraSessionsUrl(2026)).toBe("https://opendata.congreso.cl/camaradiputados/WServices/WSSala.asmx/retornarSesionesXAnno?prmAnno=2026");
    expect(buildCamaraAttendanceUrl(4809)).toBe("https://opendata.congreso.cl/camaradiputados/WServices/WSSala.asmx/retornarSesionAsistencia?prmSesionId=4809");
    expect(() => buildCamaraSessionsUrl(1989)).toThrow("CAMARA_INVALID_YEAR");
  });

  it("distingue sesiones celebradas de citadas sin inventar asistencia futura", () => {
    const sessions = parseCamaraSessionsXml(sessionsXml);
    expect(sessions).toHaveLength(3);
    expect(sessions[0]).toMatchObject({ id: 4808, date: "2026-08-04", state: { code: 1, label: "Celebrada" } });
    expect(sessions[2]).toMatchObject({ id: 4810, state: { code: 0, label: "Citada" } });
  });

  it("normaliza presencia y ausencia justificada usando sólo el ID oficial", () => {
    const detail = parseCamaraAttendanceXml(attendanceXml());
    expect(detail.attendance).toHaveLength(2);
    expect(normalizeCamaraAttendance(detail, detail.attendance[1], { sourceUrl: buildCamaraAttendanceUrl(4809) })).toMatchObject({
      id: "camara-attendance-4809-1015",
      fecha: "2026-08-05",
      period: "2026-08",
      kind: "attendance",
      attendance: { code: 0, label: "No Asiste" },
      justification: { code: 19, name: "Licencia médica (Art. 42)", reduces_attendance: true, reduces_quorum: false },
      deputy: { entity_id: "person-camara-1015", official_id: "1015", name: "Jorge Brito Hasbún" },
      subject_entity_ids: ["person-camara-1015"],
      object_entity_ids: ["public-body-camara"],
      reconciliation_method: "official_camara_dipid",
    });
    expect(JSON.stringify(detail)).not.toMatch(/\b\d{7,8}-[\dkK]\b/);
  });

  it("recorre todas las sesiones celebradas, omite citadas y produce originales verificables por mes", async () => {
    const calls: string[] = [];
    const result = await fetchCamaraAttendance({
      year: 2026,
      concurrency: 2,
      fetchImpl: async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("retornarSesionesXAnno")) return new Response(sessionsXml, { headers: { "content-type": "text/xml; charset=utf-8" } });
        const id = Number(new URL(url).searchParams.get("prmSesionId"));
        return new Response(attendanceXml(id, id === 4808 ? 815 : 803), { headers: { "content-type": "text/xml; charset=utf-8" } });
      },
    });
    expect(calls).toHaveLength(3);
    expect(calls.some((url) => url.includes("prmSesionId=4810"))).toBe(false);
    expect(result).toMatchObject({ sourceId: "camara", year: 2026, sessionsFound: 3, sessionsPublished: 2, sessionsUnavailable: 1 });
    expect(result.records).toHaveLength(4);
    expect(result.originals).toHaveLength(1);
    expect(result.originals[0]).toMatchObject({ year: 2026, month: 8, redistributable: false });
    expect(result.originals[0].checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rechaza duplicados, XML peligroso, cambios incompatibles y fuente caída", async () => {
    const duplicate = attendanceXml().replace("</ListadoAsistencia>", `<Asistencia><TipoAsistencia Valor="1">Asiste</TipoAsistencia><Diputado><Id>803</Id><Nombre>René</Nombre><ApellidoPaterno>Alinco</ApellidoPaterno><ApellidoMaterno>Bustos</ApellidoMaterno></Diputado></Asistencia></ListadoAsistencia>`);
    expect(() => parseCamaraAttendanceXml(duplicate)).toThrow("CAMARA_DUPLICATE_ATTENDANCE");
    expect(() => parseCamaraSessionsXml("<!DOCTYPE x [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><x>&xxe;</x>")).toThrow("CAMARA_UNSAFE_XML");
    expect(() => parseCamaraSessionsXml("<unexpected />")).toThrow("CAMARA_INVALID_SESSIONS_SCHEMA");
    await expect(fetchCamaraAttendance({ year: 2026, fetchImpl: async () => new Response("caída", { status: 503 }) })).rejects.toThrow("CAMARA_HTTP_503");
    await expect(fetchCamaraAttendance({ year: 2026, fetchImpl: async () => { throw new DOMException("timeout", "TimeoutError"); } })).rejects.toThrow("CAMARA_TIMEOUT");
  });
});
