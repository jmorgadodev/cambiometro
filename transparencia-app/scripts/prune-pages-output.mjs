#!/usr/bin/env node

import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const NEXT_ROUTE_TEXT_NAMES = new Set(["index.txt", "__PAGE__.txt"]);

function isNextRouteTextFile(name) {
  return NEXT_ROUTE_TEXT_NAMES.has(name) || name.startsWith("__next.");
}

export async function prunePagesOutput(outputRoot) {
  let removed = 0;
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (isNextRouteTextFile(entry.name)) {
        await rm(absolute, { force: true });
        removed += 1;
      }
    }
  }
  await visit(outputRoot);
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputRoot = path.resolve(process.cwd(), "out");
  const removed = await prunePagesOutput(outputRoot);
  console.log(JSON.stringify({ outputRoot, removed }, null, 2));
}
