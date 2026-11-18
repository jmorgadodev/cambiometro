import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pausedPeripheralWorkflows = [
  "etl-chilecompra.yml",
  "etl-contraloria.yml",
  "etl-cplt.yml",
  "etl-dipres.yml",
  "etl-infoprobidad.yml",
  "etl-infolobby-scheduled.yml",
  "etl-ley-19862.yml",
  "etl-sinim.yml",
];

const activeCoreWorkflows = [
  "etl-camara-votaciones.yml",
  "etl-daily.yml",
  "etl-expenses.yml",
  "etl-movimientos.yml",
  "etl-personal-apoyo-senado.yml",
  "etl-remuneraciones-38bis.yml",
];

describe("alcance automático de la renovación parlamentaria", () => {
  it("no encadena los ETL secundarios hacia publicación automática", () => {
    const pausedNames = pausedPeripheralWorkflows.map((file) => readFileSync(resolve("..", ".github", "workflows", file), "utf8").split(/\r?\n/)[0].replace(/^name: /, ""));
    for (const file of ["pages-static-refresh.yml", "etl-publication-guard.yml"]) {
      const triggers = readFileSync(resolve("..", ".github", "workflows", file), "utf8").split("types: [completed]")[0];
      for (const name of pausedNames) expect(triggers).not.toContain(`- "${name}"`);
    }
  });

  it.each(pausedPeripheralWorkflows)("mantiene %s sólo bajo ejecución manual", (file) => {
    const workflow = readFileSync(resolve("..", ".github", "workflows", file), "utf8");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/^\s+schedule:/m);
    expect(workflow).not.toMatch(/^\s+push:/m);
  });

  it.each(activeCoreWorkflows)("conserva la programación automática de %s", (file) => {
    const workflow = readFileSync(resolve("..", ".github", "workflows", file), "utf8");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toMatch(/^\s+schedule:/m);
  });
});
