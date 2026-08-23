import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export function measureWorkerEvaluationSize() {
  const workerFile = resolve(".open-next/worker.js");
  const handlerFile = resolve(".open-next/server-functions/default/handler.mjs");
  const indexFile = resolve(".open-next/server-functions/default/index.mjs");

  const workerSizeBytes = existsSync(workerFile) ? statSync(workerFile).size : 0;
  const handlerSizeBytes = existsSync(handlerFile) ? statSync(handlerFile).size : 0;
  const indexSizeBytes = existsSync(indexFile) ? statSync(indexFile).size : 0;
  const totalSizeBytes = workerSizeBytes + handlerSizeBytes + indexSizeBytes;

  const workerKb = (workerSizeBytes / 1024).toFixed(1);
  const handlerMb = (handlerSizeBytes / (1024 * 1024)).toFixed(2);
  const indexKb = (indexSizeBytes / 1024).toFixed(1);
  const totalMb = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  const budgetMb = 12.0; // Presupuesto máximo permitido de evaluación JS en cold start

  console.log("\n=======================================================");
  console.log("  PRESUPUESTO DE EVALUACIÓN RUNTIME (CLOUDFLARE WORKER) ");
  console.log("=======================================================");
  console.log(`- Worker Entry (.open-next/worker.js):          ${workerKb} KB`);
  console.log(`- Server Handler (.open-next/default/handler):  ${handlerMb} MB`);
  console.log(`- Server Entry (.open-next/default/index):      ${indexKb} KB`);
  console.log(`-------------------------------------------------------`);
  console.log(`- Total Bundle JS Evaluado en Cold Start:       ${totalMb} MB`);
  console.log(`- Presupuesto Límite Máximo:                   ${budgetMb} MB`);
  console.log("=======================================================");

  if (totalSizeBytes > budgetMb * 1024 * 1024) {
    console.error(`❌ ERROR: El bundle evaluado (${totalMb} MB) excede el presupuesto límite (${budgetMb} MB).`);
    process.exit(1);
  }

  console.log("✅ PRESUPUESTO DE BUNDLE CUMPLIDO (CERO PARSE PESADO)\n");
  return { workerKb, handlerMb, indexKb, totalMb };
}

if (process.argv[1]?.endsWith("measure-bundle-size.mjs")) {
  measureWorkerEvaluationSize();
}
