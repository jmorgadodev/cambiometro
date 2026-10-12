import { expect, test } from "vitest";
import {
  CAMARA_REQUEST_HEADERS,
  CAMARA_TRANSPARENCY_TIMEOUT_SECONDS,
  appendCamaraRequestHeaders,
  assertCamaraTransparencyPeriod,
  buildCamaraTransparencyMonthPostback,
  parseCamaraDeputyProfile,
  parseCamaraOpenDataDeputies,
  parseCamaraTransparencyPage,
  camaraTransparencyHasAllMonths,
  parseCamaraTransparencyPeriodOptions,
  planCamaraTransparencyPeriods,
  parseCamaraDeputyIds,
  selectCamaraPersonalApoyoIds,
} from "./camara-request-headers.mjs";
import { selectCamaraProfileBatch } from "./refresh-camara-official-profiles.mjs";
import { parseCamaraGeneralSupportTable, attachCamaraStartDates } from "./camara-personal-apoyo-general.mjs";
import {
  linkCamaraExternalAdvisories,
  mergeCamaraExternalAdvisories,
  parseCamaraExternalAdvisories,
} from "./camara-external-advisories.mjs";

test("el sondeo y el ETL comparten encabezados de navegador aceptados por Cámara", () => {
  const args = [];
  appendCamaraRequestHeaders(args);

  expect(args).toContain("-H");
  expect(CAMARA_REQUEST_HEADERS).toContain('sec-ch-ua: "Chromium";v="140", "Google Chrome";v="140", "Not;A=Brand";v="24"');
  expect(args).toContain('sec-ch-ua: "Chromium";v="140", "Google Chrome";v="140", "Not;A=Brand";v="24"');
  expect(CAMARA_REQUEST_HEADERS).toContain("User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36");
});

test("el ETL espera respuestas válidas de transparencia que superan 30 segundos", () => {
  expect(CAMARA_TRANSPARENCY_TIMEOUT_SECONDS).toBeGreaterThanOrEqual(45);
});

test("extrae sólo diputados del selector propio, no opciones de mes o año", () => {
  const html = `<select id="ContentPlaceHolder1_ContentPlaceHolder1_ddlDiputados"><option value="1009">Diputada A</option></select><select id="ddlMes"><option value="9">septiembre</option><option value="10">octubre</option></select><select id="ddlAno"><option value="2026">2026</option></select>`;

  expect(parseCamaraDeputyIds(html)).toEqual([{ id: "1009", apellido: "Diputada A" }]);
});

test("el refresco de perfiles procesa cinco fichas por defecto y permite continuar por offset", () => {
  const ids = Array.from({ length: 17 }, (_, index) => String(1000 + index));

  expect(selectCamaraProfileBatch(ids)).toEqual(ids.slice(0, 5));
  expect(selectCamaraProfileBatch(ids, { offset: 5, limit: 5 })).toEqual(ids.slice(5, 10));
});

test("el refresco de perfiles bloquea límites mayores a diez y offsets inválidos", () => {
  const ids = Array.from({ length: 17 }, (_, index) => String(1000 + index));

  expect(() => selectCamaraProfileBatch(ids, { limit: 11 })).toThrow("CAMARA_PROFILE_BATCH_LIMIT_INVALID");
  expect(() => selectCamaraProfileBatch(ids, { offset: 17 })).toThrow("CAMARA_PROFILE_BATCH_OFFSET_INVALID");
});

test("reporta categoría y período al rechazar una respuesta de transparencia no verificable", () => {
  expect(() => assertCamaraTransparencyPeriod(
    { status: "unknown", rows: [], period: null },
    { page: "asesoriaexterna.aspx", period: "septiembre 2026" },
  )).toThrow("PERSONAL_APOYO_CAMARA_TRANSPARENCY_PERIOD_UNVERIFIED: asesoriaexterna.aspx septiembre 2026");
});

test("refresca fichas previas con datos del año vigente sin volver a consultar históricos vacíos", () => {
  const ids = selectCamaraPersonalApoyoIds({
    selectorIds: ["1100"],
    openDataIds: ["4", "1101"],
    previousDeputies: {
      "1009": { mes_personal: "julio 2026", personal_apoyo: [{ nombre: "registro existente" }] },
      "900": { mes_personal: "diciembre 2025", personal_apoyo: [{ nombre: "histórico" }] },
      "5": { personal_apoyo: [] },
    },
    extraIds: ["1101"],
    year: 2026,
  });

  expect(ids).toEqual(["1100", "4", "1101", "1009"]);
});

