import fs from "fs";
import path from "path";
import { listEntities, listRecords, listRelations } from "../../lib/data-platform-v1";
import { POLITICOS_SEED } from "../../lib/seed-politicos";
import { getEvidenceForPolitico } from "../../lib/data-source";
import type { PoliticoEvidence } from "../../lib/data-source";
import type { CanonicalEntity, EvidenceRecord, RelationEdge } from "../../lib/data-contracts";

console.log("Generando datos estáticos de Entidades y Evidencias Globales...");

const LIMIT = 100;
const entities: CanonicalEntity[] = [];
let cursor = undefined;
do {
  const page = listEntities({ limit: LIMIT, cursor });
  entities.push(...page.data);
  cursor = page.nextCursor;
} while (cursor);

const records: EvidenceRecord[] = [];
cursor = undefined;
do {
  const page = listRecords({ limit: LIMIT, cursor });
  records.push(...page.data);
  cursor = page.nextCursor;
} while (cursor);

const relations: RelationEdge[] = [];
cursor = undefined;
do {
  const page = listRelations({ limit: LIMIT, cursor });
  relations.push(...page.data);
  cursor = page.nextCursor;
} while (cursor);

console.log(`${entities.length} entities`);
console.log(`${records.length} records`);
console.log(`${relations.length} relations`);

const outputPath = path.join(process.cwd(), "data", "entidades-canonica.json");
fs.writeFileSync(outputPath, JSON.stringify({ entities, records, relations }));
console.log(`Guardado en ${outputPath}`);

console.log("Generando politicos-evidences.json...");
const evidences: Record<string, PoliticoEvidence[]> = {};
let totalEvidences = 0;
for (const pol of POLITICOS_SEED) {
  const polEvidences = await getEvidenceForPolitico(pol);
  evidences[pol.id] = polEvidences;
  totalEvidences += polEvidences.reduce((acc, curr) => acc + curr.records.length, 0);
}
const evidencesPath = path.join(process.cwd(), "data", "politicos-evidences.json");
fs.writeFileSync(evidencesPath, JSON.stringify(evidences));
console.log(`Guardados ${totalEvidences} registros de evidencia en ${evidencesPath}`);
