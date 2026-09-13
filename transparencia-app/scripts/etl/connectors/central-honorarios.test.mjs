import { describe, expect, it } from "vitest";
import { parseCentralHonorarioRow } from "../central-honorarios.mjs";

const header = [
  "idPagina", "organismo_nombre", "organismo_codigo", "fecha_publicacion", "anyo", "Mes",
  "Nombres", "Paterno", "Materno", "grado_eus", "descripcion_funcion", "tipo_calificacionp",
  "region", "Tipo Unidad monetaria", "remuneracionbruta", "Tipo Unidad monetaria remuneracion liquida",
  "remuliquida_mensual", "tipo_pago", "desc_otrpago", "num_cuotas", "fecha_ingreso", "fecha_termino",
  "observaciones", "enlace",
].join(";");

const paidRow = [
  "62503451", "Presidencia de la República", "AA001", "2026/08/12", "2026", "Junio",
  "ROMER ANGEL", "RUBIO", "FLORES", "NO APLICA",
  "ASESORAR EN EL SEGUIMIENTO DE COMPROMISOS MINISTERIALES Y PRESIDENCIALES APOYANDO SU REPORTE Y COORDINACIÓN CON CONTRAPARTES TÉCNICAS.",
  "ABOGADO MAGISTER EN GESTIÓN DE GOBIERNO EXPERTO EN DERECHO Y GESTIÓN DE GOBIERNO",
  "Región Metropolitana de Santiago", "Pesos", "2850000,0", "Pesos", "2415375,0", "Pago mensual", "", "",
  "2026/03/11 00:00:00.000", "31/12/2026", "Sin observaciones", "https://oficial.test/rubio.pdf",
].join(";");

describe("parser de honorarios centrales CPLT", () => {
  it("conserva los campos de pago y procedencia de una fila oficial", () => {
    const record = parseCentralHonorarioRow({ line: paidRow, headerLine: header, sourceUrl: "https://source.test/honorarios.csv" });

    expect(record).toMatchObject({
      nombre_completo: "Romer Angel Rubio Flores",
      organo_nombre: "Presidencia de la República",
      cargo: "Asesorar En El Seguimiento De Compromisos Ministeriales Y Presidenciales Apoyando Su Reporte Y Coordinación Con Contrapartes Técnicas.",
      remuneracion_bruta_mensual: 2850000,
      remuneracion_liquida_mensual: 2415375,
      tipo_pago: "Pago mensual",
      fecha_ingreso: "2026-03-11",
      fecha_termino: "2026-12-31",
      fuente_periodo: "2026-06",
      source_scope: "organismos_centrales",
      url: "https://oficial.test/rubio.pdf",
    });
    expect(record.id).toMatch(/^func-central-honorarios-/);
  });

  it("no convierte una fila sin remuneración publicada en un pago", () => {
    const unpaid = paidRow.replace("2850000,0", "").replace("2415375,0", "");
    expect(parseCentralHonorarioRow({ line: unpaid, headerLine: header, sourceUrl: "https://source.test/honorarios.csv" })).toBeNull();
  });
});
