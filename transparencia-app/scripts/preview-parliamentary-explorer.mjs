/** Local static review server. Serves the built Pages artifact with its CSP, no Next/Workers/API. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join, sep, extname } from "node:path";
import { createHash } from "node:crypto";
import { brotliCompress, constants } from "node:zlib";
import { promisify } from "node:util";
const root = resolve("out"),
  port = Number(process.env.EXPLORER_PREVIEW_PORT ?? 3201),
  compress = promisify(brotliCompress);
if (!existsSync(join(root, "dashboard/index.html")))
  throw new Error("Build the static Pages artifact first");
const rules = [];
let rule;
for (const line of readFileSync(join(root, "_headers"), "utf8").split(
  /\r?\n/,
)) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  if (!/^\s/.test(line)) {
    rule = { pattern: line.trim(), headers: {} };
    rules.push(rule);
  } else if (rule) {
    const text = line.trim(),
      colon = text.indexOf(":");
    if (colon > 0)
      rule.headers[text.slice(0, colon)] = text.slice(colon + 1).trim();
  }
}
const matches = (pattern, value) =>
  new RegExp(
    "^" +
      pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*") +
      "$",
  ).test(value);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const cache = new Map();
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1"),
      pathname = decodeURIComponent(url.pathname);
    let file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const metadata = await stat(file).catch(() => null);
    if (metadata?.isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      response.writeHead(404, { "Cache-Control": "no-store" });
      response.end("Not found");
      return;
    }
    const headers = {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "X-Cambiometro-Preview": "local-static",
    };
    for (const r of [...rules].sort(
      (a, b) => a.pattern.length - b.pattern.length,
    ))
      if (matches(r.pattern, pathname)) Object.assign(headers, r.headers);
    let stored = cache.get(file);
    if (!stored) {
      const raw = await readFile(file);
      const br = /\.(html|js|css|json|svg|txt)$/.test(file)
        ? await compress(raw, {
            params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
          })
        : null;
      stored = {
        raw,
        br,
        etag: '"' + createHash("sha256").update(raw).digest("hex") + '"',
      };
      if (cache.size >= 64) cache.delete(cache.keys().next().value);
      cache.set(file, stored);
    }
    headers.ETag = stored.etag;
    headers.Vary = "Accept-Encoding";
    if (request.headers["if-none-match"] === stored.etag) {
      response.writeHead(304, headers);
      response.end();
      return;
    }
    const body =
      stored.br && request.headers["accept-encoding"]?.includes("br")
        ? stored.br
        : stored.raw;
    if (body === stored.br) headers["Content-Encoding"] = "br";
    headers["Content-Length"] = body.length;
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(500, { "Cache-Control": "no-store" });
    response.end("Static preview unavailable");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Local static review: http://127.0.0.1:${port}/dashboard/ (Brotli quality 4, Pages CSP; not a CDN benchmark)`,
  ),
);
