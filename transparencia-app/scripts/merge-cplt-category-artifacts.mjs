import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const categories = ["Planta", "Contrata", "Honorarios", "CodigoTrabajo"];
const artifactRoot = resolve("data/cplt-artifacts");
const output = resolve("data/raw/transparencia_activa");
const projections = join(output, "projections", "funcionarios-v1");
rmSync(output, { recursive: true, force: true });
mkdirSync(projections, { recursive: true });
mkdirSync(join(output, "validation"), { recursive: true });
mkdirSync(join(output, "coverage"), { recursive: true });

const organismosAdicionales = new Map();
const projectionFiles = new Set();
for (const category of categories) {
  const source = join(artifactRoot, `cplt-${category}`);
  if (!existsSync(source)) throw new Error(`CPLT_ARTIFACT_MISSING: ${category}`);
  const normalized = category.toLowerCase();
  writeFileSync(join(output, "validation", `${normalized}.json`), readFileSync(join(source, "validation.json")));
  writeFileSync(join(output, "coverage", `${normalized}.json`), readFileSync(join(source, "coverage.json")));

  for (const fileName of readdirSync(join(source, "projections"))) {
    if (!fileName.endsWith(".json")) continue;
    projectionFiles.add(fileName);
  }

  const additionalPath = join(source, "organismos_adicionales.json");
  if (existsSync(additionalPath)) {
    const additional = JSON.parse(readFileSync(additionalPath, "utf8"));
    if (!Array.isArray(additional)) throw new Error(`CPLT_ARTIFACT_INVALID: ${category}/organismos_adicionales.json`);
    for (const organismo of additional) {
      if (organismo?.id) organismosAdicionales.set(organismo.id, organismo);
    }
  }
}

// Cada organismo se consolida de forma independiente. El ETL nacional puede
// superar el millón de filas; mantener un Map global por archivo retenía todo
// el país en memoria y hacía fallar el runner con heap out of memory. Aquí sólo
// vive en memoria el organismo que se está escribiendo y su deduplicación por
// id. El orden de categorías es estable, por lo que el resultado sigue siendo
// determinista.
for (const fileName of [...projectionFiles].sort()) {
  const recordsById = new Map();
  for (const category of categories) {
    const filePath = join(artifactRoot, `cplt-${category}`, "projections", fileName);
    if (!existsSync(filePath)) continue;
    const records = JSON.parse(readFileSync(filePath, "utf8"));
    if (!Array.isArray(records)) throw new Error(`CPLT_ARTIFACT_INVALID: ${category}/${fileName}`);
    for (const record of records) {
      if (!record?.id) throw new Error(`CPLT_ARTIFACT_RECORD_ID_MISSING: ${category}/${fileName}`);
      recordsById.set(record.id, record);
    }
  }
  writeFileSync(join(projections, fileName), JSON.stringify([...recordsById.values()]));
}
if (projectionFiles.size < 1) throw new Error("CPLT_MERGED_PROJECTIONS_MISSING");
if (organismosAdicionales.size > 0) {
  writeFileSync(join(output, "organismos_adicionales.json"), `${JSON.stringify([...organismosAdicionales.values()], null, 2)}\n`);
}
console.log(JSON.stringify({ categories: categories.length, projectionFiles: projectionFiles.size, organismosAdicionales: organismosAdicionales.size, mergeMode: "per-organism" }));
