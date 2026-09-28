#!/usr/bin/env node
import { readFileSync } from "node:fs";

const path = new URL(
  "../workers/public-api/wrangler.audit-preview.jsonc",
  import.meta.url,
);
const raw = readFileSync(path, "utf8");
const config = JSON.parse(
  raw
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1"),
);
const workerSource = readFileSync(
  new URL("../workers/public-api/index.ts", import.meta.url),
  "utf8",
);
const failures = [];

if (!config.name?.includes("audit-preview"))
  failures.push("el Worker debe tener nombre aislado de auditoría");
if (config.workers_dev !== true || config.preview_urls !== true)
  failures.push("debe publicarse sólo en workers.dev preview");
if (config.routes?.length) failures.push("no puede declarar rutas de dominio");
if (config.d1_databases?.length || config.env)
  failures.push("no puede declarar D1 ni entornos heredables");
if (
  config.r2_buckets?.length !== 1 ||
  config.r2_buckets[0]?.binding !== "PUBLIC_DATA"
)
  failures.push("sólo puede enlazar el bucket público de lectura");
if (config.send_email?.length) failures.push("no puede enlazar correo");
if (
  /PUBLIC_DATA\s*\.\s*(put|delete|createMultipartUpload)\s*\(/.test(
    workerSource,
  )
)
  failures.push("el Worker contiene operaciones de escritura/borrado R2");
if (
  config.vars?.READ_ONLY_PREVIEW !== "1" ||
  config.vars?.ALLOW_PUBLIC_D1_READS !== "0"
)
  failures.push("debe mantener las guardas de sólo lectura");

if (failures.length) {
  console.error(`FAIL preview audit: ${failures.join("; ")}`);
  process.exit(1);
}

console.log(
  `OK preview audit: ${config.name}; R2 only; no D1, routes, email, or mutable request mode.`,
);
