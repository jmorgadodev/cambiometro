/** Prepara la nómina oficial vigente de Cámara para un período aislado. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { buildLakePlan } from "./lake.mjs";

const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const period = String(argument("--period") ?? "2026-09");
const outputArgument = argument("--output");
const output = resolve(outputArgument ?? "");
if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("CAMARA_AUTHORITIES_INVALID_PERIOD");
if (!outputArgument) throw new Error("CAMARA_AUTHORITIES_OUTPUT_REQUIRED");

const url = "https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes";
const response = await fetch(url, { headers: { "User-Agent": "Cambiometro-ETL/1.0 (+https://cambiometro.impulsacv.cl)" }, signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`CAMARA_AUTHORITIES_HTTP:${response.status}`);
const xml = await response.text();
const rows = [];
const pattern = /<Diputado>([\s\S]*?)<\/Diputado>/g;
let match;
while ((match = pattern.exec(xml)) !== null) {
  const tag = (name) => match[1].match(new RegExp(`<${name}>(.*?)</${name}>`, "s"))?.[1]?.trim() ?? "";
  const id = tag("DIPID");
  const nombre = `${tag("Nombre")} ${tag("Apellido_Paterno")} ${tag("Apellido_Materno")}`.replace(/\s+/g, " ").trim();
  if (!/^\d+$/.test(id) || !nombre) continue;
  rows.push({ id, nombre, distrito: tag("Distrito") || null, cargo: "Diputado/a — Cámara de Diputadas y Diputados", fecha: `${period}-01`, source_period: period, kind: "authority", url, fuente: "Congreso Nacional · opendata.congreso.cl (WSDL getDiputados_Vigentes)" });
}
if (rows.length !== 155) throw new Error(`CAMARA_AUTHORITIES_COUNT:${rows.length}`);
if (new Set(rows.map((row) => row.id)).size !== rows.length) throw new Error("CAMARA_AUTHORITIES_DUPLICATE_IDS");

const snapshot = { generado_por: "prepare-camara-authorities-release.mjs", actualizado_en: new Date().toISOString(), fuentes: { congreso_opendata: rows } };
const plan = buildLakePlan(snapshot);
const prefix = `partitions/camara/congreso_opendata/${period.replace("-", "/")}/`;
const assets = plan.assets.filter((asset) => asset.key.startsWith(prefix)).map(({ key, checksumSha256, size, releaseTag, releaseAssetName }) => ({ key, checksumSha256, size, releaseTag, releaseAssetName }));
const partitions = plan.catalog.partitions.filter((partition) => partition.id === `camara/congreso_opendata/${period.replace("-", "/")}`);
if (partitions.length !== 1 || assets.length < 3) throw new Error(`CAMARA_AUTHORITIES_PLAN_INVALID:${partitions.length}:${assets.length}`);
const summary = { schemaVersion: "camara-authorities-release-v1", generatedAt: snapshot.actualizado_en, sourceId: "camara", variant: "congreso_opendata", period, recordCount: rows.length, officialSource: url, periods: [{ period, recordCount: rows.length }], partitions, assets, publication: { status: "staged_not_published", writesToCloudflare: false } };
if (process.argv.includes("--dry-run")) { console.log(JSON.stringify(summary, null, 2)); process.exit(0); }
for (const item of plan.assets.filter((asset) => asset.key.startsWith(prefix))) { const target = resolve(output, item.key); if (!target.startsWith(`${output}${sep}`)) throw new Error(`INVALID_ASSET_KEY:${item.key}`); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, item.data); }
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "release-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, output, period, records: rows.length, assets: assets.length, checksum: partitions[0].checksumSha256 }, null, 2));