test("extrae períodos, contacto y redes desde las secciones de la ficha oficial", () => {
  const html = `<header><a href="https://x.com/Camara_cl">X institucional</a></header>
    <p>Comunas: Ñuñoa, Providencia<br />Distrito: Nº 10<br />Región: Región Metropolitana<br />Período: 2026-2030<br />Partido: Partido A<br />Bancada: Bancada A</p>
    <li class="rotulo-ficha-diputados">Contacto</li><li>Teléfono<br />+56 2 1234 5678</li>
    <a href="/cdn-cgi/l/email-protection#1234"><span class="__cf_email__" data-cfemail="1234">[email protected]</span></a>
    <li class="rotulo-ficha-diputados">Sitio web y redes sociales</li>
    <li><a href="http://twitter.com/diputada">X</a></li><li><a href="https://instagram.com/diputada">Instagram</a></li>
    <li class="rotulo-ficha-diputados">Periodos parlamentarios</li><li>2022-2026</li><li>2026-2030</li>`;

  expect(parseCamaraDeputyProfile(html)).toMatchObject({
    comunas_distrito: "Ñuñoa, Providencia",
    numero_distrito: 10,
    region: "Región Metropolitana",
    periodo: "2026-2030",
    periodos: ["2022-2026", "2026-2030"],
    partido: "Partido A",
    bancada: "Bancada A",
    telefono: "+56 2 1234 5678",
    redes: { x: "https://twitter.com/diputada", instagram: "https://instagram.com/diputada" },
  });
});

test("extrae por ID el partido vigente desde el catálogo oficial de diputados", () => {
  const xml = `<DiputadosColeccion xmlns="http://opendata.camara.cl/camaradiputados/v1">
    <Diputado><Id>1009</Id><Nombre>Jorge</Nombre><ApellidoPaterno>Alessandri</ApellidoPaterno><ApellidoMaterno>Vergara</ApellidoMaterno>
      <Militancias><Militancia><FechaInicio>2026-03-11T00:00:00</FechaInicio><FechaTermino>2030-03-10T23:59:59</FechaTermino>
        <Partido><Id>UDI</Id><Nombre>Unión Demócrata Independiente</Nombre><Alias>UDI</Alias></Partido>
      </Militancia></Militancias>
    </Diputado>
  </DiputadosColeccion>`;

  expect(parseCamaraOpenDataDeputies(xml, { asOf: new Date("2026-10-10T12:00:00Z") })).toEqual({
    "1009": {
      nombre: "Jorge Alessandri Vergara",
      partido: "Unión Demócrata Independiente",
      source_url: "https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx/retornarDiputados",
    },
  });
});

test("no inventa partido ni períodos cuando el XML oficial no los entrega", () => {
  expect(parseCamaraOpenDataDeputies(`<Diputado><Id>5</Id><Nombre>A</Nombre></Diputado>`))
    .toEqual({ "5": { nombre: "A", partido: null, source_url: "https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx/retornarDiputados" } });
});

test("conserva el sitio web y todos los enlaces sociales publicados, incluso varios de una red", () => {
  const html = `<li class="rotulo-ficha-diputados">Sitio web y redes sociales</li>
    <a href="https://diputada.example.cl">Sitio Web</a>
    <a href="https://facebook.com/cuenta1">Facebook</a>
    <a href="https://facebook.com/cuenta2">Facebook</a>
    <a href="https://instagram.com/cuenta">Instagram</a>
    <li class="rotulo-ficha-diputados">Periodos parlamentarios</li><li>2026 - 2030</li>`;

  expect(parseCamaraDeputyProfile(html)).toMatchObject({
    sitio_web: "https://diputada.example.cl/",
    redes: {
      facebook: "https://facebook.com/cuenta1",
      instagram: "https://instagram.com/cuenta",
    },
    enlaces_publicos: [
      { label: "Sitio Web", url: "https://diputada.example.cl/" },
      { label: "Facebook", url: "https://facebook.com/cuenta1" },
      { label: "Facebook", url: "https://facebook.com/cuenta2" },
      { label: "Instagram", url: "https://instagram.com/cuenta" },
    ],
  });
});

