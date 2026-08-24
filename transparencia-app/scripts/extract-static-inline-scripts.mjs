import crypto from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(fileURLToPath(new URL("../", import.meta.url)), "out");
const scriptDir = join(out, "inline-scripts");
await mkdir(scriptDir, { recursive: true });
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory() && file !== scriptDir) await walk(file);
    else if (entry.name.endsWith(".html")) {
      let html = await readFile(file, "utf8");
      const bodies = [];
      html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, body) => {
        if (/\bsrc\s*=|application\/ld\+json/i.test(attrs) || !body.trim()) return tag;
        bodies.push(body);
        return "";
      });
      if (bodies.length) {
        const id = crypto.createHash("sha256").update(bodies.join("\n")).digest("hex").slice(0, 16);
        await writeFile(join(scriptDir, `${id}.js`), bodies.join("\n"));
        html = html.replace("</body>", `<script src="/inline-scripts/${id}.js"></script></body>`);
      }
      await writeFile(file, html);
    }
  }
}
await walk(out);
console.log(`Extracted one consolidated executable script per HTML document.`);
