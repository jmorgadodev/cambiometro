import crypto from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(fileURLToPath(new URL("../", import.meta.url)), "out");
const rules = new Map();
const classFor = (style) => {
  const id = crypto.createHash("sha256").update(style).digest("hex").slice(0, 12);
  rules.set(id, style.endsWith(";") ? style : `${style};`);
  return `csp-style-${id}`;
};
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith(".html")) {
      let html = await readFile(file, "utf8");
      html = html.replace(/<([a-z][^>]*?)>/gi, (tag) => {
        const style = tag.match(/\sstyle="([^"]*)"/i);
        if (!style) return tag;
        const className = classFor(style[1]);
        const existing = tag.match(/\sclass="([^"]*)"/i);
        const replacement = existing
          ? ` class="${existing[1]} ${className}"`
          : ` class="${className}"`;
        const withoutStyle = tag.replace(style[0], "");
        return existing
          ? withoutStyle.replace(existing[0], replacement)
          : withoutStyle.replace(/>$/, `${replacement}>`);
      });
      await writeFile(file, html);
    }
  }
}
await walk(out);
const css = [...rules.entries()].map(([id, declarations]) => `.csp-style-${id}{${declarations}}`).join("\n");
await writeFile(join(out, "inline-styles.css"), `${css}\n`);
for (const entry of await readdir(out, { withFileTypes: true })) {
  if (!entry.isDirectory() && entry.name === "inline-styles.css") continue;
}
// Add one shared stylesheet reference to each document after rewriting styles.
async function linkCss(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await linkCss(file);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      await writeFile(file, html.replace("</head>", '<link rel="stylesheet" href="/inline-styles.css"/></head>'));
    }
  }
}
await linkCss(out);
console.log(`Extracted ${rules.size} inline style declarations into inline-styles.css.`);
