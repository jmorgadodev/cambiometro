/** Prepara las votaciones oficiales de Cámara de un mes, sin publicar. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { buildLakePlan } from "./lake.mjs";

const argument = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const period = String(argument("--period") ?? "2026-09");
const outputArgument = argument("--output");
const output = resolve(outputArgument ?? "");
if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("CAMARA_VOTES_INVALID_PERIOD");
if (!outputArgument) throw new Error("CAMARA_VOTES_OUTPUT_REQUIRED");
const from = `${period}-01`;
const to = `${period}-${new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate()}`;
const base = "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx";
const headers = { "User-Agent": "Cambiometro-ETL/1.0 (+https://cambiometro.impulsacv.cl)" };
const get = async (url) => { const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) }); if (!response.ok) throw new Error(`CAMARA_VOTES_HTTP:${response.status}`); return response.text(); };
const date = (value) => { const raw = String(value ?? "").trim().slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw; const m = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const xml = await get(`${base}/retornarVotacionesXAnno?prmAnno=${period.slice(0, 4)}`);
const candidates = [];
const pattern = /<Votacion>([\s\S]*?)<\/Votacion>/g;
let match;
while ((match = pattern.exec(xml)) !== null) {
  const tag = (name) => match[1].match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
  const text = (name) => match[1].match(new RegExp(`<${name} Valor="\\d+">(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
  const fecha = date(tag("Fecha"));
  if (fecha < from || fecha > to) continue;
  candidates.push({ id: tag("Id"), descripcion: tag("Descripcion"), fecha, fecha_original: tag("Fecha"), total_si: tag("TotalSi"), total_no: tag("TotalNo"), total_abstencion: tag("TotalAbstencion"), total_dispensado: tag("TotalDispensado"), quorum: text("Quorum") || null, resultado: text("Resultado") || null, tipo: text("Tipo") || null });
}
if (new Set(candidates.map((row) => row.id)).size !== candidates.length || candidates.some((row) => !/^\d+$/.test(row.id))) throw new Error("CAMARA_VOTES_DUPLICATE_OR_INVALID_IDS");
const rows = await Promise.all(candidates.map(async (vote) => {
  const detail = await get(`${base}/retornarVotacionDetalle?prmVotacionId=${encodeURIComponent(vote.id)}`);
  const votes = [];
  const votePattern = /<Voto>([\s\S]*?)<\/Voto>/g;
  let item;
  while ((item = votePattern.exec(detail)) !== null) {
    const member = item[1].match(/<Diputado>([\s\S]*?)<\/Diputado>/s)?.[1] ?? "";
    const memberTag = (name) => member.match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
    const option = item[1].match(/<OpcionVoto Valor="(\d+)">(.*?)<\/OpcionVoto>/s);
    votes.push({ id: memberTag("Id"), nombre: `${memberTag("Nombre")} ${memberTag("ApellidoPaterno")} ${memberTag("ApellidoMaterno")}`.replace(/\s+/g, " ").trim(), opcion_valor: option?.[1] ?? "", opcion: option?.[2]?.trim() ?? null });
  }
  return { ...vote, id: `vot-${vote.id}`, votacion_id: vote.id, kind: "vote", votos: votes, source_period: period, fuente: "Congreso Nacional · opendata.camara.cl (WSLegislativo, votaciones de sala)", url: `${base}/retornarVotacionDetalle?prmVotacionId=${vote.id}` };
}));
rows.sort((left, right) => left.fecha.localeCompare(right.fecha) || left.votacion_id.localeCompare(right.votacion_id));
if (rows.length !== 49) throw new Error(`CAMARA_VOTES_COUNT:${rows.length}`);
const snapshot = { generado_por: "prepare-camara-votes-release.mjs", actualizado_en: new Date().toISOString(), fuentes: { votaciones_camara: rows } };
const plan = buildLakePlan(snapshot);
const prefix = `partitions/camara/votaciones_camara/${period.replace("-", "/")}/`;
const assets = plan.assets.filter((asset) => asset.key.startsWith(prefix)).map(({ key, checksumSha256, size, releaseTag, releaseAssetName }) => ({ key, checksumSha256, size, releaseTag, releaseAssetName }));
const partitions = plan.catalog.partitions.filter((partition) => partition.id === `camara/votaciones_camara/${period.replace("-", "/")}`);
if (partitions.length !== 1 || assets.length < 3) throw new Error(`CAMARA_VOTES_PLAN_INVALID:${partitions.length}:${assets.length}`);
const summary = { schemaVersion: "camara-votes-release-v1", generatedAt: snapshot.actualizado_en, sourceId: "camara", variant: "votaciones_camara", period, recordCount: rows.length, officialSource: base, periods: [{ period, recordCount: rows.length }], partitions, assets, publication: { status: "staged_not_published", writesToCloudflare: false } };
if (process.argv.includes("--dry-run")) { console.log(JSON.stringify(summary, null, 2)); process.exit(0); }
for (const item of plan.assets.filter((asset) => asset.key.startsWith(prefix))) { const target = resolve(output, item.key); if (!target.startsWith(`${output}${sep}`)) throw new Error(`INVALID_ASSET_KEY:${item.key}`); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, item.data); }
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, output, period, records: rows.length, assets: assets.length, checksum: partitions[0].checksumSha256 }, null, 2));
