import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowsDir = resolve("..", ".github", "workflows");
const remoteMaterialization = /npm run data:materialize(?::optional|:transfer)?[^\n]*--remote/;

function materializationSteps() {
  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .flatMap((name) => {
      const contents = readFileSync(resolve(workflowsDir, name), "utf8");
      return contents
        .split(/\n(?=\s*-\s+name:)/)
        .filter((step) => remoteMaterialization.test(step))
        .map((step) => ({ name, step }));
    });
}

describe("guardia de materializacion D1", () => {
  it("impide que una ejecucion programada materialice D1 remotamente", () => {
    const steps = materializationSteps();

    expect(steps.length).toBeGreaterThan(0);
    for (const { name, step } of steps) {
      expect(step, `${name}: materializacion remota sin compuerta manual`).toMatch(
        /if:\s*[\s\S]*github\.event_name\s*==\s*['"]workflow_dispatch['"]/
      );
    }
  });
});
