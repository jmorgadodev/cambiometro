import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const category = process.argv[2];
const normalized = String(category ?? "").toLowerCase();
if (!new Set(["planta", "contrata", "honorarios", "codigotrabajo"]).has(normalized)) {
  throw new Error(`CPLT_UNKNOWN_CATEGORY: ${category}`);
}

const raw = resolve("data/raw/transparencia_activa");
const target = resolve("data/cplt-category", category);
const validation = join(raw, "validation", `${normalized}.json`);
const coverage = join(raw, "coverage", `${normalized}.json`);
const projections = join(raw, "projections", "funcionarios-v1");
if (!existsSync(validation) || !existsSync(coverage) || !existsSync(projections)) throw new Error("CPLT_CATEGORY_INCOMPLETE");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(projections, join(target, "projections"), { recursive: true });
const coverageReport = JSON.parse(readFileSync(coverage, "utf8"));
for (const item of coverageReport.coverage ?? []) {
  if (item.status === "not_applicable" || (item.status === "unavailable" && process.env.CPLT_ALLOW_UNAVAILABLE === "1")) {
    const filePath = join(target, "projections", `${item.communeId}.json`);
    if (!existsSync(filePath)) writeFileSync(filePath, "[]\n");
  } else if (item.status === "available" && !existsSync(join(target, "projections", `${item.communeId}.json`))) {
    throw new Error(`CPLT_CATEGORY_PARTITION_MISSING: ${category}/${item.communeId}`);
  }
}
writeFileSync(join(target, "validation.json"), readFileSync(validation));
writeFileSync(join(target, "coverage.json"), readFileSync(coverage));
console.log(JSON.stringify({ category, target }));
