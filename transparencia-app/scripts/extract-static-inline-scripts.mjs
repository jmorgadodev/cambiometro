import crypto from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(fileURLToPath(new URL("../", import.meta.url)), "out");
const scriptDir = join(out, "inline-scripts");
await mkdir(scriptDir, { recursive: true });
const rscRevealShim = `(()=>{const g=globalThis,q=g.__cmRcPending||(g.__cmRcPending=[]),d=Object.getOwnPropertyDescriptor(g,"$RC");if(!d||typeof d.get!=="function"||!d.get.__cmRcShim){const existing=typeof g.$RC==="function"?g.$RC:null;let current=existing;const get=()=>current??((...args)=>q.push(args));get.__cmRcShim=true;Object.defineProperty(g,"$RC",{configurable:true,get,set(fn){current=fn;for(const args of q.splice(0))fn(...args);}});}})();`;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory() && file !== scriptDir) await walk(file);
    else if (entry.name.endsWith(".html")) {
      let html = await readFile(file, "utf8");
      const groups = [];
      let currentGroup = null;
      html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, body) => {
        if (/\bsrc\s*=|application\/ld\+json/i.test(attrs) || !body.trim()) {
          currentGroup = null;
          return tag;
        }
        if (!currentGroup) {
          currentGroup = {
            bodies: [],
            marker: `__INLINE_SCRIPT_${crypto.randomUUID()}__`,
          };
          groups.push(currentGroup);
        }
        currentGroup.bodies.push(body);
        return currentGroup.bodies.length === 1 ? currentGroup.marker : "";
      });
      for (const group of groups) {
        const body = `${rscRevealShim}\n${group.bodies.join("\n;\n")}`;
        const id = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
        await writeFile(join(scriptDir, `${id}.js`), body);
        html = html.replace(group.marker, `<script src="/inline-scripts/${id}.js"></script>`);
      }
      await writeFile(file, html);
    }
  }
}
await walk(out);
console.log(`Extracted one consolidated executable script per HTML document.`);
