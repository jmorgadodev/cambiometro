import crypto from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(fileURLToPath(new URL("../", import.meta.url)), "out");
const scriptDir = join(out, "inline-scripts");
const MAX_SHARD_BYTES = 8 * 1024 * 1024;
const rscRevealShim = `(()=>{const g=globalThis,q=g.__cmRcPending||(g.__cmRcPending=[]),d=Object.getOwnPropertyDescriptor(g,"$RC");if(!d||typeof d.get!=="function"||!d.get.__cmRcShim){const existing=typeof g.$RC==="function"?g.$RC:null;let current=existing;const get=()=>current??((...args)=>q.push(args));get.__cmRcShim=true;Object.defineProperty(g,"$RC",{configurable:true,get,set(fn){current=fn;for(const args of q.splice(0))fn(...args);}});}})();`;

const pages = [];
const entries = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory() && file !== scriptDir) {
      await walk(file);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;

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
      group.entry = { id: String(entries.length), body, shard: null };
      entries.push(group.entry);
    }
    pages.push({ file, html, groups });
  }
}

function shardSource(items) {
  const functions = items.map(({ id, body }) => `${JSON.stringify(id)}:()=>{\n${body}\n}`).join(",\n");
  return `(()=>{const f={${functions}};const s=document.currentScript;const id=new URL(s.src,location.href).searchParams.get("e");f[id]?.();})();\n`;
}

await rm(scriptDir, { recursive: true, force: true });
await mkdir(scriptDir, { recursive: true });
await walk(out);

const shards = [];
let current = [];
let currentBytes = 0;
function flushShard() {
  if (!current.length) return;
  const name = `s-${String(shards.length).padStart(3, "0")}.js`;
  shards.push({ name, items: current });
  for (const item of current) item.shard = name;
  current = [];
  currentBytes = 0;
}

for (const entry of entries) {
  const itemBytes = Buffer.byteLength(`${JSON.stringify(entry.id)}:()=>{\n${entry.body}\n},\n`);
  if (current.length && currentBytes + itemBytes > MAX_SHARD_BYTES) flushShard();
  current.push(entry);
  currentBytes += itemBytes;
}
flushShard();

for (const shard of shards) {
  await writeFile(join(scriptDir, shard.name), shardSource(shard.items), "utf8");
}

for (const page of pages) {
  for (const group of page.groups) {
    const src = `/inline-scripts/${group.entry.shard}?e=${group.entry.id}`;
    page.html = page.html.replace(group.marker, `<script src="${src}"></script>`);
    page.html = page.html.replace("</head>", `<link rel="preload" as="script" href="${src}" /></head>`);
  }
  await writeFile(page.file, page.html, "utf8");
}

console.log(`Extracted ${entries.length} inline script groups into ${shards.length} CSP-safe shards.`);
