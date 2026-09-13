import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = join(appRoot, "..");
const manifest = JSON.parse(await readFile(join(repoRoot, ".github", "etl-calendar.json"), "utf8"));
const workflowDir = join(repoRoot, ".github", "workflows");

const failures = [];
for (const entry of manifest.entries) {
  const file = join(workflowDir, entry.workflow);
  let content = "";
  try { content = await readFile(file, "utf8"); } catch { failures.push(`${entry.workflow}: archivo inexistente`); continue; }
  if (!content.includes("workflow_dispatch:")) failures.push(`${entry.workflow}: falta workflow_dispatch`);
  if (entry.cronUtc) {
    if (!content.includes(`cron: "${entry.cronUtc}"`)) failures.push(`${entry.workflow}: cron esperado ${entry.cronUtc}`);
  } else if (content.includes("schedule:")) {
    failures.push(`${entry.workflow}: SERVEL no puede tener schedule`);
  }
  if (/wrangler(?:\s+pages)?\s+deploy|npm\s+run\s+deploy/i.test(content) && entry.workflow !== "etl-ley-19862.yml") {
    failures.push(`${entry.workflow}: un ETL programado no puede desplegar Pages/Worker`);
  }
}

const documentedFiles = new Set(manifest.entries.map((entry) => entry.workflow));
const allFiles = await readdir(workflowDir);
for (const file of allFiles) {
  if (!/^etl-.*\.ya?ml$/.test(file) || documentedFiles.has(file) || file === "etl-publication-guard.yml") continue;
  failures.push(`${file}: ETL programado no documentado en .github/etl-calendar.json`);
}

if (failures.length) {
  console.error(failures.map((failure) => `❌ ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`ETL calendar guard passed: ${manifest.entries.length} workflows, timezone ${manifest.timezone}.`);