test("no atribuye redes institucionales como redes personales ni inventa campos ausentes", () => {
  const html = `<a href="https://x.com/Camara_cl">X institucional</a>
    <li class="rotulo-ficha-diputados">Contacto</li><li>Teléfono<br /></li>
    <li class="rotulo-ficha-diputados">Sitio web y redes sociales</li>
    <li class="rotulo-ficha-diputados">Periodos parlamentarios</li><li>2026-2030</li>`;

  expect(parseCamaraDeputyProfile(html)).toMatchObject({
    telefono: null,
    email: null,
    redes: {},
    periodos: ["2026-2030"],
  });
});

test("lee el teléfono cuando Cámara lo publica en el elemento siguiente a la etiqueta", () => {
  const html = `<li class="rotulo-ficha-diputados">Contacto</li>
    <li>☎ Teléfono</li><li><a href="tel:+56322505000">+56 32 250 5000</a></li>
    <li class="rotulo-ficha-diputados">Sitio web y redes sociales</li>`;

  expect(parseCamaraDeputyProfile(html).telefono).toBe("+56 32 250 5000");
});

test("no interpreta el correo siguiente como teléfono cuando el campo está vacío", () => {
  const html = `<li class="rotulo-ficha-diputados">Contacto</li>
    <li>Teléfono</li><li><a href="mailto:diputado@congreso.cl">diputado@congreso.cl</a></li>
    <li class="rotulo-ficha-diputados">Sitio web y redes sociales</li>`;

  expect(parseCamaraDeputyProfile(html)).toMatchObject({ telefono: null, email: "diputado@congreso.cl" });
});

test("lee la exportación HTML compatible con Excel y conserva folios repetidos", () => {
  const html = `<html><table><tr><td/>Folio</td><td/>Asesor</td><td/>Monto</td><td/>Diputado</td></tr>
    <tr><td/>3793</td><td/>Asesoría A</td><td/>1.000.000</td><td/>Jofré C., Álvaro</td></tr>
    <tr><td/>3793</td><td/>Asesoría B</td><td/>200.000</td><td/>Jofré C., Álvaro</td></tr></table></html>`;

  expect(parseCamaraExternalAdvisories(html)).toHaveLength(2);
  expect(parseCamaraExternalAdvisories(html)[0].values).toMatchObject({
    Folio: "3793",
    Asesor: "Asesoría A",
    Monto: "1.000.000",
    Diputado: "Jofré C., Álvaro",
  });
});

test("acepta una exportación mensual con encabezados pero sin filas sin convertirla en un borrado", () => {
  const html = `<html><table><tr><td/>Folio</td><td/>Asesor</td><td/>Monto</td><td/>Diputado</td></tr></table></html>`;
  expect(parseCamaraExternalAdvisories(html)).toEqual([]);
  expect(() => mergeCamaraExternalAdvisories({ diputados: {} }, [], {}, { period: "2026-09" })).toThrow("CAMARA_EXTERNAL_ADVISORIES_EMPTY_MONTH");
});

test("vincula por nombre sólo con coincidencia única y conserva los casos ambiguos aparte", () => {
  const rows = [
    { values: { Folio: "1", Asesor: "A", Monto: "100", Diputado: "Jofré C., Álvaro" }, sourceLinks: [] },
    { values: { Folio: "2", Asesor: "B", Monto: "200", Diputado: "Apellido, Nombre Inexistente" }, sourceLinks: [] },
  ];
  const deputies = { "803": "Álvaro Jofré Cisternas", "900": "Álvaro Jofré Carrasco" };

  expect(linkCamaraExternalAdvisories(rows, deputies)).toMatchObject({ matched: 0, ambiguous: 1, unmatched: 1 });
});

test("incorpora el período disponible sin marcar como vacíos a los demás diputados", () => {
  const rows = [{ values: { Folio: "1", Asesor: "A", Monto: "100", Diputado: "Jofré C., Álvaro" }, sourceLinks: [] }];
  const result = mergeCamaraExternalAdvisories({ diputados: { "803": {}, "900": {} } }, rows, {
    "803": "Álvaro Jofré Cisternas",
    "900": "María Pérez Soto",
  }, { period: "2026-09", retrievedAt: "2026-10-12T00:00:00.000Z" });

  expect(result.period).toBe("septiembre 2026");
  expect(result.dataset.diputados["803"].transparencia_camara.asesorias_externas.periods[0].rows).toEqual(rows);
  expect(result.dataset.diputados["900"].transparencia_camara).toBeUndefined();
});

