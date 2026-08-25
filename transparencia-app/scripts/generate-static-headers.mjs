import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = join(root, "out");
const styleValues = new Set();
const scriptValues = new Set();
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (entry.name.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      for (const match of html.matchAll(/style="([^"]*)"/g)) styleValues.add(match[1]);
      for (const match of html.matchAll(/<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/g)) {
        if (!/application\/ld\+json/i.test(match[1])) scriptValues.add(match[2]);
      }
    }
  }
}
if (await import("node:fs").then(({ existsSync }) => existsSync(out))) await scan(out);
const hash = (value) => `'sha256-${crypto.createHash("sha256").update(value).digest("base64")}'`;
const styleHashes = [...styleValues].map(hash).join(" ");
const scriptHashes = [...scriptValues].map(hash).join(" ");
const stylePolicy = styleHashes ? `'unsafe-hashes' ${styleHashes}` : "";
const headers = `/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/*
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com ${scriptHashes}; style-src 'self' ${stylePolicy}; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cambiometro.impulsacv.cl https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
  X-DNS-Prefetch-Control: on
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/widget.js
  Cross-Origin-Resource-Policy: cross-origin
  Access-Control-Allow-Origin: *
`;
const cspLine = headers.split(/\r?\n/).find((line) => line.includes("Content-Security-Policy:"));
if (!cspLine || cspLine.length > 2_000) {
  throw new Error(`STATIC_CSP_EXCEEDS_PAGES_HEADER_LIMIT: ${cspLine?.length ?? 0} caracteres`);
}
await writeFile(join(root, "public", "_headers"), headers);
await mkdir(join(root, "out"), { recursive: true });
await writeFile(join(root, "out", "_headers"), headers);
console.log("Generated static security headers.");
