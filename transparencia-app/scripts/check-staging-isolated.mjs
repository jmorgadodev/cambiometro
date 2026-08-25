#!/usr/bin/env node
// Guardia C1: staging debe estar aislado de producción.
// - FAIL si staging database_id == production database_id
// - FAIL si staging database_id no es ID cero ni está en allowlist explícita
// Uso: node scripts/check-staging-isolated.mjs

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER_PATH = resolve(ROOT, "workers", "public-api", "wrangler.jsonc");

const ZERO_ID = "00000000-0000-0000-0000-000000000000";
// Allowlist para futuros IDs de staging remoto explícitamente aprobados (vacía hasta decisión).
const ALLOWED_STAGING_IDS = new Set([
  ZERO_ID,
  // Añadir aquí UUID de staging remoto cuando se decida crear DB remota (ej. Workers Paid).
]);

let config;
try {
  const raw = readFileSync(WRANGLER_PATH, "utf8");
  // wrangler.jsonc permite comentarios // y /* */ — strip antes de JSON.parse
  const withoutComments = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  config = JSON.parse(withoutComments);
} catch (e) {
  console.error(`No se pudo leer ${WRANGLER_PATH}: ${e.message}`);
  process.exit(1);
}

const prod = config?.d1_databases?.[0];
const staging = config?.env?.staging?.d1_databases?.[0];

if (!prod || !staging) {
  console.error("Falta bloque d1_databases en wrangler.jsonc (prod o staging)");
  process.exit(1);
}

const prodId = String(prod.database_id || "").trim();
const stagingId = String(staging.database_id || "").trim();
const stagingName = String(staging.database_name || "").trim();

let failed = false;

if (!stagingId) {
  console.error("FAIL C1: staging database_id vacío");
  failed = true;
}

if (stagingId === prodId) {
  console.error(`FAIL C1: staging database_id == production database_id (${prodId}). Staging debe estar aislado.`);
  failed = true;
}

if (!ALLOWED_STAGING_IDS.has(stagingId)) {
  console.error(`FAIL C1: staging database_id no permitido: ${stagingId}`);
  console.error(`  Permitidos: ${[...ALLOWED_STAGING_IDS].join(", ") || "(solo cero)"}`);
  console.error(`  Si creas una DB staging remota, añade su UUID a ALLOWED_STAGING_IDS en este script.`);
  failed = true;
}

if (stagingName === "transparencia-db" || stagingName === prod.database_name) {
  console.error(`FAIL C1: staging database_name no debe ser igual a producción (${stagingName})`);
  failed = true;
}

if (failed) {
  console.error(`\nC1 bloqueado: staging solo-local debe usar ID cero ${ZERO_ID} y nombre transparencia-db-staging-LOCAL`);
  process.exit(1);
}

console.log(`OK C1: staging aislado — staging=${stagingName} (${stagingId}) != prod=${prod.database_name} (${prodId})`);
console.log(`  staging solo-local con ID cero, remoto bloqueado. No crear DB remota sin decisión expresa.`);