test("agrega meses nuevos y reimportar el mismo mes reemplaza sólo ese corte", () => {
  const row = (folio, asesor) => ({ values: { Folio: folio, Asesor: asesor, Monto: "100", Diputado: "Jofré C., Álvaro" }, sourceLinks: [] });
  const roster = { "803": "Álvaro Jofré Cisternas" };
  const sep = mergeCamaraExternalAdvisories({ diputados: { "803": {} } }, [row("1", "Sep")], roster, { period: "2026-09" });
  const oct = mergeCamaraExternalAdvisories(sep.dataset, [row("2", "Oct")], roster, { period: "2026-10" });
  const sepRefresh = mergeCamaraExternalAdvisories(oct.dataset, [row("3", "Sep actualizado")], roster, { period: "2026-09" });
  const periods = sepRefresh.dataset.diputados["803"].transparencia_camara.asesorias_externas.periods;

  expect(periods).toHaveLength(2);
  expect(periods.map((period) => period.period)).toEqual(["septiembre 2026", "octubre 2026"]);
  expect(periods[0].rows[0].values.Asesor).toBe("Sep actualizado");
  expect(periods[1].rows[0].values.Asesor).toBe("Oct");
});

test("al reimportar un mes elimina filas antiguas de diputados ausentes y conserva sus otros meses", () => {
  const row = (folio, asesor, diputado) => ({ values: { Folio: folio, Asesor: asesor, Monto: "100", Diputado: diputado }, sourceLinks: [] });
  const roster = { "803": "Álvaro Jofré Cisternas", "900": "María Pérez Soto" };
  const august = mergeCamaraExternalAdvisories({ diputados: {} }, [
    row("8a", "Agosto A", "Jofré C., Álvaro"),
    row("8b", "Agosto B", "Pérez S., María"),
  ], roster, { period: "2026-08" });
  const september = mergeCamaraExternalAdvisories(august.dataset, [
    row("9a", "Septiembre A", "Jofré C., Álvaro"),
    row("9b", "Septiembre B", "Pérez S., María"),
  ], roster, { period: "2026-09" });
  const refreshed = mergeCamaraExternalAdvisories(september.dataset, [
    row("9c", "Septiembre A actualizado", "Jofré C., Álvaro"),
  ], roster, { period: "2026-09" });
  const absentDeputyPeriods = refreshed.dataset.diputados["900"].transparencia_camara.asesorias_externas.periods;

  expect(absentDeputyPeriods.map((period) => period.period)).toEqual(["agosto 2026"]);
  expect(refreshed.dataset.diputados["900"].transparencia_camara.asesorias_externas.period).toBe("agosto 2026");
  expect(refreshed.dataset.diputados["803"].transparencia_camara.asesorias_externas.periods.find((period) => period.period === "septiembre 2026").rows[0].values.Folio).toBe("9c");
});

test("una recarga de meses antiguos conserva el período más reciente como resumen de ficha", () => {
  const row = (folio, asesor) => ({ values: { Folio: folio, Asesor: asesor, Monto: "100", Diputado: "Jofré C., Álvaro" }, sourceLinks: [] });
  const roster = { "803": "Álvaro Jofré Cisternas" };
  const sept = mergeCamaraExternalAdvisories({ diputados: { "803": {} } }, [row("9", "Sep")], roster, { period: "2026-09", retrievedAt: "2026-10-01T00:00:00.000Z" });
  const jan = mergeCamaraExternalAdvisories(sept.dataset, [row("1", "Jan")], roster, { period: "2026-01", retrievedAt: "2026-10-12T00:00:00.000Z" });
  const section = jan.dataset.diputados["803"].transparencia_camara.asesorias_externas;

  expect(section.period).toBe("septiembre 2026");
  expect(section.rows[0].values.Asesor).toBe("Sep");
  expect(section.periods.map((period) => period.period)).toEqual(["enero 2026", "septiembre 2026"]);
  expect(section.periods[0].rows[0].values.Asesor).toBe("Jan");
});

