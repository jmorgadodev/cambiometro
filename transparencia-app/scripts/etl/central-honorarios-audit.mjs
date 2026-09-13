import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseCentralHonorarioRow } from "./central-honorarios.mjs";
import { readRangedTextLines } from "./ranged-csv-source.mjs";
import { CENTRAL_HONORARIOS_URLS } from "./central-honorarios-stream.mjs";

export async function auditCentralHonorariosLines(lines, { sampleLimit = 20, onProgress = null } = {}) {
  if (!lines || typeof lines[Symbol.asyncIterator] !== "function") throw new Error("CENTRAL_HONORARIOS_LINES_REQUIRED");
  if (!Number.isInteger(sampleLimit) || sampleLimit < 0 || sampleLimit > 100) throw new Error("CENTRAL_HONORARIOS_SAMPLE_LIMIT_INVALID");
  let headerLine = null;
  let linesProcessed = 0;
  let dataRows = 0;
  let paidRows = 0;
  const byPeriod = new Map();
  const byOrganism = new Map();
  const sample = [];
  for await (const line of lines) {
    linesProcessed += 1;
    if (linesProcessed === 1) {
      headerLine = line;
      continue;
    }
    dataRows += 1;
    const record = parseCentralHonorarioRow({ line, headerLine, sourceUrl: "https://www.portaltransparencia.cl/" });
    if (!record) continue;
    paidRows += 1;
    byPeriod.set(record.fuente_periodo, (byPeriod.get(record.fuente_periodo) ?? 0) + 1);
    const organism = record.organo_nombre || record.organo_codigo || "Sin organismo";
    byOrganism.set(organism, (byOrganism.get(organism) ?? 0) + 1);
    if (sample.length < sampleLimit) {
      sample.push({
        nombre_completo: record.nombre_completo,
        organismo: record.organo_nombre,
        cargo: record.cargo,
        periodo: record.fuente_periodo,
        bruto: record.remuneracion_bruta_mensual,
        liquido: record.remuneracion_liquida_mensual,
        tipo_pago: record.tipo_pago,
        fecha_ingreso: record.fecha_ingreso,
        fecha_termino: record.fecha_termino,
        url: record.url,
      });
    }
    if (linesProcessed % 100_000 === 0) onProgress?.({ linesProcessed, dataRows, paidRows });
  }
  if (!headerLine) throw new Error("CENTRAL_HONORARIOS_HEADER_MISSING");
  return {
    schemaVersion: 1,
    sourceId: "cplt-central-honorarios",
    linesProcessed,
    dataRows,
    paidRows,
    excludedRows: dataRows - paidRows,
    byPeriod: Object.fromEntries([...byPeriod.entries()].sort(([left], [right]) => left.localeCompare(right))),
    topOrganisms: [...byOrganism.entries()]
      .map(([organismo, recordCount]) => ({ organismo, recordCount }))
      .sort((left, right) => right.recordCount - left.recordCount || left.organismo.localeCompare(right.organismo, "es-CL")),
    sample,
  };
}

export async function runCentralHonorariosAudit({ urls = CENTRAL_HONORARIOS_URLS, output = resolve("data/auditorias/cplt-central-honorarios-audit.json") } = {}) {
  let source = null;
  const result = await auditCentralHonorariosLines(readRangedTextLines({ urls, onSource: (candidate) => { source = candidate; } }));
  const report = { ...result, sourceUrl: source?.sourceUrl ?? urls[0], sourceValidator: source?.validator ?? null, generatedAt: new Date().toISOString() };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCentralHonorariosAudit()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`[central-honorarios-audit] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
