#!/usr/bin/env node

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.PAGES_ROOT ?? "out");
const apiOrigin = process.env.API_ORIGIN?.replace(/\/$/, "") ?? null;
const portArgument = process.argv.find((value) => value === "--port") ? process.argv[process.argv.indexOf("--port") + 1] : null;
const port = Number(process.env.PORT ?? portArgument ?? 3000);

function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
      continue;
    }
    const separator = line.indexOf(":");
    if (current && separator > 0) current.headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return rules;
}

function parseRedirects(text) {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts.length >= 2)
    .map(([source, target, status = "301"]) => ({ source, target, status: Number(status) || 301 }));
}

async function loadRules() {
  const [headers, redirects] = await Promise.all([
    readFile(path.join(root, "_headers"), "utf8").catch(() => ""),
    readFile(path.join(root, "_redirects"), "utf8").catch(() => ""),
  ]);
  return { headers: parseHeaders(headers), redirects: parseRedirects(redirects) };
}

function matches(pattern, pathname) {
  if (pattern === pathname || pattern === "/*") return true;
  if (pattern.endsWith("/*")) return pathname.startsWith(pattern.slice(0, -1));
  return false;
}

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
  }[extension] ?? "application/octet-stream";
}

async function resolveFile(pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidates = pathname.endsWith("/")
    ? [path.join(root, relative, "index.html")]
    : [path.join(root, relative), path.join(root, relative, "index.html"), path.join(root, `${relative}.html`)];
  for (const candidate of candidates) {
    const absolute = path.resolve(candidate);
    if (!absolute.startsWith(`${root}${path.sep}`) && absolute !== root) continue;
    try {
      if ((await stat(absolute)).isFile()) return absolute;
    } catch {
      // Continue to the next static-file candidate.
    }
  }
  return null;
}

const rules = await loadRules();
const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const pathname = requestUrl.pathname;
  if (apiOrigin && pathname.startsWith("/api/")) {
    const requestHeaders = Object.fromEntries(Object.entries(request.headers).filter(([name]) => name !== "host" && name !== "connection"));
    const body = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : Buffer.concat(await (async () => {
        const chunks = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        return chunks;
      })());
    const upstream = await fetch(`${apiOrigin}${pathname}${requestUrl.search}`, {
      method: request.method,
      headers: requestHeaders,
      body,
    });
    const headers = Object.fromEntries([...upstream.headers.entries()].filter(([name]) => !["content-encoding", "content-length", "transfer-encoding", "connection"].includes(name)));
    response.writeHead(upstream.status, headers);
    response.end(Buffer.from(await upstream.arrayBuffer()));
    return;
  }
  const redirect = rules.redirects.find((candidate) => matches(candidate.source, pathname));
  if (redirect) {
    const location = new URL(redirect.target, requestUrl);
    if (requestUrl.search && !location.search) location.search = requestUrl.search;
    response.writeHead(redirect.status, { Location: `${location.pathname}${location.search}${location.hash}` });
    response.end();
    return;
  }

  const file = await resolveFile(pathname);
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }
  const responseHeaders = { "Content-Type": contentType(file) };
  for (const rule of rules.headers) {
    if (matches(rule.pattern, pathname)) Object.assign(responseHeaders, rule.headers);
  }
  response.writeHead(200, responseHeaders);
  if (request.method === "HEAD") response.end();
  else response.end(await readFile(file));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[pages-static] serving ${root} at http://127.0.0.1:${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
