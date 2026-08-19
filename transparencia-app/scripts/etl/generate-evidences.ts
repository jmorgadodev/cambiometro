import fs from "fs";
import path from "path";
import { POLITICOS_SEED } from "../../lib/seed-politicos";
import { getEvidenceForPolitico } from "../../lib/data-source";

interface EvidenceSummary {
  key: string;
  label: string;
  url?: string;
  count: number;
}

console.log("Generando politicos-evidences-stats.json...");
const evidences: Record<string, EvidenceSummary[]> = {};
let totalEvidences = 0;

for (const pol of POLITICOS_SEED) {
  const polEvidences = await getEvidenceForPolitico(pol);
  evidences[pol.id] = polEvidences.map(src => ({
    key: src.source.key,
    label: src.source.label,
    url: src.source.url,
    count: src.records.length
  }));
  totalEvidences += polEvidences.reduce((acc, curr) => acc + curr.records.length, 0);
}

const evidencesPath = path.join(process.cwd(), "data", "politicos-evidences-stats.json");
fs.writeFileSync(evidencesPath, JSON.stringify(evidences, null, 2));
console.log(`Guardados resúmenes para ${totalEvidences} registros de evidencia en ${evidencesPath}`);
