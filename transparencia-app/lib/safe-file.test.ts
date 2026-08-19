import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readFileIfPresent, writeFileAtomic } from "../scripts/etl/safe-file.mjs";

describe("archivos ETL atómicos", () => {
  it("distingue un archivo ausente sin comprobar y usar por separado", () => {
    const directory = mkdtempSync(join(tmpdir(), "cambiometro-safe-file-"));
    expect(readFileIfPresent(join(directory, "missing.json"), "utf8")).toBeNull();
  });

  it("reemplaza el destino de forma atómica y no deja temporales", () => {
    const directory = mkdtempSync(join(tmpdir(), "cambiometro-safe-file-"));
    const target = join(directory, "state.json");
    writeFileAtomic(target, "primero", "utf8");
    writeFileAtomic(target, "segundo", "utf8");
    expect(readFileSync(target, "utf8")).toBe("segundo");
    expect(readdirSync(directory)).toEqual(["state.json"]);
  });
});