test("conserva filas y etiquetas originales de transparencia con período y enlaces oficiales", () => {
  const html = `<div id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1">
    <select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlMes"><option value="00">Todos</option></select>
    <select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlAno"><option selected="selected" value="2026">2026</option></select>
    <table class="tabla"><thead><tr><th>Fecha</th><th>Actividad</th><th>Monto</th></tr></thead><tbody>
      <tr><td>10/09/2026</td><td>Asesoría en materias de salud</td><td>$500.000</td></tr>
      <tr><td>11/09/2026</td><td><a href="/documentos/asesoria.pdf">Informe</a></td><td>$300.000</td></tr>
    </tbody></table></div><footer></footer>`;

  expect(parseCamaraTransparencyPage(html)).toEqual({
    status: "available",
    period: "2026",
    rows: [
      { values: { Fecha: "10/09/2026", Actividad: "Asesoría en materias de salud", Monto: "$500.000" }, sourceLinks: [] },
      { values: { Fecha: "11/09/2026", Actividad: "Informe", Monto: "$300.000" }, sourceLinks: ["https://www.camara.cl/documentos/asesoria.pdf"] },
    ],
  });
  expect(camaraTransparencyHasAllMonths(html)).toBe(true);
});

test("reconoce cuándo el corte oficial incluye todos los meses del año", () => {
  expect(camaraTransparencyHasAllMonths(`<select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlMes"><option selected="selected" value="00">Todos</option><option value="9">septiembre</option></select>`)).toBe(true);
  expect(camaraTransparencyHasAllMonths(`<select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlMes"><option value="00">Todos</option><option selected="selected" value="9">septiembre</option></select>`)).toBe(false);
});

test("extrae todos los meses y años que ofrece cada registro de transparencia", () => {
  const html = `<div id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1">
    <select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlMes">
      <option value="00">Todos</option><option value="9">septiembre</option><option selected="selected" value="10">octubre</option>
    </select>
    <select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlAno">
      <option value="2025">2025</option><option selected="selected" value="2026">2026</option>
    </select>
  </div>`;

  expect(parseCamaraTransparencyPeriodOptions(html)).toEqual({
    months: [{ value: "9", label: "septiembre" }, { value: "10", label: "octubre" }],
    years: [{ value: "2025", label: "2025" }, { value: "2026", label: "2026" }],
  });
});

test("planifica todos los meses de todos los años publicados sin incluir meses futuros del año vigente", () => {
  const filters = {
    months: [{ value: "1", label: "enero" }, { value: "9", label: "septiembre" }, { value: "10", label: "octubre" }, { value: "00", label: "Todos" }],
    years: [{ value: "2024", label: "2024" }, { value: "2025", label: "2025" }, { value: "2026", label: "2026" }],
  };

  expect(planCamaraTransparencyPeriods(filters, { currentYear: 2026, currentMonth: 9 })).toEqual([
    { month: "9", year: "2026", label: "septiembre 2026" },
    { month: "1", year: "2026", label: "enero 2026" },
    { month: "10", year: "2025", label: "octubre 2025" },
    { month: "9", year: "2025", label: "septiembre 2025" },
    { month: "1", year: "2025", label: "enero 2025" },
    { month: "10", year: "2024", label: "octubre 2024" },
    { month: "9", year: "2024", label: "septiembre 2024" },
    { month: "1", year: "2024", label: "enero 2024" },
  ]);
});

test("construye el AutoPostBack mensual de Cámara con el estado y el control correctos", () => {
  const html = `<input type="hidden" name="__VIEWSTATE" value="view-1" />
    <input type="hidden" name="__EVENTVALIDATION" value="event-1" />
    <input type="hidden" name="__VIEWSTATEGENERATOR" value="generator-1" />
    <select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlMes"
      name="ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlMes">
      <option value="00">Todos</option><option value="9">septiembre</option>
    </select>
    <select id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_ddlAno"
      name="ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlAno">
      <option selected="selected" value="2026">2026</option>
    </select>`;

  expect(buildCamaraTransparencyMonthPostback(html, { month: "9", year: "2026" })).toEqual({
    __EVENTTARGET: "ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlMes",
    __EVENTARGUMENT: "",
    __VIEWSTATE: "view-1",
    __EVENTVALIDATION: "event-1",
    __VIEWSTATEGENERATOR: "generator-1",
    "ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlMes": "9",
    "ctl00$ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DetallePlaceHolder$ddlAno": "2026",
  });
});

test("no convierte una página sin filas en un vacío confirmado si la fuente no lo declara", () => {
  expect(parseCamaraTransparencyPage('<div id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"><p>Contenido disponible</p></div>'))
    .toEqual({ status: "unknown", period: null, rows: [] });
});

