import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../../.github/workflows/etl-infolobby-scheduled.yml", import.meta.url), "utf8");

describe("workflow ETL de InfoLobby", () => {
  it("construye el plan de publicación del lake antes de publicar", () => {
    const projection = workflow.indexOf("npm run data:lake:projection:infolobby");
    const lakePlan = workflow.indexOf("npm run data:lake -- --source infolobby");
    const publish = workflow.indexOf("npm run data:publish", projection);

    expect(projection).toBeGreaterThanOrEqual(0);
    expect(lakePlan).toBeGreaterThan(projection);
    expect(publish).toBeGreaterThan(lakePlan);
  });
});
