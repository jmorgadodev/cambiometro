import fs from "node:fs";
import path from "node:path";

export function readCpltPublishedCount(root, fallback = 1203287) {
  const candidates = [
    path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1", "manifest.json"),
    path.join(root, "data", "lake", "projections", "funcionarios-v1", "manifest.json"),
  ];

  for (const candidate of candidates) {
    try {
      const manifest = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (manifest?.sourceId !== "transparencia-activa") continue;
      if (Number.isSafeInteger(manifest.recordCount) && manifest.recordCount > 0) {
        return manifest.recordCount;
      }
    } catch {
      // El build local puede no tener el snapshot R2 hidratado todavía.
    }
  }

  return fallback;
}