test("marca como vacío confirmado sólo el mensaje explícito publicado por Cámara", () => {
  expect(parseCamaraTransparencyPage('<div id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"><p>No hay registros para el mes seleccionado.</p></div>'))
    .toEqual({ status: "empty_confirmed", period: null, rows: [] });
});

test("lee Inicio de la tabla general por encabezado sin confundir cese ni tipo", () => {
  const html = '<table id="tabla"><tr><th>Distrito</th><th>Diputado</th><th></th><th>Nombre</th><th>Cargo</th><th>Sueldo</th><th>Cargo Elección (SERVEL)</th><th>Inicio</th><th>Cese de funciones</th><th>Tipo</th><th>Trabaja además para</th></tr><tr><td>14</td><td>Achurra D., Ignacio</td><td></td><td>PERSONA DE PRUEBA</td><td>Asesor</td><td>1.234.567</td><td></td><td>01/09/26</td><td></td><td>Honorarios</td><td></td></tr></table>';
  expect(parseCamaraGeneralSupportTable(html)).toEqual([{
    diputado: "Achurra D., Ignacio", distrito: "14", nombre: "PERSONA DE PRUEBA", cargo: "Asesor",
    sueldo: 1234567, cargo_servel: "", inicio: "01/09/26", cese: "", tipo: "Honorarios", trabaja_ademas_para: "",
  }]);
});

test("lee la exportación oficial Excel/HTML aunque use td como encabezado y no tenga id de tabla", () => {
  const html = '<table><tr><td/>Distrito</td><td/>Diputado</td><td/></td><td/>Nombre</td><td/>Cargo</td><td/>Sueldo</td><td/>Cargo Elección<br> (SERVEL)</td><td/>Inicio</td><td/>Cese de funciones</td><td/>Tipo</td><td/>Trabaja ademas para</td></tr><tr><td/>14</td><td/>Achurra D., Ignacio</td><td/></td><td/>PERSONA DE PRUEBA</td><td/>Asesor</td><td/>1.234.567</td><td/></td><td/>01/09/26</td><td/></td><td/>Honorarios</td><td/></td></tr></table>';
  expect(parseCamaraGeneralSupportTable(html)).toEqual([{
    diputado: "Achurra D., Ignacio", distrito: "14", nombre: "PERSONA DE PRUEBA", cargo: "Asesor",
    sueldo: 1234567, cargo_servel: "", inicio: "01/09/26", cese: "", tipo: "Honorarios", trabaja_ademas_para: "",
  }]);
});

test("agrega Inicio sólo cuando la coincidencia de ficha y registro es unívoca", () => {
  const diputados = { "1001": { personal_apoyo: [{ nombre: "PERSONA DE PRUEBA", cargo: "Asesor", sueldo: 1234567, cargo_servel: "", cese: "", tipo: "Honorarios" }] } };
  const registro = { diputado: "Achurra D., Ignacio", distrito: "14", nombre: "PERSONA DE PRUEBA", cargo: "Asesor", sueldo: 1234567, cargo_servel: "", inicio: "01/09/26", cese: "", tipo: "Honorarios" };
  const deputies = [{ id: "1001", apellido: "Achurra D., Ignacio", distrito: "14" }];
  expect(attachCamaraStartDates(diputados, [registro], deputies)).toEqual({ matched: 1, unmatched: 0, ambiguous: 0 });
  expect(diputados["1001"].personal_apoyo[0].inicio).toBe("01/09/26");
});

test("no inventa Inicio cuando registros idénticos vuelven ambigua la relación", () => {
  const row = { nombre: "PERSONA DE PRUEBA", cargo: "Asesor", sueldo: 1234567, cargo_servel: "", cese: "", tipo: "Honorarios" };
  const diputados = { "1001": { personal_apoyo: [{ ...row }, { ...row }] } };
  const registro = { diputado: "Achurra D., Ignacio", distrito: "14", ...row, inicio: "01/09/26" };
  const result = attachCamaraStartDates(diputados, [registro], [{ id: "1001", apellido: "Achurra D., Ignacio", distrito: "14" }]);
  expect(result.ambiguous).toBe(2);
  expect(diputados["1001"].personal_apoyo.every((item) => item.inicio === undefined)).toBe(true);
});
