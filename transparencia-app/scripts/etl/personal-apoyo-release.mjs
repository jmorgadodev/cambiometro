import { createHash } from "node:crypto";
import { validatePersonalApoyoDataset } from "./personal-apoyo-publication.mjs";

export function verifyPersonalApoyoRelease(buffer, manifest, minimums) {
  if (manifest?.schemaVersion !== "1.0.0" || manifest?.sourceId !== "personal-apoyo") {
    throw new Error("PERSONAL_APOYO_RELEASE_MANIFEST_INVALID");
  }
  const checksum = createHash("sha256").update(buffer).digest("hex");
  if (checksum !== manifest.checksumSha256) throw new Error("PERSONAL_APOYO_RELEASE_CHECKSUM_MISMATCH");
  const dataset = JSON.parse(buffer.toString("utf8"));
  const counts = validatePersonalApoyoDataset(dataset, minimums);
  if (dataset.generado_en !== manifest.generatedAt) throw new Error("PERSONAL_APOYO_RELEASE_DATE_MISMATCH");
  for (const [key, value] of Object.entries(counts)) {
    if (manifest[key] !== value) throw new Error(`PERSONAL_APOYO_RELEASE_COUNT_MISMATCH:${key}`);
  }
  return { dataset, counts, checksum };
}

export function personalApoyoStaticSubset(dataset) {
  return {
    generado_en: dataset.generado_en,
    fuentes: dataset.fuentes || {},
    meses_senado_disponibles: dataset.meses_senado_disponibles || ["2026-07"],
    asignacion_senado_2026: dataset.asignacion_senado_2026,
    diputados: Object.fromEntries(Object.entries(dataset.diputados || {}).slice(0, 20)),
    senadores: Object.fromEntries(Object.entries(dataset.senadores || {}).slice(0, 10)),
  };
}
