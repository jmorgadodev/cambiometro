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

const recordsByFile = new Map();
for (const category of categories) {
  const source = join(artifactRoot, `cplt-${category}`);
  if (!existsSync(source)) throw new Error(`CPLT_ARTIFACT_MISSING: ${category}`);
  const normalized = category.toLowerCase();
  writeFileSync(join(output, "validation", `${normalized}.json`), readFileSync(join(source, "validation.json")));
  writeFileSync(join(output, "coverage", `${normalized}.json`), readFileSync(join(source, "coverage.json")));

  for (const fileName of readdirSync(join(source, "projections"))) {
    if (!fileName.endsWith(".json")) continue;
    const records = JSON.parse(readFileSync(join(source, "projections", fileName), "utf8"));
    if (!Array.isArray(records)) throw new Error(`CPLT_ARTIFACT_INVALID: ${category}/${fileName}`);
    const merged = recordsByFile.get(fileName) ?? new Map();
    for (const record of records) merged.set(record.id, record);
    recordsByFile.set(fileName, merged);
  }
}

for (const [fileName, records] of recordsByFile) {
  writeFileSync(join(projections, fileName), JSON.stringify([...records.values()]));
}
if (recordsByFile.size < 1) throw new Error("CPLT_MERGED_PROJECTIONS_MISSING");
console.log(JSON.stringify({ categories: categories.length, projectionFiles: recordsByFile.size }));
