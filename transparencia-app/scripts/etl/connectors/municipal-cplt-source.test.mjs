import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { selectBestCpltDirectory } from "../municipal-cplt-source.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function writeProjection(directory, fileName, records) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, fileName), JSON.stringify(records), "utf8");
}

describe("selección de la proyección CPLT municipal", () => {
  it("prefiere el release versionado con más nóminas no vacías sobre un respaldo antiguo", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cambiometro-cplt-"));
    temporaryDirectories.push(root);

    const stale = path.join(root, "data", "lake", "projections", "funcionarios-v1");
    writeProjection(stale, "muni-santiago.json", [{ nombre_completo: "Persona" }]);
    writeProjection(stale, "muni-maipu.json", [{ nombre_completo: "Persona" }]);

    const versioned = path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1", "versions", "2026-08-30T08-05-27-795Z");
    writeProjection(versioned, "muni-santiago.json", [{ nombre_completo: "Persona" }]);
    writeProjection(versioned, "muni-maipu.json", [{ nombre_completo: "Persona" }]);
    writeProjection(versioned, "muni-vitacura.json", [{ nombre_completo: "Persona" }]);

    const selected = selectBestCpltDirectory(root);

    expect(selected.directory).toBe(versioned);
    expect(selected.fileCount).toBe(3);
    expect(selected.nonEmptyCount).toBe(3);
  });

  it("ignora la carpeta contenedora sin archivos de municipio y devuelve null si no hay datos", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cambiometro-cplt-empty-"));
    temporaryDirectories.push(root);
    fs.mkdirSync(path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1", "versions"), { recursive: true });

    expect(selectBestCpltDirectory(root)).toBeNull();
  });
});
