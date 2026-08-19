import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createInfoLobbyDatasetUrl,
  createInfoLobbyQuery,
  fetchInfoProbidadBundle,
  fetchInfoLobbyBundle,
  fetchSparqlPages,
  parseCsv,
  parseInfoLobbyLegalRut,
  projectInfoProbidadRows,
  projectLobbyQuarter,
  projectProbidadJson,
} from "../scripts/etl/connectors/cplt.mjs";

describe("conectores CPLT", () => {
  it("el pipeline principal no reintroduce topes globales de registros", () => {
    const pipeline = readFileSync(join(process.cwd(), "scripts", "etl.mjs"), "utf8");
    expect(pipeline).not.toContain("LIMIT 25");
    expect(pipeline).not.toContain("VOTACIONES_LIMIT");
    expect(pipeline).toContain("--from");
    expect(pipeline).toContain("--to");
    expect(readFileSync(join(process.cwd(), "scripts", "build-data-lake.mjs"), "utf8")).toContain("--exclude-source");
  });

  it("pagina hasta agotar resultados sin límite global artificial", async () => {
    const fetchPage = vi.fn(async (offset: number) => {
      if (offset === 0) return [{ id: "1" }, { id: "2" }];
      if (offset === 2) return [{ id: "3" }];
      return [];
    });

    const rows = await fetchSparqlPages(fetchPage, { pageSize: 2 });

    expect(rows.map((row: { id: string }) => row.id)).toEqual(["1", "2", "3"]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("incluye audiencias, viajes y donativos con paginación explícita", () => {
    expect(createInfoLobbyQuery("audience", "2026-08-01", "2026-08-31", 1000, 2000)).toContain("RegistroAudiencia");
    expect(createInfoLobbyQuery("travel", "2026-08-01", "2026-08-31", 1000, 2000)).toContain("cplt:Viaje");
    expect(createInfoLobbyQuery("gift", "2026-08-01", "2026-08-31", 1000, 2000)).toContain("cplt:Donativo");
    expect(createInfoLobbyQuery("audience", "2026-08-01", "2026-08-31", 1000, 2000)).toMatch(/LIMIT 1000 OFFSET 2000/);
    expect(createInfoLobbyQuery("audience", "2026-08-01", "2026-08-31", 1000, 0)).toContain("SUBSTR(STR(?fecha), 1, 10)");
    expect(createInfoLobbyDatasetUrl(2026, 3, "audiencias")).toBe(
      "https://www.infolobby.cl/DatosAbiertos/Catalogos/VirtuosoLobby/Datasets/2026/3/audiencias/csv",
    );
  });

  it("interpreta CSV oficial con comas, comillas escapadas y saltos de línea", () => {
    const rows = parseCsv('"id","descripcion"\r\n"1","Texto, con coma"\r\n"2","Línea 1\nLínea ""2"""\r\n');
    expect(rows).toEqual([
      { id: "1", descripcion: "Texto, con coma" },
      { id: "2", descripcion: 'Línea 1\nLínea "2"' },
    ]);
  });

  it("valida RUT jurídicos compactos oficiales de InfoLobby", () => {
    expect(parseInfoLobbyLegalRut("776965952r")).toEqual({ normalized: "77696595-2", formatted: "77.696.595-2" });
    expect(parseInfoLobbyLegalRut("650564871r")).toEqual({ normalized: "65056487-1", formatted: "65.056.487-1" });
    expect(parseInfoLobbyLegalRut("776965951r")).toBeNull();
    expect(parseInfoLobbyLegalRut("codigo-persona")).toBeNull();
  });

  it("proyecta eventos lobby cruzables por IDs oficiales", () => {
    const empty = { url: "https://www.infolobby.cl/oficial.csv", rows: [] };
    const records = projectLobbyQuarter({
      audiencias: { ...empty, rows: [{ uriAudiencia: "https://datos.infolobby.cl/audiencia/a-1", CodigoURI: "a-1", uriOrganismo: "https://datos.infolobby.cl/organismo/o-1", organismo: "Servicio oficial", fechaEvento: "2026-07-02", uriComuna: "13101", comuna: "Santiago", tipo: "Presencial", duracionMinutos: "30" }] },
      datosAudiencia: { ...empty, rows: [{ codigoAudiencia: "a-1", materia: "Materia pública" }] },
      asistenciasActivos: { ...empty, rows: [{ codigoActivo: "activo-1", activo: "Representante Uno", codigoEmpLobby: "776965952r", empresaLobby: "Empresa Lobby SpA", codigoAudiencia: "a-1", codigoRepresentado: "650564871r", representado: "Entidad Representada", giroRepresentado: "Servicios" }] },
      asistenciasPasivos: { ...empty, rows: [{ codigoPasivo: "pasivo-1", pasivo: "Autoridad Uno", codigoOrganismo: "o-1", organismo: "Servicio oficial", cargo: "Jefatura", codigoAudiencia: "a-1" }] },
      representaciones: { ...empty, rows: [] },
      trabajaPara: { ...empty, rows: [] },
      otrosAsistentes: { ...empty, rows: [{ asistente: "Persona sin identificador", codigoAudiencia: "a-1" }] },
      viajes: { ...empty, rows: [
        { codigoViaje: "v-1", pasivo: "Autoridad Uno", codigoPasivo: "pasivo-1", organismo: "Servicio oficial", IdOrPortal: "o-1", cargo: "Jefatura", fechaInicio: "2026-07-03", fechaTermino: "2026-07-04" },
        { codigoViaje: "v-antiguo", pasivo: "Autoridad Uno", codigoPasivo: "pasivo-1", organismo: "Servicio oficial", IdOrPortal: "o-1", cargo: "Jefatura", fechaInicio: "2025-07-03", fechaTermino: "2026-07-04" },
      ] },
      donativos: { ...empty, rows: [{ codigoDonativo: "d-1", pasivo: "Autoridad Uno", codigoPasivo: "pasivo-1", organismo: "Servicio oficial", IdOrPortal: "o-1", cargo: "Jefatura", fechaDonativo: "2026-07-05", descripcion: "Libro" }] },
    }, "2026-07-01", "2026-07-31");

    expect(records).toHaveLength(3);
    expect(records.map((record) => record.kind)).toEqual(["lobby", "lobby", "lobby"]);
    expect(records.map((record) => record.lobby_event_kind)).toEqual(["audience", "travel", "gift"]);
    const audience = records[0] as Record<string, unknown>;
    expect(audience.subject_entity_ids).toEqual(["person-infolobby-pasivo-1"]);
    expect(audience.object_entity_ids).toEqual(expect.arrayContaining(["public-body-infolobby-o-1", "person-infolobby-activo-1", "legal-cl-776965952", "legal-cl-650564871"]));
    expect(JSON.stringify(audience)).toContain('\"rut_juridico\":\"77.696.595-2\"');
    expect((audience.entities as Array<{ name: string }>).some((entity) => entity.name === "Persona sin identificador")).toBe(false);
  });

  it("descarga las nueve tablas del trimestre y conserva sus checksums", async () => {
    const headers: Record<string, string> = {
      audiencias: "uriAudiencia,CodigoURI,uriOrganismo,organismo,fechaEvento,uriComuna,comuna,tipo,duracionMinutos\nhttps://datos.test/a-1,a-1,https://datos.test/o-1,Servicio,2026-07-02,13101,Santiago,Presencial,30\n",
      datosAudiencia: "uriAudiencia,codigoAudiencia,observaciones,descripcion,materia,anio,trimestre\n",
      asistenciasActivos: "codigoActivo,activo,uriEmpLobby,codigoEmpLobby,empresaLobby,codigoAudiencia,codigoRepresentado,representado,giroRepresentado\n",
      asistenciasPasivos: "codigoPasivo,pasivo,codigoOrganismo,organismo,cargo,codigoAudiencia\n",
      representaciones: "codigoRepresentado,representado,giroRepresentado,personalidad,codigoAudiencia\n",
      trabajaPara: "codigoEmpLobby,empresaLobby,codigoActivo,activo,tipoActivo,codigoAudiencia\n",
      otrosAsistentes: "asistente,codigoAudiencia\n",
      viajes: "codigoViaje,destino,pasivo,codigoPasivo,organismo,IdOrPortal,cargo,fechaInicio,fechaTermino,descripcion,costo,financistas\n",
      donativos: "codigoDonativo,descripcion,pasivo,codigoPasivo,organismo,IdOrPortal,cargo,fechaDonativo,ocasion\n",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/trimestres")) return new Response(JSON.stringify([{ anio: 2026, trimestre: 3 }]), { status: 200 });
      const dataset = url.split("/").at(-2) ?? "";
      return new Response(headers[dataset], { status: 200, headers: { "content-type": "text/csv" } });
    });
    const fetchImpl = fetchMock as unknown as typeof fetch;

    const result = await fetchInfoLobbyBundle({ from: "2026-07-01", to: "2026-07-31", fetchImpl });

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(result.records).toHaveLength(1);
    expect(result.originals).toHaveLength(1);
    expect(result.originals[0].datasets).toHaveLength(9);
    expect(result.originals[0].datasets.every((dataset: { checksumSha256: string }) => /^[a-f0-9]{64}$/.test(dataset.checksumSha256))).toBe(true);
  });

  it("reintenta una respuesta transitoria 500 sin descartar el trimestre completo", async () => {
    const headers: Record<string, string> = {
      audiencias: "uriAudiencia,CodigoURI,uriOrganismo,organismo,fechaEvento,uriComuna,comuna,tipo,duracionMinutos\n",
      datosAudiencia: "uriAudiencia,codigoAudiencia,observaciones,descripcion,materia,anio,trimestre\n",
      asistenciasActivos: "codigoActivo,activo,uriEmpLobby,codigoEmpLobby,empresaLobby,codigoAudiencia,codigoRepresentado,representado,giroRepresentado\n",
      asistenciasPasivos: "codigoPasivo,pasivo,codigoOrganismo,organismo,cargo,codigoAudiencia\n",
      representaciones: "codigoRepresentado,representado,giroRepresentado,personalidad,codigoAudiencia\n",
      trabajaPara: "codigoEmpLobby,empresaLobby,codigoActivo,activo,tipoActivo,codigoAudiencia\n",
      otrosAsistentes: "asistente,codigoAudiencia\n",
      viajes: "codigoViaje,destino,pasivo,codigoPasivo,organismo,IdOrPortal,cargo,fechaInicio,fechaTermino,descripcion,costo,financistas\n",
      donativos: "codigoDonativo,descripcion,pasivo,codigoPasivo,organismo,IdOrPortal,cargo,fechaDonativo,ocasion\n",
    };
    let viajesAttempts = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/trimestres")) return new Response(JSON.stringify([{ anio: 2026, trimestre: 3 }]), { status: 200 });
      const dataset = url.split("/").at(-2) ?? "";
      if (dataset === "viajes" && viajesAttempts++ === 0) return new Response("temporal", { status: 500 });
      return new Response(headers[dataset], { status: 200 });
    }) as unknown as typeof fetch;

    const result = await fetchInfoLobbyBundle({
      from: "2026-07-01",
      to: "2026-07-31",
      fetchImpl,
      retryDelayMs: 0,
    });

    expect(result.originals).toHaveLength(1);
    expect(viajesAttempts).toBe(2);
  });

  it("limita la concurrencia para no sobrecargar el portal oficial", async () => {
    const headers: Record<string, string> = {
      audiencias: "uriAudiencia,CodigoURI,uriOrganismo,organismo,fechaEvento\n",
      datosAudiencia: "codigoAudiencia\n",
      asistenciasActivos: "codigoActivo,activo,codigoAudiencia\n",
      asistenciasPasivos: "codigoPasivo,pasivo,codigoOrganismo,organismo,codigoAudiencia\n",
      representaciones: "codigoRepresentado,representado,personalidad,codigoAudiencia\n",
      trabajaPara: "codigoEmpLobby,empresaLobby,codigoActivo,codigoAudiencia\n",
      otrosAsistentes: "asistente,codigoAudiencia\n",
      viajes: "codigoViaje,codigoPasivo,organismo,IdOrPortal,fechaInicio\n",
      donativos: "codigoDonativo,codigoPasivo,organismo,IdOrPortal,fechaDonativo\n",
    };
    let active = 0;
    let maximum = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/trimestres")) return new Response(JSON.stringify([{ anio: 2026, trimestre: 3 }]), { status: 200 });
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      const dataset = url.split("/").at(-2) ?? "";
      return new Response(headers[dataset], { status: 200 });
    }) as unknown as typeof fetch;

    await fetchInfoLobbyBundle({ from: "2026-07-01", to: "2026-07-31", fetchImpl, retryDelayMs: 0 });

    expect(maximum).toBeLessThanOrEqual(2);
  });

  it("conserva audiencias verificables cuando falla una tabla auxiliar", async () => {
    const headers: Record<string, string> = {
      audiencias: "uriAudiencia,CodigoURI,uriOrganismo,organismo,fechaEvento\nhttps://datos.test/a-1,a-1,o-1,Servicio,2026-07-02\n",
      asistenciasActivos: "codigoActivo,activo,codigoAudiencia\n",
      asistenciasPasivos: "codigoPasivo,pasivo,codigoOrganismo,organismo,cargo,codigoAudiencia\np-1,Autoridad Uno,o-1,Servicio,Jefatura,a-1\n",
      representaciones: "codigoRepresentado,representado,personalidad,codigoAudiencia\n",
      trabajaPara: "codigoEmpLobby,empresaLobby,codigoActivo,codigoAudiencia\n",
      otrosAsistentes: "asistente,codigoAudiencia\n",
      viajes: "codigoViaje,codigoPasivo,organismo,IdOrPortal,fechaInicio\n",
      donativos: "codigoDonativo,codigoPasivo,organismo,IdOrPortal,fechaDonativo\n",
    };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/trimestres")) return new Response(JSON.stringify([{ anio: 2026, trimestre: 3 }]), { status: 200 });
      const dataset = url.split("/").at(-2) ?? "";
      return dataset === "datosAudiencia"
        ? new Response("temporal", { status: 500 })
        : new Response(headers[dataset], { status: 200 });
    }) as unknown as typeof fetch;

    const result = await fetchInfoLobbyBundle({
      from: "2026-07-01", to: "2026-07-31", fetchImpl, retries: 0, retryDelayMs: 0,
    });

    expect(result.records).toHaveLength(1);
    expect(result.originals[0].datasets.find((dataset: { dataset: string }) => dataset.dataset === "datosAudiencia"))
      .toMatchObject({ rowCount: 0, error: "INFOLOBBY_CSV_HTTP_500: datosAudiencia/2026Q3" });
  });

  it("rechaza cambios incompatibles en el esquema CSV oficial", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/trimestres")
      ? new Response(JSON.stringify([{ anio: 2026, trimestre: 3 }]), { status: 200 })
      : new Response("columna_desconocida\nvalor\n", { status: 200 })) as unknown as typeof fetch;

    await expect(fetchInfoLobbyBundle({ from: "2026-07-01", to: "2026-07-31", fetchImpl }))
      .rejects.toThrow("INVALID_INFOLOBBY_CSV_SCHEMA");
  });

  it("proyecta una declaración conservando RUN y RUT jurídicos; omite domicilios y patentes personales", () => {
    const projection = projectProbidadJson(JSON.stringify({
      Datos_del_Declarante: { RUN: "12.345.678-5", nombre: "Persona", Domicilio: "Calle privada" },
      Actividades_Profesionales_A_La_Fecha: [{ Nombre_Razon_Social: "Empresa SpA", RUT: "76.123.456-7" }],
      Bienes_Inmuebles_Situados_En_Chile: [{ Direccion: "Domicilio particular", Avaluo_Fiscal: "12345" }],
      Vehiculos_Motorizados: [{ Placa_Patente: "ABCD12", Avaluo_Fiscal: "100" }],
      Pasivos: { Monto_Global_Pesos: "5000" },
    }));

    expect(projection).not.toBeNull();
    if (!projection) throw new Error("Se esperaba una proyección pública");
    expect(JSON.stringify(projection)).toContain("12.345.678-5");
    expect(JSON.stringify(projection)).not.toContain("Calle privada");
    expect(JSON.stringify(projection)).not.toContain("ABCD12");
    const activities = projection.Actividades_Profesionales_A_La_Fecha as Array<Record<string, unknown>>;
    const liabilities = projection.Pasivos as Record<string, unknown>;
    expect(activities[0]?.rut_juridico).toBe("76.123.456-7");
    expect(liabilities.Monto_Global_Pesos).toBe("5000");
  });

  it("concilia una declaración repetida con todos sus organismos y empresas declaradas", () => {
    const declaration = JSON.stringify({
      Datos_del_Declarante: { RUN: "12.345.678-5", Nombres: "Persona Uno" },
      Derechos_Acciones_Chile: [{ Nombre_Razon_Social: "Empresa Declarada SpA", RUT: "77.696.595-2", Porcentaje_Participacion: "25" }],
    });
    const records = projectInfoProbidadRows([
      { d: "http://datos.cplt.cl/datos/infoprobidad/declaracion_abc", persona: "http://datos.cplt.cl/datos/infoprobidad/persona_123", nombre: "Persona Uno", fecha: "2026-03-01T00:00:00", org: "http://datos.cplt.cl/datos/infoprobidad/institucion_10", orgNombre: "Servicio A", json: declaration },
      { d: "http://datos.cplt.cl/datos/infoprobidad/declaracion_abc", persona: "http://datos.cplt.cl/datos/infoprobidad/persona_123", nombre: "Persona Uno", fecha: "2026-03-01T00:00:00", org: "http://datos.cplt.cl/datos/infoprobidad/institucion_20", orgNombre: "Servicio B", json: declaration },
    ]);

    expect(records).toHaveLength(1);
    const record = records[0];
    expect(record.kind).toBe("declaration");
    expect(record.subject_entity_ids).toEqual(["person-infoprobidad-persona_123"]);
    expect(record.object_entity_ids).toEqual(expect.arrayContaining([
      "public-body-infoprobidad-institucion_10", "public-body-infoprobidad-institucion_20", "legal-cl-776965952",
    ]));
    expect(record.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ predicate: "filed_declaration_with", toId: "public-body-infoprobidad-institucion_10" }),
      expect.objectContaining({ predicate: "declared_legal_interest", toId: "legal-cl-776965952" }),
    ]));
    expect(JSON.stringify(record)).toContain('"rut_juridico":"77.696.595-2"');
    expect(JSON.stringify(record)).toContain("12.345.678-5");
    expect((record.entities as Array<{ id: string; identifiers: Array<{ scheme: string; value: string }> }>).find((entity) => entity.id === "person-infoprobidad-persona_123")?.identifiers)
      .toEqual(expect.arrayContaining([expect.objectContaining({ scheme: "CL-RUT", value: "12.345.678-5" })]));
  });

  it("pagina InfoProbidad sin tope y conserva checksum de cada respuesta oficial", async () => {
    const binding = (id: string) => ({
      d: { value: `https://datos.cplt.cl/declaracion_${id}` },
      persona: { value: `https://datos.cplt.cl/persona_${id}` },
      nombre: { value: `Persona ${id}` },
      fecha: { value: "2026-03-01T00:00:00" },
      org: { value: "https://datos.cplt.cl/institucion_1" },
      orgNombre: { value: "Servicio Uno" },
      json: { value: JSON.stringify({ Datos_del_Declarante: { Nombres: `Persona ${id}` } }) },
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const query = new URL(String(input)).searchParams.get("query") ?? "";
      const rows = query.includes("OFFSET 0") ? [binding("a"), binding("b")] : [binding("c")];
      return new Response(JSON.stringify({ results: { bindings: rows } }), { status: 200 });
    });

    const result = await fetchInfoProbidadBundle({
      from: "2026-03-01", to: "2026-03-31", pageSize: 2, concurrency: 1,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.records).toHaveLength(3);
    expect(result.originals[0].pages).toHaveLength(2);
    expect(result.originals[0].pages.every((page) => /^[a-f0-9]{64}$/.test(page.checksumSha256))).toBe(true);
  });
});
