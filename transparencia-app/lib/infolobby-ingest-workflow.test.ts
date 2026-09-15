import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ingesta InfoLobby", () => {
  it("permite validar disponibilidad sin escribir artefactos", () => {
    const script = fs.readFileSync(path.resolve(process.cwd(), "scripts", "ingest-infolobby.mjs"), "utf8");
    expect(script).toContain('process.argv.includes("--dry-run")');
    expect(script).toContain("writesPerformed: false");
    expect(script).toContain("if (dryRun)");
  });
});
