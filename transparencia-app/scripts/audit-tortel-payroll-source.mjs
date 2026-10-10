import { parseCpltHeader, parseCpltRecord } from "./etl/cplt-personal.mjs";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Bounded read-only investigation of one municipality, not a CSV ingestion.
const url = "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv";
let requests = 0;
let bytes = 0;
let etag;
async function range(start, length) {
  if (++requests > 40 || bytes + length > 6_000_000) throw new Error("AUDIT_READ_BUDGET_EXCEEDED");
  const response = await fetch(url, { headers: { Range: `bytes=${start}-${start + length - 1}` }, signal: AbortSignal.timeout(20000) });
  if (response.status !== 206) { await response.body?.cancel(); throw new Error(`RANGE_REQUIRED:${response.status}`); }
  const currentEtag = response.headers.get("etag");
  if (etag && currentEtag !== etag) throw new Error("SOURCE_CHANGED_DURING_AUDIT");
  etag = currentEtag;
  const data = await response.arrayBuffer();
  bytes += data.byteLength;
  return { text: new TextDecoder("windows-1252").decode(data), total: Number(response.headers.get("content-range")?.split("/")[1]) };
}

const initial = await range(0, 8192);
const headerLine = initial.text.split("\n")[0].trim();
const header = parseCpltHeader(headerLine);
// The file is ordered by organism code; stop instead of guessing if a window is malformed.
let low = 0, high = initial.total - 8192;
while (high - low > 8192) {
  const middle = Math.floor((low + high) / 2);
  const window = await range(middle, 8192);
  const code = window.text.split("\n")[1]?.split(";")[4];
  if (!/^[A-Z]{2}\d{3}$/.test(code ?? "")) throw new Error("UNEXPECTED_SOURCE_ORDER");
  if (code < "MU326") low = middle; else high = middle;
}

let offset = Math.max(0, low - 8192);
let pending = "";
let foundMunicipality = false;
const rows = [];
for (let block = 0; block < 5; block++) {
  const window = await range(offset, 1_000_000);
  const lines = (pending + window.text).split("\n");
  pending = lines.pop() ?? "";
  if (block === 0) lines.shift();
  let finished = false;
  for (const line of lines) {
    const cells = line.trim().split(";");
    if (cells[4] === "MU326") {
      foundMunicipality = true;
      if ((cells[9]?.toUpperCase().includes("ABEL") && cells[10]?.toUpperCase().includes("BECERRA"))
        || (cells[9]?.toUpperCase().includes("MARISELA") && cells[10]?.toUpperCase().includes("JIMENEZ") && cells[6] === "2026" && cells[7] === "Agosto")) {
        const parsed = parseCpltRecord({ line, header, tipo: "Planta", organismoId: "muni-tortel", sourceUrl: url });
        rows.push({ raw: { period: `${cells[6]} ${cells[7]}`, name: [cells[9], cells[10], cells[11]].join(" "), cargo: cells[14], gross: cells[18], net: cells[20], observations: cells[40], publicationDate: cells[5], pageId: cells[0], startDate: cells[37], endDate: cells[38] }, parsed });
      }
    } else if (foundMunicipality && cells[4] > "MU326") { finished = true; break; }
  }
  if (finished) break;
  offset += 1_000_000;
}
if (!foundMunicipality) throw new Error("TARGET_NOT_FOUND_WITHIN_BUDGET");
const report = { source: url, etag, requests, bytes, matchingRows: rows.length, rows: rows.filter(row => ["2026 Agosto", "2025 Enero", "2024 Diciembre", "2024 Noviembre"].includes(row.raw.period)).map(row => ({ raw: row.raw, parsedGross: row.parsed?.remuneracion_bruta_mensual, parsedNet: row.parsed?.remuneracion_liquida_mensual, recordId: row.parsed?.id })) };
const reportArgument = process.argv.indexOf("--report");
if (reportArgument >= 0) writeFileSync(resolve(process.argv[reportArgument + 1]), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
