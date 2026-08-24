import crypto from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(fileURLToPath(new URL("../", import.meta.url)), "out");
const scriptDir = join(out, "inline-scripts");
const scripts = new Map();
await mkdir(scriptDir, { recursive: true });
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory() && file !== scriptDir) await walk(file);
    else if (entry.name.endsWith(".html")) {
      let html = await readFile(file, "utf8");
      html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, body) => {
        if (/\bsrc\s*=|application\/ld\+json/i.test(attrs) || !body.trim()) return tag;
        const id = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
        if (!scripts.has(id)) scripts.set(id, body);
        return `<script src="/inline-scripts/${id}.js"></script>`;
      });
      await writeFile(file, html);
    }
  }
}
await walk(out);
for (const [id, body] of scripts) await writeFile(join(scriptDir, `${id}.js`), body);
console.log(`Extracted ${scripts.size} executable inline scripts.`);
