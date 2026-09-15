import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const category = process.argv[2];
const normalized = String(category ?? "").toLowerCase();
if (!new Set(["planta", "contrata", "honorarios", "codigotrabajo"]).has(normalized)) {
  throw new Error(`CPLT_UNKNOWN_CATEGORY: ${category}`);
}
const scopeArgument = process.argv.find((argument) => argument.startsWith("--scope="));
const scope = String(scopeArgument?.slice("--scope=".length) || "municipal").toLowerCase();
if (!new Set(["municipal", "central"]).has(scope)) throw new Error(`CPLT_UNKNOWN_SCOPE: ${scope}`);

const raw = resolve("data/raw", scope === "central" ? "transparencia_activa_central" : "transparencia_activa");
const target = resolve("data", scope === "central" ? "cplt-central-category" : "cplt-category", category);
const validation = join(raw, "validation", `${normalized}.json`);
const coverage = join(raw, "coverage", `${normalized}.json`);
const organizations = join(raw, "organizations", `${normalized}.json`);
const projections = join(raw, "projections", "funcionarios-v1");
if (!existsSync(validation) || !existsSync(projections)) throw new Error("CPLT_CATEGORY_INCOMPLETE");
if (scope === "municipal" && !existsSync(coverage)) throw new Error("CPLT_CATEGORY_COVERAGE_INCOMPLETE");
if (scope === "central" && !existsSync(organizations)) throw new Error("CPLT_CATEGORY_ORGANIZATIONS_INCOMPLETE");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(projections, join(target, "projections"), { recursive: true });
writeFileSync(join(target, "validation.json"), readFileSync(validation));
if (existsSync(coverage)) writeFileSync(join(target, "coverage.json"), readFileSync(coverage));
if (existsSync(organizations)) writeFileSync(join(target, "organizations.json"), readFileSync(organizations));
console.log(JSON.stringify({ category, scope, target }));
