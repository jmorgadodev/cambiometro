import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

function scanDirectory(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".open-next") {
        scanDirectory(fullPath, results);
      }
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) {
      results.push(fullPath);
    }
  }
  return results;
}

const targetDirs = [resolve("lib"), resolve("app")];
const allFiles = targetDirs.flatMap((d) => (existsSync(d) ? scanDirectory(d) : []));

console.log(`Analyzing ${allFiles.length} files in lib/ and app/ for JSON imports...`);

const LIMIT_KB = 200;
const largeImports = [];

for (const filePath of allFiles) {
  const content = readFileSync(filePath, "utf8");
  const regex = /from\s+["']([^"']+\.json)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const importSpecifier = match[1];
    let resolvedPath = "";
    if (importSpecifier.startsWith("@/")) {
      resolvedPath = resolve(importSpecifier.replace(/^@\//, ""));
    } else if (importSpecifier.startsWith(".")) {
      resolvedPath = resolve(join(filePath, "..", importSpecifier));
    } else {
      resolvedPath = resolve(importSpecifier);
    }

    if (existsSync(resolvedPath)) {
      const sizeBytes = statSync(resolvedPath).size;
      const sizeKb = Math.round(sizeBytes / 1024);
      if (sizeKb > LIMIT_KB) {
        largeImports.push({
          sourceFile: filePath.replace(resolve(".") + "\\", "").replace(resolve(".") + "/", ""),
          importSpecifier,
          resolvedPath: resolvedPath.replace(resolve(".") + "\\", "").replace(resolve(".") + "/", ""),
          sizeKb,
        });
      }
    }
  }
}

largeImports.sort((a, b) => b.sizeKb - a.sizeKb);

console.log(`\nFound ${largeImports.length} JSON imports > ${LIMIT_KB} KB:`);
for (const item of largeImports) {
  console.log(`- [${item.sizeKb} KB] in ${item.sourceFile} -> ${item.importSpecifier}`);
}

if (largeImports.length > 0) {
  console.error(`\nFAIL: app/ y lib/ no pueden importar JSON mayores a ${LIMIT_KB} KB en runtime.`);
  process.exitCode = 1;
}
