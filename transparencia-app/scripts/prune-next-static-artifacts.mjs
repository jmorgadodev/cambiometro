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
    // Next can change the names of its internal RSC metadata files between
    // versions. Pages only needs the per-route `index.txt` navigation payload;
    // remove every other generated .txt metadata file instead of relying on a
    // version-specific filename list.
    else if (entry.name.endsWith('.txt') && entry.name !== 'index.txt' && entry.name !== 'robots.txt') {
      await unlink(path);
      removed += 1;
    }
  }
}
await walk(out);
console.log(`Removed ${removed} non-public Next static metadata files.`);
