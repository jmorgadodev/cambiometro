import { describe, expect, it } from "vitest";
import { createCpltRecordId, parseCpltHeader, parseCpltLine, parseCpltRecord } from "../scripts/etl/cplt-personal.mjs";

describe("parser de personal CPLT", () => {
  it("respeta delimitadores y comillas escapadas dentro de una celda", () => {
    const columns = parseCpltLine('1;2;"Pagina Personal; Contrata";Servicio;AA001;2026/09/10;2026;Agosto;Profesional;ANA;PEREZ;SOTO;6;ABOGADO;ASESORA;RM;();Pesos;1000000;Pesos;800000;Pesos;;Pesos;;No;Pesos;0;0;Pesos;0;0;Pesos;0;0;01/01/2026;31/12/2026;"Sin observaciones; revisar";No;Pesos;0;Sí');
    const header = parseCpltHeader("idPagina;idPaginaPadre;camino;organismo_nombre;organismo_codigo;fecha_publicacion;anyo;Mes;Tipo Estamento;Nombres;Paterno;Materno;grado_eus;tipo_calificacionp;Tipo cargo;region;asignaciones;Tipo Unidad monetaria;remuneracionbruta_mensual;Tipo Unidad monetaria remuneracion liquida;remuliquida_mensual;Tipo Unidad monetaria remuneracion adicional;remu_adicional;Tipo unidad monetaria remuneracion bonos incentivos;remu_bonoin;horasextra;Tipo de unidad monetaria horas diurnas;Pago extra diurnas;Horas extra diurnas;Tipo de unidad monetaria horas nocturnas;Pago extra nocturnas;Horas extra nocturnas;Tipo de unidad monetaria horas festivas;Pago extra festivas;Horas extra festivas;fecha_ingreso;fecha_termino;observaciones;enlace;Tipo unidad monetaria viaticos;viaticos;activado");
    const record = parseCpltRecord({ columns, header, tipo: "Contrata", organismoId: "org-servicio", sourceUrl: "https://oficial.test/contrata" });

    expect(record).toMatchObject({ fuente_periodo: "2026-08", organo_nombre: "Servicio", remuneracion_bruta_mensual: 1_000_000 });
    expect(record?.observaciones).toBe("Sin observaciones; revisar");
  });

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

  it("marca errores de formato de la fuente sin inventar nombre ni sueldo líquido", () => {
    const header = parseCpltHeader("organismo_nombre;anyo;Mes;Nombres;Paterno;Materno;descripcion_funcion;remuneracionbruta;remuliquida_mensual;enlace");
    const record = parseCpltRecord({
      line: "Municipalidad;2026;Junio;. EZZIO;BRAZZODURO;;SERVICIO;1000000;0;https://oficial.test/nomina",
      header,
      tipo: "Honorarios",
      organismoId: "muni-gorbea",
      sourceUrl: "https://www.cplt.cl/honorarios.csv",
    });

    expect(record).toMatchObject({
      nombre_completo: "Ezzio Brazzoduro",
      nombre_completo_original: ". Ezzio Brazzoduro",
      remuneracion_liquida_mensual: null,
      remuneracion_liquida_mensual_original: 0,
    });
    expect(record?.calidad_datos?.incidencias).toEqual([
      "nombre_prefijo_invalido",
      "remuneracion_liquida_no_informada",
    ]);
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
