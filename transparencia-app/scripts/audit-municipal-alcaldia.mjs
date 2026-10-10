import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { isAlcaldiaRole, resolvePublishedAlcaldia } from "../lib/municipal-alcaldia.ts";

const response = await fetch("https://cambiometro.impulsacv.cl/data/release-set.json", { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`RELEASE_SET_HTTP:${response.status}`);
const releaseSet = await response.json();
const domain = releaseSet.domains.municipalidades;
const entry = domain?.files?.find(file => file.path === "data/municipalidades-data.json");
if (!entry || entry.size > 65_000_000) throw new Error("MUNICIPAL_AUDIT_PREFLIGHT_FAILED");
const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "r2", "object", "get", `transparencia-public-data/${entry.key}`, "--remote", "--pipe"], { maxBuffer: 65_000_000, timeout: 60000 });
if (result.status !== 0) throw new Error("MUNICIPAL_AGGREGATE_READ_FAILED");
const checksum = createHash("sha256").update(result.stdout).digest("hex");
if (result.stdout.byteLength !== entry.size || checksum !== entry.checksumSha256) throw new Error("MUNICIPAL_AGGREGATE_CHECKSUM_MISMATCH");
const municipalities = Object.values(JSON.parse(result.stdout));
const cases = municipalities.map(data => {
  const latestPeriod = [data.periodo_cplt_reciente, ...(data.periodos_disponibles ?? []).map(period => period.periodo)].filter(Boolean).sort().at(-1);
  const mayorRows = (data.top_remuneraciones_por_periodo?.[latestPeriod] ?? []).filter(isAlcaldiaRole);
  const resolved = resolvePublishedAlcaldia(data);
  return { id: data.id, name: data.nombre_comuna, previous: data.alcalde, latestPeriod, observedLatestMayors: mayorRows.map(row => ({ id: row.id, name: row.nombre, cargo: row.cargo, period: row.periodo, gross: row.remuneracion_bruta })), selected: resolved, olderThanPublishedCut: Boolean(data.alcalde?.periodo && latestPeriod && data.alcalde.periodo < latestPeriod), lowGross: data.alcalde?.remuneracion_bruta > 0 && data.alcalde.remuneracion_bruta < 1_000_000 };
});
const summary = {
  total: cases.length,
  withPreviousMayor: cases.filter(row => row.previous).length,
  olderThanPublishedCut: cases.filter(row => row.olderThanPublishedCut).length,
  newerMayorObserved: cases.filter(row => row.olderThanPublishedCut && row.observedLatestMayors.length > 0).length,
  differentNameObserved: cases.filter(row => row.olderThanPublishedCut && row.observedLatestMayors.some(mayor => mayor.name !== row.previous.nombre)).length,
  lowGross: cases.filter(row => row.lowGross).length,
  lowGrossAllHistorical: cases.filter(row => row.lowGross).every(row => row.olderThanPublishedCut),
  observedLatestAmbiguous: cases.filter(row => row.observedLatestMayors.length > 1).length,
  resolvedObservedMayor: cases.filter(row => row.selected).length,
};
const report = { checkedAt: new Date().toISOString(), releaseId: domain.releaseId, artifactChecksumSha256: checksum, readBytes: result.stdout.byteLength, scope: "346 municipal aggregates; latest top-five payroll evidence is partial, not a census of current legal incumbents or validation of all salaries", summary, cases: cases.filter(row => row.olderThanPublishedCut || row.lowGross).map(row => ({ id: row.id, previousName: row.previous.nombre, previousPeriod: row.previous.periodo, previousGross: row.previous.remuneracion_bruta, latestPeriod: row.latestPeriod, observedLatestMayors: row.observedLatestMayors, selectedName: row.selected?.nombre ?? null, lowGross: row.lowGross })) };
const reportArgument = process.argv.indexOf("--report");
if (reportArgument >= 0) writeFileSync(resolve(process.argv[reportArgument + 1]), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ ...summary, tortel: cases.find(row => row.id === "muni-tortel"), lowGrossMunicipalities: cases.filter(row => row.lowGross).map(row => row.id) }, null, 2));
