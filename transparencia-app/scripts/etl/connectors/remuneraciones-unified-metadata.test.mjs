import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readCpltPublishedCount } from "../../remuneraciones-unified-metadata.mjs";

describe("readCpltPublishedCount", () => {
  it("usa el conteo del manifiesto R2 hidratado", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cambiometro-r2-count-"));
    const manifestPath = path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1");
    fs.mkdirSync(manifestPath, { recursive: true });
    fs.writeFileSync(path.join(manifestPath, "manifest.json"), JSON.stringify({
      sourceId: "transparencia-activa",
      recordCount: 1243761,
    }));

    expect(readCpltPublishedCount(root)).toBe(1243761);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("conserva el respaldo cuando no hay manifiesto válido", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cambiometro-r2-count-"));
    expect(readCpltPublishedCount(root, 123)).toBe(123);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
