import { describe, expect, it } from "vitest";
import { auditCentralHonorariosLines } from "../central-honorarios-audit.mjs";

const header = "idPagina;organismo_nombre;organismo_codigo;fecha_publicacion;anyo;Mes;Nombres;Paterno;Materno;descripcion_funcion;tipo_calificacionp;region;Tipo Unidad monetaria;remuneracionbruta;Tipo Unidad monetaria remuneracion liquida;remuliquida_mensual;tipo_pago;num_cuotas;fecha_ingreso;fecha_termino;observaciones;enlace";
const row = (org, code, month, name, amount) => [
  `${code}-${month}-${name}`, org, code, "2026/08/12", "2026", month, name, "RUBIO", "FLORES",
  "ASESORAR EN EL SEGUIMIENTO", "ABOGADO", "Región Metropolitana de Santiago", "Pesos", `${amount},0`, "Pesos", `${amount - 100},0`, "Pago mensual", "10", "2026/03/11", "31/12/2026", "Sin observaciones", "https://oficial.test/row.pdf",
].join(";");

describe("auditoría liviana de honorarios centrales", () => {
  it("cuenta sin conservar el universo y entrega muestra acotada", async () => {
    const result = await auditCentralHonorariosLines((async function* lines() {
      yield header;
      yield row("Presidencia", "AA001", "Junio", "ROMER ANGEL", 2850000);
      yield row("Presidencia", "AA001", "Mayo", "ROMER ANGEL", 2850000);
      yield row("Ministerio", "AB001", "Junio", "ANA MARIA", 1000000);
    }()), { sampleLimit: 2 });

    expect(result).toMatchObject({ linesProcessed: 4, dataRows: 3, paidRows: 3, sample: expect.any(Array) });
    expect(result.sample).toHaveLength(2);
    expect(result.byPeriod).toEqual({ "2026-05": 1, "2026-06": 2 });
    expect(result.topOrganisms[0]).toMatchObject({ organismo: "Presidencia", recordCount: 2 });
  });
});
