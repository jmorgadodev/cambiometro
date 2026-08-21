import { describe, expect, it } from "vitest";
import { officialSessionMetadata } from "./session-integrity";

describe("R10 para metadatos de sesiones", () => {
  it("preserva campos oficiales y normaliza solo la fecha", () => {
    expect(officialSessionMetadata({
      fecha: "2026-08-20T15:30:00Z",
      descripcion: "Proyecto de ley",
      tramite: "Discusión general",
      resultado: "Aprobado",
      url_tramitacion: "https://www.camara.cl/sala/ver.aspx?id=1",
    })).toEqual({
      fecha: "2026-08-20",
      descripcion: "Proyecto de ley",
      tramite: "Discusión general",
      resultado: "Aprobado",
      url_tramitacion: "https://www.camara.cl/sala/ver.aspx?id=1",
    });
  });

  it("representa ausencias como null sin fechas, resultados ni textos inventados", () => {
    expect(officialSessionMetadata({})).toEqual({
      fecha: null,
      descripcion: null,
      tramite: null,
      resultado: null,
      url_tramitacion: null,
    });
  });
});
