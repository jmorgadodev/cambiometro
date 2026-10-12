import { expect, test } from "vitest";
import { mergeCamaraGeneralSupportMonth, parseCamaraGeneralSupportTable } from "../scripts/etl/camara-personal-apoyo-general.mjs";

const roster = { "1009": "Jorge Alessandri Vergara" };
const row = { diputado: "Alessandri V., Jorge", distrito: "10", nombre: "PERSONA PUBLICADA", cargo: "Asesor", sueldo: 100, tipo: "Contrato", inicio: "11/03/26", cese: "", cargo_servel: "", trabaja_ademas_para: "" };
const baseline = {
  diputados: { "1009": { mes_personal: "septiembre 2026", personal_apoyo: [{ ...row, sueldo: 200 }], ficha: { email: "jorge.alessandri@congreso.cl" }, transparencia_camara: { asesorias_externas: { rows: [{ values: { Folio: "123" } }] } } } },
  senadores: { "OFICINA EXISTENTE": [{ periodo: "2026-03", monto: 300 }] },
};

test("recupera marzo sin retroceder septiembre ni modificar asesores externos o Senado", () => {
  const result = mergeCamaraGeneralSupportMonth(baseline, [row], roster, { period: "2026-03", retrievedAt: "2026-10-12T12:00:00Z", checksum: "source-checksum" });
  expect(result.matched).toBe(1);
  expect(result.dataset.diputados["1009"]).toMatchObject({
    mes_personal: "septiembre 2026", personal_apoyo: [{ sueldo: 200 }],
    personal_apoyo_por_periodo: { "2026-03": { status: "available", rows: [{ sueldo: 100, inicio: "11/03/26" }], checksum_sha256: "source-checksum" }, "2026-09": { rows: [{ sueldo: 200 }] } },
    transparencia_camara: baseline.diputados["1009"].transparencia_camara,
  });
  expect(result.dataset.senadores).toEqual(baseline.senadores);
  expect("personal_apoyo_por_periodo" in baseline.diputados["1009"]).toBe(false);
});

test("conserva filas separadas de la misma persona y reimporta el mes sin duplicarlo", () => {
  const rows = [row, { ...row, sueldo: 50, inicio: "11/03/22", cese: "10/03/26" }];
  const first = mergeCamaraGeneralSupportMonth(baseline, rows, roster, { period: "2026-03" });
  const second = mergeCamaraGeneralSupportMonth(first.dataset, rows, roster, { period: "2026-03" });
  expect(second.dataset.diputados["1009"].personal_apoyo_por_periodo["2026-03"].rows).toHaveLength(2);
  expect(second.dataset.diputados["1009"].personal_apoyo_por_periodo["2026-03"].rows.reduce((sum: number, record: { sueldo: number }) => sum + record.sueldo, 0)).toBe(150);
});

test("bloquea identidades ambiguas o sin vínculo antes de producir un candidato", () => {
  expect(() => mergeCamaraGeneralSupportMonth(baseline, [row], { ...roster, "999": "Jorge Alessandri Vidal" }, { period: "2026-03" })).toThrow("CAMARA_SUPPORT_LINK_INCOMPLETE");
  expect(() => mergeCamaraGeneralSupportMonth(baseline, [{ ...row, diputado: "Apellido X., Nombre" }], roster, { period: "2026-03" })).toThrow("CAMARA_SUPPORT_LINK_INCOMPLETE");
});

test("vincula el segundo nombre publicado con el ID oficial cuando los apellidos son unívocos", () => {
  const result = mergeCamaraGeneralSupportMonth(baseline, [{ ...row, diputado: "Ñanco V., Ericka" }], { "1153": "Coca Ericka Ñanco Vásquez" }, { period: "2026-03" });
  expect(result.dataset.diputados["1153"].personal_apoyo_por_periodo["2026-03"].rows).toHaveLength(1);
});

test("una errata requiere un alias documentado contra el nombre e ID oficiales", () => {
  const sourceRows = [{ ...row, diputado: "Zamorano P., Fernado" }];
  const officialRoster = { "1264": "Fernando Zamorano Peralta" };
  const aliases = { "Zamorano P., Fernado": { id: "1264", officialName: "Fernando Zamorano Peralta", sourceUrl: "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1264" } };
  expect(() => mergeCamaraGeneralSupportMonth(baseline, sourceRows, officialRoster, { period: "2026-03" })).toThrow("CAMARA_SUPPORT_LINK_INCOMPLETE");
  expect(mergeCamaraGeneralSupportMonth(baseline, sourceRows, officialRoster, { period: "2026-03", aliases }).matched).toBe(1);
  expect(() => mergeCamaraGeneralSupportMonth(baseline, sourceRows, { "1264": "Otra Persona" }, { period: "2026-03", aliases })).toThrow("CAMARA_SUPPORT_LINK_INCOMPLETE");
});

test("un período vacío o un monto ausente no reemplazan la evidencia anterior", () => {
  expect(() => mergeCamaraGeneralSupportMonth(baseline, [], roster, { period: "2026-03" })).toThrow("CAMARA_SUPPORT_EMPTY_MONTH");
  const html = '<table id="tabla"><tr><th>Diputado</th><th>Distrito</th><th>Nombre</th><th>Cargo</th><th>Sueldo</th><th>Inicio</th><th>Tipo</th></tr><tr><td>Alessandri V., Jorge</td><td>10</td><td>PERSONA PUBLICADA</td><td>Asesor</td><td></td><td>11/03/26</td><td>Contrato</td></tr></table>';
  expect(() => parseCamaraGeneralSupportTable(html)).toThrow("CAMARA_GENERAL_SUPPORT_AMOUNT_MISSING");
  expect(parseCamaraGeneralSupportTable(html.replace('<td></td>', '<td>0</td>'))[0].sueldo).toBe(0);
});
