import { expect, test } from "vitest";
import {
  CAMARA_REQUEST_HEADERS,
  appendCamaraRequestHeaders,
  parseCamaraDeputyProfile,
  parseCamaraTransparencyPage,
  parseCamaraDeputyIds,
  selectCamaraPersonalApoyoIds,
} from "./camara-request-headers.mjs";

test("el sondeo y el ETL comparten encabezados de navegador aceptados por Cámara", () => {
  const args = [];
  appendCamaraRequestHeaders(args);

  expect(args).toContain("-H");
  expect(CAMARA_REQUEST_HEADERS).toContain('sec-ch-ua: "Chromium";v="126", "Google Chrome";v="126", "Not;A=Brand";v="99"');
  expect(args).toContain('sec-ch-ua: "Chromium";v="126", "Google Chrome";v="126", "Not;A=Brand";v="99"');
});

test("extrae sólo diputados del selector propio, no opciones de mes o año", () => {
  const html = `<select id="ContentPlaceHolder1_ContentPlaceHolder1_ddlDiputados"><option value="1009">Diputada A</option></select><select id="ddlMes"><option value="9">septiembre</option><option value="10">octubre</option></select><select id="ddlAno"><option value="2026">2026</option></select>`;

  expect(parseCamaraDeputyIds(html)).toEqual([{ id: "1009", apellido: "Diputada A" }]);
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
});

test("no convierte una página sin filas en un vacío confirmado si la fuente no lo declara", () => {
  expect(parseCamaraTransparencyPage('<div id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"><p>Contenido disponible</p></div>'))
    .toEqual({ status: "unknown", period: null, rows: [] });
});

test("marca como vacío confirmado sólo el mensaje explícito publicado por Cámara", () => {
  expect(parseCamaraTransparencyPage('<div id="ContentPlaceHolder1_ContentPlaceHolder1_DetallePlaceHolder_UpdatePanel1"><p>No hay registros para el mes seleccionado.</p></div>'))
    .toEqual({ status: "empty_confirmed", period: null, rows: [] });
});
