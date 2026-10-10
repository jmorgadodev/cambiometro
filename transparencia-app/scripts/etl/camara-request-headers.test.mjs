import { expect, test } from "vitest";
import {
  CAMARA_REQUEST_HEADERS,
  appendCamaraRequestHeaders,
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
