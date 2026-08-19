import { describe, expect, it } from "vitest";
import { createCpltRecordId, parseCpltHeader, parseCpltRecord } from "../scripts/etl/cplt-personal.mjs";

describe("parser de personal CPLT", () => {
  it("interpreta meses en texto y columnas de Planta", () => {
    const header = parseCpltHeader("organismo_nombre;anyo;Mes;Tipo Estamento;Nombres;Paterno;Materno;Tipo cargo;remuneracionbruta_mensual;remuliquida_mensual;observaciones;enlace");
    const record = parseCpltRecord({
      line: "Presidencia de la Republica;2026;Junio;Directivo;ANA;PEREZ;SOTO;JEFATURA;3088479,0;2630053,0;Sin observaciones;https://oficial.test/planta",
      header,
      tipo: "Planta",
      organismoId: "org-presidencia",
      sourceUrl: "https://www.cplt.cl/planta.csv",
    });

    expect(record).toMatchObject({
      nombre_completo: "Ana Perez Soto",
      fuente_periodo: "2026-06",
      remuneracion_bruta_mensual: 3_088_479,
      cargo: "Jefatura",
    });
  });

  it("interpreta el esquema reducido de Honorarios sin exigir 40 columnas", () => {
    const header = parseCpltHeader("organismo_nombre;anyo;Mes;Nombres;Paterno;Materno;descripcion_funcion;tipo_calificacionp;remuneracionbruta;remuliquida_mensual;fecha_ingreso;fecha_termino;observaciones;enlace");
    const record = parseCpltRecord({
      line: "Presidencia de la Republica;2026;Junio;JOSE MIGUEL;ALDUNATE;HUIDOBRO;ASESORAR EN COMUNICACION;ABOGADO;5200000,0;4407000,0;2026/03/11;31/12/2026;Sin observaciones;https://oficial.test/honorarios",
      header,
      tipo: "Honorarios",
      organismoId: "org-presidencia",
      sourceUrl: "https://www.cplt.cl/honorarios.csv",
    });

    expect(record).toMatchObject({
      tipo_contrato: "Honorarios",
      cargo: "Asesorar En Comunicacion",
      remuneracion_bruta_mensual: 5_200_000,
      fuente_periodo: "2026-06",
    });
    expect(record?.id).toMatch(/^func-org-presidencia-honorarios-[a-f0-9]{16}$/);
  });

  it("genera el mismo identificador estable al repetir el registro", () => {
    const header = parseCpltHeader("organismo_nombre;anyo;Mes;Nombres;Paterno;Materno;descripcion_funcion;remuneracionbruta;enlace");
    const input = {
      line: "Servicio;2026;6;ANA;PEREZ;SOTO;ASESORIA;1000000;https://oficial.test/ficha",
      header,
      tipo: "Honorarios",
      organismoId: "org-servicio",
      sourceUrl: "https://www.cplt.cl/honorarios.csv",
    };

    expect(parseCpltRecord(input)?.id).toBe(parseCpltRecord(input)?.id);
  });

  it("permite diferir el hash hasta despues de deduplicar", () => {
    const header = parseCpltHeader("organismo_nombre;anyo;Mes;Nombres;Paterno;Materno;descripcion_funcion;remuneracionbruta;enlace");
    const input = {
      line: "Municipalidad de Maipu;2026;6;ANA;PEREZ;SOTO;ASESORIA;1000000;https://oficial.test/ficha",
      header,
      tipo: "Honorarios",
      organismoId: "muni-maipu",
      sourceUrl: "https://www.cplt.cl/honorarios.csv",
    };
    const direct = parseCpltRecord(input);
    const deferred = parseCpltRecord({ ...input, deferId: true });

    expect(deferred?.id).toBe("");
    expect(createCpltRecordId(deferred?._stableKey)).toBe(direct?.id);
  });
});
