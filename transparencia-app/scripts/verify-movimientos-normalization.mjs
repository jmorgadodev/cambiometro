import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  normalizeMovementRelease,
  validateMovementNormalization,
} from "./movimientos-normalization.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const inputPath = resolve(projectRoot, process.env.MOVIMIENTOS_INPUT ?? "data/movimientos.json");
const payload = JSON.parse(await readFile(inputPath, "utf8"));
const release = validateMovementNormalization(normalizeMovementRelease(payload));

console.log(JSON.stringify({
  ok: true,
  input: inputPath,
  ...release.summary,
  releaseId: release.releaseId,
  checksum: release.checksum,
  publishedAt: release.publishedAt,
  note: "Auditoría local; no escribe R2 ni D1 y conserva la fila original en cada registro.",
}, null, 2));
