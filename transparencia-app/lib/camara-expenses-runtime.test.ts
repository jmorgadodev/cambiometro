import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runtime del ETL de gastos de Camara", () => {
  it("declara las dependencias que el conector importa", () => {
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    expect(pkg.devDependencies).toMatchObject({
      "puppeteer-core": expect.any(String),
      "puppeteer-extra": expect.any(String),
      "puppeteer-extra-plugin-stealth": expect.any(String),
    });
  });

  it("selecciona navegador y temporales de forma compatible con Linux y Windows", () => {
    const connector = readFileSync(resolve("scripts/etl/connectors/camara-gastos.mjs"), "utf8");
    expect(connector).toContain("PUPPETEER_EXECUTABLE_PATH");
    expect(connector).toContain("tmpdir()");
    expect(connector).not.toContain('const EDGE = "C:\\\\Program Files');
  });
});
