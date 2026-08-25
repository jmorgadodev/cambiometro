import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(fileURLToPath(new URL("../", import.meta.url)), "out");
let removed = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    // Keep index.txt: the static App Router requests it during a client
    // transition. Link prefetch is disabled for the static UI, so the tree
    // metadata is not needed and can be removed to stay below Pages limits.
    else if (/^__PAGE__\.txt$/.test(entry.name) || /^__next\._(?:full|index|tree|__PAGE__)\.txt$/.test(entry.name)) {
      await unlink(path);
      removed += 1;
    }
  }
}
await walk(out);
console.log(`Removed ${removed} non-public Next static metadata files.`);
