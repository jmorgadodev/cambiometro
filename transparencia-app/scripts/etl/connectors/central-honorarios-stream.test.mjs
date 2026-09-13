import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { processCentralHonorariosLines } from "../central-honorarios-stream.mjs";

const temporaryDirectories = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const header = "idPagina;organismo_nombre;organismo_codigo;fecha_publicacion;anyo;Mes;Nombres;Paterno;Materno;descripcion_funcion;tipo_calificacionp;region;Tipo Unidad monetaria;remuneracionbruta;Tipo Unidad monetaria remuneracion liquida;remuliquida_mensual;tipo_pago;num_cuotas;fecha_ingreso;fecha_termino;observaciones;enlace";
const row = (month, name, amount) => [
  `${month}-${name}`, "Presidencia de la República", "AA001", "2026/08/12", "2026", month,
  name, "RUBIO", "FLORES", "ASESORAR EN EL SEGUIMIENTO", "ABOGADO", "Región Metropolitana de Santiago",
  "Pesos", `${amount},0`, "Pesos", `${Math.round(amount * 0.8475)},0`, "Pago mensual", "10",
  "2026/03/11 00:00:00.000", "31/12/2026", "Sin observaciones", "https://oficial.test/row.pdf",
].join(";");

describe("ETL incremental por rangos de honorarios centrales", () => {
  it("procesa el iterador sin cargar el universo y publica el manifiesto local", async () => {
    const root = await mkdtemp(join(tmpdir(), "central-honorarios-stream-"));
    temporaryDirectories.push(root);
    const result = await processCentralHonorariosLines((async function* lines() {
      yield header;
      yield row("Junio", "ROMER ANGEL", 2850000);
      yield row("Mayo", "ROMER ANGEL", 2850000);
    }()), { outputRoot: root, sourceUrl: "https://source.test/honorarios.csv", sourceValidator: "etag-test" });

    expect(result.manifest.recordCount).toBe(2);
    expect(result.linesProcessed).toBe(3);
    expect(result.manifest.partitions.map((partition) => partition.period)).toEqual(["2026-05", "2026-06"]);
    const june = JSON.parse(await readFile(join(root, "partitions", "2026-06.json"), "utf8"));
    expect(june[0]).toMatchObject({ nombre_completo: "Romer Angel Rubio Flores", remuneracion_bruta_mensual: 2850000 });
  });

  it("bloquea un release vacío", async () => {
    const root = await mkdtemp(join(tmpdir(), "central-honorarios-empty-"));
    temporaryDirectories.push(root);
    await expect(processCentralHonorariosLines((async function* lines() { yield header; }()), { outputRoot: root })).rejects.toThrow("CENTRAL_HONORARIOS_EMPTY");
  });
});
