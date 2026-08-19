import { randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export function readFileIfPresent(filePath, encoding) {
  try {
    return readFileSync(filePath, encoding);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function readJsonIfPresent(filePath, fallback = null) {
  const text = readFileIfPresent(filePath, "utf8");
  return text === null ? fallback : JSON.parse(text);
}

export function writeFileAtomic(filePath, data, encoding) {
  const temporaryPath = join(dirname(filePath), `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporaryPath, data, { encoding, flag: "wx", mode: 0o600 });
    renameSync(temporaryPath, filePath);
  } catch (error) {
    try {
      rmSync(temporaryPath, { force: true });
    } catch {
      // Preserve the original error; cleanup is best effort.
    }
    throw error;
  }
}
