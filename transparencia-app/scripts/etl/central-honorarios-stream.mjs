import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseCentralHonorarioRow } from "./central-honorarios.mjs";
import { LatestCpltRecordStore } from "./latest-cplt-record-store.mjs";
import { readRangedTextLines } from "./ranged-csv-source.mjs";
import { writeCentralHonorariosPartitions } from "./central-honorarios-release.mjs";

export const CENTRAL_HONORARIOS_URLS = [
  "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContratohonorarios.csv",
  "https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContratohonorarios.csv",
];

export async function processCentralHonorariosLines(lines, {
  outputRoot,
  sourceUrl = null,
  sourceValidator = null,
  storePath = null,
} = {}) {
  if (!lines || typeof lines[Symbol.asyncIterator] !== "function") throw new Error("CENTRAL_HONORARIOS_LINES_REQUIRED");
  if (!outputRoot) throw new Error("CENTRAL_HONORARIOS_OUTPUT_REQUIRED");
  await mkdir(outputRoot, { recursive: true });
  const temporaryStorePath = storePath ?? join(outputRoot, `.central-honorarios-${process.pid}.sqlite`);
  const store = new LatestCpltRecordStore(temporaryStorePath);
  let headerLine = null;
  let linesProcessed = 0;
  try {
    for await (const line of lines) {
      linesProcessed += 1;
      if (linesProcessed === 1) {
        headerLine = line;
        continue;
      }
      const record = parseCentralHonorarioRow({ line, headerLine, sourceUrl: sourceUrl ?? "https://www.portaltransparencia.cl/" });
      if (!record) continue;
      store.upsert({
        stableKey: record.id,
        period: record.fuente_periodo,
        record,
        organismoId: record.organo_codigo || record.organo_nombre,
        recordId: record.id,
      });
    }
    if (!headerLine) throw new Error("CENTRAL_HONORARIOS_HEADER_MISSING");
    store.flush();
    if (store.size < 1) throw new Error("CENTRAL_HONORARIOS_EMPTY");
    const records = (function* recordsFromStore() {
      for (const item of store.valuesSortedByRecordId()) yield item.record;
    }());
    const manifest = await writeCentralHonorariosPartitions(records, outputRoot, { sourceUrl, sourceValidator });
    manifest.linesProcessed = linesProcessed;
    await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return { manifest, linesProcessed };
  } finally {
    store.close();
  }
}

export async function runCentralHonorarios({ urls = CENTRAL_HONORARIOS_URLS, outputRoot = resolve("data/raw/transparencia_activa_central") } = {}) {
  let source = null;
  const lines = readRangedTextLines({
    urls,
    onSource: (candidate) => { source = candidate; },
  });
  return processCentralHonorariosLines(lines, {
    outputRoot,
    sourceUrl: source?.sourceUrl ?? urls[0],
    sourceValidator: source?.validator ?? null,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCentralHonorarios()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`[central-honorarios] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
