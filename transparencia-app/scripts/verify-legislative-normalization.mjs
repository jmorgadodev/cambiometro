import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  normalizeLegislativeRelease,
  validateLegislativeRelease,
} from "./legislative-normalization.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const latestPath = resolve(projectRoot, "data/etl/latest.json");
const supportPath = resolve(projectRoot, "data/personal-apoyo.json");
const latest = JSON.parse(await readFile(latestPath, "utf8"));
const support = JSON.parse(await readFile(supportPath, "utf8"));
const generatedAt = latest.actualizado_en ?? null;
const releases = [];

function add(sourceId, sourceLabel, rows, checksum = null, recordIdForRow = null, metadataForRow = null) {
  releases.push(validateLegislativeRelease(normalizeLegislativeRelease({
    sourceId,
    sourceLabel,
    rows,
    releaseId: `${sourceId}-${generatedAt ?? "local"}`,
    checksum,
    publishedAt: generatedAt,
    recordIdForRow,
    metadataForRow,
  })));
}

for (const sourceId of ["congreso_opendata", "votaciones_camara", "votaciones_senado", "gastos_camara", "gastos_senado"]) {
  add(sourceId, sourceId === "congreso_opendata" ? "Congreso Nacional · nómina de autoridades" : sourceId, latest.fuentes?.[sourceId] ?? []);
}

const diputados = [];
const supportMetadata = [];
for (const person of Object.values(support.diputados ?? {})) {
  for (const row of person.personal_apoyo ?? []) {
    diputados.push(row);
    supportMetadata.push({
      defaultOfficialUrls: [support.fuentes?.camara?.url].filter(Boolean),
      defaultPeriod: person.mes_personal ?? null,
    });
  }
}
const supportIdForRow = (prefix) => (row, index) => {
  if (row?.id) return row.id;
  const source = [row?.nombre, row?.apellido_paterno, row?.apellido_materno, row?.cargo, row?.sueldo, row?.monto, row?.periodo, row?.cese, index].map((value) => String(value ?? "").trim()).join("|");
  return `${prefix}-${createHash("sha256").update(source).digest("hex").slice(0, 16)}`;
};
add("personal-apoyo", "Cámara · personal de apoyo y asesorías externas", diputados, support.asignacion_senado_2026?.checksum_sha256 ?? null, supportIdForRow("personal-apoyo"), (_row, index) => supportMetadata[index]);

const senadores = Object.values(support.senadores ?? {}).flat();
add(
  "personal-apoyo-senado",
  "Senado · personal de apoyo parlamentario",
  senadores,
  support.asignacion_senado_2026?.checksum_sha256 ?? null,
  supportIdForRow("personal-apoyo-senado"),
  () => ({ defaultOfficialUrls: [support.fuentes?.senado?.url].filter(Boolean) }),
);

console.log(JSON.stringify({
  ok: true,
  generatedAt,
  releases: releases.map((release) => ({ sourceId: release.sourceId, chamber: release.chamber, ...release.summary })),
  totals: {
    records: releases.reduce((sum, release) => sum + release.records.length, 0),
    categories: Object.fromEntries([...new Set(releases.flatMap((release) => Object.keys(release.summary.categories)))].map((category) => [
      category,
      releases.reduce((sum, release) => sum + (release.summary.categories[category] ?? 0), 0),
    ])),
  },
  note: "Auditoría local; no escribe R2 ni D1 y no mezcla categorías parlamentarias.",
}, null, 2));
