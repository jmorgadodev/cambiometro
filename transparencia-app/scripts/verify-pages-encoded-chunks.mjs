import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = join(root, "out");
const references = new Set();

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      for (const match of html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)) {
        const asset = match[1].split("?", 1)[0].split("#", 1)[0];
        if (asset.includes("%5B") && asset.startsWith("/_next/")) references.add(asset.slice(1));
      }
    }
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

await walk(out);
const missing = [];
for (const asset of references) {
  if (!(await exists(join(out, asset)))) missing.push(asset);
}
if (missing.length > 0) throw new Error(`Chunks codificados ausentes en Pages: ${missing.join(", ")}`);
console.log(JSON.stringify({ encodedReferences: references.size, missing: 0, checked: [...references].map((asset) => relative(out, join(out, asset))) }, null, 2));
