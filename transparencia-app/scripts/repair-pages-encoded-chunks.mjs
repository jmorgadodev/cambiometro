import { cp, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const appChunks = join(root, "out", "_next", "static", "chunks", "app");
let copiedDirectories = 0;
let copiedFiles = 0;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(dir) {
  let count = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    count += entry.isDirectory() ? await countFiles(path) : 1;
  }
  return count;
}

async function repair(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const source = join(dir, entry.name);
    if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
      const encodedName = encodeURIComponent(entry.name);
      const destination = join(dir, encodedName);
      if (!(await exists(destination))) {
        await cp(source, destination, { recursive: true });
        copiedDirectories += 1;
        copiedFiles += await countFiles(source);
      }
    }
    await repair(source);
  }
}

if (await exists(appChunks)) await repair(appChunks);
console.log(JSON.stringify({ copiedDirectories, copiedFiles, appChunks }, null, 2));
